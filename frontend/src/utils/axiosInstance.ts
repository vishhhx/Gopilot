import axios, { type AxiosInstance } from "axios";

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: "http://localhost:5000/api/v1/",
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
