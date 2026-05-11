import 'server-only'
import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app'
import { getMessaging, type Messaging } from 'firebase-admin/messaging'

/**
 * Firebase Admin wrapper for sending FCM pushes to the Android app.
 *
 * Reads credentials from a single env var:
 *   FCM_SERVICE_ACCOUNT_JSON — full service-account JSON, stringified
 *
 * Same paste-it-into-Vercel pattern used for GA. When the env var
 * isn't set the lib reports unconfigured and the dispatcher in
 * /api/notifications/send becomes a no-op for FCM — the existing
 * web-push pipeline is unaffected.
 */

let cachedApp: App | null = null
let cachedConfigured: boolean | null = null

function parseCreds(raw: string): ServiceAccount {
  // Same dual-path parser as the GA lib: raw JSON → re-escaped → base64.
  try {
    return JSON.parse(raw) as ServiceAccount
  } catch {
    /* try next */
  }
  try {
    return JSON.parse(raw.replace(/\n/g, '\\n').replace(/\r/g, '')) as ServiceAccount
  } catch {
    /* try next */
  }
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8')
    return JSON.parse(decoded) as ServiceAccount
  } catch {
    /* fall through */
  }
  throw new Error('FCM_SERVICE_ACCOUNT_JSON is not valid JSON (raw, escaped, or base64).')
}

function getApp(): App | null {
  if (cachedConfigured !== null) return cachedApp
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) {
    cachedConfigured = false
    return null
  }
  try {
    const creds = parseCreds(raw)
    // Repair the private_key if its newlines came through as literal
    // backslash-n pairs (a common Vercel paste artifact).
    type WithKey = ServiceAccount & { private_key?: string }
    const c = creds as WithKey
    if (typeof c.private_key === 'string' && !c.private_key.includes('\n') && c.private_key.includes('\\n')) {
      c.private_key = c.private_key.replace(/\\n/g, '\n')
    }
    const existing = getApps().find((a) => a.name === 'greenofig-fcm')
    cachedApp =
      existing ??
      initializeApp({ credential: cert(c) }, 'greenofig-fcm')
    cachedConfigured = true
    return cachedApp
  } catch (err) {
    console.error('[fcm] init failed:', err)
    cachedConfigured = false
    cachedApp = null
    return null
  }
}

export function isFcmConfigured(): boolean {
  getApp()
  return cachedConfigured === true
}

export function getMessagingClient(): Messaging | null {
  const app = getApp()
  return app ? getMessaging(app) : null
}

export interface FcmPayload {
  title: string
  body: string
  url?: string
  data?: Record<string, string>
}

export interface FcmDispatchResult {
  sent: number
  failed: number
  /** Tokens the FCM service told us are invalid — caller should
   *  delete these from fcm_tokens so we stop trying. */
  expiredTokens: string[]
}

/**
 * Send the same payload to a batch of FCM tokens. Splits into
 * 500-token chunks (the FCM batch limit), surfaces per-token
 * failures, and identifies expired tokens via the standard FCM
 * error codes so the caller can delete them.
 */
export async function sendFcmToTokens(
  tokens: string[],
  payload: FcmPayload,
): Promise<FcmDispatchResult> {
  if (tokens.length === 0) {
    return { sent: 0, failed: 0, expiredTokens: [] }
  }
  const messaging = getMessagingClient()
  if (!messaging) {
    return { sent: 0, failed: 0, expiredTokens: [] }
  }

  let sent = 0
  let failed = 0
  const expiredTokens: string[] = []

  for (let i = 0; i < tokens.length; i += 500) {
    const slice = tokens.slice(i, i + 500)
    try {
      const result = await messaging.sendEachForMulticast({
        tokens: slice,
        notification: {
          title: payload.title,
          body: payload.body,
        },
        data: {
          ...(payload.data ?? {}),
          ...(payload.url ? { url: payload.url } : {}),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'greenofig-default',
            color: '#a3e635',
          },
        },
      })
      result.responses.forEach((r, idx) => {
        if (r.success) {
          sent++
        } else {
          failed++
          const code = r.error?.code
          if (
            code === 'messaging/registration-token-not-registered' ||
            code === 'messaging/invalid-registration-token' ||
            code === 'messaging/invalid-argument'
          ) {
            expiredTokens.push(slice[idx])
          }
          console.error('[fcm] send failed:', code, r.error?.message)
        }
      })
    } catch (err) {
      failed += slice.length
      console.error('[fcm] batch failed:', err)
    }
  }

  return { sent, failed, expiredTokens }
}
