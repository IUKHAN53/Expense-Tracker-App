// Local replacement for the REST API. Every method resolves to the same JSON
// body the old endpoint returned, so a screen swaps
//   (await api.get('/entries', { params })).data   →   await db.entries.list(params)
// Table/column names are only ever taken from the whitelists below; values
// always go through bound parameters.

import { monthKey, monthRange, toIso } from './month.js';
import { buildFuel } from './fuel.js';
import { SNAPSHOT_SCHEMA, validateSnapshot } from './snapshot.js';

const r2 = (n) => Math.round(n * 100) / 100;
const NOW_SQL = "strftime('%Y-%m-%dT%H:%M:%fZ','now')";

const LIST_COLS = ['name', 'type', 'color', 'icon', 'monthly_budget', 'sort_order', 'is_active'];
const CAT_COLS = ['name', 'icon', 'color'];
const ENTRY_COLS = [
  'spending_list_id', 'category_id', 'item_name', 'amount', 'original_amount', 'original_currency',
  'fx_rate', 'quantity', 'unit', 'purchased_at', 'source', 'notes', 'fuel_liters', 'fuel_rate',
  'odometer', 'fuel_type', 'is_full_tank',
];

/** Keep whitelisted keys only; booleans → 0/1 (SQLite has no bool). */
function pick(data, cols) {
  const out = {};
  for (const c of cols) {
    if (data?.[c] === undefined) continue;
    out[c] = typeof data[c] === 'boolean' ? Number(data[c]) : data[c];
  }
  return out;
}

function checkEntry(row, partial) {
  if (!partial || 'item_name' in row) {
    const name = String(row.item_name ?? '').trim();
    if (!name) throw new Error('Item name is required.');
    row.item_name = name.slice(0, 255);
  }
  if (!partial || 'amount' in row) {
    const a = Number(row.amount);
    if (!Number.isFinite(a) || a < 0) throw new Error('Amount must be zero or more.');
    row.amount = r2(a);
  }
  if (!partial || 'purchased_at' in row) row.purchased_at = toIso(row.purchased_at);
}

function checkName(row, partial) {
  if (!partial || 'name' in row) {
    const name = String(row.name ?? '').trim();
    if (!name) throw new Error('Name is required.');
    row.name = name.slice(0, 100);
  }
}

const ENTRY_SELECT = `
  SELECT e.*, l.name AS l_name, l.type AS l_type, l.color AS l_color,
         c.name AS c_name, c.color AS c_color
  FROM entries e
  JOIN spending_lists l ON l.id = e.spending_list_id
  LEFT JOIN categories c ON c.id = e.category_id`;

function presentEntry(e) {
  return {
    id: e.id,
    spending_list_id: e.spending_list_id,
    spending_list: { id: e.spending_list_id, name: e.l_name, type: e.l_type, color: e.l_color },
    category_id: e.category_id,
    category: e.category_id ? { id: e.category_id, name: e.c_name, color: e.c_color } : null,
    item_name: e.item_name,
    amount: e.amount,
    original_amount: e.original_amount,
    original_currency: e.original_currency,
    fx_rate: e.fx_rate,
    quantity: e.quantity,
    unit: e.unit,
    purchased_at: e.purchased_at,
    source: e.source,
    notes: e.notes,
    fuel_liters: e.fuel_liters,
    fuel_rate: e.fuel_rate,
    odometer: e.odometer,
    fuel_type: e.fuel_type,
    is_full_tank: e.is_full_tank == null ? null : !!e.is_full_tank,
    split_group_id: e.split_group_id,
  };
}

function presentList(l) {
  const total = r2(l.month_total ?? 0);
  return {
    id: l.id,
    name: l.name,
    type: l.type,
    color: l.color,
    icon: l.icon,
    monthly_budget: l.monthly_budget,
    sort_order: l.sort_order,
    is_active: !!l.is_active,
    month_total: total,
    month_entries_count: l.month_entries_count ?? 0,
    budget_remaining: l.monthly_budget != null ? r2(l.monthly_budget - total) : null,
  };
}

/**
 * @param db  an expo-sqlite SQLiteDatabase (or anything with the same async API)
 * @param opts.uuid  () => string, used to link split entries
 */
export function createRepo(db, { uuid }) {
  async function insert(table, row) {
    const cols = Object.keys(row);
    const res = await db.runAsync(
      `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => row[c] ?? null),
    );
    return res.lastInsertRowId;
  }

  async function patch(table, id, row) {
    const cols = Object.keys(row);
    if (!cols.length) return;
    await db.runAsync(
      `UPDATE ${table} SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = ${NOW_SQL} WHERE id = ?`,
      [...cols.map((c) => row[c] ?? null), id],
    );
  }

  async function mustExist(table, id, label) {
    const row = await db.getFirstAsync(`SELECT id FROM ${table} WHERE id = ?`, [id]);
    if (!row) throw new Error(`${label} not found.`);
  }

  const getEntry = async (id) => {
    const row = await db.getFirstAsync(`${ENTRY_SELECT} WHERE e.id = ?`, [id]);
    if (!row) throw new Error('Entry not found.');
    return presentEntry(row);
  };

  const getList = async (id, month) => {
    const [from, to] = monthRange(month);
    const row = await db.getFirstAsync(
      `SELECT l.*,
         (SELECT SUM(amount) FROM entries WHERE spending_list_id = l.id AND purchased_at >= ? AND purchased_at < ?) AS month_total,
         (SELECT COUNT(*) FROM entries WHERE spending_list_id = l.id AND purchased_at >= ? AND purchased_at < ?) AS month_entries_count
       FROM spending_lists l WHERE l.id = ?`,
      [from, to, from, to, id],
    );
    if (!row) throw new Error('List not found.');
    return presentList(row);
  };

  const lists = {
    async all({ month } = {}) {
      const [from, to] = monthRange(month);
      const rows = await db.getAllAsync(
        `SELECT l.*, SUM(e.amount) AS month_total, COUNT(e.id) AS month_entries_count
         FROM spending_lists l
         LEFT JOIN entries e ON e.spending_list_id = l.id AND e.purchased_at >= ? AND e.purchased_at < ?
         GROUP BY l.id ORDER BY l.sort_order, l.id`,
        [from, to],
      );
      return { data: rows.map(presentList), month: month || monthKey() };
    },
    async create(data) {
      const row = pick(data, LIST_COLS);
      checkName(row, false);
      const id = await insert('spending_lists', row);
      return { data: await getList(id) };
    },
    async update(id, data) {
      await mustExist('spending_lists', id, 'List');
      const row = pick(data, LIST_COLS);
      checkName(row, true);
      await patch('spending_lists', id, row);
      return { data: await getList(id) };
    },
    async remove(id) {
      await db.runAsync('DELETE FROM spending_lists WHERE id = ?', [id]); // entries cascade
      return { message: 'List deleted.' };
    },
  };

  const categories = {
    async all() {
      const data = await db.getAllAsync(
        'SELECT id, name, icon, color FROM categories ORDER BY name COLLATE NOCASE',
      );
      return { data };
    },
    async create(data) {
      const row = pick(data, CAT_COLS);
      checkName(row, false);
      const id = await insert('categories', row);
      return { data: await db.getFirstAsync('SELECT id, name, icon, color FROM categories WHERE id = ?', [id]) };
    },
    async update(id, data) {
      await mustExist('categories', id, 'Category');
      const row = pick(data, CAT_COLS);
      checkName(row, true);
      await patch('categories', id, row);
      return { data: await db.getFirstAsync('SELECT id, name, icon, color FROM categories WHERE id = ?', [id]) };
    },
    async remove(id) {
      await db.runAsync('DELETE FROM categories WHERE id = ?', [id]); // entries keep, category → null
      return { message: 'Category deleted.' };
    },
  };

  const entries = {
    async list(f = {}) {
      const where = [];
      const args = [];
      if (f.spending_list_id) { where.push('e.spending_list_id = ?'); args.push(f.spending_list_id); }
      if (f.category_id) { where.push('e.category_id = ?'); args.push(f.category_id); }
      if (f.source) { where.push('e.source = ?'); args.push(f.source); }
      if (f.search) {
        where.push("e.item_name LIKE ? ESCAPE '\\'");
        args.push(`%${String(f.search).replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
      }
      if (f.month) {
        const [from, to] = monthRange(f.month);
        where.push('e.purchased_at >= ? AND e.purchased_at < ?');
        args.push(from, to);
      } else {
        if (f.from) { where.push('e.purchased_at >= ?'); args.push(toIso(f.from)); }
        if (f.to) { where.push('e.purchased_at <= ?'); args.push(toIso(f.to)); }
      }
      const limit = Math.min(Math.max(parseInt(f.limit, 10) || 500, 1), 1000);
      const rows = await db.getAllAsync(
        `${ENTRY_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
         ORDER BY e.purchased_at DESC, e.id DESC LIMIT ${limit}`,
        args,
      );
      const data = rows.map(presentEntry);
      return { data, total: r2(data.reduce((s, e) => s + e.amount, 0)) };
    },

    async get(id) {
      return { data: await getEntry(id) };
    },

    /** Single list id, or `spending_list_ids` to split the amount equally. */
    async create(input) {
      const listIds = (input.spending_list_ids ?? [input.spending_list_id]).map(Number);
      if (!listIds.length || listIds.length > 10 || listIds.some((v) => !Number.isInteger(v))
        || new Set(listIds).size !== listIds.length) {
        throw new Error('Pick between 1 and 10 different lists.');
      }
      const row = pick(input, ENTRY_COLS);
      delete row.spending_list_id;
      checkEntry(row, false);
      row.quantity = row.quantity ?? 1;
      row.source = row.source ?? 'manual';

      if (listIds.length === 1) {
        const id = await insert('entries', { ...row, spending_list_id: listIds[0] });
        return { data: await getEntry(id) };
      }

      // shortcut: equal shares rounded to 2dp, like the old backend — the sum can be off by a paisa.
      const share = r2(row.amount / listIds.length);
      const groupId = uuid();
      const ids = [];
      await db.withTransactionAsync(async () => {
        for (const listId of listIds) {
          ids.push(await insert('entries', {
            ...row, spending_list_id: listId, amount: share, split_group_id: groupId,
          }));
        }
      });
      return {
        data: await Promise.all(ids.map(getEntry)),
        split_group_id: groupId,
        split_share: share,
      };
    },

    async update(id, input) {
      await mustExist('entries', id, 'Entry');
      const row = pick(input, ENTRY_COLS);
      checkEntry(row, true);
      await patch('entries', id, row);
      return { data: await getEntry(id) };
    },

    async remove(id) {
      await db.runAsync('DELETE FROM entries WHERE id = ?', [id]);
      return { message: 'Entry deleted.' };
    },
  };

  async function summary({ month } = {}) {
    const key = /^\d{4}-\d{2}$/.test(month || '') ? month : monthKey();
    const [from, to] = monthRange(key);
    const { data: listRows } = await lists.all({ month: key });
    const byCategory = await db.getAllAsync(
      `SELECT e.category_id, COALESCE(c.name, CASE WHEN e.category_id IS NULL THEN 'Uncategorised' ELSE 'Unknown' END) AS category_name,
              SUM(e.amount) AS total, COUNT(*) AS count
       FROM entries e LEFT JOIN categories c ON c.id = e.category_id
       WHERE e.purchased_at >= ? AND e.purchased_at < ?
       GROUP BY e.category_id ORDER BY total DESC`,
      [from, to],
    );
    const [y, m] = key.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    return {
      month: key,
      from: `${key}-01`,
      to: `${key}-${String(lastDay).padStart(2, '0')}`,
      grand_total: r2(listRows.reduce((s, l) => s + l.month_total, 0)),
      lists: listRows.map(({ id, name, type, color, monthly_budget, month_total, budget_remaining }) => ({
        id, name, type, color, monthly_budget, total: month_total, budget_remaining,
      })),
      by_category: byCategory.map((c) => ({ ...c, total: r2(c.total) })),
    };
  }

  async function fuel(now = new Date()) {
    const car = await db.getFirstAsync(
      "SELECT id FROM spending_lists WHERE type = 'vehicle' ORDER BY sort_order, id LIMIT 1",
    );
    if (!car) return buildFuel([], now);
    const rows = await db.getAllAsync(
      `SELECT * FROM entries WHERE spending_list_id = ? AND fuel_liters > 0
       ORDER BY purchased_at, id`,
      [car.id],
    );
    return buildFuel(rows, now);
  }

  const settings = {
    async get(key, fallback = null) {
      const row = await db.getFirstAsync('SELECT value FROM settings WHERE key = ?', [key]);
      return row ? JSON.parse(row.value) : fallback;
    },
    async set(key, value) {
      await db.runAsync(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        [key, JSON.stringify(value)],
      );
    },
  };

  /** Whole ledger as a plain snapshot (see snapshot.js). */
  async function exportAll() {
    const [listRows, catRows, entryRows] = await Promise.all([
      db.getAllAsync(`SELECT id, ${LIST_COLS.join(', ')} FROM spending_lists ORDER BY id`),
      db.getAllAsync(`SELECT id, ${CAT_COLS.join(', ')} FROM categories ORDER BY id`),
      db.getAllAsync(`SELECT id, ${ENTRY_COLS.join(', ')}, split_group_id FROM entries ORDER BY id`),
    ]);
    return {
      app: 'kharcha',
      schema: SNAPSHOT_SCHEMA,
      exported_at: new Date().toISOString(),
      currency: await settings.get('currency'),
      lists: listRows,
      categories: catRows,
      entries: entryRows,
    };
  }

  /**
   * Replace everything with a backup. Validates first; the wipe + insert is one
   * transaction, so a failure leaves the current data untouched.
   */
  async function replaceAll(raw) {
    const snap = validateSnapshot(raw);
    await db.withTransactionAsync(async () => {
      await db.execAsync('DELETE FROM entries; DELETE FROM spending_lists; DELETE FROM categories;');
      for (const l of snap.lists) await insert('spending_lists', l);
      for (const c of snap.categories) await insert('categories', c);
      for (const e of snap.entries) await insert('entries', e);
      if (snap.currency) await settings.set('currency', snap.currency);
    });
    return {
      lists: snap.lists.length,
      categories: snap.categories.length,
      entries: snap.entries.length,
      currency: snap.currency,
    };
  }

  return { lists, categories, entries, summary, fuel, settings, exportAll, replaceAll };
}
