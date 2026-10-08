import React, { createContext, useContext, useState, useEffect } from "react";
import { storage } from "../utils/storage";
import { api, ApiUser } from "../api/client";

interface AuthContextType {
  user: ApiUser | null;
  role: "DONOR" | "NGO" | "VOLUNTEER" | "ADMIN" | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: ApiUser, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  setDemoRole: (role: "DONOR" | "NGO" | "VOLUNTEER" | "ADMIN") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadAuth() {
      try {
        const storedToken = await api.getToken();
        const storedUserJson = await storage.getItem("donateconnect_user_data");
        if (storedToken && storedUserJson) {
          setToken(storedToken);
          setUser(JSON.parse(storedUserJson));
        }
      } catch (e) {
        console.error("Failed to load stored auth state:", e);
      } finally {
        setIsLoading(false);
      }
    }
    loadAuth();
  }, []);

  const login = async (newToken: string, newUser: ApiUser, refreshToken?: string) => {
    await api.setTokens(newToken, refreshToken);
    await storage.setItem("donateconnect_user_data", JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    await api.removeToken();
    await storage.deleteItem("donateconnect_user_data");
    setToken(null);
    setUser(null);
  };

  // Demo role switcher for testing and previews in development
  const setDemoRole = (role: "DONOR" | "NGO" | "VOLUNTEER" | "ADMIN") => {
    setUser({
      id: "demo-user-1",
      name: `Demo ${role}`,
      email: `${role.toLowerCase()}@donateconnect.org`,
      role,
      status: "ACTIVE",
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        token,
        isLoading,
        login,
        logout,
        setDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
