import * as Sentry from "@sentry/nextjs";

/**
 * Cron schedules, kept in sync with `vercel.json` (UTC crontab strings for IST times).
 * Monitor slugs double as the Sentry Cron Monitor slugs.
 */
export const CRON_MONITORS = {
  "task-reminder": "30 3 * * 1", // Mon 09:00 IST
  "attendance-nudge": "0 5 * * 1-5", // Weekdays 10:30 IST
  "daily-plan-nudge": "30 5 * * 1-5", // Weekdays 11:00 IST
  "performance-scores": "30 18 * * *", // Daily 00:00 IST
} as const;

export type CronMonitorSlug = keyof typeof CRON_MONITORS;

/**
 * Runs a cron job body inside a Sentry cron check-in (in_progress -> ok/error).
 * The body should throw on failure so the check-in is marked as errored; the
 * error is reported to Sentry and rethrown for the route to turn into a 500.
 * Without a Sentry DSN this just runs `fn`.
 */
export async function runCronWithMonitor<T>(
  slug: CronMonitorSlug,
  fn: () => Promise<T>
): Promise<T> {
  try {
    return await Sentry.withMonitor(slug, fn, {
      schedule: { type: "crontab", value: CRON_MONITORS[slug] },
      timezone: "Etc/UTC",
      checkinMargin: 5,
      maxRuntime: 10,
    });
  } catch (err) {
    Sentry.captureException(err, { tags: { cron: slug } });
    throw err;
  } finally {
    // Serverless functions may freeze right after responding; flush queued events.
    await Sentry.flush(2000);
  }
}
