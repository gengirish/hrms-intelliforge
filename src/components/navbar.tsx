"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { Menu, X, LogOut, User, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/careers", label: "Careers" },
  { href: "/intern-onboarding", label: "Onboarding" },
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
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setDropdownOpen(false);
  }, [pathname]);

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || "?";

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl navbar-standalone"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
            aria-label="IntelliForge HRMS — Home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg gradient-brand font-bold text-white text-sm shadow-brand-glow">
              IF
            </span>
            <span className="text-lg font-semibold tracking-tight text-white">
              IntelliForge{" "}
              <span className="text-slate-400 font-normal">AI</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 cursor-pointer",
                    active
                      ? "bg-brand-500/10 text-white ring-1 ring-inset ring-brand-500/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="ml-3 flex items-center">
              {isSignedIn ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-haspopup="menu"
                    aria-expanded={dropdownOpen}
                    aria-label="Open user menu"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold ring-1 ring-inset ring-white/10 hover:bg-brand-500 transition-colors cursor-pointer"
                  >
                    {initials}
                  </button>
                  {dropdownOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-60 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1 z-50"
                    >
                      <div className="px-4 py-3 border-b border-slate-700">
                        <p className="text-sm font-medium text-slate-100 truncate">
                          {user?.name || user?.email}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {user?.email}
                        </p>
                        <span className="inline-flex items-center gap-1 mt-2 text-[10px] uppercase tracking-wider font-semibold text-brand-300 bg-brand-500/10 border border-brand-500/30 px-2 py-0.5 rounded">
                          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                          {user?.accountType}
                        </span>
                      </div>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setDropdownOpen(false);
                          signOut();
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/sign-in"
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-brand-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  Sign In
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {isSignedIn && (
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-white text-xs font-bold cursor-pointer"
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
              aria-label={
                mobileOpen ? "Close navigation menu" : "Open navigation menu"
              }
              className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer touch-target"
            >
              {mobileOpen ? (
                <X className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Menu className="h-5 w-5" aria-hidden="true" />
              )}
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
            {navLinks.map((link) => {
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "block px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    active
                      ? "bg-brand-500/10 text-white ring-1 ring-inset ring-brand-500/30"
                      : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            {isSignedIn ? (
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  signOut();
                }}
                className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Sign out
              </button>
            ) : (
              <Link
                href="/sign-in"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm font-medium text-brand-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
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
