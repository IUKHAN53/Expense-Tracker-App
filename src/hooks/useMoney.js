import { useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { currencyMeta, money as fmt, moneyShort as fmtShort } from '../support/currency';

/**
 * The chosen currency's metadata ({ code, name, symbol, locale }).
 * Use `.symbol` for inline labels like "Rate (Rs/L)". Falls back to USD
 * only before onboarding has picked one.
 */
export function useCurrency() {
  return currencyMeta(useApp().currency || 'USD');
}

/** `(value) => string` formatter bound to the chosen currency. */
export function useMoney() {
  const code = useApp().currency || 'USD';
  return useCallback((v) => fmt(v, code), [code]);
}

export function useMoneyShort() {
  const code = useApp().currency || 'USD';
  return useCallback((v) => fmtShort(v, code), [code]);
}
