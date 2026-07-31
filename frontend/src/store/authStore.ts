import { create } from "zustand";
import axios from "axios";
import { api } from "@/lib/api";
import type { User, RegisterPayload, LoginPayload } from "@/types/auth";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  error: null,

  login: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post("/auth/login", payload);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
      set({ isLoading: false });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: axios.isAxiosError(err) ? err.response?.data?.detail || "Login failed. Please try again." : "Login failed. Please try again.",
      });
      throw err;
    }
  },

  register: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await api.post("/auth/register", payload);
      set({ isLoading: false });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: axios.isAxiosError(err) ? err.response?.data?.detail || "Registration failed. Please try again." : "Registration failed. Please try again.",
      });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null });
  },

  fetchCurrentUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.get<User>("/auth/me");
      set({ user: data, isLoading: false });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: axios.isAxiosError(err) ? err.response?.data?.detail || "Unable to load your session." : "Unable to load your session.",
      });
      throw err;
    }
  },
}));
