# Shipping "I Got This" to TestFlight (iOS)

This app is wrapped with [Capacitor](https://capacitorjs.com) — the same React
web app, running in a native iOS shell with offline storage. This guide covers
the steps that have to happen on your Mac (signing, archiving, uploading) — the
parts I can't do for you.

> Prereqs (already confirmed on this machine): Xcode 26, an Apple Developer
> account, and a populated `.env` with your `REACT_APP_SUPABASE_*` values.

---

## Fast path: build + upload from the terminal (no Xcode GUI)

Recommended — especially on slow internet, since it skips the simulator/runtime
downloads the Xcode GUI nags about. The app already compiles for device via CLI.

**One-time:** create an **App Store Connect API key**
(App Store Connect → *Users and Access* → *Integrations* → *App Store Connect
API* → generate a key with *App Manager* access). Download the
`AuthKey_XXXX.p8` (one download only) and note the **Key ID** and **Issuer ID**.
Grab your **Team ID** from developer.apple.com → *Membership*.

Then:

```bash
export ASC_KEY_ID=XXXXXXXXXX
export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
export ASC_KEY_PATH="$HOME/keys/AuthKey_XXXXXXXXXX.p8"
export APPLE_TEAM_ID=XXXXXXXXXX

bash scripts/ios-release.sh
```

That builds the web app, syncs it, archives a signed Release build (creating the
distribution cert + provisioning profile automatically), and uploads it to
TestFlight. Re-run it any time — the build number auto-increments. The only
network it uses is a quick signing handshake plus the (small) `.ipa` upload.

After it finishes, jump to **Step 5** below to add your wife as a tester.

> Don't commit the `.p8` key or your IDs — keep them in your shell or an
> untracked file you `source`.

---

## GUI path (alternative)

## 1. Build the web app and open Xcode

```bash
npm run ios:open
```

This builds the React app, copies it into the iOS project (`cap sync`), and
opens the `App` project in Xcode. (Capacitor 7 uses Swift Package Manager, so
it's `App.xcodeproj` — there's no CocoaPods workspace. Run `npm run ios:sync`
alone whenever you change web code and just want to refresh the native project.)

## 2. Signing (one-time)

In Xcode: select the **App** target → **Signing & Capabilities**:

1. Check **Automatically manage signing**.
2. Set **Team** to your Apple Developer account.
3. **Bundle Identifier** is `com.balonek.igotthis` — change it if you want; it
   just has to be unique to your account. Xcode will register it for you.

## 3. Set version + build number

App target → **General** → Identity: set **Version** (e.g. `1.0`) and **Build**
(e.g. `1`). Bump **Build** every time you upload a new archive.

## 4. Archive and upload

1. Set the run destination (top bar) to **Any iOS Device (arm64)** — you can't
   archive against a simulator.
2. **Product → Archive**. When it finishes, the Organizer window opens.
3. Select the archive → **Distribute App** → **App Store Connect** → **Upload**.
   Accept the defaults; let Xcode manage signing. It uploads to App Store
   Connect (a few minutes to process).

## 5. App Store Connect → TestFlight

1. At [appstoreconnect.apple.com](https://appstoreconnect.apple.com), if there's
   no app record yet: **Apps → +** → New App, pick the bundle ID, name it
   "I Got This Itinerary".
2. Open the **TestFlight** tab. Your build appears once processing finishes
   (you may need to answer the export-compliance question — this app uses only
   standard HTTPS encryption, so "No" to proprietary encryption).
3. **Invite your wife (easiest path — internal testing, no review):**
   - **Users and Access → +** → add her Apple ID with the **App Manager** (or
     Developer) role.
   - Back in **TestFlight → Internal Testing**, create a group, add her, and
     attach the build. She gets an email, installs the **TestFlight** app from
     the App Store, and taps the invite to install "I Got This."
   - Internal testers skip Beta App Review. (External testers would trigger a
     short review.)

## Updating the app later

```bash
npm run ios:sync     # rebuild web + sync into the native project
```
Then in Xcode bump the **Build** number, Archive, and Upload again.

## Known limitation: AI scraping in the native app

The screenshot/URL extraction calls Netlify Functions at relative paths
(`/.netlify/functions/...`). In the web/PWA build (served from Netlify) this
works; in the native build there's no server at that path, so those AI features
won't work until we point them at the absolute deployed URL
(e.g. `https://i-got-this-itenerary.netlify.app/.netlify/functions/...`).
Everything else — trips, itinerary, maps, offline sync — works natively.
Ask me to wire this up when you want it.

## App icon (optional polish)

The build currently uses Capacitor's default icon. To set your own, drop a
1024×1024 PNG and run an icon generator (e.g. `@capacitor/assets`), or set the
`AppIcon` asset in `ios/App/App/Assets.xcassets` directly in Xcode.
