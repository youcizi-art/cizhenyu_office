"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { useExtracted } from "next-intl";
import { useEnterprise } from "../context/enterprise-auth-context";
import { getNewUrl } from "@/utils/editor/utils";
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode2,
  Users,
  Ticket,
  Plus,
} from "lucide-react";

interface QuickActionsProps {
  onOpenMembers: () => void;
  onOpenInvitations: () => void;
  onOpenPermissions?: () => void;
}

export function DashboardQuickActions({
  onOpenMembers,
  onOpenInvitations,
  onOpenPermissions,
}: QuickActionsProps) {
  const t = useExtracted();
  const router = useRouter();
  const { isAdmin } = useEnterprise();

  const handleCreateDocument = (type: "docx" | "xlsx" | "pptx" | "md") => {
    router.push(getNewUrl(type));
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#18181b]/80">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold tracking-tight text-foreground flex items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          <span>{t({ id: "Enterprise.Dashboard.QuickActions", message: "Quick Actions" })}</span>
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 新建 Word */}
        <button
          type="button"
          onClick={() => handleCreateDocument("docx")}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-blue-50/50 hover:border-blue-300 dark:border-white/5 dark:bg-white/5 dark:hover:bg-blue-500/10 dark:hover:border-blue-500/30 transition-all cursor-pointer group text-center"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform mb-2">
            <FileText className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-foreground">
            {t({ id: "NewWordDoc", message: "Word Document" })}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">.docx</span>
        </button>

        {/* 新建 Excel */}
        <button
          type="button"
          onClick={() => handleCreateDocument("xlsx")}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-emerald-50/50 hover:border-emerald-300 dark:border-white/5 dark:bg-white/5 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-500/30 transition-all cursor-pointer group text-center"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform mb-2">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-foreground">
            {t({ id: "NewExcelSheet", message: "Spreadsheet" })}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">.xlsx</span>
        </button>

        {/* 新建 PPT */}
        <button
          type="button"
          onClick={() => handleCreateDocument("pptx")}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-amber-50/50 hover:border-amber-300 dark:border-white/5 dark:bg-white/5 dark:hover:bg-amber-500/10 dark:hover:border-amber-500/30 transition-all cursor-pointer group text-center"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform mb-2">
            <Presentation className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-foreground">
            {t({ id: "NewPresentation", message: "Presentation" })}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">.pptx</span>
        </button>

        {/* 新建 Markdown */}
        <button
          type="button"
          onClick={() => handleCreateDocument("md")}
          className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-300 dark:border-white/5 dark:bg-white/5 dark:hover:bg-indigo-500/10 dark:hover:border-indigo-500/30 transition-all cursor-pointer group text-center"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform mb-2">
            <FileCode2 className="h-5 w-5" />
          </div>
          <span className="text-xs font-medium text-foreground">
            {t({ id: "NewMarkdown", message: "Markdown" })}
          </span>
          <span className="text-[10px] text-muted-foreground mt-0.5">.md</span>
        </button>

        {/* 管理员专属: 成员管理 */}
        {isAdmin && (
          <button
            type="button"
            onClick={onOpenMembers}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-purple-50/50 hover:border-purple-300 dark:border-white/5 dark:bg-white/5 dark:hover:bg-purple-500/10 dark:hover:border-purple-500/30 transition-all cursor-pointer group text-center"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform mb-2">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-foreground">
              {t({ id: "Enterprise.Dashboard.ManageStaff", message: "Manage Staff" })}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">Admin</span>
          </button>
        )}

        {/* 管理员专属: 邀请凭证 */}
        {isAdmin && (
          <button
            type="button"
            onClick={onOpenInvitations}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-teal-50/50 hover:border-teal-300 dark:border-white/5 dark:bg-white/5 dark:hover:bg-teal-500/10 dark:hover:border-teal-500/30 transition-all cursor-pointer group text-center"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 group-hover:scale-105 transition-transform mb-2">
              <Ticket className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-foreground">
              {t({ id: "Enterprise.Dashboard.InviteCodes", message: "Invite Codes" })}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">Security</span>
          </button>
        )}

        {/* 管理员专属: 权限矩阵管理 (跳转独立页面) */}
        {isAdmin && (
          <button
            type="button"
            onClick={() => router.push("/permissions")}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-slate-200/60 bg-slate-50/50 hover:bg-rose-50/50 hover:border-rose-300 dark:border-white/5 dark:bg-white/5 dark:hover:bg-rose-500/10 dark:hover:border-rose-500/30 transition-all cursor-pointer group text-center"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:scale-105 transition-transform mb-2">
              <Plus className="h-5 w-5" />
            </div>
            <span className="text-xs font-medium text-foreground">
              {t({ id: "Enterprise.Dashboard.PermissionMatrix", message: "Permissions" })}
            </span>
            <span className="text-[10px] text-muted-foreground mt-0.5">RBAC</span>
          </button>
        )}
      </div>
    </div>
  );
}
