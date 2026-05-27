// Supported currencies + symbol metadata. The mobile UI never invents
// new currency codes; the backend's Account::SUPPORTED_CURRENCIES list
// must stay in sync with this one.
export const CURRENCIES = [
  { code: 'USD', name: 'US Dollar',         symbol: '$',    locale: 'en-US' },
  { code: 'EUR', name: 'Euro',              symbol: '€',    locale: 'en-IE' },
  { code: 'GBP', name: 'British Pound',     symbol: '£',    locale: 'en-GB' },
  { code: 'INR', name: 'Indian Rupee',      symbol: '₹',    locale: 'en-IN' },
  { code: 'PKR', name: 'Pakistani Rupee',   symbol: 'Rs',   locale: 'en-PK' },
  { code: 'BDT', name: 'Bangladeshi Taka',  symbol: '৳',    locale: 'en-BD' },
  { code: 'LKR', name: 'Sri Lankan Rupee',  symbol: 'Rs',   locale: 'en-LK' },
  { code: 'AED', name: 'UAE Dirham',        symbol: 'AED',  locale: 'en-AE' },
  { code: 'SAR', name: 'Saudi Riyal',       symbol: 'SAR',  locale: 'en-SA' },
  { code: 'CAD', name: 'Canadian Dollar',   symbol: 'CA$',  locale: 'en-CA' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$',   locale: 'en-AU' },
  { code: 'CNY', name: 'Chinese Yuan',      symbol: '¥',    locale: 'zh-CN' },
];

const BY_CODE = Object.fromEntries(CURRENCIES.map((c) => [c.code, c]));

export function currencyMeta(code) {
  return BY_CODE[code] || BY_CODE.USD;
}

/** Format a number as currency: money(142860, 'PKR') -> "Rs 142,860". */
export function money(value, code = 'USD') {
  const c = currencyMeta(code);
  const v = Math.round(Number(value) || 0);
  const neg = v < 0;
  const abs = Math.abs(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${neg ? '-' : ''}${c.symbol} ${abs}`;
}

/** Compact form: moneyShort(142860, 'PKR') -> "Rs 143k". */
export function moneyShort(value, code = 'USD') {
  const c = currencyMeta(code);
  const n = Math.round(Number(value) || 0);
  if (Math.abs(n) >= 100000) return `${c.symbol} ${Math.round(n / 1000)}k`;
  if (Math.abs(n) >= 1000) return `${c.symbol} ${(n / 1000).toFixed(1)}k`;
  return `${c.symbol} ${n}`;
}
