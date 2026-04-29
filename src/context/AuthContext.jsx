/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { login, me, register } from '../lib/api';

const STORAGE_KEYS = {
  token: 'tienda.authToken',
  user: 'tienda.authUser',
  session: 'tienda.sessionToken',
};

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id ?? user.usuarioId ?? user.userId,
    username: user.username ?? user.nombre ?? user.name ?? null,
    email: user.email ?? null,
    rol: user.rol ?? user.role ?? 'USER',
    raw: user,
  };
}

function normalizeAuthResponse(response) {
  return {
    user: normalizeUser(response?.usuario ?? response?.user ?? response?.account ?? response),
    token: response?.token ?? response?.jwt ?? response?.accessToken ?? null,
  };
}

function getOrCreateSessionToken() {
  let token = window.localStorage.getItem(STORAGE_KEYS.session);

  if (!token) {
    token = typeof crypto !== 'undefined' && crypto.randomUUID
      ? `session_${crypto.randomUUID()}`
      : `session_${Date.now()}`;
    window.localStorage.setItem(STORAGE_KEYS.session, token);
  }

  return token;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    void (async () => {
      const nextSessionToken = getOrCreateSessionToken();
      const persistedToken = window.localStorage.getItem(STORAGE_KEYS.token) || '';
      const persistedUserRaw = window.localStorage.getItem(STORAGE_KEYS.user);
      let persistedUser = null;

      if (persistedUserRaw) {
        try {
          persistedUser = normalizeUser(JSON.parse(persistedUserRaw));
        } catch {
          persistedUser = null;
        }
      }

      if (!active) {
        return;
      }

      setSessionToken(nextSessionToken);
      setToken(persistedToken);
      setUser(persistedUser);

      if (!persistedToken) {
        setLoading(false);
        return;
      }

      try {
        const profile = await me(persistedToken);
        const normalizedProfile = normalizeUser(profile);
        if (!active) {
          return;
        }

        setUser(normalizedProfile);
        window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(normalizedProfile?.raw ?? profile));
      } catch {
        if (!active) {
          return;
        }

        setToken('');
        setUser(null);
        window.localStorage.removeItem(STORAGE_KEYS.token);
        window.localStorage.removeItem(STORAGE_KEYS.user);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  async function signIn(payload) {
    const response = await login(payload);
    let normalized = normalizeAuthResponse(response);

    if (normalized.token && !normalized.user?.id) {
      const profile = await me(normalized.token);
      normalized = {
        ...normalized,
        user: normalizeUser(profile),
      };
    }

    if (normalized.token) {
      setToken(normalized.token);
      window.localStorage.setItem(STORAGE_KEYS.token, normalized.token);
    }

    if (normalized.user) {
      setUser(normalized.user);
      window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(normalized.user.raw ?? normalized.user));
    }

    return normalized.user;
  }

  async function signUp(payload) {
    const response = await register(payload);
    const normalized = normalizeAuthResponse(response);

    if (normalized.token) {
      setToken(normalized.token);
      window.localStorage.setItem(STORAGE_KEYS.token, normalized.token);
    }

    if (normalized.user) {
      setUser(normalized.user);
      window.localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(normalized.user.raw ?? normalized.user));
    }

    return normalized.user;
  }

  function logout() {
    setToken('');
    setUser(null);
    window.localStorage.removeItem(STORAGE_KEYS.token);
    window.localStorage.removeItem(STORAGE_KEYS.user);
  }

  const value = useMemo(() => ({
    user,
    token,
    sessionToken,
    loading,
    isAuthenticated: Boolean(token),
    isAdmin: user?.rol?.toUpperCase() === 'ADMIN',
    signIn,
    signUp,
    logout,
  }), [loading, sessionToken, token, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }

  return context;
}
