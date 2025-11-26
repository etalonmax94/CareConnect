import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getAuthToken } from "./auth";

// Cloud Run API URL
const CLOUD_RUN_URL = import.meta.env.VITE_API_URL || 'https://careconnect-124485508170.australia-southeast1.run.app';

// Check if we're on the production domain (app.empowerlink.au)
function isProductionDomain(): boolean {
  const hostname = window.location.hostname;
  return hostname === 'app.empowerlink.au' || hostname === 'empowerlink.au';
}

// API base URL - in production always use Cloud Run, in dev use same-origin unless we have a token
function getApiBaseUrl(): string {
  // In production, always use Cloud Run
  if (isProductionDomain()) {
    return CLOUD_RUN_URL;
  }
  
  // In development, use Cloud Run if we have a token, otherwise same-origin
  const token = getAuthToken();
  if (token) {
    return CLOUD_RUN_URL;
  }
  
  // Dev mode with no token = same-origin (session auth)
  return '';
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const fullUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;
  
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
  };
  
  if (data) {
    headers['Content-Type'] = 'application/json';
  }
  
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const path = queryKey.join("/");
    const baseUrl = getApiBaseUrl();
    const fullUrl = path.startsWith('/') ? `${baseUrl}${path}` : path;
    
    const res = await fetch(fullUrl, {
      headers: getAuthHeaders(),
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
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
