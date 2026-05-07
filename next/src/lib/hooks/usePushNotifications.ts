'use client'

import { useCallback, useEffect, useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/client'

type Permission = 'default' | 'granted' | 'denied' | 'unsupported'

interface UsePushNotifications {
  /**
   * 'default'    — never asked
   * 'granted'    — user accepted, push subscription on file
   * 'denied'     — user blocked permission, can re-enable in browser settings
   * 'unsupported' — running on a device that doesn't support web push
   */
  permission: Permission
  loading: boolean
  /** Register the service worker, request permission, save the
   *  subscription to push_subscriptions. No-op if already granted. */
  enableNotifications: () => Promise<void>
}

/**
 * usePushNotifications — opt-in flow for the bell.
 *
 * Reads `window.Notification.permission` synchronously on mount so the
 * Settings + dashboard banner can render the right state without
 * waiting for any async checks. Calling `enableNotifications()` walks
 * through registration → permission → subscribe → upsert in one shot;
 * any failure leaves `permission` accurate so the UI reflects reality.
 */
export function usePushNotifications(
  userId: string | null,
): UsePushNotifications {
  const [permission, setPermission] = useState<Permission>('default')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setPermission('unsupported')
      return
    }
    setPermission(window.Notification.permission as Permission)
  }, [])

  const enableNotifications = useCallback(async () => {
    if (!userId || loading) return
    if (typeof window === 'undefined') return
    if (
      !('Notification' in window) ||
      !('serviceWorker' in navigator) ||
      !('PushManager' in window)
    ) {
      setPermission('unsupported')
      return
    }

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!publicKey) {
      console.error('[push] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set')
      return
    }

    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      const perm = await window.Notification.requestPermission()
      setPermission(perm as Permission)
      if (perm !== 'granted') return

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        // The PushManager type signature wants ArrayBufferView<ArrayBuffer>
        // but the practical input is a Uint8Array — cast to satisfy
        // both browser runtimes and TypeScript's stricter DOM types.
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      })
      const subJson = sub.toJSON() as {
        endpoint?: string
        keys?: { p256dh?: string; auth?: string }
      }
      if (!subJson.endpoint || !subJson.keys?.p256dh || !subJson.keys?.auth) {
        console.error('[push] subscription missing fields', subJson)
        return
      }

      const supabase = getBrowserSupabase()
      if (!supabase) return
      // The push_subscriptions table is added by migration 006 — until
      // the generated supabase/types include it, the upsert payload is
      // typed as `never`. Cast through to satisfy the compiler; the
      // shape matches the migration columns 1:1.
      await supabase
        .from('push_subscriptions')
        .upsert(
          {
            user_id: userId,
            endpoint: subJson.endpoint,
            p256dh: subJson.keys.p256dh,
            auth: subJson.keys.auth,
            user_agent:
              typeof navigator !== 'undefined' ? navigator.userAgent : null,
            updated_at: new Date().toISOString(),
          } as never,
          { onConflict: 'endpoint' },
        )
    } catch (e) {
      console.error('[push] enable failed:', e)
    } finally {
      setLoading(false)
    }
  }, [userId, loading])

  return { permission, loading, enableNotifications }
}

/** VAPID public key is base64url; PushManager.subscribe expects a
 *  Uint8Array, so this re-pads + base64-decodes the string. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const bytes = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i)
  return bytes
}
