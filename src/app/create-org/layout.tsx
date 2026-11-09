import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create your workspace",
  description:
    "Set up your program workspace on the Mentor Internship Platform: invite mentors, list internships and onboard interns.",
  alternates: { canonical: "/create-org" },
};

export default function CreateOrgLayout({ children }: { children: React.ReactNode }) {
  return children;
}
