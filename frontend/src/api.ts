export const API_BASE = import.meta.env.VITE_API_URL || "https://seed-management-1.onrender.com";

const AUTH_TOKEN_KEY = "tv_auth_token";
const AUTH_USER_KEY = "tv_auth_user";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  role: string;
  package_id?: number | null;
  package_name?: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

export function getAvatarUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return `${API_BASE}${url}`;
}

export interface PackagePlan {
  id: number;
  name: string;
  description: string | null;
  monthly_price: number;
  chat_per_minute: number;
  chat_per_day: number;
  community_per_day: number;
  duration_months?: number;
  is_active: boolean;
  created_at: string;
}

export function getToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function apiFetchRaw(path: string, options?: RequestInit) {
  const token = getToken();
  return fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
}
