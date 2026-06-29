"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import posthog from "posthog-js";
import { useAuth } from "@/lib/auth-context";
import {
  getPostHog,
  hasAnalyticsConsent,
  identifyUser,
  initPostHog,
  isPostHogConfigured,
  resetPostHog,
} from "@/lib/posthog";

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    const client = getPostHog();
    if (!client) return;
    let url = window.origin + pathname;
    const query = searchParams?.toString();
    if (query) url += `?${query}`;
    client.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  return null;
}

function PostHogAuthSync() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !isPostHogConfigured() || !hasAnalyticsConsent()) return;
    if (user) {
      identifyUser(user.id, {
        email: user.email,
        role: user.role,
        account_type: user.accountType,
      });
    } else {
      resetPostHog();
    }
  }, [user, isLoading]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    const enable = () => {
      initPostHog();
      setConsented(true);
    };
    if (hasAnalyticsConsent()) enable();
    window.addEventListener("ph-consent-granted", enable);
    return () => window.removeEventListener("ph-consent-granted", enable);
  }, []);

  if (!isPostHogConfigured() || !consented) {
    return <>{children}</>;
  }

  const client = getPostHog();
  if (!client) {
    return <>{children}</>;
  }

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      <PostHogAuthSync />
      {children}
    </PHProvider>
  );
}
