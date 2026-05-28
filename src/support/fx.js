import api from '../api/client';

// Foreign-exchange lookup for receipt scanning. Rates come from OUR backend
// (refreshed daily by a server cron), not a third party — so the app has one
// trusted source and works offline-tolerantly via the user-editable field.
// When the receipt is in a different currency than the household's base
// currency, we convert each amount before saving (the ledger stores base
// currency, and keeps the original amount alongside).

/**
 * How many units of `to` equal one unit of `from`.
 * fetchRate('USD', 'PKR') -> ~278.5
 * Returns 1 when the codes match. Throws when the server has no rate yet so
 * the caller can fall back to manual entry.
 */
export async function fetchRate(from, to) {
  if (!from || !to || from === to) return 1;

  const res = await api.get('/fx', { params: { from, to } });
  const rate = res.data?.rate;
  if (!rate || Number.isNaN(Number(rate))) {
    throw new Error('Rate unavailable');
  }
  return Number(rate);
}
