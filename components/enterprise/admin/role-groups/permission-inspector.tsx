"use client";

import React, { useState } from "react";
import { useExtracted } from "next-intl";
import {
  resolveDocumentPermissions,
  ResolvePermissionResponse,
} from "@/lib/enterprise-permissions-api";
import { DocumentAction } from "@/functions/lib/permission-types";
import { Search, ShieldAlert, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function PermissionInspector() {
  const t = useExtracted();
  const [documentId, setDocumentId] = useState("");
  const [simulatedUserId, setSimulatedUserId] = useState("");
  const [inspecting, setInspecting] = useState(false);
  const [result, setResult] = useState<ResolvePermissionResponse | null>(null);

  const handleInspect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentId.trim()) {
      toast.error(t({ id: "Enterprise.Inspector.DocIdRequired", message: "Document ID is required" }));
      return;
    }

    setInspecting(true);
    try {
      const data = await resolveDocumentPermissions({
        documentId: documentId.trim(),
        simulatedUserId: simulatedUserId.trim() || undefined,
      });
      setResult(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to resolve permission inheritance");
      setResult(null);
    } finally {
      setInspecting(false);
    }
  };

  const ALL_ACTIONS: DocumentAction[] = ["view", "edit", "comment", "upload", "download", "share"];

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-primary" />
          <span>{t({ id: "Enterprise.Inspector.Title", message: "Permission Inheritance Inspector" })}</span>
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t({
            id: "Enterprise.Inspector.Desc",
            message: "Simulate and audit real-time 4-dimensional permission inheritance for any user and document.",
          })}
        </p>
      </div>

      <form onSubmit={handleInspect} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {t({ id: "Enterprise.Inspector.DocIdLabel", message: "Target Document ID" })}
          </label>
          <input
            type="text"
            required
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            placeholder="e.g. doc-uuid-1234"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="sm:col-span-1">
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            {t({ id: "Enterprise.Inspector.UserIdLabel", message: "User ID (Optional, defaults to self)" })}
          </label>
          <input
            type="text"
            value={simulatedUserId}
            onChange={(e) => setSimulatedUserId(e.target.value)}
            placeholder="Simulate specific user"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div className="sm:col-span-1 flex items-end">
          <button
            type="submit"
            disabled={inspecting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-2 px-4 text-xs font-semibold text-primary-foreground shadow hover:bg-primary/90 cursor-pointer disabled:opacity-50"
          >
            {inspecting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Search className="h-3.5 w-3.5" />
            )}
            <span>{t({ id: "Enterprise.Inspector.RunAnalysis", message: "Run Analysis" })}</span>
          </button>
        </div>
      </form>

      {/* 审计结果卡片 */}
      {result && (
        <div className="rounded-2xl border border-border bg-slate-50/50 dark:bg-white/5 p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border/60">
            <div>
              <span className="text-xs font-semibold text-foreground">
                {result.user.name} ({result.user.email})
              </span>
              <span className="ml-2 text-[10px] font-mono uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                Role: {result.user.role}
              </span>
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span>Doc Type: <strong className="text-foreground">{result.document.type}</strong></span>
              {result.document.categoryId && (
                <span>Cat: <strong className="text-foreground">{result.document.categoryId}</strong></span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {ALL_ACTIONS.map((act) => {
              const detail = result.result.details[act];
              const isGranted = detail?.granted;

              return (
                <div
                  key={act}
                  className={`p-3 rounded-xl border text-xs transition-all ${
                    isGranted
                      ? "border-emerald-500/30 bg-emerald-50/30 dark:bg-emerald-950/20"
                      : "border-slate-200 dark:border-white/10 bg-background"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold capitalize text-foreground">{act}</span>
                    {isGranted ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Allowed
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                        <XCircle className="h-3.5 w-3.5" />
                        Denied
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-muted-foreground flex items-center justify-between mt-2 pt-2 border-t border-border/40">
                    <span>Source:</span>
                    <span className="font-mono font-medium text-foreground uppercase text-[10px] bg-muted px-1.5 py-0.5 rounded">
                      {detail?.sourceScope || "system"}
                    </span>
                  </div>

                  {detail?.reason && (
                    <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      <span>Reason: {detail.reason}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
