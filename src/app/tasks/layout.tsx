import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks | IntelliForge HRMS",
  description: "Log weekly tasks with hours tracking for your IntelliForge internship.",
};

export default function TasksLayout({ children }: { children: React.ReactNode }) {
  return children;
}
