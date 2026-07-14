"use client";

import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { DashboardSubnav } from "@/components/dashboard/dashboard-subnav";
import { LinkedInMentorImportForm } from "@/components/mentors/linkedin-import-form";
import { PublishMentorsPanel } from "@/components/mentors/publish-mentors-panel";

export default function ImportMentorPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main
        id="main-content"
        className="flex-1 mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-8"
      >
        <Breadcrumbs
          className="mb-4"
          items={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Import mentor" },
          ]}
        />
        <DashboardSubnav className="mb-8" />

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <UserPlus className="h-7 w-7 text-indigo-400" />
            Import mentor from LinkedIn
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Turn a LinkedIn profile into a workspace mentor account — ready to assign to cohorts.
          </p>
        </div>

        <PublishMentorsPanel />

        <LinkedInMentorImportForm
          mode="create"
          onMentorCreated={({ slug }) => {
            if (slug) {
              router.push(`/mentors/${slug}`);
            }
          }}
        />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
}
