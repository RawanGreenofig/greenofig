#!/usr/bin/env node
/**
 * Inject a release signing config into android/app/build.gradle.
 * Idempotent: bails out if signingConfigs.release is already present.
 *
 * Usage:
 *   node inject-signing.mjs <path-to-build.gradle>
 *
 * Reads keystore.properties (created by the CI workflow) at the
 * android/ root for storeFile / storePassword / keyAlias / keyPassword.
 */

import fs from 'node:fs'
import path from 'node:path'

const gradlePath = process.argv[2]
if (!gradlePath || !fs.existsSync(gradlePath)) {
  console.error('[inject-signing] gradle path missing or not found')
  process.exit(1)
}

let gradle = fs.readFileSync(gradlePath, 'utf8')

if (gradle.includes('signingConfigs.release') || gradle.includes('signingConfig signingConfigs.release')) {
  console.log('[inject-signing] already has release signing — skipping')
  process.exit(0)
}

// 1) Add a load block at the top so `keystoreProperties` is available.
const loadBlock = `
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
  keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
`.trim()
if (!gradle.includes('keystorePropertiesFile = rootProject.file("keystore.properties")')) {
  gradle = loadBlock + '\n\n' + gradle
}

// 2) Insert a signingConfigs.release block + wire it into release
//    buildType. We tuck it inside the existing `android { ... }` block.
const signingBlock = `
    signingConfigs {
        release {
            if (keystoreProperties['storeFile']) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
`
// Inject signingConfigs right before the `buildTypes` block.
gradle = gradle.replace(/(\n\s*buildTypes\s*\{)/, `${signingBlock}\n$1`)

// Wire signingConfigs.release into the existing `release` buildType.
gradle = gradle.replace(
  /(buildTypes\s*\{[^}]*release\s*\{)/,
  `$1\n            signingConfig signingConfigs.release`,
)

fs.writeFileSync(gradlePath, gradle, 'utf8')
console.log(`[inject-signing] patched ${path.basename(gradlePath)}`)
