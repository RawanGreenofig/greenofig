/**
 * Server-side fan-out to the notifications pipeline. Posts to
 * /api/notifications/send in x-secret mode, which writes the bell row +
 * web-push + FCM. Best-effort: never throws into the caller's happy path,
 * but DOES log failures (the audit flagged silently-swallowed notifies).
 */
export interface NotifyInput {
  userIds: string[]
  title: string
  titleAr?: string
  body: string
  bodyAr?: string
  type?: string
  url?: string
}

export async function notifyUsers(input: NotifyInput): Promise<boolean> {
  const ids = input.userIds.filter(Boolean)
  if (ids.length === 0) return false
  const secret = process.env.OPENCLAW_WEBHOOK_SECRET
  if (!secret) {
    console.warn('[notify] OPENCLAW_WEBHOOK_SECRET unset — skipping', input.type)
    return false
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://greenofig.com'
  try {
    const res = await fetch(`${appUrl}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-secret': secret },
      body: JSON.stringify({ ...input, userIds: ids }),
    })
    if (!res.ok) {
      console.error('[notify] send failed', res.status, input.type)
      return false
    }
    return true
  } catch (e) {
    console.error('[notify] threw', e instanceof Error ? e.message : e, input.type)
    return false
  }
}
