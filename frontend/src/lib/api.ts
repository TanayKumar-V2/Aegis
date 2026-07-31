import axios, { type InternalAxiosRequestConfig } from "axios";

// MVP tradeoff: auth tokens live in localStorage. Production should use
// httpOnly cookies set by the backend to reduce XSS-based token theft risk.
const API_URL = process.env.NEXT_PUBLIC_API_URL;

type RetriableRequestConfig = InternalAxiosRequestConfig & { _retry?: boolean };
let refreshPromise: Promise<string | null> | null = null;

function clearSessionAndRedirect() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  window.location.href = "/login";
}

async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise;

  const refreshToken = typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null;
  if (!refreshToken) return null;

  refreshPromise = axios
    .post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken }, { headers: { "Content-Type": "application/json" } })
    .then(({ data }) => {
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
      }
      return data.access_token as string;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as RetriableRequestConfig | undefined;
    const isRefreshRequest = typeof config?.url === "string" && config.url.includes("/auth/refresh");

    if (error.response?.status === 401 && config && !config._retry && !isRefreshRequest) {
      config._retry = true;
      const accessToken = await refreshAccessToken();
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
        return api(config);
      }
      clearSessionAndRedirect();
    }

    return Promise.reject(error);
  }
);
