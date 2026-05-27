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

  const register = async ({ name, email, password, householdName }) => {
    const res = await api.post('/register', {
      name: name.trim(),
      email: email.trim(),
      password,
      household_name: householdName?.trim() || undefined,
      device_name: 'Kharcha app',
    });
    const { token: newToken, user: newUser } = res.data;
    setToken(newToken);
    await saveSession({ token: newToken, user: newUser });
    setUser(newUser);
    setTok(newToken);
  };

  const forgotPassword = async (email) => {
    const res = await api.post('/forgot-password', { email: email.trim() });
    return res.data?.message || 'If that email is registered, a reset link has been sent.';
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

  const deleteAccount = async ({ password, confirmation }) => {
    await api.delete('/account', { data: { password, confirmation } });
    setToken(null);
    await clearSession();
    setTok(null);
    setUser(null);
  };

  const verifyEmail = async (code) => {
    const res = await api.post('/email/verify', { code });
    // Optimistic local update so the navigator drops the verification wall.
    const updated = { ...user, email_verified_at: res.data?.user?.email_verified_at || new Date().toISOString() };
    setUser(updated);
    await saveSession({ token, user: updated });
  };

  const resendVerificationCode = async () => {
    const res = await api.post('/email/resend');
    return res.data?.message;
  };

  const setCurrency = async (code) => {
    const res = await api.post('/account/currency', { currency: code });
    const next = {
      ...user,
      account: { ...(user?.account || {}), currency: res.data?.currency || code, requires_currency: false },
    };
    setUser(next);
    await saveSession({ token, user: next });
  };

  const requiresVerification = Boolean(token && user && !user.email_verified_at);
  const requiresCurrency = Boolean(
    token && user?.email_verified_at && user?.account && !user.account.currency,
  );

  return (
    <AuthContext.Provider
      value={{
        ready,
        token,
        user,
        login,
        register,
        forgotPassword,
        logout,
        deleteAccount,
        verifyEmail,
        resendVerificationCode,
        setCurrency,
        requiresVerification,
        requiresCurrency,
      }}
    >
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
