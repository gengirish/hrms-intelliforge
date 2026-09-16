import * as Sentry from "@sentry/nextjs";

// Next only picks up `instrumentation.ts` from `src/` when the app lives in `src/`.
// Both config modules are no-ops unless a Sentry DSN is set.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Called by Next for uncaught errors in route handlers, server components and
// middleware (Next 15+; harmless on 14). A no-op when Sentry is not initialised.
export const onRequestError = Sentry.captureRequestError;
