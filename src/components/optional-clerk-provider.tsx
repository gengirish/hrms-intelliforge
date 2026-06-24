"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { isClerkEnabled } from "@/lib/clerk-config";
import { hrmsClerkAppearance } from "@/lib/clerk-appearance";

export function OptionalClerkProvider({ children }: { children: ReactNode }) {
  if (!isClerkEnabled()) {
    return children;
  }
  return (
    <ClerkProvider appearance={hrmsClerkAppearance}>{children}</ClerkProvider>
  );
}
