export const API_BASE = import.meta.env.VITE_API_URL || (typeof window !== "undefined" && window.location.hostname === "localhost" ? "http://localhost:8000" : "https://seed-management-1.onrender.com");

const AUTH_TOKEN_KEY = "tv_auth_token";
const AUTH_USER_KEY = "tv_auth_user";
const GUEST_FAVORITES_KEY = "tv_guest_favorites";

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  is_admin: boolean;
  role: string;
  is_primary?: boolean;
  package_id?: number | null;
  package_name?: string;
  full_name?: string | null;
  avatar_url?: string | null;
}

export interface ChatQuota {
  authenticated: boolean;
  limit: number;
  used: number;
  remaining: number | null;
}

export function getAvatarUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return `${API_BASE}${url}`;
}

export function getImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  return `${API_BASE}${url}`;
}

export interface Tag {
  id: number;
  category: string;
  tag_name: string;
}

export interface PlantDetailSection {
  id: number;
  section_type: string;
  content: string;
  source_reference?: string | null;
}

export interface PlantImage {
  id: number;
  image_url: string;
  caption?: string | null;
  is_primary?: boolean;
}

export interface PlantReference {
  id: number;
  title: string;
  url?: string | null;
  author_source?: string | null;
}

export interface Plant {
  id: number;
  common_name: string;
  scientific_name?: string | null;
  family?: string | null;
  region?: string | null;
  image_url?: string | null;
  description?: string | null;
  slug?: string | null;
  other_names?: string | null;
  used_parts?: string | null;
  chemical_components?: string | null;
  how_to_use?: string | null;
  precautions?: string | null;
  featured?: boolean;
  views_count?: number;
  tags?: Tag[];
  details?: PlantDetailSection[];
  images?: PlantImage[];
  references?: PlantReference[];
  is_favorite?: boolean;
}

export interface AutocompletePlant {
  id: number;
  common_name: string;
  scientific_name?: string | null;
  family?: string | null;
  slug: string;
  image_url?: string | null;
}

export interface PlantListResponse {
  items: Plant[];
  total: number;
  page: number;
  page_size: number;
}

export interface Article {
  id: number;
  title: string;
  slug: string;
  summary?: string | null;
  content: string;
  image_url?: string | null;
  category: string;
  author: string;
  views_count: number;
  created_at: string;
}

export interface ArticleListResponse {
  items: Article[];
  total: number;
  page: number;
  page_size: number;
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
  discount_1m?: number;
  is_active: boolean;
  created_at: string;
}

export interface AIRecognitionCandidate {
  vietnamese_name: string;
  scientific_name?: string;
  confidence_percent: number;
  observed_features?: string;
  db_plant_id?: number;
  db_plant_slug?: string;
}

export interface AIRecognitionResult {
  identified: boolean;
  primary_candidate?: AIRecognitionCandidate;
  other_candidates?: AIRecognitionCandidate[];
  disclaimer: string;
  error?: string;
}

// ── Auth Storage ──
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
  // Sync guest local favorites to server upon login
  syncGuestFavoritesToServer();
}

export function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
}

// ── Local Guest Favorites Storage ──
export function getGuestFavorites(): number[] {
  try {
    const raw = localStorage.getItem(GUEST_FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleGuestFavorite(plantId: number): boolean {
  const list = getGuestFavorites();
  const index = list.indexOf(plantId);
  let isSaved = false;
  if (index > -1) {
    list.splice(index, 1);
  } else {
    list.push(plantId);
    isSaved = true;
  }
  localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(list));
  return isSaved;
}

export function isGuestFavorite(plantId: number): boolean {
  return getGuestFavorites().includes(plantId);
}

export async function syncGuestFavoritesToServer() {
  const list = getGuestFavorites();
  if (list.length === 0) return;
  try {
    await apiFetch("/api/favorites/sync", {
      method: "POST",
      body: JSON.stringify({ plant_ids: list }),
    });
    localStorage.removeItem(GUEST_FAVORITES_KEY);
  } catch {
    // Silent fail if network issue
  }
}

// ── Fetch Helpers ──
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
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(errData.detail || `Hệ thống gặp sự cố (Mã: ${res.status})`);
  }
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
