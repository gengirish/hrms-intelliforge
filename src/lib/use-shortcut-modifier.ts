"use client";

import { useEffect, useState } from "react";

function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? nav.userAgent;
  return /mac|iphone|ipad|ipod/i.test(platform);
}

/**
 * "⌘" on macOS/iOS, "Ctrl" elsewhere, for keyboard-shortcut hints. Renders
 * "Ctrl" on the server and first paint, then switches after mount, so there is
 * no hydration mismatch.
 */
export function useShortcutModifier(): string {
  const [modifier, setModifier] = useState("Ctrl");
  useEffect(() => {
    if (isApplePlatform()) setModifier("⌘");
  }, []);
  return modifier;
}
