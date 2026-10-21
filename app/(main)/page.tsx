import type { Metadata } from "next";
import { EnterpriseDashboardView } from "@/components/enterprise/dashboard/enterprise-dashboard-view";

export const metadata: Metadata = {
  title: "Enterprise Dashboard — CIZHENYU Office",
  description:
    "CIZHENYU Office Enterprise Workspace: Role-based access control, document governance, and cloud collaboration.",
};

export default function HomePage() {
  return <EnterpriseDashboardView />;
}
