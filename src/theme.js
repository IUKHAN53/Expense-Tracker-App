// Shared colours, formatting helpers and small utilities for the app.

export const colors = {
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  bg: '#f1f5f9',
  card: '#ffffff',
  text: '#0f172a',
  muted: '#64748b',
  border: '#e2e8f0',
  danger: '#ef4444',
  success: '#22c55e',
  info: '#0ea5e9',
  warning: '#f59e0b',
  white: '#ffffff',
};

/** Format a number as Pakistani Rupees, e.g. money(1234.5) -> "Rs 1,235". */
export function money(value) {
  const v = Math.round(Number(value) || 0);
  const sign = v < 0 ? '-' : '';
  const grouped = Math.abs(v)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}Rs ${grouped}`;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Format an ISO date string for display. */
export function formatDate(iso, withTime = false) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const base = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
  if (!withTime) return base;
  const hh = d.getHours() % 12 || 12;
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ap = d.getHours() < 12 ? 'AM' : 'PM';
  return `${base}, ${hh}:${mm} ${ap}`;
}

/** Current month as "YYYY-MM". */
export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Shift a "YYYY-MM" key by N months. */
export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Human label for a "YYYY-MM" key, e.g. "May 2026". */
export function monthLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** Ionicons name for a spending-list type. */
export function listIcon(type) {
  switch (type) {
    case 'household':
      return 'home';
    case 'vehicle':
      return 'car-sport';
    default:
      return 'person';
  }
}
