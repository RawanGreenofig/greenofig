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
  // Pin the WebView's User-Agent to a mobile Chrome string. Without
  // this the default Capacitor UA contains "Mozilla/5.0 (Linux;
  // Android…) … wv" which some sites (and some of our own SSR
  // branches) misidentify as desktop, breaking scroll heuristics.
  // Also exposes a stable "GreenofigApp/{ver}" tag so server code
  // can opt the native client into different behaviour later.
  overrideUserAgent:
    'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 GreenofigApp/0.1.0',
  server: {
    // Production URL. Override in dev via CAP_SERVER_URL.
    url: process.env.CAP_SERVER_URL ?? 'https://greenofig.com',
    androidScheme: 'https',
    // Block clear-http requests — every dependency we hit is on HTTPS.
    cleartext: false,
    // Hostnames the WebView is allowed to navigate to. Anything
    // outside this list opens in the system browser instead of
    // taking over the app shell.
    allowNavigation: [
      'greenofig.com',
      '*.greenofig.com',
      // Supabase Auth + Postgrest + Realtime endpoints. The wildcard
      // already covers our project host, but we list the explicit
      // project URL too so it's obvious from this file which Supabase
      // backend the WebView talks to. (allowNavigation governs
      // top-level WebView navigations; fetch() requests aren't
      // restricted by it on Android Capacitor — they're plain HTTPS.
      // Listed regardless for completeness.)
      'hledcyhwadgmbmznqzwe.supabase.co',
      '*.supabase.co',
      '*.supabase.in',
      'api.stripe.com',
      'checkout.stripe.com',
      '*.googleapis.com',
      'github.com',
      '*.githubusercontent.com',
    ],
  },
  android: {
    // Apply the system back gesture as a router back rather than
    // exiting the app on every press.
    backgroundColor: '#0d1a12',
    // Allow https pages to load mixed-content sub-resources (some
    // of our analytics + image CDNs occasionally serve assets over
    // http on Android's first run before the upgrade-insecure
    // header kicks in). Avoids silent fetch failures that have
    // been mistaken for "scroll dies".
    allowMixedContent: true,
    // Route raw touch events to the WebView instead of letting the
    // native view layer eat them. Resolves the case where mid-page
    // touchstart can be intercepted by an off-screen native input,
    // which kills the scroll gesture.
    captureInput: true,
    // Production builds: don't expose chrome://inspect.
    webContentsDebuggingEnabled: false,
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
