// Kharcha — warm cream + saffron design system.
// Palette, type, and the per-person / per-category colour logic.

export const colors = {
  bg: '#fdf8ee', // cream — page background
  card: '#fffaf0', // ivory — cards / panels
  soft: '#f5ebd6', // sand — soft fills
  ink: '#2b1f12', // primary text
  inkSoft: '#7a6850', // secondary text
  rule: 'rgba(43, 31, 18, 0.12)', // borders
  ruleSoft: 'rgba(43, 31, 18, 0.06)',
  accent: '#c9621f', // saffron
  accent2: '#5d7a3d', // olive — positive
  alarm: '#b14430', // clay red — negative / over budget
  white: '#ffffff',
  scrim: 'rgba(20, 12, 4, 0.34)',
};

// Font family keys — registered in App.js via useFonts().
export const fonts = {
  serif: 'Newsreader',
  serifMedium: 'Newsreader-Medium',
  serifItalic: 'Newsreader-Italic',
  serifMediumItalic: 'Newsreader-MediumItalic',
  sans: 'Geist',
  sansMedium: 'Geist-Medium',
  sansSemibold: 'Geist-SemiBold',
  mono: 'GeistMono',
  monoMedium: 'GeistMono-Medium',
};

/** Format a number as PKR with Pakistani digit grouping — money(142860) -> "Rs 1,42,860". */
export function money(value) {
  const v = Math.round(Number(value) || 0);
  const neg = v < 0;
  const s = Math.abs(v).toString();
  let last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  if (rest) {
    last3 = `,${last3}`;
    rest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  }
  return `${neg ? '-' : ''}Rs ${rest}${last3}`;
}

/** Compact money — "Rs 4.9k", "Rs 142k". */
export function moneyShort(value) {
  const n = Math.round(Number(value) || 0);
  if (n >= 100000) return `Rs ${Math.round(n / 1000)}k`;
  if (n >= 1000) return `Rs ${(n / 1000).toFixed(1)}k`;
  return `Rs ${n}`;
}

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

/** A warm pastel + matching ink for a person/list avatar, derived from the name. */
export function personColor(name) {
  const hue = hashHue(name || 'x');
  return {
    bg: `hsl(${hue}, 42%, 80%)`,
    ink: `hsl(${hue}, 36%, 30%)`,
  };
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
