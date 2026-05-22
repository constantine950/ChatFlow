// lib/api/auth.ts
import { api } from "./client";

export interface User {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
}

export const authApi = {
  register: (email: string, password: string, display_name: string) =>
    api.post<AuthResponse>("/auth/register", { email, password, display_name }),

  login: (email: string, password: string) =>
    api.post<AuthResponse>("/auth/login", { email, password }),

  refresh: (refresh_token: string) =>
    api.post<AuthResponse>("/auth/refresh", { refresh_token }),

  logout: (refresh_token: string) =>
    api.delete("/auth/logout", { refresh_token }),
};
