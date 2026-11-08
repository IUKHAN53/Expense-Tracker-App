/** Short, human-readable message for a thrown error (db errors carry their own). */
export function errorMessage(error, fallback = 'Something went wrong.') {
  return error?.message || fallback;
}
