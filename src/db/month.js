// Month helpers. Dates are stored as UTC ISO strings ("…Z") so they sort
// lexicographically; month boundaries are taken in the phone's local time.

/** "YYYY-MM" for the given date (local time). */
export function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** [fromIso, toIsoExclusive] for a "YYYY-MM" key (or current month). */
export function monthRange(key) {
  const m = /^(\d{4})-(\d{2})$/.exec(key || '');
  const now = new Date();
  const y = m ? Number(m[1]) : now.getFullYear();
  const mo = m ? Number(m[2]) - 1 : now.getMonth();
  return [new Date(y, mo, 1).toISOString(), new Date(y, mo + 1, 1).toISOString()];
}

/**
 * Normalise anything the screens send ("YYYY-MM-DD HH:mm:ss" local, ISO, Date,
 * or nothing) to a UTC ISO string. Throws on garbage instead of storing it.
 */
export function toIso(value) {
  if (value == null || value === '') return new Date().toISOString();
  const d = value instanceof Date ? value : new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${value}`);
  return d.toISOString();
}
