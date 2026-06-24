import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { MobileBottomNav } from "@/components/mobile-nav";
import { InstallPrompt } from "@/components/install-prompt";

export default function DailyPlanLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main
        id="main-content"
        className="flex-1 flex items-center justify-center px-4"
      >
        <div className="glass-card p-8 max-w-md w-full flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400">Loading daily plan…</p>
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
      <InstallPrompt />
    </div>
  );
}
