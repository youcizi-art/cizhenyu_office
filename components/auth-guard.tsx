"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useExtracted } from "@/hooks/use-i18n";
import { checkAuth, login, logout } from "@/lib/api";
import { Lock, KeyRound, Loader2, ShieldCheck } from "lucide-react";

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
  requiresPassword: false,
  handleLogout: async () => {},
  refreshAuth: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// 客户端支持通过 .env / .env.local 注入静态访问密钥
const CLIENT_SECRET = (
  process.env.NEXT_PUBLIC_ACCESS_KEY ||
  process.env.NEXT_PUBLIC_PASSWORD ||
  ""
).trim();

const AUTH_STORAGE_KEY = "office_client_auth_v1";
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 天有效期

/**
 * 计算字符串的 SHA-256 十六进制哈希
 */
async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest("SHA-256", enc.encode(text));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * 校验输入密码是否与客户端配置的密钥或哈希匹配
 */
async function verifyClientSecret(input: string, secret: string): Promise<boolean> {
  if (!input || !secret) return false;
  // 直接明文匹配
  if (input === secret) return true;
  // 计算输入哈希进行比对（支持 secret 为 64 位 SHA-256 哈希值）
  const inputHash = await sha256Hex(input);
  if (inputHash.toLowerCase() === secret.toLowerCase()) return true;
  return false;
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const t = useExtracted();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [requiresPassword, setRequiresPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [password, setPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const refreshAuth = async () => {
    try {
      // 优先通过服务端校验当前登录态（支持 CF Pages 后台修改环境变量热更新生效，无需重新构建）
      const res = await checkAuth();
      if (res.authenticated) {
        setIsAuthenticated(true);
        setRequiresPassword(res.requiresPassword);
        return;
      }

      // 如果服务端要求密码且当前未登录
      if (res.requiresPassword) {
        setRequiresPassword(true);
        setIsAuthenticated(false);
        return;
      }

      // 服务端未配置密码，直接放行
      setIsAuthenticated(true);
      setRequiresPassword(false);
    } catch {
      setIsAuthenticated(false);
      setRequiresPassword(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();

    // 监听全局未授权事件 (例如保存或其他 API 返回 401)
    const onUnauthorized = () => {
      setIsAuthenticated(false);
      setRequiresPassword(true);
      setErrorMessage(
        t({
          id: "AuthSessionExpiredHint",
          message:
            "Login session expired or access key changed, please re-enter access key to continue",
        })
      );
    };

    window.addEventListener("auth:unauthorized", onUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", onUnauthorized);
    };
  }, [t]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = password.trim();
    if (!trimmedInput) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // 统一调用服务端 Functions 登录逻辑，由服务端比对当前最新的环境变量 PASSWORD 或 ACCESS_KEY
      const res = await login(trimmedInput);
      if (res.success) {
        setIsAuthenticated(true);
        setPassword("");
        setErrorMessage("");
        // 登录成功后刷新页面以立即获取用户云端文档列表
        window.location.reload();
      } else {
        setErrorMessage(
          res.error ||
            t({ id: "InvalidAccessKey", message: "Invalid access key, please try again" })
        );
      }
    } catch (err) {
      setErrorMessage(String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    await logout().catch(() => {});
    setIsAuthenticated(false);
    setPassword("");
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{t({ id: "Verifying", message: "Verifying..." })}</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        requiresPassword,
        handleLogout,
        refreshAuth,
      }}
    >
      {/* 主界面内容持续挂载，避免编辑中的文档内容丢失 */}
      {children}

      {/* 当要求密码且未登录时，显示统一高质感的模态登录弹窗 */}
      {requiresPassword && !isAuthenticated && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/95 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#141416]/95 text-foreground">
            {/* 背景光晕装饰 */}
            <div className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl dark:bg-primary/10" />

            <div className="relative mb-6 flex flex-col items-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-8 ring-primary/5">
                <Lock className="h-7 w-7" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {t({ id: "PrivateWorkspace", message: "Private Workspace" })}
              </h2>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {t({ id: "EnterAccessKeyDesc", message: "Please enter your access key to continue" })}
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="relative space-y-4">
              <div>
                <label
                  htmlFor="access-key"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
                >
                  {t({ id: "AccessKey", message: "Access Key" })}
                </label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <input
                    id="access-key"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t({ id: "EnterAccessKeyPlaceholder", message: "Enter access key..." })}
                    autoFocus
                    required
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm text-foreground shadow-xs transition-colors placeholder:text-muted-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-lg bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-medium text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t({ id: "Verifying", message: "Verifying..." })}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>{t({ id: "UnlockSystem", message: "Unlock & Enter" })}</span>
                  </>
                )}
              </button>
            </form>

            <div className="relative mt-6 border-t border-border/50 pt-4 text-center">
              <p className="text-[11px] text-muted-foreground">
                {t({ id: "AccessKeyProtected", message: "Protected by Access Key" })}
              </p>
            </div>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  );
}
