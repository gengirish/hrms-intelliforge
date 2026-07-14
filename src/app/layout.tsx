import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorkerRegistrar } from "@/components/sw-register";
import { AuthProvider } from "@/lib/auth-context";
import { PostHogProvider } from "@/components/posthog-provider";
import { SkipToContent } from "@/components/skip-to-content";
import { CommandPalette } from "@/components/command-palette";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const SITE_DESCRIPTION =
  "Mentor Internship Platform — run internal mentor-led internship programs, track accountability, and process stipend payouts. Start free with 500 interns and 20 mentors.";

export const metadata: Metadata = {
  metadataBase: new URL("https://hrms.intelliforge.tech"),
  title: {
    default: "Mentor Internship Platform — Run Cohorts, Track Accountability, Get Paid",
    template: "%s | Mentor Internship Platform",
  },
  description: SITE_DESCRIPTION,
  applicationName: "Mentor Internship Platform",
  authors: [
    {
      name: "Girish Hiremath",
      url: "https://girishbhiremath.vercel.app",
    },
  ],
  creator: "Girish Hiremath",
  publisher: "IntelliForge AI",
  keywords: [
    "mentor internship platform",
    "internal internship program",
    "internship management",
    "mentor-led cohorts",
    "stipend payouts",
    "intern program software",
    "mentor roster",
    "onboarding",
    "attendance tracking",
    "cohort analytics",
  ],
  category: "Business · Human Resources",
  openGraph: {
    title: "Mentor Internship Platform — Run Cohorts, Track Accountability, Get Paid",
    description: SITE_DESCRIPTION,
    siteName: "Mentor Internship Platform",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mentor Internship Platform — Run Cohorts, Track Accountability, Get Paid",
    description: SITE_DESCRIPTION,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Mentor",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  userScalable: true,
  themeColor: "#2563eb",
  viewportFit: "cover",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.intelliforge.tech/#organization",
      name: "IntelliForge AI",
      url: "https://www.intelliforge.tech",
      description:
        "AI agent development and workflow automation company. Aligned with the Bharat AI Mission.",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Hyderabad",
        addressRegion: "Telangana",
        addressCountry: "IN",
      },
      founder: {
        "@type": "Person",
        "@id": "https://girishbhiremath.vercel.app/#person",
        name: "Girish Hiremath",
        url: "https://girishbhiremath.vercel.app",
        jobTitle: "AI Practitioner & Founder",
        sameAs: ["https://girishbhiremath.vercel.app"],
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://hrms.intelliforge.tech/#software",
      name: "Mentor Internship Platform",
      applicationCategory: "BusinessApplication",
      url: "https://hrms.intelliforge.tech",
      description:
        "Internal mentor-led internship program platform — invite mentors, run cohorts, track accountability, and process stipend payouts.",
      operatingSystem: "Web",
      publisher: {
        "@id": "https://www.intelliforge.tech/#organization",
      },
      author: {
        "@id": "https://girishbhiremath.vercel.app/#person",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${jakarta.variable}`}>
      <body className="font-sans antialiased bg-slate-950 text-slate-100 selection:bg-brand-500/30 selection:text-white">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <SkipToContent />
        <AuthProvider>
          <PostHogProvider>
            {children}
            <CommandPalette />
          </PostHogProvider>
        </AuthProvider>
        <Toaster
          position="top-right"
          richColors
          theme="dark"
          toastOptions={{
            style: {
              background: "#0F172A",
              border: "1px solid #334155",
              color: "#F8FAFC",
            },
          }}
        />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
