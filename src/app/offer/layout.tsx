import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offer Letter | IntelliForge HRMS",
  description: "View and accept your IntelliForge AI internship offer letter.",
};

export default function OfferLayout({ children }: { children: React.ReactNode }) {
  return children;
}
