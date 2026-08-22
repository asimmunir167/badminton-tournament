import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiFetch, ApiError, RequestOptions } from './api';
import { getItem, removeItem, setItem } from './secure-storage';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  role: string;
  status: string;
}

interface StoredTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  registerWithPassword: (fullName: string, email: string, password: string) => Promise<AuthResult>;
  requestOtp: (phone: string, purpose: 'LOGIN' | 'REGISTER') => Promise<void>;
  verifyOtp: (phone: string, code: string, purpose: 'LOGIN' | 'REGISTER', fullName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'tournament-app-auth';

async function readStoredTokens(): Promise<StoredTokens | null> {
  const raw = await getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredTokens;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const stored = await readStoredTokens();
      if (!stored) {
        setLoading(false);
        return;
      }
      setAccessToken(stored.accessToken);
      try {
        const me = await apiFetch<AuthUser>('/api/auth/me', { token: stored.accessToken });
        setUser(me);
      } catch {
        await removeItem(STORAGE_KEY);
        setAccessToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistAndSetSession = useCallback(async (result: AuthResult) => {
    await setItem(STORAGE_KEY, JSON.stringify({ accessToken: result.accessToken, refreshToken: result.refreshToken }));
    setAccessToken(result.accessToken);
    setUser(result.user);
  }, []);

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      const result = await apiFetch<AuthResult>('/api/auth/login', { method: 'POST', body: { email, password } });
      await persistAndSetSession(result);
    },
    [persistAndSetSession],
  );

  const registerWithPassword = useCallback(
    async (fullName: string, email: string, password: string) => {
      const result = await apiFetch<AuthResult>('/api/auth/register', {
        method: 'POST',
        body: { fullName, email, password },
      });
      await persistAndSetSession(result);
      return result;
    },
    [persistAndSetSession],
  );

  const requestOtp = useCallback(async (phone: string, purpose: 'LOGIN' | 'REGISTER') => {
    await apiFetch('/api/auth/otp/request', { method: 'POST', body: { phone, purpose } });
  }, []);

  const verifyOtp = useCallback(
    async (phone: string, code: string, purpose: 'LOGIN' | 'REGISTER', fullName?: string) => {
      const result = await apiFetch<AuthResult>('/api/auth/otp/verify', {
        method: 'POST',
        body: { phone, code, purpose, fullName },
      });
      await persistAndSetSession(result);
    },
    [persistAndSetSession],
  );

  const logout = useCallback(async () => {
    const stored = await readStoredTokens();
    await removeItem(STORAGE_KEY);
    setAccessToken(null);
    setUser(null);
    if (stored) {
      apiFetch('/api/auth/logout', { method: 'POST', body: { refreshToken: stored.refreshToken } }).catch(() => {});
    }
  }, []);

  const value = useMemo(
    () => ({ user, accessToken, loading, loginWithPassword, registerWithPassword, requestOtp, verifyOtp, logout }),
    [user, accessToken, loading, loginWithPassword, registerWithPassword, requestOtp, verifyOtp, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// Bound API client: attaches the current access token and logs out on 401
// (no silent refresh yet — same tradeoff as the admin panel's client).
export function useApiClient() {
  const { accessToken, logout } = useAuth();
  return useCallback(
    async <T,>(path: string, options: Omit<RequestOptions, 'token'> = {}): Promise<T> => {
      try {
        return await apiFetch<T>(path, { ...options, token: accessToken });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          await logout();
        }
        throw err;
      }
    },
    [accessToken, logout],
  );
}
