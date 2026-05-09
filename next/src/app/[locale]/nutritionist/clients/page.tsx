'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import { Avatar } from '@/components/Avatar'
import {
  Search,
  Filter,
  ArrowDownUp,
  ArrowRight,
  UserPlus,
  Download,
  TrendingDown,
  TrendingUp,
  Minus,
  Users,
  CheckCircle2,
  AlertTriangle,
  Moon,
  X,
  type LucideIcon,
} from '@/icons'
import { Link } from '@/i18n/navigation'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import type { Tier } from '@/lib/constants'

type Status = 'onTrack' | 'atRisk' | 'inactive'
type SortKey = 'lastActivity' | 'name' | 'weightDelta' | 'joinDate'

interface Client {
  id: string
  name: string
  initials: string
  email: string
  tier: Tier
  status: Status
  /** Hours since last food log */
  lastLogHours: number
  /** kg delta since they joined; negative = lost */
  weightDelta: number
  hasPlan: boolean
  joinedDaysAgo: number
}

const STATUS_META: Record<Status, { tint: string; bg: string }> = {
  onTrack:  { tint: '#a3e635', bg: 'rgb(163 230 53 / 0.14)' },
  atRisk:   { tint: '#e8912a', bg: 'rgb(232 145 42 / 0.14)' },
  inactive: { tint: '#9baf9f', bg: 'rgb(155 175 159 / 0.14)' },
}

const TIER_TINT: Record<Tier, string> = {
  free:    '#9baf9f',
  basic:   '#06b6d4',
  premium: '#a3e635',
  vip:     '#a855f7',
}

const SEED: Client[] = [
  { id: 'c1',  name: 'Layla Hijazi',     initials: 'LH', email: 'layla@example.com',  tier: 'vip',     status: 'onTrack',  lastLogHours: 3,    weightDelta: -3.0, hasPlan: true,  joinedDaysAgo: 62 },
  { id: 'c2',  name: 'Maya Khalil',      initials: 'MK', email: 'maya@example.com',   tier: 'premium', status: 'onTrack',  lastLogHours: 5,    weightDelta: -5.4, hasPlan: true,  joinedDaysAgo: 110 },
  { id: 'c3',  name: 'Yousef Abu Shaer', initials: 'YA', email: 'yousef@example.com', tier: 'basic',   status: 'onTrack',  lastLogHours: 12,   weightDelta: -1.8, hasPlan: false, joinedDaysAgo: 28 },
  { id: 'c4',  name: 'Omar Saadeh',      initials: 'OS', email: 'omar@example.com',   tier: 'premium', status: 'atRisk',   lastLogHours: 96,   weightDelta: -0.2, hasPlan: true,  joinedDaysAgo: 41 },
  { id: 'c5',  name: 'Hala Mansour',     initials: 'HM', email: 'hala@example.com',   tier: 'basic',   status: 'atRisk',   lastLogHours: 36,   weightDelta:  0.4, hasPlan: false, joinedDaysAgo: 18 },
  { id: 'c6',  name: 'Karim Jubran',     initials: 'KJ', email: 'karim@example.com',  tier: 'vip',     status: 'atRisk',   lastLogHours: 18,   weightDelta:  0.0, hasPlan: true,  joinedDaysAgo: 88 },
  { id: 'c7',  name: 'Rasha Tarawneh',   initials: 'RT', email: 'rasha@example.com',  tier: 'premium', status: 'onTrack',  lastLogHours: 1,    weightDelta: -2.6, hasPlan: true,  joinedDaysAgo: 55 },
  { id: 'c8',  name: 'Nour Bishara',     initials: 'NB', email: 'nour@example.com',   tier: 'basic',   status: 'onTrack',  lastLogHours: 8,    weightDelta: -1.1, hasPlan: false, joinedDaysAgo: 14 },
  { id: 'c9',  name: 'Saif Haddad',      initials: 'SH', email: 'saif@example.com',   tier: 'free',    status: 'inactive', lastLogHours: 720,  weightDelta:  0.0, hasPlan: false, joinedDaysAgo: 200 },
  { id: 'c10', name: 'Diana Costa',      initials: 'DC', email: 'diana@example.com',  tier: 'premium', status: 'onTrack',  lastLogHours: 4,    weightDelta: -4.2, hasPlan: true,  joinedDaysAgo: 130 },
  { id: 'c11', name: 'Tareq Sukkar',     initials: 'TS', email: 'tareq@example.com',  tier: 'vip',     status: 'onTrack',  lastLogHours: 2,    weightDelta: -2.2, hasPlan: true,  joinedDaysAgo: 33 },
  { id: 'c12', name: 'Reem Odeh',        initials: 'RO', email: 'reem@example.com',   tier: 'basic',   status: 'inactive', lastLogHours: 480,  weightDelta:  0.0, hasPlan: false, joinedDaysAgo: 90 },
]

const STATUS_TABS: (Status | 'all')[] = ['all', 'onTrack', 'atRisk', 'inactive']
const TIER_TABS: (Tier | 'all')[] = ['all', 'free', 'basic', 'premium', 'vip']

export default function ClientsListPage() {
  const t = useTranslations('nutritionist.clientList')
  const tStatus = useTranslations('nutritionist.clientStatus')
  const tTiers = useTranslations('tiers')

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [tierFilter, setTierFilter] = useState<Tier | 'all'>('all')
  const [sort, setSort] = useState<SortKey>('lastActivity')

  const live = useSupabaseQuery<Client[]>(async (supabase) => {
    const cutoffActive   = new Date(); cutoffActive.setDate(cutoffActive.getDate()  - 1)
    const cutoffAtRisk   = new Date(); cutoffAtRisk.setDate(cutoffAtRisk.getDate()  - 4)
    const cutoffInactive = new Date(); cutoffInactive.setDate(cutoffInactive.getDate() - 30)
    void cutoffActive

    type ProfileRow = {
      id: string
      full_name: string | null
      tier: Tier
      created_at: string
      last_seen_at: string | null
      weight_kg: number | null
    }
    const { data: profileRows } = await supabase
      .from('profiles')
      .select('id, full_name, tier, created_at, last_seen_at, weight_kg')
      .eq('role', 'user')
      .order('last_seen_at', { ascending: false, nullsFirst: false })
      .limit(80)
    const profiles = (profileRows as ProfileRow[] | null) ?? []
    if (profiles.length === 0) return []

    const ids = profiles.map((p) => p.id)

    type EarliestWeight = { user_id: string; weight_kg: number | null }
    const { data: earliestRows } = await supabase
      .from('progress_entries')
      .select('user_id, weight_kg')
      .in('user_id', ids)
      .not('weight_kg', 'is', null)
      .order('recorded_at', { ascending: true })
    const earliest = new Map<string, number>()
    for (const r of (earliestRows as EarliestWeight[] | null) ?? []) {
      if (!earliest.has(r.user_id) && r.weight_kg != null) {
        earliest.set(r.user_id, r.weight_kg)
      }
    }

    const { data: planRows } = await supabase
      .from('meal_plans')
      .select('client_id')
      .in('client_id', ids)
      .eq('is_active', true)
    const hasPlanFor = new Set(
      ((planRows as { client_id: string }[] | null) ?? []).map((p) => p.client_id),
    )

    const now = Date.now()
    return profiles.map((p) => {
      const lastSeenMs = p.last_seen_at ? new Date(p.last_seen_at).getTime() : 0
      const lastLogHours = lastSeenMs ? Math.max(0, (now - lastSeenMs) / 3_600_000) : 9999
      const status: Status =
        !lastSeenMs || lastLogHours > 30 * 24 ? 'inactive' :
        lastLogHours > 4 * 24 ? 'atRisk' : 'onTrack'
      const start = earliest.get(p.id) ?? p.weight_kg ?? null
      const weightDelta = start != null && p.weight_kg != null
        ? Number((p.weight_kg - start).toFixed(1)) : 0
      const name = p.full_name?.trim() || 'Unnamed client'
      return {
        id: p.id,
        name,
        initials: initialsOf(name),
        email: '', // hidden from non-admin
        tier: p.tier,
        status,
        lastLogHours,
        weightDelta,
        hasPlan: hasPlanFor.has(p.id),
        joinedDaysAgo: Math.max(
          0,
          Math.floor((now - new Date(p.created_at).getTime()) / 86_400_000),
        ),
      }
    })
  }, [])

  const sourceList = (live.data && live.data.length > 0) ? live.data : SEED

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    let rows = sourceList.filter((c) => {
      if (statusFilter !== 'all' && c.status !== statusFilter) return false
      if (tierFilter !== 'all' && c.tier !== tierFilter) return false
      if (q && !`${c.name} ${c.email}`.toLowerCase().includes(q)) return false
      return true
    })
    rows = [...rows].sort((a, b) => {
      switch (sort) {
        case 'lastActivity': return a.lastLogHours - b.lastLogHours
        case 'name':         return a.name.localeCompare(b.name)
        case 'weightDelta':  return a.weightDelta - b.weightDelta
        case 'joinDate':     return a.joinedDaysAgo - b.joinedDaysAgo
        default: return 0
      }
    })
    return rows
  }, [sourceList, query, statusFilter, tierFilter, sort])

  const counts = useMemo(() => {
    let onTrack = 0
    let atRisk = 0
    let inactive = 0
    for (const c of sourceList) {
      if (c.status === 'onTrack') onTrack += 1
      else if (c.status === 'atRisk') atRisk += 1
      else inactive += 1
    }
    return { total: sourceList.length, onTrack, atRisk, inactive }
  }, [sourceList])

  const [inviteOpen, setInviteOpen] = useState(false)

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {t('subtitle').split('—')[0]?.trim() || 'My Clients'}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportClientsCsv(visible)}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t('exportCsv')}
          </button>
          <button
            type="button"
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
          >
            <UserPlus className="w-3.5 h-3.5" strokeWidth={2} />
            {t('newClient')}
          </button>
        </div>
      </header>

      {/* KPI strip — quick read on the entire client roster */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          Icon={Users}
          tint="#60a5fa"
          label="Total clients"
          value={counts.total}
        />
        <KpiCard
          Icon={CheckCircle2}
          tint="#a3e635"
          label="On track"
          value={counts.onTrack}
        />
        <KpiCard
          Icon={AlertTriangle}
          tint="#fb923c"
          label="At risk"
          value={counts.atRisk}
        />
        <KpiCard
          Icon={Moon}
          tint="#9baf9f"
          label="Inactive"
          value={counts.inactive}
        />
      </section>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search
            className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="w-full h-11 rounded-pill bg-surface border border-border ps-11 pe-4 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <FilterGroup
            Icon={Filter}
            label={t('filterStatus')}
            options={STATUS_TABS.map((s) => [
              s,
              s === 'all' ? t('statusAll') : tStatus(s),
            ])}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as Status | 'all')}
          />
          <FilterGroup
            label={t('filterTier')}
            options={TIER_TABS.map((tier) => [
              tier,
              tier === 'all' ? t('tierAll') : tTiers(`${tier}.name`),
            ])}
            value={tierFilter}
            onChange={(v) => setTierFilter(v as Tier | 'all')}
          />
          <SortMenu
            t={t}
            value={sort}
            onChange={setSort}
          />
        </div>
      </div>

      {/* Results */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <Users
            className="w-9 h-9 mx-auto mb-3 text-fg-3"
            strokeWidth={1.5}
          />
          <p className="text-base font-semibold text-fg-1">{t('noResults')}</p>
          <p className="mt-1 text-sm text-fg-2">{t('noResultsBody')}</p>
        </div>
      ) : (
        <ClientTable
          t={t}
          tStatus={tStatus}
          tTiers={tTiers}
          rows={visible}
        />
      )}

      {inviteOpen && (
        <InviteClientModal
          onClose={() => setInviteOpen(false)}
          onInvited={() => {
            setInviteOpen(false)
            live.reload()
          }}
        />
      )}
    </div>
  )
}

function KpiCard({
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
        <Icon className="w-4 h-4" strokeWidth={1.75} style={{ color: tint }} />
        <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
          {label}
        </p>
      </div>
      <p
        className="mt-2 font-display text-2xl font-bold"
        style={{ color: tint }}
      >
        {value.toLocaleString()}
      </p>
    </article>
  )
}

function exportClientsCsv(rows: Client[]): void {
  const header =
    'name,email,tier,status,last_log_hours,weight_delta_kg,has_plan,joined_days_ago\n'
  const cell = (v: unknown): string => {
    const s = v == null ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const body = rows
    .map((r) =>
      [
        r.name,
        r.email,
        r.tier,
        r.status,
        Math.round(r.lastLogHours),
        r.weightDelta,
        r.hasPlan ? 'yes' : 'no',
        r.joinedDaysAgo,
      ]
        .map(cell)
        .join(','),
    )
    .join('\n')
  const blob = new Blob([header + body], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `greenofig-clients-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function InviteClientModal({
  onClose,
  onInvited,
}: {
  onClose: () => void
  onInvited: () => void
}) {
  const [email, setEmail] = useState('')
  const [tier, setTier] = useState<Tier>('free')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role: 'user', tier }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string | { message?: string }
      }
      if (res.ok && data.ok) {
        toast.success(`Invite sent to ${email}`)
        onInvited()
      } else {
        const msg =
          typeof data.error === 'string'
            ? data.error
            : data.error?.message ?? 'Could not send invite'
        toast.error(msg)
      }
    } catch {
      toast.error('Network error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 space-y-5"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-fg-1">Invite a client</h2>
            <p className="mt-1 text-xs text-fg-3">
              They&apos;ll get a magic-link email to claim the account.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-3 hover:text-fg-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </header>

        <label className="block">
          <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5 block">
            Email
          </span>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5 block">
            Starting tier
          </span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as Tier)}
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
          >
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="premium">Premium</option>
            <option value="vip">VIP</option>
          </select>
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs shadow-lime-glow border border-lime-600/60 disabled:opacity-50 disabled:cursor-wait"
          >
            <UserPlus className="w-3.5 h-3.5" strokeWidth={2} />
            {busy ? 'Sending…' : 'Send invite'}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

function FilterGroup({
  Icon,
  label,
  options,
  value,
  onChange,
}: {
  Icon?: LucideIcon
  label: string
  options: [string, string][]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex items-center gap-1.5 flex-wrap">
      <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        {Icon && <Icon className="w-3 h-3" strokeWidth={2} />}
        {label}
      </span>
      <div className="inline-flex items-center gap-0.5 rounded-pill bg-bg-deeper border border-border p-0.5">
        {options.map(([v, lbl]) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`px-3 h-7 rounded-pill text-[11px] font-semibold transition-colors ${
              value === v
                ? 'bg-primary/20 text-lime-400'
                : 'text-fg-3 hover:text-fg-1'
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  )
}

function SortMenu({
  t,
  value,
  onChange,
}: {
  t: ReturnType<typeof useTranslations>
  value: SortKey
  onChange: (v: SortKey) => void
}) {
  const opts: SortKey[] = ['lastActivity', 'name', 'weightDelta', 'joinDate']
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        <ArrowDownUp className="w-3 h-3" strokeWidth={2} />
        {t('sortBy')}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="h-8 rounded-pill bg-bg-deeper border border-border px-3 text-[11px] font-semibold text-fg-1 focus:outline-none focus:border-primary appearance-none pe-8"
      >
        {opts.map((o) => (
          <option key={o} value={o} className="bg-surface">
            {t(`sortOptions.${o}` as 'sortOptions.lastActivity')}
          </option>
        ))}
      </select>
    </div>
  )
}

function ClientTable({
  t,
  tStatus,
  tTiers,
  rows,
}: {
  t: ReturnType<typeof useTranslations>
  tStatus: ReturnType<typeof useTranslations>
  tTiers: ReturnType<typeof useTranslations>
  rows: Client[]
}) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      {/* Desktop header */}
      <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 bg-bg-deeper/40 border-b border-border text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        <div>{t('col.client')}</div>
        <div>{t('col.tier')}</div>
        <div>{t('col.status')}</div>
        <div>{t('col.lastLog')}</div>
        <div>{t('col.delta')}</div>
        <div>{t('col.plan')}</div>
        <div className="sr-only">{t('col.actions')}</div>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((c) => (
          <li key={c.id} className="hover:bg-surface-raised transition-colors">
            <Link
              href={`/nutritionist/clients/${c.id}` as `/nutritionist/clients/${string}`}
              className="md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center px-5 py-3 cursor-pointer"
            >
            {/* Client */}
            <div className="flex items-center gap-3 min-w-0 mb-3 md:mb-0">
              <Avatar text={c.initials} size={36} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg-1 truncate">{c.name}</p>
                <p className="text-xs text-fg-3 truncate font-mono" dir="ltr">
                  {c.email}
                </p>
              </div>
            </div>

            {/* Tier */}
            <div className="flex md:block items-center justify-between gap-2 mb-1.5 md:mb-0">
              <span className="md:hidden text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
                {t('col.tier')}
              </span>
              <span
                className="rounded-pill h-6 px-2.5 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
                style={{
                  background: `${TIER_TINT[c.tier]}1a`,
                  color: TIER_TINT[c.tier],
                }}
              >
                {tTiers(`${c.tier}.name`)}
              </span>
            </div>

            {/* Status */}
            <div className="flex md:block items-center justify-between gap-2 mb-1.5 md:mb-0">
              <span className="md:hidden text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
                {t('col.status')}
              </span>
              <span
                className="rounded-pill h-6 px-2.5 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
                style={{
                  background: STATUS_META[c.status].bg,
                  color: STATUS_META[c.status].tint,
                }}
              >
                {tStatus(c.status)}
              </span>
            </div>

            {/* Last log */}
            <div className="flex md:block items-center justify-between gap-2 mb-1.5 md:mb-0">
              <span className="md:hidden text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
                {t('col.lastLog')}
              </span>
              <p className="text-xs text-fg-2 font-mono" dir="ltr">
                {c.lastLogHours >= 24 * 14
                  ? t('lastLogNever')
                  : t('lastLogValue', { value: formatHours(c.lastLogHours) })}
              </p>
            </div>

            {/* Weight delta */}
            <div className="flex md:block items-center justify-between gap-2 mb-1.5 md:mb-0">
              <span className="md:hidden text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
                {t('col.delta')}
              </span>
              <DeltaPill kg={c.weightDelta} />
            </div>

            {/* Plan */}
            <div className="flex md:block items-center justify-between gap-2 mb-3 md:mb-0">
              <span className="md:hidden text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
                {t('col.plan')}
              </span>
              {c.hasPlan ? (
                <span className="rounded-pill bg-primary/15 text-lime-400 h-6 px-2.5 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold">
                  ✓
                </span>
              ) : (
                <span className="text-[11px] text-fg-3">{t('noPlan')}</span>
              )}
            </div>

            {/* Affordance — the row itself is the link, this is just the visual */}
            <div className="md:justify-self-end flex items-center gap-1 text-xs text-fg-3">
              <span className="hidden md:inline">{t('openProfile')}</span>
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={2} />
            </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DeltaPill({ kg }: { kg: number }) {
  const Icon = kg < -0.05 ? TrendingDown : kg > 0.05 ? TrendingUp : Minus
  const tint = kg < -0.05 ? '#a3e635' : kg > 0.05 ? '#f43f5e' : '#9baf9f'
  const sign = kg < 0 ? '−' : kg > 0 ? '+' : ''
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-xs font-semibold"
      style={{ color: tint }}
      dir="ltr"
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      {sign}
      {Math.abs(kg).toFixed(1)} kg
    </span>
  )
}

function formatHours(h: number): string {
  if (h < 1) return '< 1h'
  if (h < 24) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
