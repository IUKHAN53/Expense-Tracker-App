// Kharcha 2.0 — "signage": black type on white, one chrome-yellow action.
// Source of truth: the Paper file "Kharcha 2.0 — Redesign" (its design tokens).

export const colors = {
  bg: '#FFFFFF', // page
  card: '#FFFFFF', // surfaces sit on the page, separated by rules not boxes
  soft: '#F6F6F4', // soft fills (inputs, chips, icon buttons)
  ink: '#111111', // text, dark surfaces
  inkSoft: '#6B6B6B', // secondary text
  muted: '#9A9A9A', // chevrons, placeholder strokes
  rule: '#EDEDED', // dividers, chip outlines
  ruleSoft: '#F3F3F3',
  primary: '#F5C518', // chrome yellow — the primary action only; ink text on top
  accent: '#F5C518', // legacy alias of primary (never use as text colour)
  accent2: '#1F8A4C', // good / under budget
  good: '#1F8A4C',
  alarm: '#C8372D', // bad / over budget
  bad: '#C8372D',
  warnFill: '#FDF3E1',
  white: '#FFFFFF',
  scrim: 'rgba(0, 0, 0, 0.55)',
};

// Font family keys — registered in App.js via useFonts(). The old serif keys
// now map onto Geist so any screen not yet rebuilt still picks up the new type.
export const fonts = {
  display: 'Geist-ExtraBold',
  sans: 'Geist',
  sansMedium: 'Geist-Medium',
  sansSemibold: 'Geist-SemiBold',
  mono: 'GeistMono',
  monoMedium: 'GeistMono-Medium',
  serif: 'Geist-Medium',
  serifMedium: 'Geist-ExtraBold',
  serifItalic: 'Geist',
  serifMediumItalic: 'Geist-ExtraBold',
};

/** Shared type styles from the design (sizes in dp). */
export const type = {
  hero: { fontFamily: 'Geist-ExtraBold', fontSize: 60, lineHeight: 64, letterSpacing: -3, color: '#111111' },
  title: { fontFamily: 'Geist-ExtraBold', fontSize: 34, letterSpacing: -1.4, color: '#111111' },
  h2: { fontFamily: 'Geist-ExtraBold', fontSize: 22, letterSpacing: -0.6, color: '#111111' },
  caps: { fontFamily: 'Geist-Medium', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: '#6B6B6B' },
  body: { fontFamily: 'Geist', fontSize: 15, lineHeight: 21, color: '#111111' },
  bodySoft: { fontFamily: 'Geist', fontSize: 14, lineHeight: 20, color: '#6B6B6B' },
  label: { fontFamily: 'Geist-Medium', fontSize: 15, color: '#111111' },
  amount: { fontFamily: 'GeistMono-Medium', fontSize: 15, color: '#111111' },
};

export const radius = { sm: 8, md: 14, full: 999 };

// Legacy single-arg formatters. The whole app should migrate to
// `useMoney()` from src/hooks/useMoney so amounts render in the user's
// chosen currency; these stay so old imports do not crash, defaulting
// to USD so an un-migrated screen looks obviously wrong rather than
// silently in the wrong currency.
export { money, moneyShort } from './support/currency';

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

export function currentMonthKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function shiftMonth(key, delta) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key) {
  if (!key) return '';
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

export function monthLabelShort(key) {
  if (!key) return '';
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${y}`;
}

function hashHue(str) {
  let h = 0;
  for (let i = 0; i < (str || '').length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) % 360;
  }
  return h;
}

// Category hues borrowed from the Kharcha design spec.
const CAT_META = {
  groceries: { hue: 32, short: 'Gr' },
  'vegetables & fruit': { hue: 95, short: 'Vf' },
  vegetables: { hue: 95, short: 'Vf' },
  meat: { hue: 8, short: 'Mt' },
  dairy: { hue: 55, short: 'Da' },
  snacks: { hue: 22, short: 'Sn' },
  household: { hue: 220, short: 'Hh' },
  'personal care': { hue: 320, short: 'Pc' },
  medicine: { hue: 358, short: 'Rx' },
  fuel: { hue: 250, short: 'Fu' },
  utilities: { hue: 195, short: 'Ut' },
  other: { hue: 40, short: 'Ot' },
};

/** Pastel chip colours + a two-letter code for a category name. */
export function categoryStyle(name) {
  const key = (name || '').toLowerCase().trim();
  const meta = CAT_META[key];
  const hue = meta ? meta.hue : hashHue(key);
  let short = meta ? meta.short : (name || '?').replace(/[^a-zA-Z]/g, '').slice(0, 2);
  short = (short.charAt(0).toUpperCase() + (short.charAt(1) || '').toLowerCase()) || '?';
  return {
    hue,
    short,
    bg: `hsl(${hue}, 44%, 82%)`,
    ink: `hsl(${hue}, 40%, 30%)`,
  };
}
