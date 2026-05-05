'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  AlertOctagon,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Ban,
  ExternalLink,
  Flag,
  type LucideIcon,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

type Reason = 'spam' | 'harassment' | 'misinformation' | 'inappropriate' | 'off_topic' | 'other'
type Severity = 'low' | 'medium' | 'high'
type Resolution = 'pending' | 'kept' | 'removed'

interface FlaggedItem {
  id: string
  body: string
  authorName: string
  authorInitials: string
  reason: Reason
  severity: Severity
  reportCount: number
  flaggedHoursAgo: number
  resolution: Resolution
  resolvedBy?: string
  resolvedHoursAgo?: number
}

const REASON_TINT: Record<Reason, string> = {
  spam:           '#9baf9f',
  harassment:     '#f43f5e',
  misinformation: '#a855f7',
  inappropriate:  '#e8912a',
  off_topic:      '#06b6d4',
  other:          '#5c7262',
}

const SEVERITY_META: Record<Severity, { tint: string; bg: string; Icon: LucideIcon }> = {
  low:    { tint: '#9baf9f', bg: 'rgb(155 175 159 / 0.14)', Icon: Flag },
  medium: { tint: '#e8912a', bg: 'rgb(232 145 42 / 0.14)',  Icon: AlertTriangle },
  high:   { tint: '#f43f5e', bg: 'rgb(244 63 94 / 0.14)',   Icon: AlertOctagon },
}

const SEED: FlaggedItem[] = [
  {
    id: 'f1',
    body: "Buy these supplements now to lose 10kg in a week — DM me!",
    authorName: 'Tareq M.',
    authorInitials: 'TM',
    reason: 'spam',
    severity: 'medium',
    reportCount: 4,
    flaggedHoursAgo: 2,
    resolution: 'pending',
  },
  {
    id: 'f2',
    body: 'Anyone who eats carbs after 6pm is a fool. End of story.',
    authorName: 'Faisal D.',
    authorInitials: 'FD',
    reason: 'misinformation',
    severity: 'high',
    reportCount: 7,
    flaggedHoursAgo: 5,
    resolution: 'pending',
  },
  {
    id: 'f3',
    body: '@Layla your before pic looked rough — glad you fixed yourself.',
    authorName: 'Anonymous',
    authorInitials: 'A',
    reason: 'harassment',
    severity: 'high',
    reportCount: 2,
    flaggedHoursAgo: 9,
    resolution: 'pending',
  },
  {
    id: 'f4',
    body: 'Has anyone tried this app for budget tracking? https://example.com',
    authorName: 'Saif H.',
    authorInitials: 'SH',
    reason: 'off_topic',
    severity: 'low',
    reportCount: 1,
    flaggedHoursAgo: 14,
    resolution: 'pending',
  },
  {
    id: 'f5',
    body: 'Detox teas are a scam, just drink water with lemon.',
    authorName: 'Nour B.',
    authorInitials: 'NB',
    reason: 'misinformation',
    severity: 'low',
    reportCount: 3,
    flaggedHoursAgo: 36,
    resolution: 'kept',
    resolvedBy: 'Admin',
    resolvedHoursAgo: 30,
  },
  {
    id: 'f6',
    body: '[Removed for community guideline violation]',
    authorName: 'Anonymous',
    authorInitials: 'A',
    reason: 'inappropriate',
    severity: 'high',
    reportCount: 9,
    flaggedHoursAgo: 72,
    resolution: 'removed',
    resolvedBy: 'Dr. Rawan',
    resolvedHoursAgo: 70,
  },
]

const ALLOWED_REASONS: Reason[] = ['spam', 'harassment', 'misinformation', 'inappropriate', 'off_topic', 'other']

export default function AdminModerationPage() {
  const t = useTranslations('admin')
  const tM = useTranslations('admin.moderationPage')

  const [filter, setFilter] = useState<'pending' | 'resolved' | 'all'>('pending')
  const [items, setItems] = useState<FlaggedItem[]>(SEED)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      type FlagRow = {
        id: string
        reporter_id: string | null
        target_table: string
        target_id: string
        reason: string
        severity: Severity
        resolution: Resolution
        resolver_id: string | null
        resolved_at: string | null
        created_at: string
      }
      const { data: rows } = await supabase
        .from('moderation_flags')
        .select(
          'id, reporter_id, target_table, target_id, reason, severity, resolution, resolver_id, resolved_at, created_at',
        )
        .order('created_at', { ascending: false })
        .limit(80)
      const list = (rows as FlagRow[] | null) ?? []
      if (cancelled || list.length === 0) return

      const ids = Array.from(
        new Set(
          list
            .flatMap((r) => [r.reporter_id, r.resolver_id])
            .filter((v): v is string => !!v),
        ),
      )
      let nameOf = new Map<string, string>()
      if (ids.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ids)
        type ProfileRow = { id: string; full_name: string | null }
        nameOf = new Map(
          ((profiles as ProfileRow[] | null) ?? []).map((p) => [p.id, p.full_name ?? 'User']),
        )
      }

      const initials = (name: string) =>
        name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '·'

      const now = Date.now()
      const hoursSince = (iso: string | null) =>
        iso ? Math.max(0, (now - new Date(iso).getTime()) / 3_600_000) : 0

      const mapped: FlaggedItem[] = list.map((r) => {
        const reporter = r.reporter_id ? nameOf.get(r.reporter_id) ?? 'User' : 'Anonymous'
        const reasonKey = (ALLOWED_REASONS as string[]).includes(r.reason)
          ? (r.reason as Reason)
          : 'other'
        return {
          id: r.id,
          body: `Flagged ${r.target_table}: ${r.target_id}`,
          authorName: reporter,
          authorInitials: initials(reporter),
          reason: reasonKey,
          severity: r.severity,
          reportCount: 1,
          flaggedHoursAgo: hoursSince(r.created_at),
          resolution: r.resolution,
          resolvedBy: r.resolver_id ? nameOf.get(r.resolver_id) : undefined,
          resolvedHoursAgo: r.resolved_at ? hoursSince(r.resolved_at) : undefined,
        }
      })
      if (!cancelled) setItems(mapped)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const visible = useMemo(() => {
    return items
      .filter((i) => {
        if (filter === 'pending') return i.resolution === 'pending'
        if (filter === 'resolved') return i.resolution !== 'pending'
        return true
      })
      .sort((a, b) => a.flaggedHoursAgo - b.flaggedHoursAgo)
  }, [filter, items])

  const open = items.filter((i) => i.resolution === 'pending').length
  const resolvedToday = items.filter(
    (i) => i.resolution !== 'pending' && (i.resolvedHoursAgo ?? 0) < 24,
  ).length
  const avgResolution = '4.2h'

  const resolve = (id: string, action: 'kept' | 'removed') => {
    setItems((curr) =>
      curr.map((it) =>
        it.id === id
          ? {
              ...it,
              resolution: action,
              resolvedBy: 'You',
              resolvedHoursAgo: 0,
            }
          : it,
      ),
    )
    const supabase = getBrowserSupabase()
    if (supabase && /^[0-9a-f-]{32,}$/i.test(id)) {
      void supabase
        .from('moderation_flags')
        .update({ resolution: action, resolved_at: new Date().toISOString() } as never)
        .eq('id', id)
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          {t('moderation')}
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">{tM('subtitle')}</p>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-3 gap-4">
        <Stat Icon={AlertOctagon} tint="#f43f5e" label={tM('stats.open')}            value={open} />
        <Stat Icon={CheckCircle2} tint="#a3e635" label={tM('stats.resolvedToday')}   value={resolvedToday} />
        <Stat Icon={Clock}        tint="#06b6d4" label={tM('stats.avgResolutionH')}  value={avgResolution} />
      </section>

      {/* Filter */}
      <div className="inline-flex items-center gap-0.5 rounded-pill bg-bg-deeper border border-border p-0.5">
        {(['pending', 'resolved', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 h-8 rounded-pill text-[11px] font-semibold transition-colors ${
              filter === f
                ? 'bg-primary/20 text-lime-400'
                : 'text-fg-3 hover:text-fg-1'
            }`}
          >
            {f === 'pending'
              ? tM('filterPending')
              : f === 'resolved'
                ? tM('filterResolved')
                : tM('filterAll')}
          </button>
        ))}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <ShieldCheck className="w-9 h-9 mx-auto mb-3 text-lime-400" strokeWidth={1.5} />
          <p className="text-base font-semibold text-fg-1">{tM('noFlags')}</p>
          <p className="mt-1 text-sm text-fg-2">{tM('noFlagsBody')}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {visible.map((it) => (
            <FlagCard
              key={it.id}
              tM={tM}
              item={it}
              onResolve={(a) => resolve(it.id, a)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function FlagCard({
  tM,
  item,
  onResolve,
}: {
  tM: ReturnType<typeof useTranslations>
  item: FlaggedItem
  onResolve: (a: 'kept' | 'removed') => void
}) {
  const sev = SEVERITY_META[item.severity]
  const reasonTint = REASON_TINT[item.reason]
  const isPending = item.resolution === 'pending'

  return (
    <article
      className={`rounded-xl border bg-surface p-5 ${
        isPending ? 'border-border' : 'border-border opacity-70'
      }`}
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="rounded-pill h-6 px-2.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-eyebrow font-bold"
            style={{ background: sev.bg, color: sev.tint }}
          >
            <sev.Icon className="w-3 h-3" strokeWidth={2} />
            {tM(`severity.${item.severity}` as 'severity.low')}
          </span>
          <span
            className="rounded-pill h-6 px-2.5 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
            style={{
              background: `${reasonTint}1a`,
              color: reasonTint,
            }}
          >
            {tM(`reasons.${item.reason}` as 'reasons.spam')}
          </span>
          <span className="text-[11px] text-fg-3 font-mono" dir="ltr">
            {tM('reportedBy', { count: item.reportCount })} ·{' '}
            {formatHours(item.flaggedHoursAgo)}
          </span>
        </div>
        {!isPending && (
          <span
            className="rounded-pill h-6 px-2.5 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
            style={
              item.resolution === 'kept'
                ? { background: 'rgb(155 175 159 / 0.14)', color: '#9baf9f' }
                : { background: 'rgb(244 63 94 / 0.14)', color: '#f43f5e' }
            }
          >
            {item.resolution === 'kept'
              ? tM('actionApproved')
              : tM('actionRemoved')}
          </span>
        )}
      </header>

      <div className="mt-4 rounded-lg bg-bg-deeper/40 border border-border p-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center font-display text-[10px] font-bold"
            style={{
              background: 'linear-gradient(135deg,#5c7262,#2c3e35)',
              color: '#f0ede6',
            }}
          >
            {item.authorInitials}
          </span>
          <p className="text-xs text-fg-2">{item.authorName}</p>
        </div>
        <p className="text-sm text-fg-1 leading-relaxed">{item.body}</p>
      </div>

      <footer className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-xs text-fg-3 hover:text-fg-1"
        >
          <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
          {tM('openContext')}
        </button>
        {isPending ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onResolve('kept')}
              className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
            >
              <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              {tM('approve')}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-pill bg-amber-500/15 h-9 px-4 text-xs font-semibold hover:bg-amber-500/25"
              style={{ color: '#e8912a' }}
            >
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.75} />
              {tM('warnUser')}
            </button>
            <button
              type="button"
              onClick={() => onResolve('removed')}
              className="inline-flex items-center gap-1.5 rounded-pill bg-rose-500/15 text-rose-400 h-9 px-4 text-xs font-semibold hover:bg-rose-500/25"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              {tM('remove')}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-pill bg-rose-500/20 text-rose-400 h-9 px-4 text-xs font-semibold hover:bg-rose-500/30"
            >
              <Ban className="w-3.5 h-3.5" strokeWidth={1.75} />
              {tM('banUser')}
            </button>
          </div>
        ) : (
          <p className="text-xs text-fg-3 font-mono" dir="ltr">
            {tM('resolved')} {tM('resolvedBy', { name: item.resolvedBy ?? '—' })} ·{' '}
            {tM('resolvedAgo', { value: formatHours(item.resolvedHoursAgo ?? 0) })}
          </p>
        )}
      </footer>
    </article>
  )
}

function Stat({
  Icon,
  tint,
  label,
  value,
}: {
  Icon: LucideIcon
  tint: string
  label: string
  value: string | number
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-8 h-8 rounded-md flex items-center justify-center"
          style={{ background: `${tint}1a`, color: tint }}
        >
          <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
        </span>
        <span className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-medium">
          {label}
        </span>
      </div>
      <p className="font-mono text-xl font-bold text-fg-1" dir="ltr">
        {value}
      </p>
    </article>
  )
}

function formatHours(h: number): string {
  if (h < 1) return 'now'
  if (h < 24) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
}
