'use client'

import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Search,
  Download,
  UserPlus,
  ArrowRight,
  Users as UsersIcon,
} from '@/icons'
import { Link } from '@/i18n/navigation'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import type { Tier } from '@/lib/constants'

type Role = 'user' | 'nutritionist' | 'admin'
type Status = 'active' | 'suspended' | 'invited'

interface AdminUser {
  id: string
  name: string
  initials: string
  email: string
  role: Role
  tier: Tier
  status: Status
  joinedISO: string
  lastSeenHours: number
}

const TIER_TINT: Record<Tier, string> = {
  free: '#9baf9f',
  basic: '#06b6d4',
  premium: '#a3e635',
  vip: '#a855f7',
}

const ROLE_TINT: Record<Role, string> = {
  user: '#9baf9f',
  nutritionist: '#a3e635',
  admin: '#a855f7',
}

const STATUS_META: Record<Status, { tint: string; bg: string }> = {
  active:    { tint: '#a3e635', bg: 'rgb(163 230 53 / 0.14)' },
  suspended: { tint: '#f43f5e', bg: 'rgb(244 63 94 / 0.14)' },
  invited:   { tint: '#06b6d4', bg: 'rgb(6 182 212 / 0.14)' },
}

const SEED: AdminUser[] = [
  { id: 'u1',  name: 'Layla Hijazi',     initials: 'LH', email: 'layla@example.com',   role: 'user',         tier: 'vip',     status: 'active',    joinedISO: '2026-03-02', lastSeenHours: 3 },
  { id: 'u2',  name: 'Maya Khalil',      initials: 'MK', email: 'maya@example.com',    role: 'user',         tier: 'premium', status: 'active',    joinedISO: '2026-01-12', lastSeenHours: 5 },
  { id: 'u3',  name: 'Yousef Abu Shaer', initials: 'YA', email: 'yousef@example.com',  role: 'user',         tier: 'basic',   status: 'active',    joinedISO: '2026-04-10', lastSeenHours: 12 },
  { id: 'u4',  name: 'Omar Saadeh',      initials: 'OS', email: 'omar@example.com',    role: 'user',         tier: 'premium', status: 'active',    joinedISO: '2026-03-18', lastSeenHours: 96 },
  { id: 'u5',  name: 'Hala Mansour',     initials: 'HM', email: 'hala@example.com',    role: 'user',         tier: 'basic',   status: 'active',    joinedISO: '2026-04-22', lastSeenHours: 36 },
  { id: 'u6',  name: 'Karim Jubran',     initials: 'KJ', email: 'karim@example.com',   role: 'user',         tier: 'vip',     status: 'active',    joinedISO: '2026-02-15', lastSeenHours: 18 },
  { id: 'u7',  name: 'Saif Haddad',      initials: 'SH', email: 'saif@example.com',    role: 'user',         tier: 'free',    status: 'suspended', joinedISO: '2025-10-22', lastSeenHours: 720 },
  { id: 'u8',  name: 'Rasha Tarawneh',   initials: 'RT', email: 'rasha@example.com',   role: 'user',         tier: 'premium', status: 'active',    joinedISO: '2026-03-15', lastSeenHours: 1 },
  { id: 'u9',  name: 'Diana Costa',      initials: 'DC', email: 'diana@example.com',   role: 'user',         tier: 'premium', status: 'active',    joinedISO: '2026-01-04', lastSeenHours: 4 },
  { id: 'u10', name: 'Reem Odeh',        initials: 'RO', email: 'reem@example.com',    role: 'user',         tier: 'basic',   status: 'invited',   joinedISO: '2026-05-01', lastSeenHours: 9999 },
  { id: 'u11', name: 'Dr. Rawan Othman', initials: 'RO', email: 'rawan@greenofig.com', role: 'nutritionist', tier: 'vip',     status: 'active',    joinedISO: '2025-09-01', lastSeenHours: 1 },
  { id: 'u12', name: 'Ahmad Salim',      initials: 'AS', email: 'admin@greenofig.com', role: 'admin',        tier: 'vip',     status: 'active',    joinedISO: '2025-08-15', lastSeenHours: 0 },
]

const ROLE_TABS: ('all' | Role)[] = ['all', 'user', 'nutritionist', 'admin']
const TIER_TABS: ('all' | Tier)[] = ['all', 'free', 'basic', 'premium', 'vip']
const STATUS_TABS: ('all' | Status)[] = ['all', 'active', 'suspended', 'invited']

export default function AdminUsersPage() {
  const t = useTranslations('admin')
  const tU = useTranslations('admin.usersPage')
  const tTiers = useTranslations('tiers')

  const [query, setQuery] = useState('')
  const [roleF, setRoleF] = useState<'all' | Role>('all')
  const [tierF, setTierF] = useState<'all' | Tier>('all')
  const [statusF, setStatusF] = useState<'all' | Status>('all')

  const live = useSupabaseQuery<AdminUser[]>(async (supabase) => {
    type Row = {
      id: string
      full_name: string | null
      role: Role
      tier: Tier
      is_active: boolean
      created_at: string
      last_seen_at: string | null
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, tier, is_active, created_at, last_seen_at')
      .order('created_at', { ascending: false })
      .limit(120)

    const rows = (data as Row[] | null) ?? []
    if (rows.length === 0) return []

    const now = Date.now()
    return rows.map((r) => {
      const name = r.full_name?.trim() || 'Unnamed user'
      const lastSeenMs = r.last_seen_at ? new Date(r.last_seen_at).getTime() : 0
      const status: Status =
        !r.is_active ? 'suspended' :
        !lastSeenMs ? 'invited' :
        'active'
      return {
        id: r.id,
        name,
        initials: name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase(),
        email: '',
        role: r.role,
        tier: r.tier,
        status,
        joinedISO: r.created_at,
        lastSeenHours: lastSeenMs ? Math.max(0, (now - lastSeenMs) / 3_600_000) : 9999,
      }
    })
  }, [])

  const sourceList = (live.data && live.data.length > 0) ? live.data : SEED

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sourceList.filter((u) => {
      if (roleF !== 'all' && u.role !== roleF) return false
      if (tierF !== 'all' && u.tier !== tierF) return false
      if (statusF !== 'all' && u.status !== statusF) return false
      if (q && !`${u.name} ${u.email}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [sourceList, query, roleF, tierF, statusF])

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {t('users')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{tU('subtitle')}</p>
          <p className="mt-2 text-xs text-fg-3 inline-flex items-center gap-1.5">
            <UsersIcon className="w-3 h-3" strokeWidth={2} />
            {tU('totalUsers', { count: sourceList.length })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
          >
            <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
            {tU('exportCsv')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
          >
            <UserPlus className="w-3.5 h-3.5" strokeWidth={2} />
            {tU('newUser')}
          </button>
        </div>
      </header>

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
            placeholder={tU('search')}
            className="w-full h-11 rounded-pill bg-surface border border-border ps-11 pe-4 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <FilterGroup
            label={tU('filterRole')}
            options={ROLE_TABS.map((r) => [
              r,
              r === 'all' ? tU('roleAll') : tU(`roles.${r}` as 'roles.user'),
            ])}
            value={roleF}
            onChange={(v) => setRoleF(v as 'all' | Role)}
          />
          <FilterGroup
            label={tU('filterTier')}
            options={TIER_TABS.map((tier) => [
              tier,
              tier === 'all' ? tU('tierAll') : tTiers(`${tier}.name`),
            ])}
            value={tierF}
            onChange={(v) => setTierF(v as 'all' | Tier)}
          />
          <FilterGroup
            label={tU('filterStatus')}
            options={STATUS_TABS.map((s) => [
              s,
              s === 'all'
                ? tU('statusAll')
                : tU(`status${s.charAt(0).toUpperCase()}${s.slice(1)}` as 'statusActive'),
            ])}
            value={statusF}
            onChange={(v) => setStatusF(v as 'all' | Status)}
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <UsersIcon className="w-9 h-9 mx-auto mb-3 text-fg-3" strokeWidth={1.5} />
          <p className="text-base font-semibold text-fg-1">{tU('noResults')}</p>
          <p className="mt-1 text-sm text-fg-2">{tU('noResultsBody')}</p>
        </div>
      ) : (
        <UserTable t={tU} tTiers={tTiers} rows={visible} />
      )}
    </div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

function FilterGroup({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: [string, string][]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
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

function UserTable({
  t,
  tTiers,
  rows,
}: {
  t: ReturnType<typeof useTranslations>
  tTiers: ReturnType<typeof useTranslations>
  rows: AdminUser[]
}) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 px-5 py-3 bg-bg-deeper/40 border-b border-border text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        <div>{t('col.user')}</div>
        <div>{t('col.role')}</div>
        <div>{t('col.tier')}</div>
        <div>{t('col.status')}</div>
        <div>{t('col.joined')}</div>
        <div>{t('col.lastSeen')}</div>
        <div className="sr-only">{t('col.actions')}</div>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((u) => (
          <li
            key={u.id}
            className="md:grid md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-center px-5 py-3 hover:bg-surface-raised transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0 mb-3 md:mb-0">
              <span
                className="shrink-0 w-9 h-9 rounded-full inline-flex items-center justify-center font-display text-xs font-bold"
                style={{
                  background: 'linear-gradient(135deg,#5c7262,#2c3e35)',
                  color: '#f0ede6',
                }}
              >
                {u.initials}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg-1 truncate">{u.name}</p>
                <p className="text-xs text-fg-3 truncate font-mono" dir="ltr">
                  {u.email}
                </p>
              </div>
            </div>

            <ColCell label={t('col.role')}>
              <span
                className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
                style={{
                  background: `${ROLE_TINT[u.role]}1a`,
                  color: ROLE_TINT[u.role],
                }}
              >
                {t(`roles.${u.role}` as 'roles.user')}
              </span>
            </ColCell>

            <ColCell label={t('col.tier')}>
              <span
                className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
                style={{
                  background: `${TIER_TINT[u.tier]}1a`,
                  color: TIER_TINT[u.tier],
                }}
              >
                {tTiers(`${u.tier}.name`)}
              </span>
            </ColCell>

            <ColCell label={t('col.status')}>
              <span
                className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
                style={{
                  background: STATUS_META[u.status].bg,
                  color: STATUS_META[u.status].tint,
                }}
              >
                {t(`status${u.status.charAt(0).toUpperCase()}${u.status.slice(1)}` as 'statusActive')}
              </span>
            </ColCell>

            <ColCell label={t('col.joined')} mono>
              {new Date(u.joinedISO).toLocaleDateString(undefined, {
                month: 'short',
                year: '2-digit',
              })}
            </ColCell>

            <ColCell label={t('col.lastSeen')} mono>
              {u.status === 'invited'
                ? '—'
                : u.lastSeenHours >= 24 * 30
                  ? t('lastSeenNever')
                  : t('lastSeenAgo', { value: formatHours(u.lastSeenHours) })}
            </ColCell>

            <div className="md:justify-self-end">
              <Link
                href={`/admin/users/${u.id}`}
                className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
              >
                {t('openProfile')}
                <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={2} />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function ColCell({
  label,
  mono,
  children,
}: {
  label: string
  mono?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="flex md:block items-center justify-between gap-2 mb-1.5 md:mb-0">
      <span className="md:hidden text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        {label}
      </span>
      <div
        className={`text-xs ${mono ? 'font-mono text-fg-2' : ''}`}
        dir={mono ? 'ltr' : undefined}
      >
        {children}
      </div>
    </div>
  )
}

function formatHours(h: number): string {
  if (h < 1) return '<1h'
  if (h < 24) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
}
