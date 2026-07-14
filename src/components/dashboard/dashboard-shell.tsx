"use client";

import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";
import { DashboardSubnav } from "@/components/dashboard/dashboard-subnav";

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          <aside className="w-full shrink-0 lg:w-14 xl:w-56">
            <DashboardSubnav />
          </aside>
          <main id="main-content" className="flex-1 min-w-0">
            {children}
          </main>
        </div>
      </div>
      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
