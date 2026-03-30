import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { ServiceWorkerRegistrar } from "@/components/sw-register";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://hrms.intelliforge.tech"),
  title: "IntelliForge HRMS — Intern Portal",
  description:
    "Human Resource Management System for IntelliForge AI internship program. Onboard, track attendance, manage tasks, and more.",
  openGraph: {
    title: "IntelliForge HRMS — Intern Portal",
    description:
      "Human Resource Management System for IntelliForge AI internship program. Onboard, track attendance, manage tasks, and more.",
    siteName: "IntelliForge HRMS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
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
  themeColor: "#6366f1",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} antialiased bg-slate-950 text-slate-100`}>
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster
          position="top-right"
          richColors
          theme="dark"
          toastOptions={{
            style: { background: "#1e293b", border: "1px solid #334155" },
          }}
        />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
