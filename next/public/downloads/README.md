# Greenofig APK hosting

Each release of the Android app lands here as `greenofig-0.0.1.apk`
(filename is intentionally pinned even when the version bumps — it's
the URL that users hit from /download, and they keep the same stable
URL across releases). The CI build (.github/workflows/build-android.yml)
overwrites this file every time a `v*` tag is published.

Manual bootstrap (one time, for v0.0.2):
  1. On a device that's authenticated to the private repo, download:
     https://github.com/RawanGreenofig/greenofig/releases/download/v0.0.2/greenofig-0.0.1.apk
  2. Drop the file at next/public/downloads/greenofig-0.0.1.apk
  3. git add + commit + push to main.

After that the CI keeps it fresh automatically on every release.
