# Greenofig APK hosting

Each release of the Android app overwrites `greenofig-latest.apk`
here. The public URL the website points at is therefore stable:

    https://greenofig.com/downloads/greenofig-latest.apk

The CI build (.github/workflows/build-android.yml) handles the copy
and commit automatically on every `v*` tag push — no manual step
required after the initial bootstrap.

Per-release version-tagged APKs (greenofig-0.0.5.apk, etc.) are
attached to the matching GitHub Release for traceability, but the
website never links to those.
