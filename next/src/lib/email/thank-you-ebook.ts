/**
 * Thank-you + free ebook email triggered when a homepage consultation
 * lead is captured. Sent via Resend if RESEND_API_KEY is configured,
 * otherwise logs the would-be payload so dev/staging keeps working.
 *
 * From: health@greenofig.com (set RESEND_FROM_HEALTH to override).
 * Reply-to: health@greenofig.com so replies route back to the team.
 *
 * Returns true on a successful send, false otherwise. Caller is
 * responsible for marking the lead row's thank_you_sent / ebook_sent
 * flags.
 */

interface SendArgs {
  to: string
  name: string
  ebookUrl: string
}

export async function sendThankYouEbook({
  to,
  name,
  ebookUrl,
}: SendArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY
  const from =
    process.env.RESEND_FROM_HEALTH ?? 'Greenofig <health@greenofig.com>'

  // Prefer absolute URL in the email so download works from any client
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    'https://greenofig.com'
  const fullEbookUrl = ebookUrl.startsWith('http')
    ? ebookUrl
    : `${baseUrl}${ebookUrl}`

  const subject =
    'Your free ebook from Greenofig — and what happens next'
  const firstName = name.split(/\s+/)[0] ?? 'there'

  const html = renderHtml({ firstName, ebookUrl: fullEbookUrl })
  const text = renderText({ firstName, ebookUrl: fullEbookUrl })

  if (!apiKey) {
    // Dev / staging — log the email instead of sending
    console.warn(
      '[email:thank-you] RESEND_API_KEY not set — logging payload only',
      { to, from, subject, ebookUrl: fullEbookUrl },
    )
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
        text,
        reply_to: 'health@greenofig.com',
      }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error('[email:thank-you] Resend rejected:', res.status, body)
      return false
    }
    return true
  } catch (err) {
    console.error('[email:thank-you] fetch threw:', err)
    return false
  }
}

function renderHtml({
  firstName,
  ebookUrl,
}: {
  firstName: string
  ebookUrl: string
}): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f6f9f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1f2937;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:24px;font-weight:700;color:#16a34a;letter-spacing:-0.01em;">Greenofig</span>
      </div>
      <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;">
        <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;color:#0f172a;">
          Hi ${escapeHtml(firstName)} — your free ebook is ready 🌿
        </h1>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
          Thanks for completing the Greenofig health assessment. Your
          answers help us build a plan that actually fits your goals,
          your body, and your real life.
        </p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
          As promised, here&rsquo;s your free copy of <strong>The Greenofig
          Guide to Healthy Habits</strong> — practical, science-backed
          guidance on nutrition, energy, and sustainable habits:
        </p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${ebookUrl}"
             style="display:inline-block;padding:14px 28px;background:#65a30d;color:#ffffff;border-radius:9999px;text-decoration:none;font-weight:600;font-size:15px;">
            Download your ebook
          </a>
        </p>
        <h2 style="margin:32px 0 12px;font-size:17px;color:#0f172a;">
          What happens next
        </h2>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
          <strong>Nutrition Coach Rawan Othman</strong>, our lead clinical nutritionist,
          will personally review your answers and reach out within
          1&ndash;2 business days to schedule your free 20-minute intro
          call. No pressure, no commitment — just a real conversation
          about what would help you most.
        </p>
        <p style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#6b7280;">
          Have an urgent question in the meantime? Reply to this email
          or write to
          <a href="mailto:health@greenofig.com" style="color:#65a30d;">health@greenofig.com</a>.
        </p>
      </div>
      <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#9ca3af;text-align:center;">
        Greenofig &mdash; personalized nutrition coaching, built around you.<br/>
        You&rsquo;re receiving this because you submitted the consultation
        assessment on greenofig.com.
      </p>
    </div>
  </body>
</html>`
}

function renderText({
  firstName,
  ebookUrl,
}: {
  firstName: string
  ebookUrl: string
}): string {
  return `Hi ${firstName} — your free ebook is ready.

Thanks for completing the Greenofig health assessment. Your answers help us build a plan that actually fits your goals.

Download your free copy of "The Greenofig Guide to Healthy Habits":
${ebookUrl}

What happens next
Nutrition Coach Rawan Othman, our lead clinical nutritionist, will personally review your answers and reach out within 1-2 business days to schedule your free 20-minute intro call. No pressure, no commitment.

Questions in the meantime? Reply to this email or write to health@greenofig.com.

—
Greenofig — personalized nutrition coaching, built around you.`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
