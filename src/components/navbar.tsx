"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Menu,
  X,
  LogOut,
  User,
  ShieldCheck,
  Settings,
  Search,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/brand-mark";
import { NotificationBell } from "@/components/notification-bell";
import {
  getVisibleNav,
  isActiveLink,
  type AccountType,
} from "@/lib/nav-config";

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const { user, isSignedIn, signOut } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  const accountType = (user?.accountType as AccountType | undefined) ?? null;
  const navLinks = getVisibleNav(accountType);
  const isAdmin = accountType === "admin";

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

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const triggerCommandPalette = useCallback(() => {
    const event = new KeyboardEvent("keydown", {
      key: "k",
      ctrlKey: true,
      metaKey: true,
      bubbles: true,
    });
    window.dispatchEvent(event);
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
    <nav
      aria-label="Primary"
      className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl navbar-standalone"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-3">
          <BrandMark href="/" />

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActiveLink(pathname, link.href);
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

            <div className="ml-2 flex items-center gap-1.5">
              <button
                type="button"
                onClick={triggerCommandPalette}
                aria-label="Open command palette"
                className="hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-slate-400 bg-slate-800/50 border border-slate-700/60 hover:bg-slate-800 hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Search className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Search</span>
                <kbd className="ml-2 inline-flex items-center gap-0.5 rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                  ⌘K
                </kbd>
              </button>

              {isAdmin && <NotificationBell />}

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
                      className="absolute right-0 mt-2 w-64 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1.5 z-50 animate-stat-reveal"
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
                      <div className="py-1">
                        {isAdmin && (
                          <Link
                            href="/dashboard/settings"
                            role="menuitem"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                          >
                            <Settings
                              className="h-4 w-4 text-slate-400"
                              aria-hidden="true"
                            />
                            Workspace settings
                          </Link>
                        )}
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setDropdownOpen(false);
                            triggerCommandPalette();
                          }}
                          className="flex items-center justify-between w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <Search
                              className="h-4 w-4 text-slate-400"
                              aria-hidden="true"
                            />
                            Search
                          </span>
                          <kbd className="text-[10px] font-mono text-slate-500 border border-slate-700 rounded px-1.5">
                            ⌘K
                          </kbd>
                        </button>
                        <a
                          href="mailto:hr@intelliforge.tech"
                          role="menuitem"
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                        >
                          <HelpCircle
                            className="h-4 w-4 text-slate-400"
                            aria-hidden="true"
                          />
                          Help &amp; support
                        </a>
                      </div>
                      <div className="border-t border-slate-700 py-1">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setDropdownOpen(false);
                            signOut();
                          }}
                          className="flex items-center gap-2 w-full px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                        >
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                          Sign out
                        </button>
                      </div>
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

          <div className="flex items-center gap-1.5 md:hidden">
            {isAdmin && <NotificationBell />}
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
              aria-controls="mobile-nav-drawer"
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
        <div className="md:hidden fixed inset-0 z-[55]" role="presentation">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm animate-stat-reveal"
          />
          <div
            id="mobile-nav-drawer"
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className={cn(
              "absolute right-0 top-0 h-full w-[85%] max-w-sm bg-slate-950 border-l border-slate-800",
              "flex flex-col safe-top",
              "translate-x-0 transition-transform duration-200 ease-out-expo"
            )}
            style={{ animation: "slide-in 200ms cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 h-16">
              <BrandMark href="/" size="sm" />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-2 rounded-md text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer touch-target"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActiveLink(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                      active
                        ? "bg-brand-500/10 text-white ring-1 ring-inset ring-brand-500/30"
                        : "text-slate-300 hover:text-white hover:bg-slate-800/60"
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active ? "text-brand-300" : "text-slate-500"
                      )}
                      aria-hidden="true"
                    />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="border-t border-slate-800 p-3 safe-bottom space-y-1">
              {isSignedIn ? (
                <>
                  <div className="px-3 py-2 text-xs">
                    <p className="text-slate-400 truncate">{user?.email}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-wider font-semibold text-brand-300">
                      {user?.accountType}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      signOut();
                    }}
                    className="flex items-center gap-2 w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/sign-in"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
          <style jsx>{`
            @keyframes slide-in {
              from {
                transform: translateX(100%);
              }
              to {
                transform: translateX(0);
              }
            }
          `}</style>
        </div>
      )}
    </nav>
  );
}
