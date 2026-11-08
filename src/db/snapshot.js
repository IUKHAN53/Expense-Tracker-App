// Snapshot = the whole ledger as plain JSON (what goes inside a backup file).
// Import files are untrusted: validateSnapshot() checks every field and
// returns a clean copy, or throws before anything touches the database.

export const SNAPSHOT_SCHEMA = 1;

const LIMITS = { lists: 200, categories: 500, entries: 200000 };
const LIST_TYPES = ['person', 'household', 'vehicle'];
const SOURCES = ['manual', 'scan', 'import'];

class BadBackup extends Error {
  constructor(detail) {
    super(`This backup file is damaged or not from Kharcha (${detail}).`);
  }
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

function str(v, where, { max = 255, optional = false } = {}) {
  if (v == null || v === '') {
    if (optional) return null;
    throw new BadBackup(`${where} is missing`);
  }
  if (typeof v !== 'string') throw new BadBackup(`${where} is not text`);
  return v.slice(0, max);
}

function num(v, where, { optional = false, min = -Infinity, int = false } = {}) {
  if (v == null || v === '') {
    if (optional) return null;
    throw new BadBackup(`${where} is missing`);
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || (int && !Number.isInteger(n))) {
    throw new BadBackup(`${where} is not a valid number`);
  }
  return n;
}

function date(v, where) {
  const d = new Date(str(v, where, { max: 40 }));
  if (Number.isNaN(d.getTime())) throw new BadBackup(`${where} is not a date`);
  return d.toISOString();
}

function arr(v, where, limit) {
  if (!Array.isArray(v)) throw new BadBackup(`${where} is not a list`);
  if (v.length > limit) throw new BadBackup(`too many ${where}`);
  return v;
}

/** @returns a normalised snapshot safe to insert. */
export function validateSnapshot(s) {
  if (!isObj(s) || s.app !== 'kharcha') throw new BadBackup('not a Kharcha snapshot');
  if (s.schema !== SNAPSHOT_SCHEMA) throw new BadBackup(`unsupported version ${s.schema}`);

  const listIds = new Set();
  const lists = arr(s.lists, 'lists', LIMITS.lists).map((l, i) => {
    const w = `list #${i + 1}`;
    if (!isObj(l)) throw new BadBackup(w);
    const id = num(l.id, `${w} id`, { int: true });
    if (listIds.has(id)) throw new BadBackup(`${w} id is duplicated`);
    listIds.add(id);
    if (!LIST_TYPES.includes(l.type)) throw new BadBackup(`${w} type`);
    return {
      id,
      name: str(l.name, `${w} name`, { max: 100 }),
      type: l.type,
      color: str(l.color, `${w} color`, { max: 20, optional: true }),
      icon: str(l.icon, `${w} icon`, { max: 100, optional: true }),
      monthly_budget: num(l.monthly_budget, `${w} budget`, { optional: true, min: 0 }),
      sort_order: num(l.sort_order ?? 0, `${w} order`, { int: true }),
      is_active: l.is_active === false || l.is_active === 0 ? 0 : 1,
    };
  });

  const catIds = new Set();
  const categories = arr(s.categories, 'categories', LIMITS.categories).map((c, i) => {
    const w = `category #${i + 1}`;
    if (!isObj(c)) throw new BadBackup(w);
    const id = num(c.id, `${w} id`, { int: true });
    if (catIds.has(id)) throw new BadBackup(`${w} id is duplicated`);
    catIds.add(id);
    return {
      id,
      name: str(c.name, `${w} name`, { max: 100 }),
      icon: str(c.icon, `${w} icon`, { max: 100, optional: true }),
      color: str(c.color, `${w} color`, { max: 20, optional: true }),
    };
  });

  const entries = arr(s.entries, 'entries', LIMITS.entries).map((e, i) => {
    const w = `entry #${i + 1}`;
    if (!isObj(e)) throw new BadBackup(w);
    const listId = num(e.spending_list_id, `${w} list`, { int: true });
    if (!listIds.has(listId)) throw new BadBackup(`${w} points to a missing list`);
    const catId = num(e.category_id, `${w} category`, { optional: true, int: true });
    return {
      spending_list_id: listId,
      // A category deleted before export just leaves the entry uncategorised.
      category_id: catId != null && catIds.has(catId) ? catId : null,
      item_name: str(e.item_name, `${w} name`),
      amount: Math.round(num(e.amount, `${w} amount`, { min: 0 }) * 100) / 100,
      original_amount: num(e.original_amount, `${w} original amount`, { optional: true, min: 0 }),
      original_currency: str(e.original_currency, `${w} currency`, { max: 3, optional: true }),
      fx_rate: num(e.fx_rate, `${w} fx rate`, { optional: true, min: 0 }),
      quantity: num(e.quantity ?? 1, `${w} quantity`, { min: 0 }),
      unit: str(e.unit, `${w} unit`, { max: 50, optional: true }),
      purchased_at: date(e.purchased_at, `${w} date`),
      source: SOURCES.includes(e.source) ? e.source : 'import',
      notes: str(e.notes, `${w} notes`, { max: 2000, optional: true }),
      fuel_liters: num(e.fuel_liters, `${w} litres`, { optional: true, min: 0 }),
      fuel_rate: num(e.fuel_rate, `${w} fuel rate`, { optional: true, min: 0 }),
      odometer: num(e.odometer, `${w} odometer`, { optional: true, min: 0, int: true }),
      fuel_type: str(e.fuel_type, `${w} fuel type`, { max: 16, optional: true }),
      is_full_tank: e.is_full_tank == null ? null : (e.is_full_tank ? 1 : 0),
      split_group_id: str(e.split_group_id, `${w} split group`, { max: 64, optional: true }),
    };
  });

  const currency = typeof s.currency === 'string' && /^[A-Z]{3}$/.test(s.currency) ? s.currency : null;
  return { currency, lists, categories, entries };
}
