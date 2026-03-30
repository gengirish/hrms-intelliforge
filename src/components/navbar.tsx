"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, X, LogOut, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/onboard", label: "Onboard" },
  { href: "/attendance", label: "Attendance" },
  { href: "/tasks", label: "Tasks" },
  { href: "/offer", label: "Offer Letter" },
  { href: "/dashboard", label: "Dashboard" },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, isSignedIn, signOut } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl navbar-standalone">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-400 font-bold text-white text-sm">
              IF
            </div>
            <span className="text-lg font-semibold text-white">
              IntelliForge <span className="text-slate-400 font-normal">AI</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="ml-3 flex items-center">
              {isSignedIn ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-colors"
                    aria-label="User menu"
                  >
                    {initials}
                  </button>
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-lg bg-slate-900 border border-slate-700 shadow-xl py-1 z-50">
                      <div className="px-4 py-3 border-b border-slate-700">
                        <p className="text-sm font-medium text-slate-200 truncate">
                          {user?.name || user?.email}
                        </p>
                        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                        <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-semibold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded">
                          {user?.accountType}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          signOut();
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/sign-in"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-indigo-400 hover:text-white hover:bg-slate-800/50 transition-colors"
                >
                  <User className="h-4 w-4" />
                  Sign In
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {isSignedIn && (
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold"
                aria-label="User menu"
              >
                {initials}
              </button>
            )}
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-menu"
              aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
              className="p-2 text-slate-400 hover:text-white"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div
          id="mobile-nav-menu"
          role="navigation"
          aria-label="Mobile navigation"
          className="md:hidden border-t border-slate-800 bg-slate-950"
        >
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-slate-800 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                )}
              >
                {link.label}
              </Link>
            ))}
            {isSignedIn ? (
              <button
                onClick={() => {
                  setMobileOpen(false);
                  signOut();
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            ) : (
              <Link
                href="/sign-in"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-indigo-400 hover:text-white hover:bg-slate-800/50 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
