import React, { createContext, useContext, useEffect, useState } from 'react';
import api, { setToken } from '../api/client';
import { clearSession, loadSession, saveSession } from '../api/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [token, setTok] = useState(null);
  const [user, setUser] = useState(null);

  // Restore a saved session on startup.
  useEffect(() => {
    (async () => {
      try {
        const session = await loadSession();
        if (session.token) {
          setToken(session.token);
          setTok(session.token);
          setUser(session.user);
        }
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/login', {
      email: email.trim(),
      password,
      device_name: 'Kharcha app',
    });
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    await saveSession({ token: newToken, user: newUser });
    setUser(newUser);
    setTok(newToken);
  };

  const logout = async () => {
    try {
      await api.post('/logout');
    } catch {
      // Ignore network errors on logout — clear locally regardless.
    }
    setToken(null);
    await clearSession();
    setTok(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ ready, token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>.');
  }
  return ctx;
}
