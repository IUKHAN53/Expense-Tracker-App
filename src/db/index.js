// Opens the encrypted on-device database (SQLCipher) and hands out the repo.
//   const db = await getDb();
//   const { data } = await db.entries.list({ month: '2026-11' });
//
// The 256-bit key is generated once and kept in the Android Keystore via
// SecureStore; it never leaves the device and is excluded from backups
// (android.allowBackup = false), so export files are the only backup path.

import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { migrate } from './schema';
import { createRepo } from './repo';

const DB_NAME = 'kharcha.db';
const KEY_NAME = 'kharcha_db_key_v1';

async function databaseKey() {
  let hex = await SecureStore.getItemAsync(KEY_NAME);
  if (!hex) {
    hex = Array.from(Crypto.getRandomBytes(32), (b) => b.toString(16).padStart(2, '0')).join('');
    await SecureStore.setItemAsync(KEY_NAME, hex, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  }
  // execAsync does no escaping — refuse anything that isn't exactly our hex key.
  if (!/^[0-9a-f]{64}$/.test(hex)) throw new Error('Database key is corrupted.');
  return hex;
}

async function open() {
  const hex = await databaseKey();
  const db = await SQLite.openDatabaseAsync(DB_NAME);
  // Raw key (x'…') skips SQLCipher's KDF; must be the first statement.
  await db.execAsync(`PRAGMA key = "x'${hex}'"`);
  // A wrong key only surfaces on first read — fail loudly, never recreate the file.
  await db.getFirstAsync('SELECT count(*) AS n FROM sqlite_master');
  await db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
  await migrate(db);
  return createRepo(db, { uuid: Crypto.randomUUID });
}

let ready = null;

/** The app-wide repo. Retries on the next call if opening failed. */
export function getDb() {
  if (!ready) ready = open().catch((e) => { ready = null; throw e; });
  return ready;
}
