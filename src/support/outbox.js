import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/client';
import { isNetworkError } from './net';

// Offline write queue. When the device is offline (or a write fails with a
// network error), new expenses are stored here and replayed in order once the
// connection returns. Only CREATES are queued — edits/deletes need the record
// to already exist server-side, so those require a live connection.

const KEY = 'et_outbox';
let flushing = false;

async function read() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

async function write(queue) {
  await AsyncStorage.setItem(KEY, JSON.stringify(queue));
}

export async function count() {
  return (await read()).length;
}

/** The queued items (for the pending-sync list UI). */
export async function list() {
  return read();
}

/** Remove a single queued item by id. Returns the new length. */
export async function remove(id) {
  const queue = (await read()).filter((op) => op.id !== id);
  await write(queue);
  return queue.length;
}

/** Drop every queued item. */
export async function clear() {
  await write([]);
}

/** Queue a POST /entries payload for later sync. */
export async function enqueueEntry(payload) {
  const queue = await read();
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    payload,
    createdAt: new Date().toISOString(),
  });
  await write(queue);
  return queue.length;
}

/**
 * Replay queued entries oldest-first. Stops on the first network error (keeps
 * the rest for next time); drops items the server rejects as invalid (4xx) so
 * a single bad row can't wedge the queue forever.
 * @returns {Promise<{synced:number, remaining:number}>}
 */
export async function flush() {
  if (flushing) return { synced: 0, remaining: await count() };
  flushing = true;
  let synced = 0;
  try {
    let queue = await read();
    while (queue.length) {
      const op = queue[0];
      try {
        await api.post('/entries', op.payload);
        queue.shift();
        await write(queue);
        synced++;
      } catch (e) {
        if (isNetworkError(e)) break; // still offline — try again later
        if (e?.response?.status >= 400 && e?.response?.status < 500) {
          queue.shift(); // unrecoverable bad payload — drop it
          await write(queue);
          continue;
        }
        break; // server error (5xx) — retry later
      }
    }
    return { synced, remaining: queue.length };
  } finally {
    flushing = false;
  }
}
