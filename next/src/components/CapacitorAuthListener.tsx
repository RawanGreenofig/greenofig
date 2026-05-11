'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isInsideCapacitor } from '@/lib/is-capacitor'
import { getBrowserSupabase } from '@/lib/supabase/client'

/**
 * Capacitor deep-link → Supabase session bridge.
 *
 * Google OAuth round-trip flow inside the Android app:
 *
 *   1. User taps "Sign in with Google" in the WebView.
 *   2. signInWithOAuth({ redirectTo: 'com.greenofig.app://login-callback' })
 *      kicks off the Supabase flow → opens a Chrome Custom Tab.
 *   3. User authenticates with Google in the Custom Tab.
 *   4. Google redirects to com.greenofig.app://login-callback?code=...
 *   5. Android's intent system invokes the Greenofig app with that URL.
 *   6. THIS listener picks it up via @capacitor/app's appUrlOpen event
 *      and calls supabase.auth.exchangeCodeForSession(code) to finish
 *      the PKCE handshake.
 *   7. User lands signed-in inside the WebView.
 *
 * No-op in a regular browser — @capacitor/app's listener fires
 * nothing when there's no native bridge. Dynamic import keeps the
 * plugin out of the browser-side bundle until it's actually needed.
 */
export function CapacitorAuthListener() {
  const router = useRouter()

  useEffect(() => {
    if (!isInsideCapacitor()) return
    let cleanup: (() => void) | undefined
    let cancelled = false
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod: any = await import('@capacitor/app')
        const App = mod.App
        if (!App || cancelled) return
        const handle = await App.addListener('appUrlOpen', async (event: { url: string }) => {
          const url = event?.url ?? ''
          // eslint-disable-next-line no-console
          console.log('[gf-cap] appUrlOpen:', url)
          if (!url.startsWith('com.greenofig.app://')) return
          const supabase = getBrowserSupabase()
          if (!supabase) return

          // Supabase can deliver tokens in two shapes depending on
          // the OAuth flow:
          //   - PKCE  → ?code=... in the query string
          //   - implicit → #access_token=...&refresh_token=... in
          //     the hash fragment
          // Handle both.
          try {
            const parsed = new URL(url)
            const code = parsed.searchParams.get('code')
            if (code) {
              const { error } = await supabase.auth.exchangeCodeForSession(code)
              if (error) {
                console.error('[gf-cap] exchangeCodeForSession failed:', error)
                return
              }
              router.replace('/dashboard')
              return
            }
            const hash = parsed.hash.startsWith('#')
              ? parsed.hash.slice(1)
              : parsed.hash
            const params = new URLSearchParams(hash)
            const accessToken = params.get('access_token')
            const refreshToken = params.get('refresh_token')
            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              })
              if (error) {
                console.error('[gf-cap] setSession failed:', error)
                return
              }
              router.replace('/dashboard')
            }
          } catch (err) {
            console.error('[gf-cap] auth callback parse failed:', err)
          }
        })
        cleanup = () => {
          try { handle.remove() } catch { /* listener already gone */ }
        }
      } catch (err) {
        console.error('[gf-cap] @capacitor/app import failed:', err)
      }
    })()
    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [router])

  return null
}
