"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  LogOut,
  ChevronUp,
  Building2,
  User as UserIcon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getVisibleNav,
  NOTIFICATIONS_ITEM,
  type NavItem,
} from "@/lib/nav-config";
import { cn } from "@/lib/utils";

interface CommandAction {
  id: string;
  label: string;
  hint?: string;
  icon: NavItem["icon"];
  run: () => void;
  keywords?: string;
}

export function CommandPalette() {
  const router = useRouter();
  const { user, isSignedIn, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const isCmdK =
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (isCmdK) {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        close();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  const actions: CommandAction[] = useMemo(() => {
    const items = getVisibleNav(user?.accountType);
    const navActions: CommandAction[] = items.map((item) => ({
      id: `nav:${item.href}`,
      label: item.label,
      hint: item.description,
      icon: item.icon,
      keywords: `${item.label} ${item.description ?? ""}`,
      run: () => {
        router.push(item.href);
        close();
      },
    }));
    if (user?.accountType === "admin") {
      navActions.push({
        id: "nav:notifications",
        label: NOTIFICATIONS_ITEM.label,
        hint: NOTIFICATIONS_ITEM.description,
        icon: NOTIFICATIONS_ITEM.icon,
        keywords: "notifications history alerts inbox",
        run: () => {
          router.push(NOTIFICATIONS_ITEM.href);
          close();
        },
      });
    }
    navActions.push({
      id: "external:intelliforge",
      label: "Visit IntelliForge AI",
      hint: "Parent company · intelliforge.tech",
      icon: Building2,
      keywords: "intelliforge parent about company tech ai",
      run: () => {
        window.open(
          "https://www.intelliforge.tech",
          "_blank",
          "noopener,noreferrer"
        );
        close();
      },
    });
    navActions.push({
      id: "external:founder",
      label: "Founder · Girish Hiremath",
      hint: "girishbhiremath.vercel.app",
      icon: UserIcon,
      keywords: "founder girish hiremath about portfolio",
      run: () => {
        window.open(
          "https://girishbhiremath.vercel.app",
          "_blank",
          "noopener,noreferrer"
        );
        close();
      },
    });
    if (isSignedIn) {
      navActions.push({
        id: "action:sign-out",
        label: "Sign out",
        icon: LogOut,
        keywords: "sign out logout exit",
        run: () => {
          close();
          signOut();
        },
      });
    }
    return navActions;
  }, [user?.accountType, isSignedIn, router, close, signOut]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) =>
      `${a.label} ${a.keywords ?? ""}`.toLowerCase().includes(q)
    );
  }, [actions, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[activeIndex]?.run();
    }
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[70]"
    >
      <button
        type="button"
        aria-label="Close command palette"
        onClick={close}
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
      />
      <div className="relative mx-auto mt-[10vh] w-[92%] max-w-xl rounded-2xl border border-slate-700 bg-slate-900/95 backdrop-blur-md shadow-2xl overflow-hidden animate-stat-reveal">
        <div className="flex items-center gap-2 border-b border-slate-800 px-3.5 py-3">
          <Search
            className="h-4 w-4 text-slate-400 shrink-0"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Jump to a page or run an action…"
            aria-label="Search"
            aria-controls="command-list"
            aria-activedescendant={
              filtered[activeIndex] ? `cmd-${filtered[activeIndex].id}` : undefined
            }
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-1 rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-mono text-slate-400">
            ESC
          </kbd>
        </div>

        <ul
          id="command-list"
          ref={listRef}
          role="listbox"
          className="max-h-[60vh] overflow-y-auto py-1.5"
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-sm text-slate-500">
              No results for &ldquo;{query}&rdquo;
            </li>
          ) : (
            filtered.map((action, idx) => {
              const Icon = action.icon;
              const isActive = idx === activeIndex;
              return (
                <li
                  key={action.id}
                  id={`cmd-${action.id}`}
                  role="option"
                  aria-selected={isActive}
                >
                  <button
                    type="button"
                    onClick={() => action.run()}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3.5 py-2.5 text-left text-sm cursor-pointer transition-colors",
                      isActive
                        ? "bg-brand-500/10 text-white"
                        : "text-slate-300 hover:bg-slate-800/60"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-md ring-1 ring-inset",
                        isActive
                          ? "bg-brand-500/15 ring-brand-500/30 text-brand-300"
                          : "bg-slate-800 ring-slate-700 text-slate-400"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium">
                        {action.label}
                      </span>
                      {action.hint && (
                        <span className="block truncate text-xs text-slate-500">
                          {action.hint}
                        </span>
                      )}
                    </span>
                    {isActive && (
                      <ArrowRight
                        className="h-4 w-4 text-brand-300 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center justify-between border-t border-slate-800 px-3.5 py-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono">
                <ChevronUp className="h-3 w-3" aria-hidden="true" />
              </kbd>
              <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono">
                <ChevronUp
                  className="h-3 w-3 rotate-180"
                  aria-hidden="true"
                />
              </kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono">
                ↵
              </kbd>
              select
            </span>
          </div>
          <span className="hidden sm:flex items-center gap-1">
            <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono">
              ⌘
            </kbd>
            <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 font-mono">
              K
            </kbd>
            to toggle
          </span>
        </div>
      </div>
    </div>
  );
}
