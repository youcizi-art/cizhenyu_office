"use client";

import React, { useState } from "react";
import { useExtracted } from "next-intl";
import { useEnterprise } from "../context/enterprise-auth-context";
import { LanguageSwitcher } from "@/components/language-switcher";
import {
  Building2,
  Lock,
  Mail,
  User,
  KeyRound,
  ShieldCheck,
  Loader2,
  Ticket,
  Sparkles,
} from "lucide-react";

export function EnterpriseLoginPortal() {
  const t = useExtracted();
  const { isInitialized, handleLogin, handleAcceptInvitation } = useEnterprise();

  const [activeTab, setActiveTab] = useState<"login" | "invite">("login");
  const [submitting, setSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // 登录/初始化字段
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");

  // 邀请码激活字段
  const [inviteCode, setInviteCode] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");

  const onLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setSubmitting(true);
    try {
      const success = await handleLogin({
        email: email.trim(),
        password,
        name: isInitialized ? undefined : name.trim(),
        orgName: isInitialized ? undefined : orgName.trim(),
      });
      if (!success) {
        setLoginError(t({ id: "Enterprise.Auth.LoginFailed", message: "Invalid email or password" }));
      }
    } catch (err: any) {
      setLoginError(err.message || "Failed to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  const onInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await handleAcceptInvitation({
        code: inviteCode.trim(),
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        password: invitePassword,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 dark:bg-[#0a0a0c] text-foreground relative overflow-hidden transition-colors duration-300">
      {/* 背景动态光晕 */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/8 rounded-full blur-[140px] pointer-events-none" />

      {/* 顶部企业栏与多语言切换器 */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-foreground">
              CIZHENYU Office
            </h1>
            <span className="text-[11px] font-semibold tracking-wider uppercase text-primary">
              {t({ id: "EnterpriseEdition", message: "Enterprise Edition" })}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
        </div>
      </header>

      {/* 中心登录/激活卡片 */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-slate-200/80 bg-white/95 dark:border-white/10 dark:bg-[#141416]/95 p-8 shadow-2xl backdrop-blur-xl">
          {/* 标题 */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {!isInitialized
                ? t({ id: "Enterprise.Auth.InitTitle", message: "Initialize Enterprise" })
                : activeTab === "login"
                ? t({ id: "Enterprise.Auth.SignInTitle", message: "Enterprise Sign In" })
                : t({ id: "Enterprise.Auth.JoinTitle", message: "Activate Invitation" })}
            </h2>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {!isInitialized
                ? t({
                    id: "Enterprise.Auth.InitDesc",
                    message: "Create the first Super Administrator account for your organization.",
                  })
                : activeTab === "login"
                ? t({
                    id: "Enterprise.Auth.SignInDesc",
                    message: "Sign in with your organization account credentials.",
                  })
                : t({
                    id: "Enterprise.Auth.JoinDesc",
                    message: "Enter your one-time invitation code provided by administrator.",
                  })}
            </p>
          </div>

          {/* 切换 Tab (已初始化时展示) */}
          {isInitialized && (
            <div className="flex rounded-xl bg-slate-100 dark:bg-white/5 p-1 mb-6 text-xs font-medium">
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer ${
                  activeTab === "login"
                    ? "bg-white dark:bg-[#202024] text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t({ id: "Enterprise.Auth.AccountLogin", message: "Staff Sign In" })}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("invite")}
                className={`flex-1 py-2 rounded-lg text-center transition-all cursor-pointer ${
                  activeTab === "invite"
                    ? "bg-white dark:bg-[#202024] text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t({ id: "Enterprise.Auth.InviteCode", message: "Invitation Code" })}
              </button>
            </div>
          )}

          {/* 表单区域 */}
          {activeTab === "login" || !isInitialized ? (
            <form onSubmit={onLoginSubmit} className="space-y-4">
              {loginError && (
                <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
                  <span className="font-semibold">{loginError}</span>
                </div>
              )}
              {!isInitialized && (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t({ id: "Enterprise.Auth.OrgName", message: "Organization Name" })}
                    </label>
                    <div className="relative">
                      <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="e.g. Acme Corp"
                        className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-muted-foreground">
                      {t({ id: "Enterprise.Auth.AdminName", message: "Administrator Name" })}
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t({ id: "Enterprise.Auth.Email", message: "Work Email" })}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@company.com"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t({ id: "Enterprise.Auth.Password", message: "Password" })}
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : !isInitialized ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    <span>{t({ id: "Enterprise.Auth.InitSubmit", message: "Initialize & Launch" })}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>{t({ id: "Enterprise.Auth.SignIn", message: "Sign In" })}</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={onInviteSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t({ id: "Enterprise.Auth.InvitationCodeLabel", message: "Invitation Code" })}
                </label>
                <div className="relative">
                  <Ticket className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="YCZ-XXXXXX"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm font-mono uppercase focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t({ id: "Enterprise.Auth.YourName", message: "Your Full Name" })}
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    required
                    value={inviteName}
                    onChange={(e) => setInviteName(e.target.value)}
                    placeholder="Alice Smith"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t({ id: "Enterprise.Auth.WorkEmail", message: "Your Work Email" })}
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="alice@company.com"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t({ id: "Enterprise.Auth.SetPassword", message: "Create Password" })}
                </label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-3 text-sm focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>{t({ id: "Enterprise.Auth.ActivateAndJoin", message: "Activate & Join" })}</span>
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-border/50 text-center">
            <p className="text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>{t({ id: "Enterprise.Auth.InternalOnly", message: "Strictly for authorized enterprise personnel" })}</span>
            </p>
          </div>
        </div>
      </main>

      {/* 底部版权 */}
      <footer className="relative z-10 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} CIZHENYU Office. All Rights Reserved.
      </footer>
    </div>
  );
}
