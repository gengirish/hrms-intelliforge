import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorkerRegistrar } from "@/components/sw-register";
import { AuthProvider } from "@/lib/auth-context";
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
  "Human Resource Management System for IntelliForge AI internship program. Onboard, track attendance, manage tasks, and more. A product of IntelliForge AI, founded by Girish Hiremath — aligned with the Bharat AI Mission.";

export const metadata: Metadata = {
  metadataBase: new URL("https://hrms.intelliforge.tech"),
  title: {
    default: "IntelliForge HRMS — Intern Portal",
    template: "%s | IntelliForge HRMS",
  },
  description: SITE_DESCRIPTION,
  applicationName: "IntelliForge HRMS",
  authors: [
    {
      name: "Girish Hiremath",
      url: "https://girishbhiremath.vercel.app",
    },
  ],
  creator: "Girish Hiremath",
  publisher: "IntelliForge AI",
  keywords: [
    "HRMS",
    "intern management",
    "IntelliForge AI",
    "Bharat AI Mission",
    "AI agents",
    "onboarding",
    "attendance",
    "Hyderabad",
    "Girish Hiremath",
  ],
  category: "Business · Human Resources",
  openGraph: {
    title: "IntelliForge HRMS — Intern Portal",
    description: SITE_DESCRIPTION,
    siteName: "IntelliForge HRMS",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "IntelliForge HRMS — Intern Portal",
    description: SITE_DESCRIPTION,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HRMS",
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
      name: "IntelliForge HRMS",
      applicationCategory: "BusinessApplication",
      url: "https://hrms.intelliforge.tech",
      description:
        "Human Resource Management System for the IntelliForge AI internship program — onboarding, attendance, tasks, hiring and notifications.",
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
          {children}
          <CommandPalette />
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
