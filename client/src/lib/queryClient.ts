import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

const AUTH_STORAGE_KEY = "armoredmart_auth";

export function getAuthToken(): string | null {
  const stored = localStorage.getItem(AUTH_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.accessToken || null;
    } catch {
      return null;
    }
  }
  return null;
}

export function clearAuthStorage(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export interface ApiRequestOptions {
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  bodyType?: "json" | "formdata";
  requireAuth?: boolean;
}

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  status: number;
  ok: boolean;
}

export async function api<T = unknown>(
  options: ApiRequestOptions,
): Promise<ApiResponse<T>> {
  const {
    endpoint,
    method = "GET",
    params,
    body,
    bodyType = "json",
    requireAuth = false,
  } = options;

  let url = endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const headers: Record<string, string> = {};
  const token = getAuthToken();

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else if (requireAuth) {
    return {
      data: null,
      error: "Authentication required. Please log in.",
      status: 401,
      ok: false,
    };
  }

  let requestBody: BodyInit | undefined;

  if (body) {
    if (bodyType === "formdata") {
      if (body instanceof FormData) {
        requestBody = body;
      } else {
        const formData = new FormData();
        Object.entries(body as Record<string, unknown>).forEach(
          ([key, value]) => {
            if (value instanceof File) {
              formData.append(key, value);
            } else if (value !== undefined && value !== null) {
              formData.append(key, String(value));
            }
          },
        );
        requestBody = formData;
      }
    } else {
      headers["Content-Type"] = "application/json";
      requestBody = JSON.stringify(body);
    }
  }

  try {
    const res = await fetch(url, {
      method,
      headers,
      body: requestBody,
      credentials: "include",
    });

    let data: T | null = null;
    let errorMessage: string | null = null;

    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        const json = await res.json();
        if (res.ok) {
          data = json as T;
        } else {
          errorMessage =
            json.error ||
            json.message ||
            `Request failed with status ${res.status}`;
        }
      } catch {
        if (!res.ok) {
          errorMessage = `Request failed with status ${res.status}`;
        }
      }
    } else if (!res.ok) {
      const text = await res.text();
      errorMessage = text || `Request failed with status ${res.status}`;
    }

    if (res.status === 401 && token) {
      clearAuthStorage();
      window.location.href = "/auth/login";
      return {
        data: null,
        error: "Session expired. Please log in again.",
        status: 401,
        ok: false,
      };
    }

    return {
      data,
      error: errorMessage,
      status: res.status,
      ok: res.ok,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Network error occurred",
      status: 0,
      ok: false,
    };
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};

  if (data) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (res.status === 401 && token) {
    clearAuthStorage();
    window.location.href = "/login";
  }

  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw" | "redirect";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {};

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(queryKey.join("/") as string, {
      headers,
      credentials: "include",
    });

    if (res.status === 401) {
      if (token) {
        clearAuthStorage();
        window.location.href = "/login";
        return null;
      }
      if (unauthorizedBehavior === "returnNull") {
        return null;
      }
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
