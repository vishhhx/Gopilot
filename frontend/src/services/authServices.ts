// src/services/AuthServices.ts
import { axiosInstance } from "@/utils";

export const AuthServices = {
  googleOauthInit: async () => {
    try {
      const response = await axiosInstance.get("/auth/google/oauth-init");
      return response.data;
    } catch (error) {
      console.error("Error in AuthServices.googleOauthInit:", error);
      throw error;
    }
  },

  githubOauthInit: async () => {
    try {
      const response = await axiosInstance.get("/auth/github/oauth-init");
      return response.data;
    } catch (error) {
      console.error("Error in AuthServices.githubOauthInit:", error);
      throw error;
    }
  },

  login: async (credentials: { email: string; password: string }) => {
    try {
      const response = await axiosInstance.post("/auth/login", credentials, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error("Error in AuthServices.login:", error);
      throw error;
    }
  },

  register: async (data: { name: string; email: string; password: string }) => {
    try {
      const response = await axiosInstance.post("/auth/register", data, {
        withCredentials: true,
      });
      return response.data;
    } catch (error) {
      console.error("Error in AuthServices.register:", error);
      throw error;
    }
  },
  logout: async () => {
    try {
      await axiosInstance.post("/auth/logout", {}, { withCredentials: true });
    } catch (error) {
      console.error("Error in AuthServices.logout:", error);
      throw error;
    }
  },

  getCurrentUser: async () => {
    try {
      const response = await axiosInstance.get("/auth/me", {
        withCredentials: true,
      });
      return response.data.data;
    } catch (error) {
      console.error("Error in AuthServices.getCurrentUser:", error);
      throw error;
    }
  },
};
