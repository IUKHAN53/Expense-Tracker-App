import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  token: 'et_token',
  user: 'et_user',
  smsLastSync: 'et_sms_last_sync',
};

/** Load a persisted session (token + user). */
export async function loadSession() {
  const [token, user] = await Promise.all([
    AsyncStorage.getItem(KEYS.token),
    AsyncStorage.getItem(KEYS.user),
  ]);
  return {
    token: token || null,
    user: user ? JSON.parse(user) : null,
  };
}

export async function saveSession({ token, user }) {
  await Promise.all([
    AsyncStorage.setItem(KEYS.token, token),
    AsyncStorage.setItem(KEYS.user, JSON.stringify(user)),
  ]);
}

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
