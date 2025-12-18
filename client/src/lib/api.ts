import type { Product, Category, Review, CartItem, Order } from "@shared/schema";

const API_BASE = "/api";

// Token storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TOKEN_EXPIRY_KEY = 'token_expiry';

// Get stored tokens
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

// Store tokens
export function storeTokens(accessToken: string, refreshToken: string, expiresIn: number) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + (expiresIn * 1000)));
}

// Clear tokens (logout)
export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem('user');
  // Also clear old token key for backward compatibility
  localStorage.removeItem('auth_token');
}

// Check if token is about to expire (within 60 seconds)
function isTokenExpiringSoon(): boolean {
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  if (!expiry) return true;
  return Date.now() > (parseInt(expiry) - 60000);
}

// Refresh tokens
let refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
  // Prevent multiple simultaneous refresh requests
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return false;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        clearTokens();
        return false;
      }

      const data = await response.json();
      storeTokens(data.accessToken, data.refreshToken, data.expiresIn);
      return true;
    } catch (error) {
      clearTokens();
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(url: string, options?: RequestInit, retry = true): Promise<T> {
  // Check if token needs refresh before making request
  if (isTokenExpiringSoon() && getRefreshToken()) {
    await refreshAccessToken();
  }

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  // If unauthorized and we have a refresh token, try to refresh and retry
  if (response.status === 401 && retry && getRefreshToken()) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return fetchJson<T>(url, options, false);
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || "Request failed");
  }

  return response.json();
}

export const api = {
  // Products
  products: {
    getAll: (filters?: {
      categoryId?: number;
      search?: string;
      minPrice?: number;
      maxPrice?: number;
    }) => {
      const params = new URLSearchParams();
      if (filters?.categoryId) params.set("categoryId", filters.categoryId.toString());
      if (filters?.search) params.set("search", filters.search);
      if (filters?.minPrice) params.set("minPrice", filters.minPrice.toString());
      if (filters?.maxPrice) params.set("maxPrice", filters.maxPrice.toString());
      
      const query = params.toString();
      return fetchJson<Product[]>(`/products${query ? `?${query}` : ""}`);
    },
    
    getFeatured: () => fetchJson<Product[]>("/products/featured"),
    
    getTopSelling: () => fetchJson<Product[]>("/products/top-selling"),
    
    getById: (id: number) => fetchJson<Product>(`/products/${id}`),
    
    getSimilar: (id: number) => fetchJson<Product[]>(`/products/${id}/similar`),
    
    getRecommended: (id: number) => fetchJson<Product[]>(`/products/${id}/recommended`),
  },

  // Categories
  categories: {
    getAll: () => fetchJson<Category[]>("/categories"),
  },

  // Reviews
  reviews: {
    getByProduct: (productId: number) => 
      fetchJson<(Review & { user: { name: string; avatar?: string } })[]>(`/products/${productId}/reviews`),
    
    create: (productId: number, data: { rating: number; comment: string }) =>
      fetchJson<Review>(`/products/${productId}/reviews`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  // Cart
  cart: {
    get: () => fetchJson<(CartItem & { product: Product })[]>("/cart"),
    
    add: (productId: number, quantity: number = 1) =>
      fetchJson<CartItem>("/cart", {
        method: "POST",
        body: JSON.stringify({ productId, quantity }),
      }),
    
    update: (id: number, quantity: number) =>
      fetchJson<CartItem>(`/cart/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      }),
    
    remove: (id: number) =>
      fetch(`${API_BASE}/cart/${id}`, { 
        method: "DELETE",
        headers: getAuthHeaders(),
      }),
  },
  
  // Checkout
  checkout: {
    createSession: () => 
      fetchJson<{ url?: string; testMode?: boolean; error?: string }>("/checkout/create-session", {
        method: "POST",
      }),
  },

  // Orders
  orders: {
    getAll: () => fetchJson<(Order & { items: any[] })[]>("/orders"),
    
    getById: (id: string) => fetchJson<Order & { items: any[] }>(`/orders/${id}`),
    
    create: (items: any[]) =>
      fetchJson<Order>("/orders", {
        method: "POST",
        body: JSON.stringify({ items }),
      }),
  },

  // Vendor
  vendor: {
    getStats: () => 
      fetchJson<{ revenue: number; orders: number; products: number }>("/vendor/stats"),
    
    getProducts: () => fetchJson<Product[]>("/vendor/products"),
  },

  // Filters
  filters: {
    get: () => 
      fetchJson<{
        brands: string[];
        departments: string[];
        productTypes: { name: string; image: string }[];
        surfaceTypes: string[];
        frictionalMaterials: string[];
      }>("/filters"),
  },

  // User
  user: {
    getCurrent: () => 
      fetchJson<{ id: string; email: string; name: string; userType: 'customer' | 'vendor' | 'admin' | 'super_admin' }>("/user"),
  },

  // Auth
  auth: {
    login: (email: string, password: string) =>
      fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        return data as {
          user: { id: string; email: string; name: string; userType: string };
          accessToken: string;
          refreshToken: string;
          expiresIn: number;
        };
      }),

    register: (name: string, email: string, password: string, userType: string) =>
      fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, userType }),
      }).then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        return data as {
          user: { id: string; email: string; name: string; userType: string };
          accessToken: string;
          refreshToken: string;
          expiresIn: number;
        };
      }),

    logout: () =>
      fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: getAuthHeaders(),
      }),

    logoutAll: () =>
      fetchJson<{ message: string }>('/auth/logout-all', { method: 'POST' }),

    getSessions: () =>
      fetchJson<Array<{
        id: string;
        deviceLabel: string;
        ipAddress: string;
        lastUsedAt: string;
        createdAt: string;
        isCurrent: boolean;
      }>>('/auth/sessions'),

    revokeSession: (sessionId: string) =>
      fetchJson<{ message: string }>(`/auth/sessions/${sessionId}`, { method: 'DELETE' }),
  },
};
