import { storage } from "../utils/storage";
import { API_URL } from "../config/api";

const TOKEN_KEY = "donateconnect_auth_token";
const REFRESH_TOKEN_KEY = "donateconnect_refresh_token";
const USER_KEY = "donateconnect_user_data";

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: "DONOR" | "NGO" | "VOLUNTEER" | "ADMIN";
  status: string;
}

export class ApiError extends Error {
  public code?: string;
  public status: number;
  public details?: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ApiClient {
  private baseUrl: string;
  private isRefreshing: boolean = false;

  constructor() {
    this.baseUrl = `${API_URL}/api/v1`;
  }

  async getToken(): Promise<string | null> {
    return storage.getItem(TOKEN_KEY);
  }

  async getRefreshToken(): Promise<string | null> {
    return storage.getItem(REFRESH_TOKEN_KEY);
  }

  async setTokens(accessToken: string, refreshToken?: string): Promise<void> {
    await storage.setItem(TOKEN_KEY, accessToken);
    if (refreshToken) {
      await storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
  }

  async setToken(token: string): Promise<void> {
    await storage.setItem(TOKEN_KEY, token);
  }

  async removeToken(): Promise<void> {
    await storage.deleteItem(TOKEN_KEY);
    await storage.deleteItem(REFRESH_TOKEN_KEY);
  }

  async refreshAccessToken(): Promise<string | null> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) return null;

    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        await this.removeToken();
        return null;
      }

      const data = await response.json();
      const newAccessToken = data.data.tokens.accessToken;
      const newRefreshToken = data.data.tokens.refreshToken;
      await this.setTokens(newAccessToken, newRefreshToken);
      return newAccessToken;
    } catch {
      return null;
    }
  }

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    let token = await this.getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    // If 401 token expired, try to refresh and retry once
    if (response.status === 401 && !endpoint.includes("/auth/")) {
      const newToken = await this.refreshAccessToken();
      if (newToken) {
        headers["Authorization"] = `Bearer ${newToken}`;
        response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...options,
          headers,
        });
      }
    }

    const data = await response.json();

    if (!response.ok) {
      let msg = data?.error?.message || `Request failed with status ${response.status}`;
      if (Array.isArray(data?.error?.details) && data.error.details.length > 0) {
        const detailMsgs = data.error.details.map((d: any) => `${d.path ? d.path + ": " : ""}${d.message}`).join(", ");
        msg = `${msg}: ${detailMsgs}`;
      }
      throw new ApiError(msg, response.status, data?.error?.code, data?.error?.details);
    }

    return data as T;
  }

  // Health check helper
  async checkHealth(): Promise<{ status: string; database: string }> {
    return this.request<{ status: string; database: string }>("/health");
  }
}

export const api = new ApiClient();
export default api;
