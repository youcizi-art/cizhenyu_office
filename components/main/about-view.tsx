"use client";

import React from "react";
import { ShieldCheck, Cloud, Lock, Sparkles, Heart, FileCheck } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useExtracted } from "@/hooks/use-i18n";
import { Logo } from "../svg";

export function AboutView() {
  const t = useExtracted();
  usePageTitle(t({ id: "AboutTitle", message: "About — CIZHENYU Office" }));

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 py-6">
      {/* 头部品牌展示 */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-4 shadow-sm">
          <Logo className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
          CIZHENYU OFFICE
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t({
            id: "AboutHeroDesc",
            message:
              "Modern high-performance private online office suite, providing you with smooth, secure, high-fidelity cloud document editing and asset management.",
          })}
        </p>
      </div>

      {/* 核心产品特性卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-card border border-border rounded-2xl hover:border-primary/40 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-2">
            {t({ id: "DesktopEditingCore", message: "Desktop-Class Core" })}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t({
              id: "DesktopEditingCoreDesc",
              message:
                "Supports Word, Excel, PowerPoint, PDF, Markdown and media files with outstanding formatting compatibility and instant responsiveness.",
            })}
          </p>
        </div>

        <div className="p-6 bg-card border border-border rounded-2xl hover:border-primary/40 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
            <Cloud className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-2">
            {t({ id: "R2CloudStorage", message: "Cloudflare R2 Storage" })}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t({
              id: "R2CloudStorageDesc",
              message:
                "Connected to high-availability object storage for multi-level category archiving, Ctrl+S fast saving, and millisecond document loading.",
            })}
          </p>
        </div>

        <div className="p-6 bg-card border border-border rounded-2xl hover:border-primary/40 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-2">
            {t({ id: "LightweightAuthSharing", message: "Auth & Secure Sharing" })}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {t({
              id: "LightweightAuthSharingDesc",
              message:
                "Protected with single access key authentication and instant read-only public or passcode-protected web sharing links.",
            })}
          </p>
        </div>
      </div>

      {/* 开源合规声明区块 */}
      <div className="p-8 bg-card border border-border rounded-3xl space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-bold text-foreground">
            {t({ id: "OpenSourceNoticeTitle", message: "Open Source Technologies & License" })}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {t({
            id: "OpenSourceNoticeDesc",
            message:
              "CIZHENYU Office adheres to open-source values, customized and rebuilt on top of modern open-source core technologies and community standards.",
          })}
        </p>
        <div className="p-4 bg-muted/40 rounded-xl border border-border/60 text-xs text-muted-foreground space-y-2">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <FileCheck className="w-4 h-4 text-primary" />
            <span>
              {t({
                id: "GnuLicenseTitle",
                message: "Open Source License: GNU Affero General Public License v3.0 (AGPL-3.0)",
              })}
            </span>
          </div>
          <p>
            {t({
              id: "GnuLicenseDesc",
              message:
                "This application is free software. You can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation.",
            })}
          </p>
        </div>
      </div>

      {/* 底部愿景 */}
      <div className="p-8 bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl text-center space-y-3">
        <Heart className="w-6 h-6 text-primary mx-auto" />
        <h3 className="text-lg font-bold text-foreground">
          {t({ id: "AboutVisionTitle", message: "Building an Agile & Efficient Digital Workspace" })}
        </h3>
        <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
          {t({
            id: "AboutVisionDesc",
            message:
              "CIZHENYU Office continuously refines online document workflows and cloud integration capabilities for individuals and teams worldwide.",
          })}
        </p>
      </div>
    </div>
  );
}
