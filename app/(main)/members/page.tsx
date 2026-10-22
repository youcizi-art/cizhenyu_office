import type { Metadata } from "next";
import { MembersView } from "@/components/enterprise/members/members-view";

export const metadata: Metadata = {
  title: "Team Members — CIZHENYU Office",
  description: "Manage enterprise workspace members, role group assignments, and seats.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function MembersPage() {
  return <MembersView />;
}
