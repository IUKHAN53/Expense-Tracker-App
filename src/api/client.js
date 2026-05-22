import axios from 'axios';

// A single axios instance whose base URL + auth token are set at runtime
// once the user has logged in (or when a saved session is restored).
const instance = axios.create({
  timeout: 120000,
  headers: { Accept: 'application/json' },
});

export function setBaseUrl(url) {
  instance.defaults.baseURL = url ? `${url.replace(/\/+$/, '')}/api` : undefined;
}

export function setToken(token) {
  if (token) {
    instance.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete instance.defaults.headers.common.Authorization;
  }
}

/** Turn an axios error into a short, human-readable message. */
export function errorMessage(error, fallback = 'Something went wrong.') {
  const res = error?.response;

  if (res?.data?.errors) {
    const first = Object.values(res.data.errors)[0];
    if (Array.isArray(first) && first[0]) return first[0];
  }
  if (res?.data?.message) return res.data.message;

  if (error?.message === 'Network Error') {
    return 'Cannot reach the server. Check the server URL and that your phone is on the same Wi-Fi network.';
  }
  if (error?.code === 'ECONNABORTED') {
    return 'The request timed out. The server may be slow or unreachable.';
  }
  return error?.message || fallback;
}

export default instance;
