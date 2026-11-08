// Device side of backups: writes/reads files and opens the share sheet.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Crypto from 'expo-crypto';
import { getDb } from '../db';
import { validateSnapshot } from '../db/snapshot';
import { decryptBackup, encryptBackup, readBackupFile } from './format';
import { snapshotToCsv } from './csv';

const today = () => new Date().toISOString().slice(0, 10);

/** Write to the app-private cache dir (replacing any older copy) and share it. */
async function shareText(name, text, mimeType, dialogTitle) {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create();
  file.write(text);
  // shortcut: the file stays in the private cache until the next export or the OS
  // clears it — deleting right away can break apps still reading it from the share sheet.
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}

export async function shareBackup(password) {
  const db = await getDb();
  const text = await encryptBackup(await db.exportAll(), password, Crypto.getRandomBytes);
  await shareText(`kharcha-backup-${today()}.kharcha`, text, 'application/octet-stream', 'Save your Kharcha backup');
  await db.settings.set('last_backup_at', new Date().toISOString());
}

export async function shareCsv() {
  const db = await getDb();
  await shareText(`kharcha-${today()}.csv`, snapshotToCsv(await db.exportAll()), 'text/csv', 'Export expenses');
}

/** Let the user pick a file. Resolves null if they cancel. */
export async function pickBackupFile() {
  const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
  if (res.canceled || !res.assets?.length) return null;
  const file = new File(res.assets[0].uri);
  try {
    return readBackupFile(await file.text());
  } finally {
    try { file.delete(); } catch { /* cache copy; the OS will clean it */ }
  }
}

/** Decrypt (if needed) and validate; returns the snapshot plus counts for the confirm step. */
export async function openBackup(parsed, password) {
  const snapshot = parsed.encrypted ? await decryptBackup(parsed.envelope, password) : parsed.snapshot;
  const clean = validateSnapshot(snapshot);
  return { snapshot, lists: clean.lists.length, entries: clean.entries.length };
}

export async function restoreSnapshot(snapshot) {
  return (await getDb()).replaceAll(snapshot);
}
