"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useExtracted } from "next-intl";
import {
  AuditLogItem,
  AuditLogPagination,
  fetchAuditLogs,
  deleteAuditLog,
  pruneAuditLogs,
} from "@/lib/enterprise-api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Shield,
  Search,
  Filter,
  Calendar,
  User,
  Activity,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  Clock,
  Laptop,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  LOCK_ACQUIRE: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
  LOCK_RELEASE: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  LOCK_FORCE_TAKEOVER: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400" },
  LOGIN: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
  DOC_CREATE: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
  DOC_UPDATE: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400" },
  DOC_DELETE: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400" },
  MEMBER_CREATE: { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400" },
  MEMBER_DELETE: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400" },
  ROLE_GROUP_CREATE: { bg: "bg-cyan-500/10", text: "text-cyan-600 dark:text-cyan-400" },
  PERM_CHANGE: { bg: "bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
};

export function AuditLogsView() {
  const t = useExtracted();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pagination, setPagination] = useState<AuditLogPagination>({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null);
  const [isPruningOpen, setIsPruningOpen] = useState<boolean>(false);
  const [pruneDays, setPruneDays] = useState<number>(30);
  const [isPruning, setIsPruning] = useState<boolean>(false);

  const handleDeleteSingleLog = async (id: string) => {
    try {
      const res = await deleteAuditLog(id);
      if (res.success) {
        toast.success(t({ id: "Enterprise.Audit.LogDeleted", message: "Audit log entry deleted" }));
        setLogs((prev) => prev.filter((l) => l.id !== id));
      } else {
        toast.error(res.error || "Failed to delete log");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete log");
    } finally {
      setDeletingLogId(null);
    }
  };

  const handleConfirmPrune = async () => {
    setIsPruning(true);
    try {
      const res = await pruneAuditLogs(pruneDays);
      if (res.success) {
        toast.success(t({ id: "Enterprise.Audit.LogsPruned", message: "Historical audit logs cleaned up successfully" }));
        setIsPruningOpen(false);
        loadLogs(1);
      } else {
        toast.error(res.error || "Failed to prune logs");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to prune logs");
    } finally {
      setIsPruning(false);
    }
  };

  const loadLogs = useCallback(
    async (pageToLoad = 1) => {
      setLoading(true);
      try {
        const res = await fetchAuditLogs({
          page: pageToLoad,
          pageSize: 25,
          action: actionFilter === "all" ? undefined : actionFilter,
          search: search.trim() || undefined,
        });

        if (res.success) {
          setLogs(res.logs || []);
          setPagination(res.pagination);
        } else {
          toast.error(res.error || "Failed to load audit logs");
        }
      } catch (err: any) {
        toast.error(err.message || "Failed to load audit logs");
      } finally {
        setLoading(false);
      }
    },
    [actionFilter, search]
  );

  useEffect(() => {
    loadLogs(1);
  }, [loadLogs]);

  // 导出 CSV
  const handleExportCSV = () => {
    if (logs.length === 0) {
      toast.info(t({ id: "Enterprise.Audit.NoLogsToExport", message: "No logs to export" }));
      return;
    }

    const headers = ["Time", "User", "Action", "Target", "IP Address", "Details"];
    const rows = logs.map((l) => [
      new Date(l.createdAt).toLocaleString(),
      l.userName,
      l.action,
      l.targetId || "",
      l.ipAddress || "",
      l.details ? JSON.stringify(l.details).replace(/"/g, '""') : "",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" +
      [headers.join(","), ...rows.map((e) => `"${e.join('","')}"`)].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `audit-trail-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(t({ id: "Enterprise.Audit.ExportedCSV", message: "Audit logs exported to CSV" }));
  };

  const getActionStyle = (action: string) => {
    return ACTION_COLORS[action] || { bg: "bg-muted", text: "text-muted-foreground" };
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50/60 dark:bg-zinc-950 p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <span>{t({ id: "Enterprise.Audit.PageTitle", message: "Compliance & Audit Trail" })}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-medium">
                  {t({ id: "Enterprise.Plan.LtdBadge", message: "Enterprise LTD" })}
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t({
                  id: "Enterprise.Audit.PageSubtitle",
                  message: "Comprehensive audit logging of document locks, edits, security overrides, and member events.",
                })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPruningOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-xs font-semibold text-destructive transition-all cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t({ id: "Enterprise.Audit.CleanLogs", message: "Clean History" })}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5 text-muted-foreground" />
              <span>{t({ id: "Enterprise.Audit.ExportCSV", message: "Export CSV" })}</span>
            </button>
          </div>
        </div>

        {/* 筛选与检索栏 */}
        <div className="flex flex-col sm:flex-row items-center gap-3 bg-background p-3 rounded-2xl border border-border shadow-xs">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              placeholder={t({
                id: "Enterprise.Audit.SearchPlaceholder",
                message: "Search by user, document, details, or IP...",
              })}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-muted/40 border border-border/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-48">
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="w-full text-xs bg-muted/40 border border-border/80 rounded-xl px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              >
                <option value="all">
                  {t({ id: "Enterprise.Audit.FilterAllActions", message: "All Actions" })}
                </option>
                <option value="LOCK_ACQUIRE">LOCK_ACQUIRE (加锁编辑)</option>
                <option value="LOCK_RELEASE">LOCK_RELEASE (解锁退出)</option>
                <option value="LOCK_FORCE_TAKEOVER">LOCK_FORCE_TAKEOVER (强制接管)</option>
                <option value="LOGIN">LOGIN (成员登录)</option>
                <option value="DOC_CREATE">DOC_CREATE (创建文档)</option>
                <option value="DOC_UPDATE">DOC_UPDATE (修改保存)</option>
                <option value="DOC_DELETE">DOC_DELETE (删除文档)</option>
                <option value="MEMBER_CREATE">MEMBER_CREATE (添加成员)</option>
                <option value="MEMBER_DELETE">MEMBER_DELETE (移除成员)</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => loadLogs(1)}
              className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors cursor-pointer"
            >
              {t({ id: "Filter", message: "Filter" })}
            </button>
          </div>
        </div>

        {/* 审计日志列表表格 */}
        <div className="bg-background rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
                  <th className="py-3 px-4">{t({ id: "Time", message: "Timestamp" })}</th>
                  <th className="py-3 px-4">{t({ id: "User", message: "Operator" })}</th>
                  <th className="py-3 px-4">{t({ id: "Action", message: "Event Action" })}</th>
                  <th className="py-3 px-4">{t({ id: "Target", message: "Target / Document" })}</th>
                  <th className="py-3 px-4">{t({ id: "IP", message: "IP Address" })}</th>
                  <th className="py-3 px-4">{t({ id: "Details", message: "Event Details" })}</th>
                  <th className="py-3 px-4 text-right">{t({ id: "Actions", message: "Actions" })}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span>{t({ id: "Loading", message: "Loading audit records..." })}</span>
                      </div>
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-muted-foreground">
                      <Activity className="w-8 h-8 opacity-40 mx-auto mb-2" />
                      <p>{t({ id: "Enterprise.Audit.NoRecords", message: "No audit logs found matching criteria." })}</p>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const style = getActionStyle(log.action);
                    return (
                      <tr key={log.id} className="hover:bg-muted/40 transition-colors">
                        {/* 时间戳 */}
                        <td className="py-3 px-4 whitespace-nowrap text-muted-foreground font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 opacity-60 shrink-0" />
                            <span>{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                        </td>

                        {/* 操作人 */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px] shrink-0">
                              {log.userName.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-foreground">{log.userName}</span>
                          </div>
                        </td>

                        {/* 动作标签 */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono text-[10px] font-bold ${style.bg} ${style.text}`}
                          >
                            {log.action}
                          </span>
                        </td>

                        {/* 目标 */}
                        <td className="py-3 px-4 max-w-[180px] truncate text-foreground font-medium">
                          {log.details?.documentName || log.targetId || "—"}
                        </td>

                        {/* IP 地址 */}
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-muted-foreground text-[11px]">
                          <div className="flex items-center gap-1">
                            <Laptop className="w-3 h-3 opacity-60" />
                            <span>{log.ipAddress || "127.0.0.1"}</span>
                          </div>
                        </td>

                        {/* 详情 JSON 展开 */}
                        <td className="py-3 px-4 max-w-xs text-muted-foreground truncate font-mono text-[11px]">
                          {log.details ? (
                            <span title={JSON.stringify(log.details, null, 2)}>
                              {JSON.stringify(log.details)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* 操作 */}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => setDeletingLogId(log.id)}
                            title={t({ id: "Delete", message: "Delete" })}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* 分页控制器 */}
          <div className="flex items-center justify-between p-3.5 border-t border-border text-xs text-muted-foreground">
            <span>
              {t({
                id: "Enterprise.Audit.PageLabel",
                message: "Page",
              })}{" "}
              {pagination.page} / {pagination.totalPages} (
              {t({
                id: "Enterprise.Audit.TotalEntries",
                message: "Total",
              })}{" "}
              {pagination.total})
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={pagination.page <= 1 || loading}
                onClick={() => loadLogs(pagination.page - 1)}
                className="p-1 rounded-lg border border-border hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => loadLogs(pagination.page + 1)}
                className="p-1 rounded-lg border border-border hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 单条日志删除确认弹窗 */}
        <ConfirmDialog
          isOpen={Boolean(deletingLogId)}
          onClose={() => setDeletingLogId(null)}
          title={t({ id: "Enterprise.Audit.ConfirmDeleteTitle", message: "Delete Audit Log Record" })}
          description={t({
            id: "Enterprise.Audit.ConfirmDeleteDesc",
            message: "Are you sure you want to permanently delete this audit log record? This action cannot be undone.",
          })}
          confirmText={t({ id: "Delete", message: "Delete" })}
          destructive
          onConfirm={() => {
            if (deletingLogId) handleDeleteSingleLog(deletingLogId);
          }}
        />

        {/* 历史日志按天数清理弹窗 */}
        {isPruningOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
            <div className="bg-background border border-border rounded-2xl p-6 max-w-md w-full shadow-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">
                    {t({ id: "Enterprise.Audit.CleanLogs", message: "Clean History" })}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {t({
                      id: "Enterprise.Audit.PruneSubDesc",
                      message: "Safely prune older routine audit logs to maintain optimal database performance.",
                    })}
                  </p>
                </div>
              </div>

              <div className="space-y-2 py-2">
                <label className="text-xs font-semibold text-foreground">
                  {t({ id: "Enterprise.Audit.PruneDaysLabel", message: "Delete logs older than" })}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 60, 90].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setPruneDays(days)}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium transition-colors cursor-pointer ${
                        pruneDays === days
                          ? "border-primary bg-primary/10 text-primary font-bold"
                          : "border-border hover:bg-muted text-foreground"
                      }`}
                    >
                      {days} {t({ id: "Days", message: "Days" })}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground pt-1">
                  {t({
                    id: "Enterprise.Audit.PruneNotice",
                    message: "Notice: System automatically prunes normal records older than 90 days. You can perform earlier cleanup here.",
                  })}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsPruningOpen(false)}
                  disabled={isPruning}
                  className="px-4 py-2 rounded-xl border border-border hover:bg-muted text-xs font-medium cursor-pointer"
                >
                  {t({ id: "Cancel", message: "Cancel" })}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPrune}
                  disabled={isPruning}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive hover:bg-destructive/90 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isPruning && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t({ id: "Enterprise.Audit.ConfirmPruneBtn", message: "Prune Now" })}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
