"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [requiresPassword, setRequiresPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [password, setPassword] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const refreshAuth = async () => {
    try {
      // 方案 1：优先采用前端构建期 .env 注入的访问密钥（100% 免疫静态部署环境丢失变量的问题）
      if (CLIENT_SECRET) {
        setRequiresPassword(true);
        const savedSessionStr = localStorage.getItem(AUTH_STORAGE_KEY);
        if (savedSessionStr) {
          try {
            const session = JSON.parse(savedSessionStr);
            if (session?.expiresAt && session.expiresAt > Date.now()) {
              const targetHash =
                CLIENT_SECRET.length === 64
                  ? CLIENT_SECRET.toLowerCase()
                  : await sha256Hex(CLIENT_SECRET);
              if (session.hash === targetHash) {
                setIsAuthenticated(true);
                return;
              }
            }
          } catch {
            localStorage.removeItem(AUTH_STORAGE_KEY);
          }
        }
        setIsAuthenticated(false);
        return;
      }

      // 方案 2：未配置前端 .env 密钥时，回退到服务端 Cloudflare Pages Functions 运行时校验
      const res = await checkAuth();
      setIsAuthenticated(res.authenticated);
      setRequiresPassword(res.requiresPassword);
    } catch {
      setIsAuthenticated(false);
      setRequiresPassword(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAuth();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = password.trim();
    if (!trimmedInput) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // 若存在前端配置的 CLIENT_SECRET
      if (CLIENT_SECRET) {
        const isMatch = await verifyClientSecret(trimmedInput, CLIENT_SECRET);
        if (!isMatch) {
          setErrorMessage("访问密钥不正确，请重新输入");
          return;
        }

        const inputHash = await sha256Hex(trimmedInput);
        localStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            hash: inputHash,
            expiresAt: Date.now() + SESSION_DURATION_MS,
          })
        );
        setIsAuthenticated(true);
        setPassword("");

        // 异步尝试同步至服务端 Functions（如果配置了 R2 后端），不阻碍前端直接进入
        login(trimmedInput).catch(() => {});
        return;
      }

      // 服务端 Functions 登录逻辑
      const res = await login(trimmedInput);
      if (res.success) {
        setIsAuthenticated(true);
        setPassword("");
      } else {
        setErrorMessage(res.error || "访问密钥错误");
      }
    } catch (err) {
      setErrorMessage("登录失败: " + String(err));
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
          <p className="text-sm text-muted-foreground">正在验证访问权限...</p>
        </div>
      </div>
    );
  }

  // 需要密码且未验证通过，显示优雅简约的登录卡片
  if (requiresPassword && !isAuthenticated) {
    return (
      <div className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden bg-slate-50 dark:bg-[#0a0a0c] p-4 font-sans text-foreground">
        {/* 背景光晕装饰 */}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl dark:bg-primary/10" />

        <div className="relative w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/80 p-8 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-[#141416]/90">
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-8 ring-primary/5">
              <Lock className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              私有文档工作台
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground">
              请输入访问密钥以继续使用在线 Office 与文档库
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="access-key"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                访问密钥
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
                  placeholder="输入访问密钥..."
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
                  <span>正在验证...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>解锁进入系统</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-border/50 pt-4 text-center">
            <p className="text-[11px] text-muted-foreground">
              已启用私有访问密钥安全保护机制
            </p>
          </div>
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
      {children}
    </AuthContext.Provider>
  );
}
