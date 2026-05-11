/**
 * Detect whether the current document is running inside the
 * Greenofig Capacitor Android WebView. Two signals so we don't
 * miss either side of the load:
 *
 *   1. The UA tag we set in mobile/capacitor.config.ts. The
 *      WebView sets the UA before the page loads, so this is
 *      true on the very first paint.
 *   2. window.Capacitor.isNativePlatform() — populated after
 *      Capacitor's JS shim runs. Useful when something else has
 *      overridden the UA.
 *
 * Safe in SSR contexts — returns false when window is undefined.
 */
export function isInsideCapacitor(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof navigator !== 'undefined' && /GreenofigApp\//.test(navigator.userAgent)) {
    return true
  }
  const w = window as Window & {
    Capacitor?: { isNativePlatform?: () => boolean }
  }
  return !!w.Capacitor?.isNativePlatform?.()
}
