// Tiny in-process pub/sub so screens can invalidate each other's caches
// after a write without re-plumbing through context or react-query.

const subs = new Map();

export const EVENTS = {
  ENTRIES_CHANGED: 'entries:changed',
  LISTS_CHANGED: 'lists:changed',
  CATEGORIES_CHANGED: 'categories:changed',
};

export function on(event, handler) {
  if (!subs.has(event)) subs.set(event, new Set());
  subs.get(event).add(handler);
  return () => subs.get(event)?.delete(handler);
}

export function emit(event, payload) {
  subs.get(event)?.forEach((h) => {
    try { h(payload); } catch {}
  });
}
