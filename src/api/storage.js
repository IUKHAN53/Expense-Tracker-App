import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  token: 'et_token',
  baseUrl: 'et_base_url',
  user: 'et_user',
  smsLastSync: 'et_sms_last_sync',
};

/** Load a persisted session (token + server URL + user). */
export async function loadSession() {
  const [token, baseUrl, user] = await Promise.all([
    AsyncStorage.getItem(KEYS.token),
    AsyncStorage.getItem(KEYS.baseUrl),
    AsyncStorage.getItem(KEYS.user),
  ]);
  return {
    token: token || null,
    baseUrl: baseUrl || '',
    user: user ? JSON.parse(user) : null,
  };
}

export async function saveSession({ token, baseUrl, user }) {
  await Promise.all([
    AsyncStorage.setItem(KEYS.token, token),
    AsyncStorage.setItem(KEYS.baseUrl, baseUrl),
    AsyncStorage.setItem(KEYS.user, JSON.stringify(user)),
  ]);
}

/** Clear the token + user but keep the server URL for the next login. */
export async function clearSession() {
  await AsyncStorage.multiRemove([KEYS.token, KEYS.user]);
}

/** Timestamp (epoch ms) of the last successful SMS import. */
export async function getSmsLastSync() {
  const v = await AsyncStorage.getItem(KEYS.smsLastSync);
  return v ? Number(v) : 0;
}

export async function setSmsLastSync(timestamp) {
  await AsyncStorage.setItem(KEYS.smsLastSync, String(timestamp));
}
