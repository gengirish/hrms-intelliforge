import Link from "next/link";
import { ArrowLeft, Briefcase } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

// Rendered by notFound() in page.tsx, so the response is a real 404 (D4)
// while keeping the section-specific message and way back.
export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main id="main-content" className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <Briefcase className="h-16 w-16 text-slate-600 mx-auto mb-4" aria-hidden="true" />
          <h1 className="text-2xl font-bold text-white mb-2">Mentor Not Found</h1>
          <p className="text-slate-400 mb-6">This mentor profile may be private or doesn&apos;t exist.</p>
          <Link
            href="/mentors"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Browse Mentors
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
