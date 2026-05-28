import api from '../api/client';
import { getCache, setCache } from './cache';

/**
 * GET that survives going offline: tries the network, caches the response body
 * on success, and falls back to the last cached body on failure. Throws only
 * when there is neither a network response nor a cached copy.
 *
 * Returns the response body (same shape as `res.data`).
 */
export async function cachedGet(cacheKey, url, config) {
  try {
    const res = await api.get(url, config);
    await setCache(cacheKey, res.data);
    return res.data;
  } catch (e) {
    const cached = await getCache(cacheKey);
    if (cached && cached.data !== undefined) {
      return cached.data;
    }
    throw e;
  }
}

/** Best-effort cache warm (fire-and-forget) so offline screens have data. */
export function warmCache(cacheKey, url, config) {
  cachedGet(cacheKey, url, config).catch(() => {});
}
