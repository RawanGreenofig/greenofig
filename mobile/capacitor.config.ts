import type { CapacitorConfig } from '@capacitor/cli'

/**
 * Greenofig Android wrapper.
 *
 * Strategy: hybrid WebView pointing at the production web app.
 * The native shell ships a 1-page splash in `www/` that loads
 * briefly while the WebView fetches https://greenofig.com — the
 * actual UI is the live web app, not bundled HTML/JS. This means:
 *
 *   - Web releases auto-propagate to the APK on next launch.
 *   - No need to re-publish the APK for content changes.
 *   - APK upgrades only when we touch native code or plugin deps.
 *
 * Capacitor still requires a webDir even when server.url is set,
 * so www/ exists with a minimal index.html.
 */
const config: CapacitorConfig = {
  appId: 'com.greenofig.app',
  appName: 'Greenofig',
  webDir: 'www',
  server: {
    // Production URL. Override in dev via CAP_SERVER_URL.
    url: process.env.CAP_SERVER_URL ?? 'https://greenofig.com',
    androidScheme: 'https',
    // Block clear-http requests — every dependency we hit is on HTTPS.
    cleartext: false,
  },
  android: {
    // Apply the system back gesture as a router back rather than
    // exiting the app on every press.
    backgroundColor: '#0d1a12',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0d1a12',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
    LocalNotifications: {
      // Lime brand colour for the small icon tint on Android.
      smallIcon: 'ic_stat_icon',
      iconColor: '#a3e635',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
}

export default config
