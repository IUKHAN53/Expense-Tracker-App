import axios from 'axios';

/** The app always talks to the production API. */
export const API_BASE_URL = 'https://expense.iukhan.tech';

const instance = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 120000,
  headers: { Accept: 'application/json' },
});

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
    return 'Cannot reach the server. Check your connection and try again.';
  }
  if (error?.code === 'ECONNABORTED') {
    return 'The request timed out. The server may be slow or unreachable.';
  }
  return error?.message || fallback;
}

export default instance;
