"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useAuth as useClerkAuth, useClerk } from "@clerk/nextjs";
import { isClerkEnabled } from "@/lib/clerk-config";

interface User {
  id: string;
  email: string;
  role?: string;
  name?: string;
  accountType: "admin" | "intern";
  orgAdminRole?: "ADMIN" | "MENTOR";
}

interface AuthContextValue {
  user: User | null;
  isSignedIn: boolean;
  isLoading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isSignedIn: false,
  isLoading: true,
  signOut: async () => {},
  refresh: async () => {},
});

function AuthProviderInner({
  children,
  clerkSignedIn = false,
  clerkLoaded = true,
  clerkSignOut,
}: {
  children: ReactNode;
  clerkSignedIn?: boolean;
  clerkLoaded?: boolean;
  clerkSignOut?: () => Promise<void>;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!clerkLoaded) return;
    void refresh();
  }, [clerkLoaded, clerkSignedIn, refresh]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    if (clerkSignedIn && clerkSignOut) {
      await clerkSignOut();
      setUser(null);
      return;
    }
    setUser(null);
    window.location.href = "/";
  }, [clerkSignedIn, clerkSignOut]);

  const effectiveSignedIn = clerkSignedIn || !!user;

  return (
    <AuthContext.Provider
      value={{
        user,
        isSignedIn: effectiveSignedIn,
        isLoading: !clerkLoaded || isLoading,
        signOut,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function ClerkAuthBridge({ children }: { children: ReactNode }) {
  const { isSignedIn: clerkSignedIn, isLoaded: clerkLoaded } = useClerkAuth();
  const { signOut: clerkSignOut } = useClerk();
  return (
    <AuthProviderInner
      clerkSignedIn={clerkSignedIn}
      clerkLoaded={clerkLoaded}
      clerkSignOut={() => clerkSignOut({ redirectUrl: "/" })}
    >
      {children}
    </AuthProviderInner>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  if (isClerkEnabled()) {
    return <ClerkAuthBridge>{children}</ClerkAuthBridge>;
  }
  return <AuthProviderInner>{children}</AuthProviderInner>;
}

export function useAuth() {
  return useContext(AuthContext);
}
