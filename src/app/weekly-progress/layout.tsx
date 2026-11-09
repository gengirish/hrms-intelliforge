import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weekly Progress",
  description:
    "Log accomplishments, learning outcomes, and challenges for your IntelliForge internship week.",
};

export default function WeeklyProgressLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
