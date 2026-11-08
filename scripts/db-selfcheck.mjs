// Self-check for src/db: runs the real schema + repo against Node's built-in
// SQLite (no encryption here — SQLCipher only exists in the native build).
//   node scripts/db-selfcheck.mjs
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { migrate } from '../src/db/schema.js';
import { createRepo } from '../src/db/repo.js';
import { buildFuel } from '../src/db/fuel.js';
import { monthRange, toIso } from '../src/db/month.js';
import {
  decryptBackup, encryptBackup, fromBase64, readBackupFile, toBase64, utf8Decode, utf8Encode,
} from '../src/backup/format.js';
import { snapshotToCsv } from '../src/backup/csv.js';

// Minimal expo-sqlite-shaped adapter.
function adapter() {
  const raw = new DatabaseSync(':memory:');
  raw.exec('PRAGMA foreign_keys = ON');
  return {
    execAsync: async (sql) => raw.exec(sql),
    runAsync: async (sql, params = []) => {
      const r = raw.prepare(sql).run(...params);
      return { lastInsertRowId: Number(r.lastInsertRowid), changes: r.changes };
    },
    getAllAsync: async (sql, params = []) => raw.prepare(sql).all(...params).map((o) => ({ ...o })),
    getFirstAsync: async (sql, params = []) => {
      const o = raw.prepare(sql).get(...params);
      return o ? { ...o } : null;
    },
    withTransactionAsync: async (fn) => {
      raw.exec('BEGIN');
      try { await fn(); raw.exec('COMMIT'); } catch (e) { raw.exec('ROLLBACK'); throw e; }
    },
  };
}

const sql = adapter();
await migrate(sql);
await migrate(sql); // idempotent
const db = createRepo(sql, { uuid: randomUUID });

// Seeds
const { data: lists } = await db.lists.all({ month: '2026-11' });
assert.deepEqual(lists.map((l) => l.name), ['Home', 'Car']);
const home = lists[0];
const car = lists[1];
const { data: cats } = await db.categories.all();
assert.equal(cats.length, 11);
const groceries = cats.find((c) => c.name === 'Groceries');

// Create / validate
const me = (await db.lists.create({ name: ' Me ', type: 'person', monthly_budget: 30000 })).data;
assert.equal(me.name, 'Me');
await assert.rejects(db.entries.create({ spending_list_id: home.id, item_name: '', amount: 5 }), /Item name/);
await assert.rejects(db.entries.create({ spending_list_id: home.id, item_name: 'x', amount: -1 }), /Amount/);
await assert.rejects(db.entries.create({ spending_list_id: home.id, item_name: 'x', amount: 1, purchased_at: 'nope' }), /Invalid date/);
await assert.rejects(db.entries.create({ spending_list_id: 999, item_name: 'x', amount: 1 }), /FOREIGN KEY/);

const e1 = (await db.entries.create({
  spending_list_id: home.id, category_id: groceries.id, item_name: 'Rice', amount: '2150.456',
  purchased_at: '2026-11-08 10:00:00',
})).data;
assert.equal(e1.amount, 2150.46);
assert.equal(e1.category.name, 'Groceries');
assert.equal(e1.spending_list.name, 'Home');
assert.equal(e1.quantity, 1);
assert.equal(e1.source, 'manual');

// Split
const split = await db.entries.create({
  spending_list_ids: [home.id, String(me.id)], item_name: 'Dinner', amount: 1001, purchased_at: '2026-11-05 20:00:00',
});
assert.equal(split.data.length, 2);
assert.equal(split.split_share, 500.5);
assert.ok(split.data.every((e) => e.split_group_id === split.split_group_id));
await assert.rejects(db.entries.create({ spending_list_ids: [home.id, home.id], item_name: 'x', amount: 1 }), /different lists/);

// Out-of-month entry must not count
await db.entries.create({ spending_list_id: home.id, item_name: 'Oct thing', amount: 999, purchased_at: '2026-10-31 23:59:00' });

// List + summary
const nov = await db.entries.list({ month: '2026-11' });
assert.equal(nov.data.length, 3);
assert.equal(nov.total, 2150.46 + 1001);
assert.equal(nov.data[0].item_name, 'Rice'); // newest first
const searched = await db.entries.list({ search: '100%_' });
assert.equal(searched.data.length, 0); // wildcards escaped

const s = await db.summary({ month: '2026-11' });
assert.equal(s.grand_total, 3151.46);
assert.equal(s.to, '2026-11-30');
const meRow = s.lists.find((l) => l.id === me.id);
assert.equal(meRow.total, 500.5);
assert.equal(meRow.budget_remaining, 29499.5);
assert.equal(s.by_category[0].category_name, 'Groceries');
assert.equal(s.by_category.find((c) => c.category_id === null).category_name, 'Uncategorised');

// Update (partial) + whitelisting
const upd = (await db.entries.update(e1.id, { amount: 2000, id: 777, account_id: 3 })).data;
assert.equal(upd.amount, 2000);
assert.equal(upd.id, e1.id);
assert.equal(upd.item_name, 'Rice');

// Delete category → entry kept, uncategorised
await db.categories.remove(groceries.id);
assert.equal((await db.entries.get(e1.id)).data.category, null);

// Delete list → its entries cascade
await db.lists.remove(me.id);
assert.equal((await db.entries.list({ month: '2026-11' })).data.length, 2);

// Fuel
await db.entries.create({ spending_list_id: car.id, item_name: 'Fuel', amount: 8240, fuel_liters: 28.4, odometer: 47318, fuel_type: 'E95', is_full_tank: true, purchased_at: '2026-10-09 09:00:00' });
await db.entries.create({ spending_list_id: car.id, item_name: 'Fuel', amount: 8400, fuel_liters: 30, odometer: 47735, purchased_at: '2026-10-24 09:00:00' });
await db.entries.create({ spending_list_id: car.id, item_name: 'Fuel', amount: 9100, fuel_liters: 32.5, odometer: 48210, purchased_at: '2026-11-07 09:00:00' });
const f = await db.fuel(new Date(2026, 10, 15));
assert.equal(f.records.length, 3);
assert.equal(f.records[0].km_since_last, 475);
assert.equal(f.records[0].km_per_liter, 14.62);
assert.equal(f.records[2].km_per_liter, null); // first fill has nothing to chain from
assert.equal(f.records[2].is_full_tank, true);
assert.equal(f.stats.month_spent, 9100);
assert.equal(f.stats.avg_km_per_liter, Math.round(((475 / 32.5) + (417 / 30)) / 2 * 100) / 100);
assert.deepEqual(buildFuel([]).records, []);

// Settings
await db.settings.set('currency', 'PKR');
assert.equal(await db.settings.get('currency'), 'PKR');
assert.equal(await db.settings.get('missing', 'x'), 'x');

// Month helpers
const [from, to] = monthRange('2026-12');
assert.ok(from < to && new Date(to).getMonth() === 0);
assert.throws(() => toIso('garbage'));

// ---- Backup: codecs ----
const sample = 'Rs ₨ — نان 🍞 "quotes"\n';
assert.equal(utf8Decode(utf8Encode(sample)), sample);
assert.deepEqual(Buffer.from(utf8Encode(sample)), Buffer.from(sample, 'utf8'));
for (const n of [0, 1, 2, 3, 31, 1000]) {
  const b = randomBytes(n);
  assert.equal(toBase64(b), Buffer.from(b).toString('base64'));
  assert.deepEqual(Buffer.from(fromBase64(toBase64(b))), Buffer.from(b));
}
assert.throws(() => fromBase64('abc'), /damaged/);

// ---- Backup: export → encrypt → decrypt → restore round trip ----
const snap = await db.exportAll();
assert.equal(snap.app, 'kharcha');
assert.equal(snap.currency, 'PKR');
const file = await encryptBackup(snap, 'correct horse', (n) => new Uint8Array(randomBytes(n)));
assert.ok(!file.includes('Rice')); // nothing readable in the file
const parsed = readBackupFile(file);
assert.equal(parsed.encrypted, true);
await assert.rejects(decryptBackup(parsed.envelope, 'wrong password'), /Wrong password/);
const tampered = JSON.parse(file);
tampered.kdf.salt = toBase64(randomBytes(16));
await assert.rejects(decryptBackup(tampered, 'correct horse'), /Wrong password/);
const hostile = { ...JSON.parse(file), kdf: { ...JSON.parse(file).kdf, N: 2 ** 24 } };
await assert.rejects(decryptBackup(hostile, 'correct horse'), /can’t open/);
await assert.rejects(encryptBackup(snap, 'short', randomBytes), /at least 8/);
assert.deepEqual(await decryptBackup(parsed.envelope, 'correct horse'), snap);
assert.throws(() => readBackupFile('not json'), /isn’t a Kharcha backup/);
assert.throws(() => readBackupFile('{"hello":1}'), /isn’t a Kharcha backup/);

// Restore into a fresh database
const sql2 = adapter();
await migrate(sql2);
const db2 = createRepo(sql2, { uuid: randomUUID });
const counts = await db2.replaceAll(await decryptBackup(parsed.envelope, 'correct horse'));
assert.equal(counts.entries, snap.entries.length);
assert.deepEqual(await db2.summary({ month: '2026-11' }), await db.summary({ month: '2026-11' }));
assert.deepEqual((await db2.fuel(new Date(2026, 10, 15))).stats, (await db.fuel(new Date(2026, 10, 15))).stats);
assert.equal(await db2.settings.get('currency'), 'PKR');

// Validation rejects bad files and leaves existing data untouched
const before = await db2.exportAll();
const bad = structuredClone(snap);
bad.entries[0].spending_list_id = 424242;
await assert.rejects(db2.replaceAll(bad), /missing list/);
const bad2 = structuredClone(snap);
bad2.entries[0].amount = 'lots';
await assert.rejects(db2.replaceAll(bad2), /not a valid number/);
await assert.rejects(db2.replaceAll({ app: 'kharcha', schema: 99 }), /unsupported version/);
const after = await db2.exportAll();
assert.deepEqual({ ...after, exported_at: 0 }, { ...before, exported_at: 0 });

// Plain snapshot (server export path) is accepted, unknown category → null
const plain = readBackupFile(JSON.stringify({ ...snap, categories: [] }));
assert.equal(plain.encrypted, false);
await db2.replaceAll(plain.snapshot);
assert.ok((await db2.entries.list({})).data.every((e) => e.category_id === null));

// ---- CSV ----
const csv = snapshotToCsv({
  lists: [{ id: 1, name: 'Home' }],
  categories: [],
  entries: [
    { spending_list_id: 1, item_name: '=HYPERLINK("x")', amount: 5, purchased_at: '2026-11-02T00:00:00.000Z' },
    { spending_list_id: 1, item_name: 'Eggs, "large"', amount: -0, notes: 'a\nb', purchased_at: '2026-11-01T00:00:00.000Z' },
  ],
});
const lines = csv.split('\r\n');
assert.match(lines[0], /^date,list,category,item,amount/);
assert.ok(lines[1].includes('"Eggs, ""large"""')); // oldest first, quotes escaped
assert.ok(csv.includes(`"'=HYPERLINK(""x"")"`)); // formula neutralised

console.log('db self-check: all assertions passed');
