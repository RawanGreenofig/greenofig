'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Check, Loader2, CreditCard } from '@/icons'

/**
 * Public payment page behind the coach's pay link (/clinic-pay/<paymentId>).
 * Shows the amount and lets the client pay by card (Stripe) or see the
 * coach's Zelle handle. Stripe success is reconciled by the webhook.
 */
interface Summary {
  amount_cents: number
  currency: string
  status: 'due' | 'paid'
  zelle_handle: string | null
  card_available: boolean
}

export default function ClinicPayPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const locale = useLocale()
  const search = useSearchParams()
  const justPaid = search.get('paid') === '1'

  const [sum, setSum] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/clinic-pay/${id}`, { cache: 'no-store' })
        if (res.ok) setSum((await res.json()) as Summary)
        else setErr('This payment link is not valid.')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const payByCard = async () => {
    if (busy) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/clinic-pay/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      })
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
      if (res.ok && data.url) {
        window.location.href = data.url
      } else {
        setErr(data.error ?? `Could not start payment (${res.status}).`)
        setBusy(false)
      }
    } catch {
      setErr('Network error — please try again.')
      setBusy(false)
    }
  }

  const amount = sum ? `${(sum.amount_cents / 100).toFixed(2)} ${sum.currency}` : ''
  const settled = sum?.status === 'paid' || justPaid

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--gf-bg-deeper)' }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center">
        <h1 className="font-display font-bold text-fg-1" style={{ fontSize: 'clamp(22px,5vw,30px)', lineHeight: 1.1 }}>
          Payment
        </h1>

        {loading ? (
          <div className="mt-6 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-fg-3" strokeWidth={1.75} />
          </div>
        ) : !sum ? (
          <p className="mt-6 text-sm" style={{ color: '#fca5a5' }}>{err ?? 'Not found.'}</p>
        ) : settled ? (
          <div className="mt-6 space-y-3">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-lime-400/15">
              <Check className="w-6 h-6 text-lime-400" strokeWidth={2.25} />
            </span>
            <p className="text-sm text-fg-2">
              {justPaid ? 'Payment received — thank you!' : 'This payment is already settled.'}
            </p>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">Amount due</p>
              <p className="text-3xl font-bold text-fg-1 mt-1 font-mono" dir="ltr">{amount}</p>
            </div>

            {sum.card_available && (
              <button
                type="button"
                onClick={() => void payByCard()}
                disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 text-sm shadow-lime-glow border border-lime-600/60 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.25} /> : <CreditCard className="w-4 h-4" strokeWidth={2} />}
                {busy ? 'Redirecting…' : 'Pay with card'}
              </button>
            )}

            {sum.zelle_handle && (
              <div className="rounded-xl border border-border bg-bg-deeper/50 p-4 text-start">
                <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1">Or pay by Zelle</p>
                <p className="text-sm text-fg-1">
                  Send <b dir="ltr">{amount}</b> to:
                </p>
                <p className="mt-1 text-base font-mono text-lime-600 break-all" dir="ltr">{sum.zelle_handle}</p>
                <p className="mt-2 text-xs text-fg-3">After sending, let your coach know so she can mark it received.</p>
              </div>
            )}

            {err && <p className="text-xs" style={{ color: '#fca5a5' }}>{err}</p>}
          </div>
        )}
      </div>
    </main>
  )
}
