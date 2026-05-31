#!/usr/bin/env bash
#
# Build, archive, and upload the iOS app to App Store Connect / TestFlight
# entirely from the terminal — no Xcode GUI required.
#
# One-time setup:
#   1. App Store Connect -> Users and Access -> Integrations -> App Store
#      Connect API -> generate a key with "App Manager" access. Download the
#      AuthKey_XXXXXXXXXX.p8 (you can only download it once) and note the
#      Key ID and Issuer ID.
#   2. Find your Team ID at developer.apple.com -> Membership (10 chars).
#   3. Export these before running (e.g. in your shell or a .env you `source`):
#        export ASC_KEY_ID=XXXXXXXXXX
#        export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
#        export ASC_KEY_PATH="$HOME/keys/AuthKey_XXXXXXXXXX.p8"
#        export APPLE_TEAM_ID=XXXXXXXXXX
#
# Then just run:  bash scripts/ios-release.sh
#
# The only network it needs: a quick signing handshake with Apple and the
# final upload (this app's .ipa is small). No simulator/runtime downloads.

set -euo pipefail

: "${ASC_KEY_ID:?set ASC_KEY_ID (App Store Connect API Key ID)}"
: "${ASC_ISSUER_ID:?set ASC_ISSUER_ID (App Store Connect Issuer ID)}"
: "${ASC_KEY_PATH:?set ASC_KEY_PATH (path to AuthKey_XXXX.p8)}"
: "${APPLE_TEAM_ID:?set APPLE_TEAM_ID (10-char Apple Developer Team ID)}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ARCHIVE="$ROOT/build/App.xcarchive"
EXPORT_DIR="$ROOT/build/ios-export"
PLIST="$ROOT/build/ExportOptions.plist"
# Auto-incrementing build number so re-uploads aren't rejected as duplicates.
BUILD_NUMBER="$(date +%Y%m%d%H%M)"
APP_VERSION="${APP_VERSION:-1.0}"

echo "==> Building web app + syncing into iOS project"
npm run build
npx cap sync ios

echo "==> Archiving (Release, generic iOS device) — version $APP_VERSION ($BUILD_NUMBER)"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$ARCHIVE" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID" \
  DEVELOPMENT_TEAM="$APPLE_TEAM_ID" \
  MARKETING_VERSION="$APP_VERSION" \
  CURRENT_PROJECT_VERSION="$BUILD_NUMBER" \
  archive

echo "==> Writing export options"
cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key><string>app-store-connect</string>
  <key>destination</key><string>upload</string>
  <key>signingStyle</key><string>automatic</string>
  <key>teamID</key><string>${APPLE_TEAM_ID}</string>
</dict>
</plist>
PLIST_EOF

echo "==> Exporting + uploading to App Store Connect (TestFlight)"
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportPath "$EXPORT_DIR" \
  -exportOptionsPlist "$PLIST" \
  -allowProvisioningUpdates \
  -authenticationKeyPath "$ASC_KEY_PATH" \
  -authenticationKeyID "$ASC_KEY_ID" \
  -authenticationKeyIssuerID "$ASC_ISSUER_ID"

echo ""
echo "==> Uploaded. It'll appear in App Store Connect -> TestFlight in a few"
echo "    minutes once Apple finishes processing. Add your wife as an internal"
echo "    tester there (see TESTFLIGHT.md)."
