import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Native iOS/Android shell for the HRMS web app.
 *
 * HRMS is a server-rendered Next.js app (Route Handlers, middleware auth), so it
 * cannot be bundled into the app as static files. The shell loads the deployed
 * site instead, and `capacitor/www` only holds the pages shown when it can't.
 * Web changes ship with a normal Vercel deploy; only changes to this file, the
 * native projects or native plugins need a new store build.
 *
 * Set CAP_SERVER_URL to point a dev build at a local or preview server, e.g.
 *   CAP_SERVER_URL=http://192.168.1.10:3000 npx cap sync android
 */
const DEFAULT_SERVER_URL = "https://hrms.intelliforge.tech";
const serverUrl = process.env.CAP_SERVER_URL || DEFAULT_SERVER_URL;

const config: CapacitorConfig = {
  appId: "tech.intelliforge.hrms",
  appName: "Mentor",
  webDir: "capacitor/www",
  backgroundColor: "#020617",
  // Lets the server and analytics tell app traffic apart from mobile browsers.
  appendUserAgent: "IntelliForgeHRMS",
  server: {
    url: serverUrl,
    cleartext: serverUrl.startsWith("http://"),
    errorPath: "offline.html",
    // Everything else opens in the system browser. Stripe stays in the WebView
    // because it redirects back to /dashboard/settings, and the return trip
    // needs the session cookie, which only lives inside the app's WebView.
    // (Digio e-sign reports back by webhook, so it can open outside the app.)
    // Keep in sync with IN_APP_HOSTS in src/lib/native-app.ts.
    allowNavigation: ["checkout.stripe.com", "billing.stripe.com"],
  },
  android: {
    // Debugging a production build needs a rebuild with this flipped on.
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: "never",
    scrollEnabled: true,
  },
  plugins: {
    SystemBars: {
      // The app is dark-only (slate-950), so the bars get light icons.
      style: "DARK",
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
    },
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#020617",
      showSpinner: false,
    },
  },
};

export default config;
