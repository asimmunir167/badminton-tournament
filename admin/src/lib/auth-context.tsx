"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError, type RequestOptions } from "./api";

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

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = "tournament-admin-auth";

function readStoredTokens(): StoredTokens | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
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
    const stored = readStoredTokens();
    if (!stored) {
      setLoading(false);
      return;
    }
    setAccessToken(stored.accessToken);
    apiFetch<AuthUser>("/api/auth/me", { token: stored.accessToken })
      .then((me) => setUser(me))
      .catch(() => {
        window.localStorage.removeItem(STORAGE_KEY);
        setAccessToken(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await apiFetch<{ user: AuthUser; accessToken: string; refreshToken: string }>(
      "/api/auth/login",
      { method: "POST", body: { email, password } },
    );
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ accessToken: result.accessToken, refreshToken: result.refreshToken }),
    );
    setAccessToken(result.accessToken);
    setUser(result.user);
  }, []);

  const logout = useCallback(() => {
    const stored = readStoredTokens();
    window.localStorage.removeItem(STORAGE_KEY);
    setAccessToken(null);
    setUser(null);
    if (stored) {
      apiFetch("/api/auth/logout", { method: "POST", body: { refreshToken: stored.refreshToken } }).catch(() => {});
    }
  }, []);

  const value = useMemo(
    () => ({ user, accessToken, loading, login, logout }),
    [user, accessToken, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Bound API client: attaches the current access token and logs out on 401
// (no silent refresh yet — the 15-minute access token TTL means an admin
// gets bounced back to /login when it expires, rather than staying signed
// in transparently).
export function useApiClient() {
  const { accessToken, logout } = useAuth();
  return useCallback(
    async <T,>(path: string, options: Omit<RequestOptions, "token"> = {}): Promise<T> => {
      try {
        return await apiFetch<T>(path, { ...options, token: accessToken });
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          logout();
        }
        throw err;
      }
    },
    [accessToken, logout],
  );
}
