import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api, { setBaseUrl, setToken } from '../api/client';
import { clearSession, loadSession, saveSession } from '../api/storage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [token, setTok] = useState(null);
  const [user, setUser] = useState(null);
  const [baseUrl, setUrl] = useState('');

  // Restore a saved session on startup.
  useEffect(() => {
    (async () => {
      try {
        const session = await loadSession();
        if (session.baseUrl) {
          setUrl(session.baseUrl);
          setBaseUrl(session.baseUrl);
        }
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

  const login = async (url, email, password) => {
    const cleanUrl = url.trim();
    setBaseUrl(cleanUrl);
    const res = await api.post('/login', {
      email: email.trim(),
      password,
      device_name: 'Expo app',
    });
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    await saveSession({ token: newToken, baseUrl: cleanUrl, user: newUser });
    setUrl(cleanUrl);
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
    <AuthContext.Provider value={{ ready, token, user, baseUrl, login, logout }}>
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
