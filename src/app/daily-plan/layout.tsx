import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Daily Task Plan | IntelliForge HRMS",
  description:
    "Plan your daily tasks, mark them complete, and submit your day plan.",
};

export default function DailyPlanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
