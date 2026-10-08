import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthResponse, LoginRequest, RegisterRequest, User } from '../types';
import { loginApi, registerDonorApi, getCurrentUserApi } from '../api/authApi';
import { setAuthTokenInMemory, registerLogoutCallback } from '../api/client';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (data: LoginRequest) => Promise<void>;
  registerDonor: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setAuthTokenInMemory(null);
  };

  useEffect(() => {
    registerLogoutCallback(handleLogout);
  }, []);

  const login = async (data: LoginRequest) => {
    setLoading(true);
    try {
      const res: AuthResponse = await loginApi(data);
      setToken(res.token);
      setUser(res.user);
      setAuthTokenInMemory(res.token);
    } finally {
      setLoading(false);
    }
  };

  const registerDonor = async (data: RegisterRequest) => {
    setLoading(true);
    try {
      const res: AuthResponse = await registerDonorApi(data);
      setToken(res.token);
      setUser(res.user);
      setAuthTokenInMemory(res.token);
    } finally {
      setLoading(false);
    }
  };

  const refetchUser = async () => {
    if (!token) return;
    try {
      const currentUser = await getCurrentUserApi();
      setUser(currentUser);
    } catch {
      handleLogout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        registerDonor,
        logout: handleLogout,
        refetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
