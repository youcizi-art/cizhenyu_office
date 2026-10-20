"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  EnterpriseUser,
  EnterpriseOrg,
  checkEnterpriseAuth,
  enterpriseLogin,
  enterpriseLogout,
} from "@/lib/enterprise-api";
import { usePermissions, AppAbility } from "../hooks/use-permissions";
import { useExtracted } from "next-intl";
import { toast } from "sonner";

interface EnterpriseContextType {
  user: EnterpriseUser | null;
  org: EnterpriseOrg | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  enterpriseConfigured: boolean;
  isInitialized: boolean;
  ability: AppAbility;
  isOwner: boolean;
  isAdmin: boolean;
  canManageMembers: boolean;
  canEditDocument: (docPerm?: string | null) => boolean;
  canCommentDocument: (docPerm?: string | null) => boolean;
  handleLogin: (params: {
    email: string;
    password: string;
    name?: string;
    orgName?: string;
  }) => Promise<boolean>;
  handleLogout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const EnterpriseContext = createContext<EnterpriseContextType | null>(null);

export function useEnterprise() {
  const context = useContext(EnterpriseContext);
  if (!context) {
    throw new Error("useEnterprise must be used within an EnterpriseProvider");
  }
  return context;
}

export function EnterpriseProvider({ children }: { children: React.ReactNode }) {
  const t = useExtracted();
  const [user, setUser] = useState<EnterpriseUser | null>(null);
  const [org, setOrg] = useState<EnterpriseOrg | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [enterpriseConfigured, setEnterpriseConfigured] = useState<boolean>(true);
  const [isInitialized, setIsInitialized] = useState<boolean>(true);

  const permissions = usePermissions(user);

  const refreshAuth = useCallback(async () => {
    try {
      const res = await checkEnterpriseAuth();
      setEnterpriseConfigured(res.enterpriseConfigured);
      setIsInitialized(res.isInitialized !== false);

      if (res.authenticated && res.user && res.org) {
        setUser(res.user);
        setOrg(res.org);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setOrg(null);
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
      setUser(null);
      setOrg(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [refreshAuth]);

  const handleLogin = async (params: {
    email: string;
    password: string;
    name?: string;
    orgName?: string;
  }): Promise<boolean> => {
    try {
      const res = await enterpriseLogin(params);
      if (res.success && res.user && res.org) {
        setUser(res.user);
        setOrg(res.org);
        setIsAuthenticated(true);
        toast.success(
          t({
            id: "Enterprise.Auth.LoginSuccess",
            message: "Successfully signed in to enterprise account",
          })
        );
        return true;
      } else {
        toast.error(
          res.error ||
            t({
              id: "Enterprise.Auth.LoginFailed",
              message: "Invalid credentials or account disabled",
            })
        );
        return false;
      }
    } catch (e: any) {
      toast.error(
        e.message ||
          t({
            id: "Enterprise.Auth.LoginNetworkError",
            message: "Failed to connect to authentication service",
          })
      );
      return false;
    }
  };

  const handleLogout = async () => {
    try {
      await enterpriseLogout();
      setUser(null);
      setOrg(null);
      setIsAuthenticated(false);
      toast.success(
        t({
          id: "Enterprise.Auth.LogoutSuccess",
          message: "Signed out of enterprise account",
        })
      );
    } catch {
      setUser(null);
      setOrg(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <EnterpriseContext.Provider
      value={{
        user,
        org,
        isAuthenticated,
        isLoading,
        enterpriseConfigured,
        isInitialized,
        ...permissions,
        handleLogin,
        handleLogout,
        refreshAuth,
      }}
    >
      {children}
    </EnterpriseContext.Provider>
  );
}
