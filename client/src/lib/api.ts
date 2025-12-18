import type { Product, Category, Review, CartItem, Order } from "@shared/schema";

const API_BASE = "/api";

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

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
};
