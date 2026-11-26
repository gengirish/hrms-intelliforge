# Mobile app (Capacitor)

The iOS and Android apps are a native shell around the deployed site. HRMS is server-rendered (Route Handlers, middleware auth), so it can't be bundled as static files; the app loads `https://hrms.intelliforge.tech` in a WebView instead.

**What needs a store release:** only changes to `capacitor.config.ts`, `android/`, `ios/`, `capacitor/` or a native plugin. Everything else, including `src/components/native-shell.tsx`, ships with a normal Vercel deploy and reaches installed apps on their next launch.

## Layout

| Path | What it is |
|---|---|
| `capacitor.config.ts` | App ID `tech.intelliforge.hrms`, name "Mentor", server URL, allowed in-app hosts, system bars, splash |
| `capacitor/www/` | `index.html` (required by Capacitor, never shown) and `offline.html` (shown when the site can't load) |
| `capacitor/assets/` | Icon and splash sources (SVG + rendered PNG); `npm run cap:assets` regenerates every platform size |
| `android/`, `ios/` | Native projects. Commit them; build output and the copied config are git-ignored |
| `src/lib/native-app.ts` | Pure link-routing rules, unit-tested in `tests/unit/native-app.test.ts` |
| `src/components/native-shell.tsx` | Web side of the shell, mounted in the root layout; does nothing in a browser |

## Behaviour inside the app

- **Session:** the WebView keeps the `hrms-session` cookie like a browser, so password, OTP and invite flows work unchanged.
- **Links:** HRMS pages load in the app; new-tab links to HRMS stay in the app (the WebView has no tabs). Other sites open in an in-app system browser (Custom Tab / SFSafariViewController), which doesn't share the app's cookies.
- **Stripe** checkout and billing portal load inside the WebView (`server.allowNavigation`), because they redirect back to `/dashboard/settings` and need the session. Add any future provider that redirects back with the user's session to both `allowNavigation` and `IN_APP_HOSTS`; a unit test keeps the two lists in sync.
- **Digio e-sign** opens in the system browser; Digio reports back by webhook, and the offer page re-checks the status when the intern returns.
- **Same-origin PDFs** (`/api/offer/pdf`) are fetched with the session and handed to the share sheet, since the Android WebView can't display or download them.
- **Android back button** walks WebView history, then backgrounds the app.
- **Status bar:** the app is edge-to-edge; `html.native-app .navbar-standalone` pads the navbar below the status bar. A new full-screen header needs `env(safe-area-inset-top)` padding too.
- **Traffic** from the app carries `IntelliForgeHRMS` in its user agent.

## Building

Prerequisites:

- **Android:** Android Studio with SDK 36. Capacitor 8 compiles with **Java 21**; Android Studio's bundled JDK works, but command-line Gradle builds need `JAVA_HOME` pointing at JDK 21 (JDK 17 fails). Minimum Android version is 7.0 (API 24).
- **iOS:** a Mac with a current Xcode; the deployment target is iOS 15. iOS uses Swift Package Manager, so CocoaPods isn't needed.

```bash
npm install
npm run cap:android     # sync, then open in Android Studio → Run
npm run cap:ios         # sync, then open in Xcode (Mac only) → Run
```

Run `npx cap sync` after changing `capacitor.config.ts`, `capacitor/www/` or a plugin version. The copied config in the native projects is git-ignored, so a fresh clone needs a sync before its first build.

Point a debug build at a local server (phone and PC on the same network):

```bash
npm run dev -- -H 0.0.0.0
CAP_SERVER_URL=http://192.168.1.10:3000 npx cap sync android
```

Sync again without `CAP_SERVER_URL` before building a release. To inspect the WebView with `chrome://inspect`, set `android.webContentsDebuggingEnabled: true` for that build.

## Before the first store submission

- **App ID** `tech.intelliforge.hrms` is permanent once published.
- **Android signing:** create an upload keystore, keep it out of git, and enable Play App Signing.
- **Apple review (guideline 4.2, minimum functionality):** Apple rejects apps that are only a website in a wrapper. Native file sharing, back handling and system-browser links help, but push notifications or another native feature make approval more likely.
- **Apple guideline 3.1:** Stripe subscriptions inside an iOS app can be rejected unless billing is clearly for an organisation (B2B). Consider hiding the billing UI in the iOS app (`html.native-app`) and sending admins to the website instead.
- **Privacy:** both stores require a privacy policy URL and a data-safety / privacy-label form, which must cover PostHog and Sentry.

## Known gaps

- `.ics` downloads (interview scheduling) and other `blob:` downloads do nothing on Android.
- The service worker doesn't register in the iOS app (WKWebView needs App-Bound Domains for that); the app works without it.
- `offline.html` retries production even in a `CAP_SERVER_URL` debug build.
