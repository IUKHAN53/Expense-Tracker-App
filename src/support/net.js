import * as Network from 'expo-network';

/**
 * True when the device has a usable internet connection. `isInternetReachable`
 * is null on some Android states, so we only treat an explicit `false` as
 * offline (a connected interface with unknown reachability counts as online).
 */
export async function getOnline() {
  try {
    const s = await Network.getNetworkStateAsync();
    return Boolean(s.isConnected) && s.isInternetReachable !== false;
  } catch {
    // If we can't even read the network state, assume online and let the
    // actual request fail/queue rather than blocking the user.
    return true;
  }
}

/** Did an axios error come from losing the network (vs a server response)? */
export function isNetworkError(error) {
  return !error?.response && (error?.message === 'Network Error' || error?.code === 'ECONNABORTED' || !error?.status);
}
