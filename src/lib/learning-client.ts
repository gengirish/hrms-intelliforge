/**
 * Typed client for the IntelliForge Learning Platform v1 API
 * (https://learning.intelliforge.tech).
 *
 * Used by HRMS to enroll interns into Learning courses on demand. The
 * Learning side authenticates via a Bearer API key minted at
 * /api/admin/api-keys with `write` scope.
 *
 * Configure with two env vars on the HRMS deployment:
 *   - LEARNING_API_KEY      (required, ifk_... raw key)
 *   - LEARNING_API_BASE_URL (optional, defaults to production URL)
 *
 * If LEARNING_API_KEY is unset every method throws a LearningApiError with
 * status 503 so callers can surface a friendly "integration not configured"
 * response to the admin without leaking config details.
 */

const DEFAULT_BASE_URL = "https://learning.intelliforge.tech";

function getBaseUrl(): string {
  return (process.env.LEARNING_API_BASE_URL || DEFAULT_BASE_URL)
    .trim()
    .replace(/\/+$/, "");
}

function getApiKey(): string {
  const key = process.env.LEARNING_API_KEY?.trim();
  if (!key) {
    throw new LearningApiError(
      503,
      "Learning integration is not configured (LEARNING_API_KEY missing)"
    );
  }
  return key;
}

export class LearningApiError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "LearningApiError";
    this.status = status;
    this.body = body;
  }
}

export interface LearningCourse {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  level: string | null;
  price: number;
  currency: string;
  lesson_count: number;
  enrollment_count: number;
}

export interface LearningEnrollment {
  id: string;
  user_email: string;
  course_id: string;
  status: string;
  enrolled_at: string;
}

export interface LearningEnrollResult {
  enrollment: LearningEnrollment;
  /**
   * True iff the underlying upsert returned an enrollment that was created
   * before this call. Detected by inspecting the `enrolled_at` timestamp; if
   * it's older than the wall-clock window the call started in, the row was
   * already present.
   */
  alreadyEnrolled: boolean;
}

export interface LearningEnrollmentProgress {
  total: number;
  completed: number;
  percentage: number;
}

export interface LearningEnrollmentDetail {
  id: string;
  user_email: string;
  course_id: string;
  course_title?: string;
  course_slug?: string;
  status: string;
  enrolled_at: string;
  completed_at?: string | null;
  progress?: LearningEnrollmentProgress;
}

export interface LearningLiveSession {
  id: string;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
  instructor: string;
  registration_count: number;
}

export interface LearningParticipantRegistration {
  full_name: string;
  email: string;
  phone?: string | null;
  organization?: string | null;
  training_session: string;
  referral_source?: string | null;
}

interface LearningCoursesResponse {
  courses: LearningCourse[];
}

interface LearningEnrollResponse {
  success: boolean;
  enrollment: LearningEnrollment;
}

interface LearningEnrollmentsResponse {
  enrollments: LearningEnrollmentDetail[];
}

interface LearningLiveSessionsResponse {
  sessions: LearningLiveSession[];
}

interface LearningLiveSessionRegisterResponse {
  success?: boolean;
  message?: string;
  status?: string;
  waitlist_position?: number;
}

async function request<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown,
  init?: { signal?: AbortSignal }
): Promise<T> {
  const url = `${getBaseUrl()}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getApiKey()}`,
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: init?.signal,
      // Server-to-server call — no caching.
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    throw new LearningApiError(0, `Failed to reach Learning API: ${message}`);
  }

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : undefined;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const errorMsg =
      typeof parsed === "object" && parsed !== null && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : `Learning API ${method} ${path} failed with status ${res.status}`;
    throw new LearningApiError(res.status, errorMsg, parsed);
  }

  return parsed as T;
}

/**
 * Fetch the list of published Learning courses available for enrollment.
 * Returns the raw v1 shape so the UI can surface level / price / lesson count
 * to the admin picking a course.
 */
export async function listCourses(init?: { signal?: AbortSignal }): Promise<LearningCourse[]> {
  const data = await request<LearningCoursesResponse>("GET", "/api/v1/courses", undefined, init);
  return Array.isArray(data?.courses) ? data.courses : [];
}

/**
 * Enroll a user (by email) into a course (by Learning course id).
 *
 * The Learning side does an `upsert` keyed on (user_email, course_id), so
 * this call is idempotent on their end. We infer "alreadyEnrolled" from the
 * returned enrolled_at timestamp: if it's older than the moment we issued
 * the request, the row pre-existed.
 */
export async function enroll(
  email: string,
  courseId: string,
  init?: { signal?: AbortSignal }
): Promise<LearningEnrollResult> {
  const calledAt = Date.now();
  const data = await request<LearningEnrollResponse>(
    "POST",
    "/api/v1/enrollments",
    { email, course_id: courseId },
    init
  );

  const enrollment = data.enrollment;
  if (!enrollment?.id) {
    throw new LearningApiError(
      502,
      "Learning API returned a malformed enrollment response",
      data
    );
  }

  // Allow ~5s clock skew either direction; if the enrolled_at is before
  // (calledAt - 5s) the row was already present.
  const enrolledAtMs = Date.parse(enrollment.enrolled_at);
  const alreadyEnrolled = Number.isFinite(enrolledAtMs)
    ? enrolledAtMs < calledAt - 5000
    : false;

  return { enrollment, alreadyEnrolled };
}

/**
 * Build the canonical learner-facing URL for a course on Learning. Uses the
 * same base host as the API, which is intentional: in preview/staging
 * deployments LEARNING_API_BASE_URL points at the staging Learning instance
 * and we want the link to land there too.
 */
export function courseUrl(slug: string): string {
  return `${getBaseUrl()}/courses/${encodeURIComponent(slug)}`;
}

/**
 * Cheap probe used by the courses-route in-memory cache to know when the
 * config is unset (without hitting the network).
 */
export function isConfigured(): boolean {
  return !!process.env.LEARNING_API_KEY?.trim();
}

/**
 * Fetch all enrollments for a learner email, including lesson progress.
 */
export async function getEnrollmentsByEmail(
  email: string,
  init?: { signal?: AbortSignal }
): Promise<LearningEnrollmentDetail[]> {
  const params = new URLSearchParams({ email });
  const data = await request<LearningEnrollmentsResponse>(
    "GET",
    `/api/v1/enrollments?${params.toString()}`,
    undefined,
    init
  );
  return Array.isArray(data?.enrollments) ? data.enrollments : [];
}

/**
 * Register a participant for a bootcamp / instructor-led training session
 * via Learning's public participants API (no API key required).
 */
export async function registerParticipant(
  data: LearningParticipantRegistration,
  init?: { signal?: AbortSignal }
): Promise<{ success: boolean; message?: string }> {
  const url = `${getBaseUrl()}/api/participants`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        full_name: data.full_name,
        email: data.email,
        phone: data.phone ?? null,
        organization: data.organization ?? null,
        training_session: data.training_session,
        referral_source: data.referral_source ?? "hrms",
      }),
      signal: init?.signal,
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    throw new LearningApiError(0, `Failed to reach Learning participants API: ${message}`);
  }

  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = text.length > 0 ? JSON.parse(text) : undefined;
  } catch {
    parsed = text;
  }

  if (!res.ok) {
    const errorMsg =
      typeof parsed === "object" && parsed !== null && "error" in parsed
        ? String((parsed as { error: unknown }).error)
        : `Learning participants API failed with status ${res.status}`;
    throw new LearningApiError(res.status, errorMsg, parsed);
  }

  return (parsed as { success: boolean; message?: string }) ?? { success: true };
}

/**
 * List upcoming live sessions (requires API key with read scope).
 */
export async function listLiveSessions(
  upcoming = true,
  init?: { signal?: AbortSignal }
): Promise<LearningLiveSession[]> {
  const params = upcoming ? "?upcoming=true" : "";
  const data = await request<LearningLiveSessionsResponse>(
    "GET",
    `/api/v1/sessions${params}`,
    undefined,
    init
  );
  return Array.isArray(data?.sessions) ? data.sessions : [];
}

/**
 * Register a learner for a live session by email (requires write scope).
 */
export async function registerLiveSession(
  sessionId: string,
  email: string,
  name: string,
  init?: { signal?: AbortSignal }
): Promise<LearningLiveSessionRegisterResponse> {
  return request<LearningLiveSessionRegisterResponse>(
    "POST",
    `/api/v1/sessions/${encodeURIComponent(sessionId)}/register`,
    { email, name },
    init
  );
}
