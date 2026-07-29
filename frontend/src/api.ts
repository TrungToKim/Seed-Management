const API_BASE = import.meta.env.VITE_API_URL || "https://seed-management-1.onrender.com";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function apiFetchRaw(path: string, options?: RequestInit) {
  return fetch(`${API_BASE}${path}`, options);
}
