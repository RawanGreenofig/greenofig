#!/usr/bin/env node
/**
 * Sync the Android build's versionName + versionCode with the web
 * app's package.json version. Single source of truth: bump
 * `next/package.json` "version", then run this script.
 *
 *   versionName = the semver string itself ("0.0.1")
 *   versionCode = packed integer the Play Store + Android use
 *                 to compare builds. Formula:
 *                   major * 1_000_000 + minor * 1_000 + patch
 *                 So 0.0.1 → 1, 0.2.3 → 2003, 1.4.7 → 1_004_007.
 *
 * Writes the values into mobile/android/app/build.gradle if it
 * exists (i.e. after `npx cap add android` has been run). In CI
 * we run this AFTER the cap-add step but BEFORE assembleRelease,
 * so the gradle build picks the right values up.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, '..', '..')
const webPkgPath = path.join(repoRoot, 'next', 'package.json')
const gradlePath = path.join(here, '..', 'android', 'app', 'build.gradle')

const webPkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf8'))
const versionName = String(webPkg.version ?? '0.0.1').trim()

const semver = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(versionName)
if (!semver) {
  console.error(`[sync-version] Invalid semver in next/package.json: "${versionName}"`)
  process.exit(1)
}
const [, majorS, minorS, patchS] = semver
const major = Number(majorS)
const minor = Number(minorS)
const patch = Number(patchS)
const versionCode = major * 1_000_000 + minor * 1_000 + patch

console.log(`[sync-version] versionName=${versionName} versionCode=${versionCode}`)

// Always emit a sidecar JSON so CI can read both values without
// re-implementing the math. Lives in mobile/ so .gitignore covers it.
const sidecarPath = path.join(here, '..', 'version.json')
fs.writeFileSync(
  sidecarPath,
  JSON.stringify({ versionName, versionCode }, null, 2) + '\n',
  'utf8',
)
console.log(`[sync-version] wrote ${path.relative(repoRoot, sidecarPath)}`)

// If the Android project has been generated, patch its build.gradle
// in-place. If not, the developer or CI hasn't run `cap add android`
// yet — we still emitted version.json so the next step can use it.
if (!fs.existsSync(gradlePath)) {
  console.log('[sync-version] android/ not generated yet — version.json only')
  process.exit(0)
}

let gradle = fs.readFileSync(gradlePath, 'utf8')
const before = gradle
gradle = gradle.replace(/versionCode\s+\d+/g, `versionCode ${versionCode}`)
gradle = gradle.replace(/versionName\s+"[^"]*"/g, `versionName "${versionName}"`)
if (gradle === before) {
  console.warn('[sync-version] no versionCode/Name found in build.gradle — skipped patch')
} else {
  fs.writeFileSync(gradlePath, gradle, 'utf8')
  console.log(`[sync-version] patched ${path.relative(repoRoot, gradlePath)}`)
}
