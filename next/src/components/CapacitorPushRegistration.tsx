'use client'

import { useEffect, useRef } from 'react'
import { isInsideCapacitor } from '@/lib/is-capacitor'
import { useAuth } from '@/context/AuthContext'

/**
 * Inside the Capacitor Android app, register the device with Firebase
 * Cloud Messaging and POST the resulting token to /api/push/subscribe
 * so notifications/send can fan out to phones.
 *
 * Fires when:
 *   - We're inside Capacitor (UA + @capacitor/core check)
 *   - A signed-in user is present in AuthContext
 *   - We haven't already registered this session
 *
 * No-op outside Capacitor — the @capacitor/push-notifications import
 * is dynamic so the plugin shim doesn't ship to browser bundles.
 */
export function CapacitorPushRegistration() {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const registeredFor = useRef<string | null>(null)

  useEffect(() => {
    if (!isInsideCapacitor()) return
    if (!userId) return
    // Don't re-register on every render — once per user id per
    // session is enough. Re-running the flow on a new sign-in
    // (different userId) does fire again.
    if (registeredFor.current === userId) return

    let cancelled = false
    let cleanup: (() => void) | undefined

    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mod: any = await import('@capacitor/push-notifications')
        const PushNotifications = mod.PushNotifications
        if (!PushNotifications || cancelled) return

        // 1. Permission check / request.
        let perm = await PushNotifications.checkPermissions()
        if (perm.receive === 'prompt' || perm.receive === 'prompt-with-rationale') {
          perm = await PushNotifications.requestPermissions()
        }
        if (perm.receive !== 'granted') {
          // eslint-disable-next-line no-console
          console.log('[gf-cap] push: permission not granted', perm.receive)
          return
        }

        // 2. Listen for the registration result BEFORE calling
        //    register() so the event isn't missed if the plugin
        //    fires it synchronously on some platforms.
        const tokenHandle = await PushNotifications.addListener(
          'registration',
          async (token: { value?: string }) => {
            if (cancelled) return
            const fcmToken = token?.value
            if (!fcmToken) return
            try {
              const res = await fetch('/api/push/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  fcmToken,
                  platform: 'android',
                  appVersion: '0.0.5',
                }),
              })
              if (!res.ok) {
                console.error('[gf-cap] push: subscribe failed', res.status)
                return
              }
              registeredFor.current = userId
              // eslint-disable-next-line no-console
              console.log('[gf-cap] push: token registered')
            } catch (err) {
              console.error('[gf-cap] push: subscribe error', err)
            }
          },
        )
        const errorHandle = await PushNotifications.addListener(
          'registrationError',
          (err: { error?: string }) => {
            console.error('[gf-cap] push: registrationError', err?.error)
          },
        )

        // 3. Kick off registration. Triggers the 'registration' event
        //    on success.
        await PushNotifications.register()

        cleanup = () => {
          try { tokenHandle.remove() } catch { /* listener already gone */ }
          try { errorHandle.remove() } catch { /* listener already gone */ }
        }
      } catch (err) {
        console.error('[gf-cap] push: @capacitor/push-notifications import failed', err)
      }
    })()

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [userId])

  return null
}
