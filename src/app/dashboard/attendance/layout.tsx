import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Attendance | Dashboard | IntelliForge HRMS",
  description: "Admin attendance overview for IntelliForge interns.",
};

export default function DashboardAttendanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
