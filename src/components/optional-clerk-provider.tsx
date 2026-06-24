"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { isClerkEnabled } from "@/lib/clerk-config";

export function OptionalClerkProvider({ children }: { children: ReactNode }) {
  if (!isClerkEnabled()) {
    return children;
  }
  return <ClerkProvider>{children}</ClerkProvider>;
}
