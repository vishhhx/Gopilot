import axios, { type AxiosInstance } from "axios";

/** Where the GoPilot backend lives. Override with VITE_API_ORIGIN in frontend/.env. */
export const API_ORIGIN: string =
  (import.meta.env.VITE_API_ORIGIN as string | undefined)?.replace(/\/$/, "") ??
  "http://localhost:5000";

export const API_BASE = `${API_ORIGIN}/api/v1/`;

/** Absolute URL for a file the backend serves, such as "/public/icons/Gmail.svg". */
export function assetUrl(path?: string | null): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? "" : "/"}${path}`;
}

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 800000,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosInstance.interceptors.request.use((config) => {
  const methodsWithBody = ["post", "put", "patch"];

  if (methodsWithBody.includes(config.method?.toLowerCase() || "")) {
    config.headers["Content-Type"] = "application/json";
  }

  return config;
});
