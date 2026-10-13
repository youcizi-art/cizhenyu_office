"use client";

import React from "react";
import { ShieldCheck, Cloud, Lock, Sparkles, Heart, FileCheck, Layers } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { Logo } from "../svg";

export function AboutView() {
  usePageTitle("关于 — CIZHENYU Office");

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
          现代高性能私有在线 Office 套件，为您提供流畅、安全、高保真的云端文档编辑与资产归档管理体验。
        </p>
      </div>

      {/* 核心产品特性卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-card border border-border rounded-2xl hover:border-primary/40 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-2">桌面级编辑内核</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            支持 Word、Excel、PowerPoint、PDF 等全主流 Office 格式，具备极佳的排版兼容度与快速响应体验。
          </p>
        </div>

        <div className="p-6 bg-card border border-border rounded-2xl hover:border-primary/40 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
            <Cloud className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-2">Cloudflare R2 存储</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            连接高可用对象存储，实现多级树形目录归类归档、Ctrl+S 快速覆盖保存，以及毫秒级文档加载。
          </p>
        </div>

        <div className="p-6 bg-card border border-border rounded-2xl hover:border-primary/40 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-foreground mb-2">轻量鉴权与安全分享</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            采用单密钥访问认证，支持一键生成免密只读安全外链，兼顾私有数据的隐私保护与外部协同分发需求。
          </p>
        </div>
      </div>

      {/* 开源合规声明区块 (AGPL-3.0 规定) */}
      <div className="p-8 bg-card border border-border rounded-3xl space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <h3 className="text-lg font-bold text-foreground">开源技术与许可声明</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          CIZHENYU OFFICE 秉持开源精神，基于优秀的 OnlyOffice 开源核心及社区生态成果进行深度定制与云原生架构重构。
        </p>
        <div className="p-4 bg-muted/40 rounded-xl border border-border/60 text-xs text-muted-foreground space-y-2">
          <div className="flex items-center gap-2 text-foreground font-semibold">
            <FileCheck className="w-4 h-4 text-primary" />
            <span>开源许可证：GNU Affero General Public License v3.0 (AGPL-3.0)</span>
          </div>
          <p>
            本程序为自由软件。我们在遵守 AGPL-3.0 开源协议的前提下进行功能扩展、云端存储集成与界面优化，您可以根据自由软件基金会发布的 GNU Affero 通用公共许可证条款重新分发和/或修改它。
          </p>
        </div>
      </div>

      {/* 底部愿景 */}
      <div className="p-8 bg-linear-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-3xl text-center space-y-3">
        <Heart className="w-6 h-6 text-primary mx-auto" />
        <h3 className="text-lg font-bold text-foreground">构建更敏捷高效的数字办公空间</h3>
        <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
          CIZHENYU OFFICE 将持续聚焦办公体验与云端集成能力的打磨，为团队与个人提供开箱即用、安全自主的办公基础设施。
        </p>
      </div>
    </div>
  );
}
