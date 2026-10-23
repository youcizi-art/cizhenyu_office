"use client";

import { AuthGuard } from "@/components/auth-guard";
import { AuditLogsView } from "@/components/enterprise/audit/audit-logs-view";

export default function AuditLogsPage() {
  return (
    <AuthGuard>
      <AuditLogsView />
    </AuthGuard>
  );
}
