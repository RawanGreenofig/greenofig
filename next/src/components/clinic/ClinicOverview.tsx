'use client'

import { useEffect, useState } from 'react'
import { Link } from '@/i18n/navigation'
import { Wallet, CalendarClock, AlertTriangle, Loader2 } from '@/icons'

/**
 * Coach cockpit shown atop the clinic-clients roster: money owed /
 * collected this month, today's in-clinic visits, and who needs
 * attention (overdue payment, no recent check-in, low adherence).
 * One fetch via /api/nutritionist/clinic-overview.
 */
interface Overview {
  totals: { owedCents: number; collectedThisMonthCents: number; currency: string; dueCount: number; overdueCount: number }
  todayVisits: { id: string; clinic_client_id: string; full_name: string; scheduled_at: string; type: string | null; status: string }[]
  attention: { clinic_client_id: string; full_name: string; flags: string[] }[]
}

const FLAG_LABEL: Record<string, string> = {
  overdue: 'Payment overdue',
  stale: 'No recent check-in',
  low_adherence: 'Low adherence',
}
const FLAG_COLOR: Record<string, string> = {
  overdue: '#e11d48',
  stale: '#e8912a',
  low_adherence: '#4a9ac4',
}

function money(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: (currency || 'USD').toUpperCase() }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

export function ClinicOverview() {
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/nutritionist/clinic-overview', { cache: 'no-store' })
        if (res.ok && !cancelled) setData((await res.json()) as Overview)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6 text-center mb-5">
        <Loader2 className="w-5 h-5 mx-auto animate-spin text-fg-3" strokeWidth={1.75} />
      </div>
    )
  }
  if (!data) return null

  const t = data.totals
  const visits = data.todayVisits
  const attention = data.attention

  return (
    <div className="space-y-3 mb-5">
      {/* Money + today tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border bg-surface p-4" style={{ borderColor: t.owedCents > 0 ? 'rgba(225,29,72,0.4)' : 'var(--gf-border)' }}>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2" style={{ background: 'rgba(225,29,72,0.14)', color: '#e11d48' }}>
            <Wallet className="w-4 h-4" strokeWidth={1.75} />
          </span>
          <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">Owed to you</p>
          <p className="mt-0.5 text-lg font-bold text-fg-1">{money(t.owedCents, t.currency)}</p>
          <p className="text-[11px] text-fg-3">{t.dueCount} open{t.overdueCount > 0 ? ` · ${t.overdueCount} overdue` : ''}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2" style={{ background: 'rgba(163,230,53,0.16)', color: '#65a30d' }}>
            <Wallet className="w-4 h-4" strokeWidth={1.75} />
          </span>
          <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">Collected this month</p>
          <p className="mt-0.5 text-lg font-bold text-fg-1">{money(t.collectedThisMonthCents, t.currency)}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
            <CalendarClock className="w-4 h-4" strokeWidth={1.75} />
          </span>
          <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">Today&rsquo;s visits</p>
          <p className="mt-0.5 text-lg font-bold text-fg-1">{visits.length}</p>
          {visits.length > 0 && (
            <p className="text-[11px] text-fg-3 truncate">
              {visits.slice(0, 2).map((v) => `${new Date(v.scheduled_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} ${v.full_name}`).join(' · ')}
            </p>
          )}
        </div>
      </div>

      {/* Attention list */}
      {attention.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-semibold text-fg-1 inline-flex items-center gap-1.5 mb-2.5">
            <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#e8912a' }} strokeWidth={2} />
            Needs attention ({attention.length})
          </p>
          <ul className="space-y-1.5">
            {attention.map((a) => (
              <li key={a.clinic_client_id}>
                <Link
                  href={`/nutritionist/clinic-clients/${a.clinic_client_id}`}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-raised"
                >
                  <span className="text-sm text-fg-1 truncate">{a.full_name}</span>
                  <span className="flex items-center gap-1.5 shrink-0">
                    {a.flags.map((f) => (
                      <span key={f} className="inline-flex items-center rounded-pill px-2 py-0.5 text-[10px] font-semibold"
                        style={{ background: `${FLAG_COLOR[f]}1f`, color: FLAG_COLOR[f] }}>
                        {FLAG_LABEL[f] ?? f}
                      </span>
                    ))}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
