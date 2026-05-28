import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { currencyMeta, money as fmt, moneyShort as fmtShort } from '../support/currency';

/**
 * The current account's currency metadata ({ code, name, symbol, locale }).
 * Use `.symbol` for inline labels like "Rate (Rs/L)" so they track the user's
 * chosen currency instead of hardcoding one. Falls back to USD before login.
 */
export function useCurrency() {
  const { user } = useAuth();
  return currencyMeta(user?.account?.currency || 'USD');
}

/**
 * Returns a `(value) => string` formatter bound to the current user's
 * account currency. Falls back to USD before login / between sessions.
 *
 *   const money = useMoney();
 *   <Text>{money(entry.amount)}</Text>
 */
export function useMoney() {
  const { user } = useAuth();
  const code = user?.account?.currency || 'USD';
  return useCallback((v) => fmt(v, code), [code]);
}

export function useMoneyShort() {
  const { user } = useAuth();
  const code = user?.account?.currency || 'USD';
  return useCallback((v) => fmtShort(v, code), [code]);
}
