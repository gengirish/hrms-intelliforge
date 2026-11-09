import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Assign weekly tasks",
  description: "Assign weekly tasks to interns for the full week.",
};

export default function DashboardTasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
