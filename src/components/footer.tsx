import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 font-bold text-white text-sm">
                IF
              </div>
              <span className="text-lg font-semibold text-white">
                IntelliForge <span className="text-slate-400 font-normal">AI</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-xs">
              IntelliForge HRMS — Streamlined intern management for the AI age.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { href: "/onboard", label: "Onboard" },
                { href: "/attendance", label: "Attendance" },
                { href: "/tasks", label: "Tasks" },
                { href: "/offer", label: "Offer Letter" },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">IntelliForge</h3>
            <ul className="space-y-2">
              {[
                { href: "https://www.intelliforge.tech", label: "IntelliForge AI" },
                { href: "https://learning.intelliforge.tech", label: "Learning Portal" },
                { href: "https://upskill.intelliforge.tech", label: "AI Bootcamp" },
              ].map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-slate-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-800 text-center">
          <p className="text-sm text-slate-500">
            &copy; 2026 IntelliForge AI. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
