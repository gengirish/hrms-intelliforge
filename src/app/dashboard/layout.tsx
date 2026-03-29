import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | IntelliForge HRMS",
  description: "Admin dashboard for managing IntelliForge AI interns.",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
