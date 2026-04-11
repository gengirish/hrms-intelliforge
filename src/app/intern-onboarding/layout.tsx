import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Intern Onboarding | IntelliForge HRMS",
  description: "Self-service intern onboarding for the IntelliForge AI internship program.",
};

export default function InternOnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
