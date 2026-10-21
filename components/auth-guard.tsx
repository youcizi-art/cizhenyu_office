"use client";

import React, { createContext, useContext } from "react";
import { useExtracted } from "next-intl";
import { useEnterprise } from "@/components/enterprise/context/enterprise-auth-context";
import { EnterpriseLoginPortal } from "@/components/enterprise/auth/enterprise-login-portal";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresPassword: boolean;
  handleLogout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  isLoading: true,
  requiresPassword: true,
  handleLogout: async () => {},
  refreshAuth: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/**
 * 企业版统一安全门禁 (Enterprise Zero-Trust AuthGuard)
 * 未登录用户绝不挂载内部受保护路由与组件，直接呈现企业统一登录门户
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const t = useExtracted();
  const { isAuthenticated, isLoading, handleLogout, refreshAuth } = useEnterprise();

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            {t({ id: "Verifying", message: "Verifying credentials..." })}
          </p>
        </div>
      </div>
    );
  }

  // 未登录时，呈现专属企业登录门户
  if (!isAuthenticated) {
    return (
      <AuthContext.Provider
        value={{
          isAuthenticated: false,
          isLoading: false,
          requiresPassword: true,
          handleLogout,
          refreshAuth,
        }}
      >
        <EnterpriseLoginPortal />
      </AuthContext.Provider>
    );
  }

  // 已登录时，挂载工作台与应用内容
  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: true,
        isLoading: false,
        requiresPassword: false,
        handleLogout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
