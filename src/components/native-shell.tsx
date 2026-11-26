"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import {
  NATIVE_APP_CLASS,
  classifyNativeLink,
  fileNameForUrl,
} from "@/lib/native-app";

/**
 * Native behaviour for the Capacitor iOS/Android shell. Renders nothing and
 * does nothing in a normal browser; plugins are loaded only inside the app.
 *
 * - Android back button walks WebView history, then backgrounds the app.
 * - Off-site links open in the system browser (in-app Custom Tab /
 *   SFSafariViewController) instead of replacing the app.
 * - New-tab links to HRMS itself stay in the WebView, which has no tabs.
 * - Same-origin PDFs (the offer letter) are fetched with the session cookie
 *   and handed to the share sheet, since the Android WebView can't show them.
 */
export function NativeShell() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    document.documentElement.classList.add(NATIVE_APP_CLASS);

    let disposed = false;
    const cleanups: Array<() => void> = [];

    void (async () => {
      const [{ App }, { Browser }, { SplashScreen }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/browser"),
        import("@capacitor/splash-screen"),
      ]);
      if (disposed) return;

      void SplashScreen.hide().catch(() => undefined);

      const backHandle = await App.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
        else void App.minimizeApp();
      });
      cleanups.push(() => void backHandle.remove());

      const openExternal = (href: string) => {
        void Browser.open({ url: href, presentationStyle: "popover" });
      };

      const onClick = (event: MouseEvent) => {
        // React handlers (e.g. next/link) run on `document` first; respect them.
        if (event.defaultPrevented || event.button !== 0) return;
        const anchor = (event.target as Element | null)?.closest?.("a[href]");
        if (!(anchor instanceof HTMLAnchorElement)) return;

        const action = classifyNativeLink({
          href: anchor.href,
          origin: window.location.origin,
          target: anchor.target,
          download: anchor.hasAttribute("download"),
        });
        if (action === "default") return;

        event.preventDefault();
        if (action === "external") openExternal(anchor.href);
        else if (action === "same-view") window.location.assign(anchor.href);
        else void shareSameOriginFile(anchor.href, anchor.getAttribute("download"));
      };
      window.addEventListener("click", onClick);
      cleanups.push(() => window.removeEventListener("click", onClick));

      const originalOpen = window.open;
      window.open = function nativeOpen(url?: string | URL, target?: string, features?: string) {
        if (url === undefined || url === "") return originalOpen.call(window, url, target, features);
        const href = String(url);
        const action = classifyNativeLink({
          href,
          origin: window.location.origin,
          target: target ?? "_blank",
        });
        if (action === "external") {
          openExternal(new URL(href, window.location.origin).toString());
          return null;
        }
        if (action === "same-view") {
          window.location.assign(href);
          return null;
        }
        if (action === "file") {
          void shareSameOriginFile(href, null);
          return null;
        }
        return originalOpen.call(window, url, target, features);
      };
      cleanups.push(() => {
        window.open = originalOpen;
      });

      if (disposed) cleanups.splice(0).forEach((fn) => fn());
    })();

    return () => {
      disposed = true;
      cleanups.splice(0).forEach((fn) => fn());
    };
  }, []);

  return null;
}

async function shareSameOriginFile(href: string, downloadAttr: string | null) {
  const url = new URL(href, window.location.origin);
  const toastId = toast.loading("Preparing document…");
  try {
    const res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`Could not load the document (${res.status})`);

    const blob = await res.blob();
    // fileNameForUrl sanitises, so a header can't steer the write path.
    const name = fileNameForUrl(
      url,
      fileNameFromDisposition(res.headers.get("content-disposition")) ?? downloadAttr
    );

    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import("@capacitor/filesystem"),
      import("@capacitor/share"),
    ]);
    const { uri } = await Filesystem.writeFile({
      path: name,
      data: await blobToBase64(blob),
      directory: Directory.Cache,
    });
    toast.dismiss(toastId);
    await Share.share({ title: name, files: [uri] });
  } catch (err) {
    toast.dismiss(toastId);
    // Closing the share sheet rejects with "Share canceled"; that's not an error.
    const message = err instanceof Error ? err.message : String(err);
    if (/cancel/i.test(message)) return;
    toast.error(message || "Could not open the document");
  }
}

function fileNameFromDisposition(header: string | null): string | null {
  if (!header) return null;
  const star = /filename\*=(?:UTF-8'')?([^;]+)/i.exec(header);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      // fall through to the plain filename
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(header);
  return plain ? plain[1].trim() : null;
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the document"));
    reader.readAsDataURL(blob);
  });
}
