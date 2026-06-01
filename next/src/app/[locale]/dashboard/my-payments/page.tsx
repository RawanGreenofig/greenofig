'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Wallet, Loader2, Check, ExternalLink } from '@/icons'
import { FetchError } from '@/components/dashboard/FetchError'

/**
 * /dashboard/my-payments — a linked walk-in client's clinic payment
 * ledger: what they've paid and what's still due. Due rows link to the
 * existing public pay flow (/clinic-pay/<payment.id>) for Stripe / Zelle.
 */
interface Payment {
  id: string
  amount_cents: number
  currency: string | null
  status: 'due' | 'paid' | string
  due_date: string | null
  paid_at: string | null
  method: string | null
  notes: string | null
  created_at: string
}

function money(cents: number, currency: string | null) {
  const amount = (cents ?? 0) / 100
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: (currency || 'USD').toUpperCase() }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency ?? ''}`.trim()
  }
}

export default function MyPaymentsPage() {
  const t = useTranslations('clinic')
  const locale = useLocale()
  const [items, setItems] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const refresh = useCallback(async () => {
    setError(false)
    try {
      const res = await fetch('/api/my-payments', { cache: 'no-store' })
      if (res.ok) setItems(((await res.json()) as { payments: Payment[] }).payments ?? [])
      else setError(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void refresh()
  }, [refresh])
  // After paying on the standalone pay page (or another tab), reflect the
  // new "paid" status when the user returns instead of showing stale "due".
  useEffect(() => {
    const onFocus = () => void refresh()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refresh])

  const due = items.filter((p) => p.status === 'due')
  const totalDue = due.reduce((s, p) => s + (p.amount_cents ?? 0), 0)
  const dueCurrency = due[0]?.currency ?? 'USD'

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-md mx-auto space-y-5">
      <header>
        <h1 className="font-display font-bold text-fg-1 tracking-tight" style={{ fontSize: 'clamp(24px,4vw,34px)', lineHeight: 1.1 }}>
          {t('paymentsTitle')}
        </h1>
        <p className="mt-2 text-sm text-fg-2">
          {t('paymentsSubtitle')}
          {due.length > 0 && <b className="ms-1" style={{ color: '#e8912a' }}>{t('paymentsDue', { amount: money(totalDue, dueCurrency) })}</b>}
        </p>
      </header>

      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-fg-3" strokeWidth={1.75} />
        </div>
      ) : error ? (
        <FetchError onRetry={() => { setLoading(true); void refresh() }} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="text-sm text-fg-2">{t('paymentsEmpty')}</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((p) => {
            const isPaid = p.status === 'paid'
            return (
              <li key={p.id} className="rounded-xl border border-border bg-surface p-4 flex items-center gap-3">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
                  style={{ background: isPaid ? 'rgba(163,230,53,0.16)' : 'rgba(232,145,42,0.14)', color: isPaid ? '#65a30d' : '#e8912a' }}>
                  {isPaid ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Wallet className="w-4 h-4" strokeWidth={1.75} />}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg-1">{money(p.amount_cents, p.currency)}</p>
                  <p className="mt-0.5 text-[11px] text-fg-3">
                    {isPaid
                      ? `${p.paid_at ? t('paidWithDate', { date: new Date(p.paid_at).toLocaleDateString() }) : t('paid')}${p.method ? ` · ${p.method}` : ''}`
                      : p.due_date ? t('paymentDueDate', { date: p.due_date }) : t('paymentDue')}
                  </p>
                  {p.notes && <p className="mt-1 text-xs text-fg-2">{p.notes}</p>}
                </div>
                {!isPaid && (
                  <a
                    href={`/${locale}/clinic-pay/${p.id}`}
                    className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs border border-lime-600/60 shrink-0"
                  >
                    <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                    {t('payNow')}
                  </a>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
