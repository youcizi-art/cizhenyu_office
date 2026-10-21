import type { Metadata } from "next";
import { PermissionsView } from "@/components/enterprise/admin/permissions-view";

export const metadata: Metadata = {
  title: "Permissions & RBAC — CIZHENYU Office",
  description: "Enterprise Role-Based Access Control and 4-dimensional permission matrix configuration.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PermissionsPage() {
  return <PermissionsView />;
}
