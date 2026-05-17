'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import { Avatar } from '@/components/Avatar'
import {
  Search,
  Download,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Info,
  Activity,
  type LucideIcon,
} from '@/icons'

type Severity = 'info' | 'warn' | 'danger'
type DateRange = 'all' | 'today' | '7d' | '30d'

type ActionKey =
  | 'user_role_changed'
  | 'user_tier_changed'
  | 'user_suspended'
  | 'user_deleted'
  | 'user_impersonated'
  | 'store_toggled'
  | 'feature_flag_toggled'
  | 'api_key_added'
  | 'api_key_rotated'
  | 'api_key_revoked'
  | 'broadcast_sent'
  | 'post_unpublished'
  | 'post_pinned'
  | 'moderation_resolved'
  | 'site_published'
  | 'data_exported'

interface AuditEvent {
  id: string
  hoursAgo: number
  actor: string
  actorInitials: string
  action: ActionKey
  target: string
  ip: string
  severity: Severity
  payload?: Record<string, string>
}

const SEVERITY_META: Record<Severity, { tint: string; bg: string; Icon: LucideIcon }> = {
  info:   { tint: '#9baf9f', bg: 'rgb(155 175 159 / 0.14)', Icon: Info },
  warn:   { tint: '#e8912a', bg: 'rgb(232 145 42 / 0.14)',  Icon: AlertTriangle },
  danger: { tint: '#f43f5e', bg: 'rgb(244 63 94 / 0.14)',   Icon: AlertOctagon },
}


const RANGE_HOURS: Record<DateRange, number | null> = {
  all:    null,
  today:  24,
  '7d':   168,
  '30d':  720,
}

export default function AdminAuditLogPage() {
  const t = useTranslations('admin')
  const tA = useTranslations('admin.auditPage')

  const [range, setRange] = useState<DateRange>('7d')
  const [severity, setSeverity] = useState<'all' | Severity>('all')
  const [query, setQuery] = useState('')

  const live = useSupabaseQuery<AuditEvent[]>(async (supabase) => {
    const since = new Date()
    since.setHours(since.getHours() - 24 * 30) // pull last 30 days
    type Row = {
      id: string
      actor_id: string | null
      action: string
      resource_type: string | null
      resource_id: string | null
      new_value: { requestedBy?: string; tier?: string; role?: string; flag?: string; state?: string; provider?: string; audience?: string; format?: string; action?: string; kind?: string } | null
      ip_address: string | null
      created_at: string
    }
    const { data: rows } = await supabase
      .from('audit_log')
      .select('id, actor_id, action, resource_type, resource_id, new_value, ip_address, created_at')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(100)

    const list = (rows as Row[] | null) ?? []
    if (list.length === 0) return []

    const actorIds = Array.from(
      new Set(list.map((r) => r.actor_id).filter((x): x is string => !!x)),
    )
    const { data: actors } = actorIds.length
      ? await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', actorIds)
      : { data: [] }
    type ActorRow = { id: string; full_name: string | null }
    const nameOf = new Map(
      ((actors as ActorRow[] | null) ?? []).map((a) => [a.id, a.full_name ?? 'Admin']),
    )

    const now = Date.now()
    return list.map((r) => {
      const action = (r.action.split('.')[0] ?? r.action) as ActionKey
      const actorName = r.actor_id
        ? nameOf.get(r.actor_id) ?? 'Admin'
        : 'OpenClaw'
      const sev: Severity =
        r.action.includes('delete') || r.action.includes('revoke') ? 'danger' :
        r.action.includes('toggle') || r.action.includes('rotate') || r.action.includes('suspend') ? 'warn' :
        'info'
      return {
        id: r.id,
        hoursAgo: Math.max(0, (now - new Date(r.created_at).getTime()) / 3_600_000),
        actor: actorName,
        actorInitials: actorName.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase(),
        action,
        target: r.resource_id ?? r.resource_type ?? '',
        ip: r.ip_address ?? '—',
        severity: sev,
        payload: (r.new_value as Record<string, string> | null) ?? undefined,
      }
    })
  }, [])

  const sourceList = useMemo(() => live.data ?? [], [live.data])

  const visible = useMemo(() => {
    const max = RANGE_HOURS[range]
    const q = query.trim().toLowerCase()
    return sourceList.filter((e) => {
      if (max != null && e.hoursAgo > max) return false
      if (severity !== 'all' && e.severity !== severity) return false
      if (
        q &&
        !e.actor.toLowerCase().includes(q) &&
        !e.target.toLowerCase().includes(q) &&
        !e.action.toLowerCase().includes(q)
      ) {
        return false
      }
      return true
    })
  }, [sourceList, range, severity, query])

  const totalEvents = sourceList.length
  const todayCount = sourceList.filter((e) => e.hoursAgo < 24).length
  const dangerCount = sourceList.filter((e) => e.severity === 'danger').length

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {t('auditLog')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{tA('subtitle')}</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-fg-1 transition-colors"
          style={{
            background: 'var(--gf-input-bg)',
            border: '1px solid var(--gf-border)',
            borderRadius: 8,
          }}
        >
          <Download
            className="w-3.5 h-3.5"
            strokeWidth={1.75}
            color="var(--gf-fg-3)"
          />
          {tA('exportCsv')}
        </button>
      </header>

      {/* Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat Icon={Activity}      tint="#a3e635" label={tA('stats.totalEvents', { count: totalEvents })} value={totalEvents} />
        <Stat Icon={Info}          tint="#06b6d4" label={tA('stats.today')}                                value={todayCount} />
        <Stat Icon={AlertOctagon}  tint="#f43f5e" label={tA('stats.highSev')}                              value={dangerCount} />
      </section>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-[280px]">
          <Search
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ insetInlineStart: '12px' }}
            strokeWidth={1.75}
            color="var(--gf-fg-3)"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tA('search')}
            className="w-full h-10 rounded-lg text-sm text-fg-1 placeholder-fg-3 focus:outline-none"
            style={{
              background: 'var(--gf-input-bg)',
              border: '1px solid var(--gf-border)',
              paddingInlineStart: '36px',
              paddingInlineEnd: '12px',
            }}
          />
        </div>
        <FilterGroup
          options={[
            ['all',   tA('filterAll')],
            ['today', tA('filterToday')],
            ['7d',    tA('filter7d')],
            ['30d',   tA('filter30d')],
          ]}
          value={range}
          onChange={(v) => setRange(v as DateRange)}
        />
        <FilterGroup
          options={[
            ['all',    tA('filterAll')],
            ['info',   tA('severity.info')],
            ['warn',   tA('severity.warn')],
            ['danger', tA('severity.danger')],
          ]}
          value={severity}
          onChange={(v) => setSeverity(v as 'all' | Severity)}
        />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <ShieldCheck className="w-9 h-9 mx-auto mb-3 text-fg-3" strokeWidth={1.5} />
          <p className="text-base font-semibold text-fg-1">{tA('noResults')}</p>
          <p className="mt-1 text-sm text-fg-2">{tA('noResultsBody')}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface overflow-hidden">
          <div className="hidden md:grid grid-cols-[120px_1.5fr_2fr_1.5fr_120px_90px] gap-3 px-5 py-3 bg-bg-deeper/40 border-b border-border text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
            <div>{tA('col.when')}</div>
            <div>{tA('col.actor')}</div>
            <div>{tA('col.action')}</div>
            <div>{tA('col.target')}</div>
            <div>{tA('col.ip')}</div>
            <div>{tA('col.severity')}</div>
          </div>
          <ul className="divide-y divide-border">
            {visible.map((e) => (
              <Row key={e.id} tA={tA} event={e} />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

function Row({ tA, event }: { tA: ReturnType<typeof useTranslations>; event: AuditEvent }) {
  const sev = SEVERITY_META[event.severity]
  return (
    <li
      className="md:grid md:grid-cols-[120px_1.5fr_2fr_1.5fr_120px_90px] gap-3 items-center px-5 py-3 transition-colors"
      style={{ background: 'transparent' }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'var(--gf-card-hover)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = 'transparent')
      }
    >
      <div className="flex md:block items-center justify-between gap-2 mb-1.5 md:mb-0 text-xs text-fg-2 font-mono" dir="ltr">
        <span className="md:hidden text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
          {tA('col.when')}
        </span>
        {formatHours(event.hoursAgo)}
      </div>

      <div className="flex md:block items-center justify-between gap-2 mb-1.5 md:mb-0">
        <span className="md:hidden text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
          {tA('col.actor')}
        </span>
        <div className="flex items-center gap-2 min-w-0">
          <Avatar text={event.actorInitials} size={28} />
          <p className="text-sm text-fg-1 truncate">{event.actor}</p>
        </div>
      </div>

      <div className="flex md:block items-center justify-between gap-2 mb-1.5 md:mb-0">
        <span className="md:hidden text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
          {tA('col.action')}
        </span>
        <p className="text-sm text-fg-1">
          {tA(`actions.${event.action}` as 'actions.user_role_changed', event.payload ?? {})}
        </p>
      </div>

      <div className="flex md:block items-center justify-between gap-2 mb-1.5 md:mb-0">
        <span className="md:hidden text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
          {tA('col.target')}
        </span>
        <p className="text-xs text-fg-2 font-mono truncate" dir="ltr">
          {event.target}
        </p>
      </div>

      <div className="flex md:block items-center justify-between gap-2 mb-1.5 md:mb-0">
        <span className="md:hidden text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
          {tA('col.ip')}
        </span>
        <p className="text-[11px] text-fg-3 font-mono" dir="ltr">
          {event.ip}
        </p>
      </div>

      <div className="flex md:block items-center justify-between gap-2">
        <span className="md:hidden text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
          {tA('col.severity')}
        </span>
        <span
          className="inline-flex items-center"
          style={{
            height: 18,
            padding: '0 8px',
            borderRadius: 999,
            fontSize: 9.5,
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            lineHeight: 1,
            background: sev.bg,
            color: sev.tint,
          }}
        >
          {tA(`severity.${event.severity}` as 'severity.info')}
        </span>
      </div>
    </li>
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
  value: number
}) {
  return (
    <article
      className="rounded-xl border border-border bg-surface p-4"
      style={{ boxShadow: `inset 4px 0 0 ${tint}` }}
    >
      <div className="flex items-center gap-2">
        <Icon
          className="w-4 h-4 flex-shrink-0"
          strokeWidth={1.75}
          color={tint}
        />
        <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
          {label}
        </p>
      </div>
      <p
        className="mt-2 font-display text-2xl font-bold"
        style={{ color: tint }}
        dir="ltr"
      >
        {value}
      </p>
    </article>
  )
}

function FilterGroup({
  options,
  value,
  onChange,
}: {
  options: [string, string][]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div
      className="inline-flex items-center"
      style={{
        background: 'var(--gf-input-bg)',
        border: '1px solid var(--gf-border)',
        borderRadius: 8,
        padding: 2,
        gap: 2,
      }}
    >
      {options.map(([v, lbl]) => {
        const active = value === v
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className="inline-flex items-center justify-center h-8 px-3 text-xs font-semibold transition-colors whitespace-nowrap"
            style={{
              borderRadius: 6,
              background: active ? 'rgba(132,217,61,0.12)' : 'transparent',
              color: active ? '#a3e635' : 'var(--gf-fg-2)',
            }}
          >
            {lbl}
          </button>
        )
      })}
    </div>
  )
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m ago`
  if (h < 24) return `${Math.round(h)}h ago`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d ago`
  return `${Math.round(d / 7)}w ago`
}
