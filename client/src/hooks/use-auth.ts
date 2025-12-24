import { useState, useEffect, useCallback } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  userType: "customer" | "vendor" | "admin" | "super_admin";
  emailVerified?: boolean;
  phoneVerified?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AUTH_STORAGE_KEY = "armoredmart_auth";

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setAuthState({
          user: parsed.user,
          accessToken: parsed.accessToken,
          refreshToken: parsed.refreshToken,
          isAuthenticated: !!parsed.accessToken,
          isLoading: false,
        });
      } catch {
        setAuthState((s) => ({ ...s, isLoading: false }));
      }
    } else {
      setAuthState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const setAuth = useCallback(
    (data: { user: User; accessToken: string; refreshToken: string }) => {
      const newState = {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        isAuthenticated: true,
        isLoading: false,
      };
      setAuthState(newState);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    },
    []
  );

  const clearAuth = useCallback(() => {
    setAuthState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const updateUser = useCallback((userData: Partial<User>) => {
    setAuthState((prev) => {
      if (!prev.user) return prev;
      const updatedUser = { ...prev.user, ...userData };
      const newState = { ...prev, user: updatedUser };
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          user: updatedUser,
          accessToken: prev.accessToken,
          refreshToken: prev.refreshToken,
        })
      );
      return newState;
    });
  }, []);

  return {
    ...authState,
    setAuth,
    clearAuth,
    updateUser,
  };
}
