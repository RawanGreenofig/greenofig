#!/usr/bin/env node
/**
 * Inject the `com.greenofig.app://` deep-link intent filter into
 * android/app/src/main/AndroidManifest.xml so OAuth providers can
 * bounce back into the Capacitor app after auth.
 *
 * Idempotent — bails out if the scheme is already declared.
 *
 * Runs in CI after `npx cap add android` (which generates a fresh
 * manifest each build) and before `gradle assembleRelease`.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const manifestPath = path.join(
  here,
  '..',
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml',
)

if (!fs.existsSync(manifestPath)) {
  console.error(`[patch-manifest] AndroidManifest.xml not found at ${manifestPath}`)
  console.error('[patch-manifest] Did you run `npx cap add android` first?')
  process.exit(1)
}

let manifest = fs.readFileSync(manifestPath, 'utf8')

if (manifest.includes('android:scheme="com.greenofig.app"')) {
  console.log('[patch-manifest] Deep-link intent filter already present — skipping.')
  process.exit(0)
}

const intentFilter = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="com.greenofig.app" />
            </intent-filter>
`

// Insert the new <intent-filter> right before the closing </activity>
// of the MainActivity launcher block. Capacitor's manifest puts the
// LAUNCHER intent filter inside <activity android:name="MainActivity">.
const closingActivity = manifest.lastIndexOf('</activity>')
if (closingActivity === -1) {
  console.error('[patch-manifest] Could not find </activity> in manifest')
  process.exit(1)
}

const patched =
  manifest.slice(0, closingActivity) +
  intentFilter +
  manifest.slice(closingActivity)

fs.writeFileSync(manifestPath, patched, 'utf8')
console.log('[patch-manifest] Added com.greenofig.app:// intent filter')
