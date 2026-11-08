// Local database schema. Mirrors the backend's spending_lists / categories /
// entries tables minus accounts, users and receipts (no server any more).
// Add a migration by appending to MIGRATIONS — never edit a shipped one.

export const DEFAULT_LISTS = [
  { name: 'Home', type: 'household', color: '#0ea5e9', icon: 'home' },
  { name: 'Car', type: 'vehicle', color: '#ef4444', icon: 'car' },
];

export const DEFAULT_CATEGORIES = [
  ['Groceries', '#22c55e'],
  ['Vegetables & Fruit', '#84cc16'],
  ['Meat', '#dc2626'],
  ['Dairy', '#fbbf24'],
  ['Snacks', '#f97316'],
  ['Household', '#0ea5e9'],
  ['Personal Care', '#a855f7'],
  ['Medicine', '#14b8a6'],
  ['Fuel', '#ef4444'],
  ['Utilities', '#6366f1'],
  ['Other', '#64748b'],
];

const MIGRATIONS = [
  // 1 — initial schema
  `
  CREATE TABLE spending_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('person','household','vehicle')),
    color TEXT,
    icon TEXT,
    monthly_budget REAL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE TABLE entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    spending_list_id INTEGER NOT NULL REFERENCES spending_lists(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    amount REAL NOT NULL CHECK (amount >= 0),
    original_amount REAL,
    original_currency TEXT,
    fx_rate REAL,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT,
    purchased_at TEXT NOT NULL,
    source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','scan','import')),
    notes TEXT,
    fuel_liters REAL,
    fuel_rate REAL,
    odometer INTEGER,
    fuel_type TEXT,
    is_full_tank INTEGER,
    split_group_id TEXT,
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX entries_purchased_at ON entries(purchased_at);
  CREATE INDEX entries_list_date ON entries(spending_list_id, purchased_at);
  CREATE INDEX entries_category ON entries(category_id);
  CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
  `,
];

/** Bring the database up to the latest schema; seeds defaults on first run. */
export async function migrate(db) {
  const row = await db.getFirstAsync('PRAGMA user_version');
  const current = row?.user_version ?? 0;
  if (current >= MIGRATIONS.length) return;

  await db.withTransactionAsync(async () => {
    for (let v = current; v < MIGRATIONS.length; v += 1) {
      await db.execAsync(MIGRATIONS[v]);
    }
    if (current === 0) {
      for (const [i, l] of DEFAULT_LISTS.entries()) {
        await db.runAsync(
          'INSERT INTO spending_lists (name, type, color, icon, sort_order) VALUES (?, ?, ?, ?, ?)',
          [l.name, l.type, l.color, l.icon, i],
        );
      }
      for (const [name, color] of DEFAULT_CATEGORIES) {
        await db.runAsync('INSERT INTO categories (name, color) VALUES (?, ?)', [name, color]);
      }
    }
    // Integer literal from our own array length — safe to interpolate.
    await db.execAsync(`PRAGMA user_version = ${MIGRATIONS.length}`);
  });
}
