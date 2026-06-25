import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { User, LoginInput, RegisterInput } from "@workspace/api-client-react";
import { useGetMe, login as apiLogin, register as apiRegister, logout as apiLogout } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  const { data: me, isLoading: isLoadingMe, refetch } = useGetMe({
    query: {
      retry: false,
    }
  });

  useEffect(() => {
    if (me) {
      setUser(me);
    }
  }, [me]);

  const login = async (data: LoginInput) => {
    try {
      const result = await apiLogin(data);
      localStorage.setItem("irforge_token", result.token);
      setUser(result.user);
      setLocation("/dashboard");
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const register = async (data: RegisterInput) => {
    try {
      const result = await apiRegister(data);
      localStorage.setItem("irforge_token", result.token);
      setUser(result.user);
      setLocation("/dashboard");
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error(error);
    } finally {
      localStorage.removeItem("irforge_token");
      setUser(null);
      setLocation("/login");
    }
  };

  const refreshUser = async () => {
    const result = await refetch();
    if (result.data) setUser(result.data);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: isLoadingMe, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
