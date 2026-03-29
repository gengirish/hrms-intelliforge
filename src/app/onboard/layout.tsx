import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Onboard | IntelliForge HRMS",
  description: "Self-service intern onboarding for the IntelliForge AI internship program.",
};

export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
