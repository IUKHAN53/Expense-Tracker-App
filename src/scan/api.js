import { randomUUID } from 'expo-crypto';
import { getDb } from '../db';

export const SCAN_URL = 'https://expense.iukhan.tech/api/v2/scan';

/** Random id for this install, used only to count free scans on the server. */
async function deviceId() {
  const db = await getDb();
  let id = await db.settings.get('device_id');
  if (!id) {
    id = randomUUID();
    await db.settings.set('device_id', id);
  }
  return id;
}

/**
 * Send one receipt photo for reading. Resolves to
 * { ok: true, scan, freeLeft, pro } or { ok: false, code, message, freeLeft }.
 * code is 'paywall', 'unreadable', 'offline' or 'error'.
 */
export async function scanReceipt(uri, { token, currency, categories }) {
  const form = new FormData();
  form.append('image', { uri, name: 'receipt.jpg', type: 'image/jpeg' });
  form.append('device_id', await deviceId());
  if (token) form.append('purchase_token', token);
  if (currency) form.append('currency', currency);
  (categories || []).slice(0, 40).forEach((c) => form.append('categories[]', c));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 90000);
  try {
    const res = await fetch(SCAN_URL, {
      method: 'POST', body: form, headers: { Accept: 'application/json' }, signal: ctrl.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true, scan: body.scan, freeLeft: body.free_left, pro: body.pro };
    if (res.status === 429) return { ok: false, code: 'error', message: 'Too many scans in a row. Wait a minute and try again.' };
    return {
      ok: false,
      code: body.code || 'error',
      message: body.message || 'Something went wrong reading the receipt.',
      freeLeft: body.free_left,
    };
  } catch {
    return { ok: false, code: 'offline', message: 'Scanning needs an internet connection. Check it and try again.' };
  } finally {
    clearTimeout(timer);
  }
}
