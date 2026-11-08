// .kharcha backup file: a JSON envelope around an AES-256-GCM encrypted
// snapshot. The key comes from the user's password via scrypt; salt, nonce
// and KDF params are bound to the ciphertext as AAD, so editing the header
// makes decryption fail instead of silently weakening it.
// Plain snapshots (app: 'kharcha', no encryption) are also accepted on import,
// for the one-off export from the old server.

import { gcm } from '@noble/ciphers/aes.js';
import { scryptAsync } from '@noble/hashes/scrypt.js';

export const FORMAT = 'kharcha-backup';
export const MIN_PASSWORD = 8;
const KDF = { N: 2 ** 15, r: 8, p: 1, dkLen: 32 };
const MAX_FILE_CHARS = 100 * 1024 * 1024;

// --- tiny codecs (Hermes has no guaranteed TextDecoder / atob) -------------
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function toBase64(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63]
      + (i + 1 < bytes.length ? B64[(n >> 6) & 63] : '=')
      + (i + 2 < bytes.length ? B64[n & 63] : '=');
  }
  return out;
}

export function fromBase64(s) {
  if (typeof s !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(s) || s.length % 4) {
    throw new Error('Backup file is damaged (bad encoding).');
  }
  const pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0;
  const out = new Uint8Array((s.length / 4) * 3 - pad);
  let o = 0;
  for (let i = 0; i < s.length; i += 4) {
    const n = (B64.indexOf(s[i]) << 18) | (B64.indexOf(s[i + 1]) << 12)
      | ((B64.indexOf(s[i + 2]) & 63) << 6) | (B64.indexOf(s[i + 3]) & 63);
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

export function utf8Encode(str) {
  const out = [];
  for (const ch of str) {
    let c = ch.codePointAt(0);
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return Uint8Array.from(out);
}

export function utf8Decode(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length;) {
    const b = bytes[i];
    let c;
    if (b < 0x80) { c = b; i += 1; }
    else if (b < 0xe0) { c = ((b & 31) << 6) | (bytes[i + 1] & 63); i += 2; }
    else if (b < 0xf0) { c = ((b & 15) << 12) | ((bytes[i + 1] & 63) << 6) | (bytes[i + 2] & 63); i += 3; }
    else { c = ((b & 7) << 18) | ((bytes[i + 1] & 63) << 12) | ((bytes[i + 2] & 63) << 6) | (bytes[i + 3] & 63); i += 4; }
    out += String.fromCodePoint(c);
  }
  return out;
}

// --- format ---------------------------------------------------------------
const aad = (kdf, nonce) => utf8Encode(`${FORMAT}:1:${kdf.N}:${kdf.r}:${kdf.p}:${kdf.salt}:${nonce}`);

/**
 * @param randomBytes (n) => Uint8Array from a CSPRNG (expo-crypto on device)
 * @returns file contents (string)
 */
export async function encryptBackup(snapshot, password, randomBytes) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    throw new Error(`Use a password of at least ${MIN_PASSWORD} characters.`);
  }
  const salt = randomBytes(16);
  const nonce = toBase64(randomBytes(12));
  const kdf = { name: 'scrypt', N: KDF.N, r: KDF.r, p: KDF.p, salt: toBase64(salt) };
  const key = await scryptAsync(utf8Encode(password), salt, KDF);
  const ct = gcm(key, fromBase64(nonce), aad(kdf, nonce)).encrypt(utf8Encode(JSON.stringify(snapshot)));
  return JSON.stringify({
    format: FORMAT, v: 1, kdf, cipher: { name: 'aes-256-gcm', nonce }, data: toBase64(ct),
  });
}

/**
 * Parse a picked file. Returns { encrypted: true, envelope } (needs a password)
 * or { encrypted: false, snapshot } for a plain snapshot.
 */
export function readBackupFile(text) {
  if (typeof text !== 'string' || text.length > MAX_FILE_CHARS) {
    throw new Error('That file is too large to be a Kharcha backup.');
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('That file isn’t a Kharcha backup.');
  }
  if (json?.format === FORMAT && json.v === 1) return { encrypted: true, envelope: json };
  if (json?.app === 'kharcha') return { encrypted: false, snapshot: json };
  throw new Error('That file isn’t a Kharcha backup.');
}

export async function decryptBackup(envelope, password) {
  const { kdf, cipher, data } = envelope;
  // Bound the KDF so a crafted file can't make the phone hang or run out of memory.
  if (kdf?.name !== 'scrypt' || cipher?.name !== 'aes-256-gcm'
    || ![2 ** 14, 2 ** 15, 2 ** 16, 2 ** 17].includes(kdf.N) || kdf.r !== 8 || kdf.p !== 1) {
    throw new Error('This backup uses settings this version of Kharcha can’t open.');
  }
  const key = await scryptAsync(utf8Encode(String(password)), fromBase64(kdf.salt), {
    N: kdf.N, r: kdf.r, p: kdf.p, dkLen: 32,
  });
  let pt;
  try {
    pt = gcm(key, fromBase64(cipher.nonce), aad(kdf, cipher.nonce)).decrypt(fromBase64(data));
  } catch {
    throw new Error('Wrong password, or the file has been changed.');
  }
  return JSON.parse(utf8Decode(pt));
}
