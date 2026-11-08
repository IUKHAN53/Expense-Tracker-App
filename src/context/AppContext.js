import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getDb } from '../db';

const AppContext = createContext(null);

/**
 * Replaces the old AuthContext: no accounts any more. Opens the encrypted
 * database once at startup and holds the few app-wide settings.
 */
export function AppProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [currency, setCurrencyState] = useState(null);

  const boot = useCallback(async () => {
    setDbError(null);
    try {
      const db = await getDb();
      setCurrencyState(await db.settings.get('currency'));
    } catch (e) {
      setDbError(e);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    boot();
  }, [boot]);

  const setCurrency = async (code) => {
    const db = await getDb();
    await db.settings.set('currency', code);
    setCurrencyState(code);
  };

  return (
    <AppContext.Provider value={{ ready, dbError, retry: boot, currency, setCurrency }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>.');
  return ctx;
}
