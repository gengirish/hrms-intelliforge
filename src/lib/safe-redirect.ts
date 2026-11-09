/**
 * Validate a post-sign-in `redirect` target. Only same-origin relative paths
 * are allowed; anything else (absolute URLs, protocol-relative "//host",
 * "/\host", javascript:, control characters) falls back to `fallback`.
 */
export function safeRedirectPath(value: string | null | undefined, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  const raw = value.trim();
  if (!raw.startsWith("/")) return fallback;
  // "//evil.com" and "/\evil.com" are treated as protocol-relative by browsers.
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  // Tabs/newlines are stripped by URL parsers and can smuggle "//" back in.
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  if (raw.includes("\\")) return fallback;

  try {
    const base = "https://same-origin.invalid";
    const url = new URL(raw, base);
    if (url.origin !== base) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
