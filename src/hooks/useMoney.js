import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { money as fmt, moneyShort as fmtShort } from '../support/currency';

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
