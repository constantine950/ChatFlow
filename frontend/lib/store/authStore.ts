import { create } from "zustand";
import { User } from "../api/auth";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,

  setAuth: (user, accessToken, refreshToken) => {
    // Persist tokens to localStorage for page refreshes
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);
    }
    set({ user, accessToken, refreshToken });
  },

  clearAuth: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
    }
    set({ user: null, accessToken: null, refreshToken: null });
  },

  isAuthenticated: () => !!get().accessToken,
}));
