import { useState, type ReactNode } from "react";
import { apiFetch, type AuthUser, getStoredUser, getToken, setAuth, clearAuth } from "./api";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());
  const [token, setToken] = useState<string | null>(() => getToken());

  const applyAuth = (newToken: string, newUser: AuthUser) => {
    setAuth(newToken, newUser);
    setToken(newToken);
    setUser(newUser);
  };

  const login = async (username: string, password: string) => {
    const data = await apiFetch<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    applyAuth(data.token, data.user);
  };

  const register = async (username: string, email: string, password: string) => {
    const data = await apiFetch<{ token: string; user: AuthUser }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    });
    applyAuth(data.token, data.user);
  };

  const logout = () => {
    clearAuth();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}