'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { resolveFirstName } from '@/lib/displayName'
import {
  ClipboardList,
  CalendarClock,
  Wallet,
  MessageSquare,
  Sparkles,
  Loader2,
  ArrowRight,
} from '@/icons'

/**
 * Home screen for a linked walk-in clinic client. Replaces the online
 * calorie/water tracker (which doesn't apply to them) with their clinic
 * essentials: next appointment, plan progress, amount due, a coach-shared
 * note, and quick actions. One fetch via /api/my-overview.
 */
interface Overview {
  isClinicClient: boolean
  plan?: { done: number; total: number }
  nextAppointment?: { scheduled_at: string; type: string | null } | null
  amountDue?: { cents: number; currency: string }
  coachCard?: { summary: string | null; recommendations: string | null } | null
}

function money(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: (currency || 'USD').toUpperCase() }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

export function ClinicHome() {
  const t = useTranslations('clinic')
  const { user, profile } = useUser()
  const firstName = resolveFirstName(profile, user, 'there')
  const [data, setData] = useState<Overview | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/my-overview', { cache: 'no-store' })
        if (res.ok && !cancelled) setData((await res.json()) as Overview)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const appt = data?.nextAppointment
  const apptLabel = appt
    ? new Date(appt.scheduled_at).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null
  const due = data?.amountDue
  const plan = data?.plan

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-md mx-auto space-y-5">
      <header>
        <h1 className="font-display font-bold text-fg-1 tracking-tight" style={{ fontSize: 'clamp(24px,4vw,34px)', lineHeight: 1.1 }}>
          {t('greeting', { name: firstName })}
        </h1>
        <p className="mt-2 text-sm text-fg-2">{t('tagline')}</p>
      </header>

      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-fg-3" strokeWidth={1.75} />
        </div>
      ) : (
        <>
          {/* Coach card */}
          {data?.coachCard && (
            <div className="rounded-2xl border border-border p-5" style={{ background: 'rgba(74,154,196,0.06)' }}>
              <p className="text-[11px] uppercase tracking-eyebrow font-bold mb-2 inline-flex items-center gap-1.5" style={{ color: '#4a9ac4' }}>
                <Sparkles className="w-3.5 h-3.5" strokeWidth={2} /> {t('fromCoach')}
              </p>
              {data.coachCard.summary && <p className="text-sm text-fg-1 leading-relaxed">{data.coachCard.summary}</p>}
              {data.coachCard.recommendations && (
                <p className="mt-2 text-xs text-fg-2 whitespace-pre-wrap leading-relaxed">{data.coachCard.recommendations}</p>
              )}
            </div>
          )}

          {/* Stat tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatTile
              href="/dashboard/appointments"
              Icon={CalendarClock}
              tint="#4ade80"
              label={t('nextAppointment')}
              value={apptLabel ?? t('noneScheduled')}
            />
            <StatTile
              href="/dashboard/my-plan"
              Icon={ClipboardList}
              tint="#34d399"
              label={t('planProgress')}
              value={plan && plan.total > 0 ? t('planDone', { done: plan.done, total: plan.total }) : t('nothingAssignedShort')}
            />
            <StatTile
              href="/dashboard/my-payments"
              Icon={Wallet}
              tint="#fbbf24"
              label={t('amountDue')}
              value={due && due.cents > 0 ? money(due.cents, due.currency) : t('allSettled')}
              alert={!!due && due.cents > 0}
            />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link href="/dashboard/my-plan" className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between hover:border-primary/40">
              <span className="text-sm font-semibold text-fg-1 inline-flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-lime-400" strokeWidth={1.75} /> {t('logCheckin')}
              </span>
              <ArrowRight className="w-4 h-4 text-fg-3" strokeWidth={1.75} />
            </Link>
            <Link href="/dashboard/messages" className="rounded-xl border border-border bg-surface p-4 flex items-center justify-between hover:border-primary/40">
              <span className="text-sm font-semibold text-fg-1 inline-flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-lime-400" strokeWidth={1.75} /> {t('messageCoach')}
              </span>
              <ArrowRight className="w-4 h-4 text-fg-3" strokeWidth={1.75} />
            </Link>
          </div>
        </>
      )}
    </div>
  )
}

function StatTile({
  href, Icon, tint, label, value, alert,
}: {
  href: string
  Icon: typeof Wallet
  tint: string
  label: string
  value: string
  alert?: boolean
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border bg-surface p-4 block hover:border-primary/40 transition-colors"
      style={{ borderColor: alert ? 'rgba(232,145,42,0.5)' : 'var(--gf-border)' }}
    >
      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2" style={{ background: `${tint}26`, color: tint }}>
        <Icon className="w-4 h-4" strokeWidth={1.75} />
      </span>
      <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-fg-1">{value}</p>
    </Link>
  )
}
