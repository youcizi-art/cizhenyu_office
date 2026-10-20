"use client";

import React, { useState } from "react";
import { useExtracted } from "next-intl";
import { useEnterprise } from "../context/enterprise-auth-context";
import { Building2, Mail, Lock, User, Sparkles, Loader2, X } from "lucide-react";

interface EnterpriseLoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EnterpriseLoginDialog({ isOpen, onClose }: EnterpriseLoginDialogProps) {
  const t = useExtracted();
  const { isInitialized, handleLogin } = useEnterprise();

  const [isBootstrapMode, setIsBootstrapMode] = useState<boolean>(!isInitialized);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const success = await handleLogin({
      email,
      password,
      name: isBootstrapMode ? name : undefined,
      orgName: isBootstrapMode ? orgName : undefined,
    });
    setLoading(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* 背景光斑效果 */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {isBootstrapMode
                  ? t({
                      id: "Enterprise.Auth.InitTitle",
                      message: "Initialize Enterprise Workspace",
                    })
                  : t({
                      id: "Enterprise.Auth.LoginTitle",
                      message: "Enterprise Sign In",
                    })}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isBootstrapMode
                  ? t({
                      id: "Enterprise.Auth.InitSubtitle",
                      message: "Create the primary organization and root owner account",
                    })
                  : t({
                      id: "Enterprise.Auth.LoginSubtitle",
                      message: "Sign in with your organizational credentials",
                    })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {isBootstrapMode && (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t({ id: "Enterprise.Auth.OrgNameLabel", message: "Organization Name" })}
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder={t({
                      id: "Enterprise.Auth.OrgNamePlaceholder",
                      message: "e.g. Acme Corporation",
                    })}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                  {t({ id: "Enterprise.Auth.AdminNameLabel", message: "Owner Full Name" })}
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t({
                      id: "Enterprise.Auth.AdminNamePlaceholder",
                      message: "e.g. John Doe",
                    })}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t({ id: "Enterprise.Auth.EmailLabel", message: "Work Email" })}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              {t({ id: "Enterprise.Auth.PasswordLabel", message: "Password" })}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-sm shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {t({ id: "Enterprise.Auth.Submitting", message: "Authenticating..." })}
                  </span>
                </>
              ) : isBootstrapMode ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {t({
                      id: "Enterprise.Auth.InitSubmit",
                      message: "Create & Initialize Workspace",
                    })}
                  </span>
                </>
              ) : (
                <span>{t({ id: "Enterprise.Auth.SignIn", message: "Sign In" })}</span>
              )}
            </button>
          </div>
        </form>

        {!isInitialized && (
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setIsBootstrapMode(!isBootstrapMode)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              {isBootstrapMode
                ? t({
                    id: "Enterprise.Auth.SwitchToLogin",
                    message: "Already have an account? Sign In",
                  })
                : t({
                    id: "Enterprise.Auth.SwitchToInit",
                    message: "Need to initialize first owner? Click here",
                  })}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
