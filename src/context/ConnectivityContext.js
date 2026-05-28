import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { getOnline } from '../support/net';
import { count as outboxCount, flush as flushOutbox } from '../support/outbox';
import { emit, EVENTS } from '../support/events';
import { SyncSheet } from '../components/SyncSheet';

const ConnectivityContext = createContext({
  online: true,
  pending: 0,
  syncNow: async () => {},
  refreshPending: async () => {},
  openSync: () => {},
});

/**
 * App-wide connectivity state. Polls reachability (every 5s + whenever the app
 * returns to the foreground) and, the moment the device comes back online,
 * replays any queued offline writes and tells screens to refresh.
 */
export function ConnectivityProvider({ children }) {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [syncOpen, setSyncOpen] = useState(false);
  const wasOnline = useRef(true);

  const refreshPending = async () => setPending(await outboxCount());

  const syncNow = async () => {
    const res = await flushOutbox();
    await refreshPending();
    if (res.synced > 0) emit(EVENTS.ENTRIES_CHANGED);
    return res;
  };

  const check = async () => {
    const isOnline = await getOnline();
    setOnline(isOnline);
    // Transitioned offline -> online: drain the outbox.
    if (isOnline && !wasOnline.current) {
      await syncNow();
    }
    wasOnline.current = isOnline;
    await refreshPending();
  };

  useEffect(() => {
    check();
    const interval = setInterval(check, 5000);
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') check();
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSync = () => setSyncOpen(true);
  const closeSync = () => setSyncOpen(false);

  return (
    <ConnectivityContext.Provider value={{ online, pending, syncNow, refreshPending, openSync }}>
      {children}
      <SyncSheet
        visible={syncOpen}
        onClose={closeSync}
        online={online}
        onSyncNow={syncNow}
        onChanged={refreshPending}
      />
    </ConnectivityContext.Provider>
  );
}

export function useOnline() {
  return useContext(ConnectivityContext);
}
