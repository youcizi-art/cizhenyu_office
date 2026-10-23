"use client";

import {
  FileText,
  Sheet,
  Presentation,
  FileType2,
  FileCode2,
  Files,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState, PropsWithChildren } from "react";
import { useRouter } from "next/navigation";
import { useExtracted } from "next-intl";
import { cn } from "@/lib/utils";

import { useAuth } from "@/components/auth-guard";
import { useEnterprise } from "@/components/enterprise/context/enterprise-auth-context";
import { EnterpriseLoginDialog } from "@/components/enterprise/auth/enterprise-login-dialog";
import { RoleBadge } from "@/components/enterprise/permissions/permission-badge";
import { LogOut, Building2, Users, Activity } from "lucide-react";

export function Header({ children }: PropsWithChildren<{ className?: string }>) {
  const router = useRouter();
  const t = useExtracted();
  const { requiresPassword, isAuthenticated, handleLogout } = useAuth();
  const {
    user: enterpriseUser,
    org: enterpriseOrg,
    isAuthenticated: isEnterpriseAuth,
    isAdmin: isEnterpriseAdmin,
    handleLogout: handleEnterpriseLogout,
  } = useEnterprise();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showEnterpriseLogin, setShowEnterpriseLogin] = useState(false);

  const quickActions = [
    {
      type: "docx",
      icon: FileText,
      color:
        "text-blue-600 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60",
    },
    {
      type: "xlsx",
      icon: Sheet,
      color:
        "text-green-600 bg-green-50 dark:bg-green-900/40 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/60",
    },
    {
      type: "pptx",
      icon: Presentation,
      color:
        "text-orange-600 bg-orange-50 dark:bg-orange-900/40 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/60",
    },
    {
      type: "pdf",
      icon: FileType2,
      color:
        "text-red-600 bg-red-50 dark:bg-red-900/40 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60",
    },
    {
      type: "md",
      icon: FileCode2,
      color:
        "text-purple-600 bg-purple-50 dark:bg-purple-900/40 dark:text-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/60",
    },
  ];

  return (
    <header className="h-16 flex items-center justify-between px-4 z-20 w-full shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center">
          <Image width={40} height={40} src="/logo.svg" className="w-10 h-10" alt="CIZHENYU Office logo" />
        </div>
        <h1 className="text-xl font-extrabold tracking-normal text-foreground leading-5">
          {"CIZHENYU OFFICE"}
        </h1>
      </div>

      {children}

      <div className="hidden md:flex items-center gap-2">
        {quickActions.map((action) => (
          <button
            key={action.type}
            onClick={() => router.push(`/editor?new=${action.type}`)}
            className={cn(
              "p-2 rounded-lg transition-all duration-200 flex items-center justify-center cursor-pointer",
              action.color,
            )}
            title={t("New {type}", { type: action.type })}
          >
            <action.icon className="w-5 h-5" />
          </button>
        ))}

        {/* 企业版工作区状态 / 登录入口 */}
        {isEnterpriseAuth && enterpriseUser ? (
          <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-border/50">
            {isEnterpriseAdmin ? (
              <div className="flex items-center gap-1.5">
                <Link
                  href="/audit-logs"
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                  title={t({ id: "Enterprise.Header.AuditLogs", message: "Compliance & Audit Trail" })}
                >
                  <Activity className="w-4 h-4" />
                </Link>
                <Link
                  href="/members"
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs transition-all border bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20 cursor-pointer"
                  title={t({ id: "Enterprise.Header.ManageTeam", message: "Manage Workspace Members" })}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="font-medium max-w-[100px] truncate">
                    {enterpriseOrg?.name || "Enterprise"}
                  </span>
                  <RoleBadge role={enterpriseUser.role} size="sm" />
                </Link>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs border bg-muted/40 border-border/40 text-foreground cursor-default"
                title={enterpriseOrg?.name || "Enterprise"}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span className="font-medium max-w-[100px] truncate">
                  {enterpriseOrg?.name || "Enterprise"}
                </span>
                <RoleBadge role={enterpriseUser.role} size="sm" />
              </div>
            )}
            <button
              onClick={handleEnterpriseLogout}
              className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-destructive/10 transition-colors cursor-pointer"
              title={t({ id: "Enterprise.Header.SignOut", message: "Sign out of Enterprise account" })}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowEnterpriseLogin(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 transition-all cursor-pointer ml-1"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{t({ id: "Enterprise.Header.EnterpriseEdition", message: "Enterprise" })}</span>
          </button>
        )}

        {requiresPassword && isAuthenticated && (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all flex items-center justify-center cursor-pointer ml-1"
            title={t({ id: "LogOut", message: "Log Out" })}
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 企业登录与初始化弹窗 */}
      <EnterpriseLoginDialog
        isOpen={showEnterpriseLogin}
        onClose={() => setShowEnterpriseLogin(false)}
      />

      {/* 退出登录确认弹窗 */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl text-foreground space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-foreground">
                {t({ id: "LogoutConfirmTitle", message: "Log Out" })}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t({ id: "LogoutConfirmDesc", message: "Are you sure you want to log out of your session?" })}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                {t({ id: "Cancel", message: "Cancel" })}
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowLogoutConfirm(false);
                  await handleLogout();
                }}
                className="px-3.5 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold hover:bg-destructive/90 shadow-xs transition-colors cursor-pointer"
              >
                {t({ id: "ConfirmLogout", message: "Log Out" })}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
