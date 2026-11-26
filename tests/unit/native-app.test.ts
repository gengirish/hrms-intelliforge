import { describe, expect, it } from "vitest";
import config from "../../capacitor.config";
import {
  IN_APP_HOSTS,
  classifyNativeLink,
  fileNameForUrl,
} from "@/lib/native-app";

const origin = "https://hrms.intelliforge.tech";

describe("classifyNativeLink", () => {
  it("leaves ordinary in-app navigation to the WebView", () => {
    expect(classifyNativeLink({ href: "/dashboard", origin })).toBe("default");
    expect(classifyNativeLink({ href: `${origin}/tasks?x=1`, origin })).toBe("default");
  });

  it("keeps same-origin new-tab links in the WebView", () => {
    expect(classifyNativeLink({ href: "/internships/x", origin, target: "_blank" })).toBe(
      "same-view"
    );
  });

  it("treats same-origin PDFs and download links as files", () => {
    expect(classifyNativeLink({ href: "/api/offer/pdf", origin, target: "_blank" })).toBe("file");
    expect(classifyNativeLink({ href: "/api/offer/pdf", origin, download: true })).toBe("file");
    expect(classifyNativeLink({ href: "/docs/terms.PDF", origin })).toBe("file");
    expect(classifyNativeLink({ href: "/api/export", origin, download: true })).toBe("file");
  });

  it("opens other sites in the system browser", () => {
    expect(classifyNativeLink({ href: "https://www.linkedin.com/in/x", origin })).toBe("external");
    expect(
      classifyNativeLink({ href: "https://ext.digio.in/sign/abc", origin, target: "_blank" })
    ).toBe("external");
    expect(
      classifyNativeLink({
        href: "https://abc.public.blob.vercel-storage.com/resume.pdf",
        origin,
        target: "_blank",
      })
    ).toBe("external");
    // A look-alike subdomain is not our origin.
    expect(classifyNativeLink({ href: "https://hrms.intelliforge.tech.evil.com/", origin })).toBe(
      "external"
    );
  });

  it("keeps Stripe checkout and billing in the WebView", () => {
    expect(classifyNativeLink({ href: "https://checkout.stripe.com/c/pay/cs_1", origin })).toBe(
      "default"
    );
    expect(
      classifyNativeLink({ href: "https://billing.stripe.com/p/session/x", origin, target: "_blank" })
    ).toBe("same-view");
  });

  it("leaves non-web schemes and junk to the OS", () => {
    expect(classifyNativeLink({ href: "mailto:hr@example.com", origin })).toBe("default");
    expect(classifyNativeLink({ href: "tel:+919999999999", origin })).toBe("default");
    expect(classifyNativeLink({ href: "https://[bad", origin })).toBe("default");
  });
});

describe("fileNameForUrl", () => {
  it("names /…/pdf endpoints after their parent segment", () => {
    expect(fileNameForUrl(new URL(`${origin}/api/offer/pdf`))).toBe("offer.pdf");
  });

  it("prefers the download attribute and sanitises it", () => {
    expect(fileNameForUrl(new URL(`${origin}/api/offer/pdf`), "Offer Letter.pdf")).toBe(
      "Offer-Letter.pdf"
    );
    expect(fileNameForUrl(new URL(`${origin}/api/offer/pdf`), "../../etc/passwd")).toBe(
      "etc-passwd"
    );
    expect(fileNameForUrl(new URL(`${origin}/api/offer/pdf`), "..")).toBe("document.pdf");
    expect(fileNameForUrl(new URL(`${origin}/a/report`), "  ")).toBe("report.pdf");
  });
});

describe("capacitor.config", () => {
  it("allows exactly the hosts the web side keeps in the WebView", () => {
    expect([...(config.server?.allowNavigation ?? [])].sort()).toEqual([...IN_APP_HOSTS].sort());
  });

  it("loads production over HTTPS by default", () => {
    if (process.env.CAP_SERVER_URL) return;
    expect(config.server?.url).toBe(origin);
    expect(config.server?.cleartext).toBe(false);
  });
});
