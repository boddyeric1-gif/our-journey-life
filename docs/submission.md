# Our Journey — App Store Submission

Two checklists, one per store, plus what's already wired up.

## Already wired (web bundle)

- `manifest.webmanifest`, theme color, apple-touch-icon, favicon, status-bar meta.
- `vitest run` covers timezone-safe streak math + freeze logic.
- Realtime hook (`useDailyRealtime`) replaces the manual refresh on the daily reveal.
- Privacy and Terms routes at `/privacy` and `/terms` (also reachable from the auth page).
- `/api/public/health` for uptime monitors.
- Soft Dusk design system (deep plum, candlelight, dusk rose) defined in `src/styles.css` — no hardcoded colors in components.

## iOS — App Store

1. From a Mac with Xcode installed, run:
   ```bash
   bun install
   bun run build
   bunx cap add ios       # first time only
   bun run cap:sync
   bun run cap:open:ios
   ```
2. In Xcode, set Team + Bundle Identifier (`app.ourjourney.couple`).
3. Replace `App/App/Assets.xcassets/AppIcon.appiconset/*` with renders of `src/assets/app-icon.png` (1024 is in repo; let Xcode generate the rest).
4. Add associated domain `applinks:ourjourney.app` for invite deep-links.
5. Required strings (Info.plist):
   - `NSUserTrackingUsageDescription` — not used.
   - No camera, mic, or location prompts needed unless we add photo memories.
6. Sign-In with Apple is enabled in Lovable Cloud — when adding the capability in Xcode, use the same Services ID configured in Cloud → Users → Auth → Apple.
7. App Store Connect metadata: see `docs/store-listing.md`.
8. Submit a build for TestFlight first; the dual-reveal flow needs two reviewer accounts (provide a paired test account pair in App Review notes).

## Android — Google Play

1. From any machine with Android Studio:
   ```bash
   bun install
   bun run build
   bunx cap add android   # first time only
   bun run cap:sync
   bun run cap:open:android
   ```
2. In `android/app/build.gradle`, confirm `applicationId "app.ourjourney.couple"`.
3. Replace launcher icons under `android/app/src/main/res/mipmap-*` from `src/assets/app-icon.png` (use Image Asset Studio for adaptive icon; foreground = icon, background = `#1A1426`).
4. Add an intent filter on `MainActivity` for `https://ourjourney.app/join/*` and `ourjourney://join/*`.
5. Play Console metadata: see `docs/store-listing.md`. Content rating = Everyone. Data safety form: only "Personal info" (email, name) + "Messages" (the writing you create), used for "App functionality", never shared.

## After both stores accept

- Wire managed Apple Sign-In credentials in Cloud → Auth → Apple (BYOC).
- Add a production custom domain (`ourjourney.app`) and re-test the OAuth redirect path on both web and Capacitor shells.
- Configure a status badge on the marketing site that pings `/api/public/health`.
