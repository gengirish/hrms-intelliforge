/**
 * Rules for running inside the Capacitor iOS/Android shell (see
 * capacitor.config.ts). Kept free of Capacitor imports so they can be unit
 * tested and imported from server code.
 */

/** Class put on <html> before first paint when running in the native shell. */
export const NATIVE_APP_CLASS = "native-app";

/**
 * Off-site hosts that must load inside the WebView rather than the system
 * browser, because they redirect back to HRMS and the return needs the session
 * cookie. Must match server.allowNavigation in capacitor.config.ts.
 */
export const IN_APP_HOSTS = ["checkout.stripe.com", "billing.stripe.com"];

/**
 * Inline script for the root layout. Capacitor injects `window.Capacitor`
 * before any page script runs, so this can tag <html> before the first paint
 * and native-only CSS (status-bar padding) never jumps.
 */
export const NATIVE_APP_DETECT_SCRIPT = `try{if(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform()){document.documentElement.classList.add("${NATIVE_APP_CLASS}")}}catch(e){}`;

/**
 * What the native shell should do with a link the user activated.
 * - `default`:  let the WebView handle it (normal in-app navigation, or a
 *               mailto:/tel: link the OS handles).
 * - `same-view`: load it in the app's WebView, even if it asked for a new tab.
 *               The WebView has no tabs, and the URL needs the session cookie.
 * - `file`:     a same-origin document (a PDF) the WebView can't display or
 *               download on Android; fetch it and hand it to the share sheet.
 * - `external`: open in the system browser.
 */
export type NativeLinkAction = "default" | "same-view" | "file" | "external";

export interface NativeLinkInput {
  href: string;
  /** The page's origin, e.g. https://hrms.intelliforge.tech */
  origin: string;
  /** The anchor's target attribute, or "_blank" for window.open. */
  target?: string | null;
  /** Whether the anchor has a `download` attribute. */
  download?: boolean;
}

export function isInAppHost(hostname: string): boolean {
  return IN_APP_HOSTS.includes(hostname.toLowerCase());
}

export function looksLikeFile(url: URL): boolean {
  const path = url.pathname.toLowerCase();
  return path.endsWith(".pdf") || path.endsWith("/pdf");
}

export function classifyNativeLink(input: NativeLinkInput): NativeLinkAction {
  let url: URL;
  try {
    url = new URL(input.href, input.origin);
  } catch {
    return "default";
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return "default";

  const newTab = (input.target ?? "").toLowerCase() === "_blank";

  if (url.origin === input.origin) {
    if (input.download || looksLikeFile(url)) return "file";
    return newTab ? "same-view" : "default";
  }

  if (isInAppHost(url.hostname)) return newTab ? "same-view" : "default";

  return "external";
}

/** File name for a same-origin document handed to the share sheet. */
export function fileNameForUrl(url: URL, downloadAttr?: string | null): string {
  const fromAttr = downloadAttr?.trim();
  if (fromAttr) return sanitizeFileName(fromAttr);

  const segments = url.pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "document";
  if (last.toLowerCase() === "pdf") {
    const parent = segments[segments.length - 2] ?? "document";
    return sanitizeFileName(`${parent}.pdf`);
  }
  return sanitizeFileName(last.includes(".") ? last : `${last}.pdf`);
}

function sanitizeFileName(name: string): string {
  // No path separators, and no leading dots, so "." / ".." can't escape the
  // cache directory and the file is never hidden.
  const cleaned = name.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^[-.]+|-+$/g, "");
  return cleaned || "document.pdf";
}
