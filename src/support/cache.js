import AsyncStorage from '@react-native-async-storage/async-storage';

// Tiny JSON cache for read-screens so the app shows the last-known data when
// offline. Keys are namespaced under "et_cache:".

const PREFIX = 'et_cache:';

export async function setCache(key, data) {
  try {
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify({ at: Date.now(), data }));
  } catch {
    // Cache writes are best-effort.
  }
}

/** Returns { data, at } or null. */
export async function getCache(key) {
  try {
    const raw = await AsyncStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
