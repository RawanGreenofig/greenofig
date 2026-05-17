'use client'

import { useMemo, useState } from 'react'
import {
  Mail, Search, CheckCircle2, MailOpen, Archive, Trash2, ChevronDown,
  ExternalLink, Download, MessageSquare,
  type LucideIcon,
} from '@/icons'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import { getBrowserSupabase } from '@/lib/supabase/client'

type Status = 'new' | 'read' | 'replied' | 'archived' | 'spam'
type Topic = 'general' | 'support' | 'health' | 'partnership' | 'feedback'

interface ContactRow {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  topic: Topic
  marketing_opt_in: boolean
  status: Status
  user_id: string | null
  ip_country: string | null
  created_at: string
  read_at: string | null
  replied_at: string | null
  admin_notes: string | null
}

const STATUS_FILTERS: { value: Status | 'all'; label: string }[] = [
  { value: 'all',      label: 'All' },
  { value: 'new',      label: 'New' },
  { value: 'read',     label: 'Read' },
  { value: 'replied',  label: 'Replied' },
  { value: 'archived', label: 'Archived' },
  { value: 'spam',     label: 'Spam' },
]

const TOPIC_LABEL: Record<Topic, string> = {
  general: 'General',
  support: 'Billing',
  health: 'Health',
  partnership: 'Partnership',
  feedback: 'Feedback',
}

const STATUS_TINT: Record<Status, { bg: string; fg: string; border: string }> = {
  new:      { bg: 'rgba(163,230,53,0.12)', fg: '#a3e635', border: 'rgba(163,230,53,0.4)' },
  read:     { bg: 'rgba(96,165,250,0.10)', fg: '#60a5fa', border: 'rgba(96,165,250,0.35)' },
  replied:  { bg: 'rgba(74,222,128,0.10)', fg: '#4ade80', border: 'rgba(74,222,128,0.35)' },
  archived: { bg: 'rgba(156,163,175,0.10)', fg: '#9ca3af', border: 'rgba(156,163,175,0.30)' },
  spam:     { bg: 'rgba(248,113,113,0.10)', fg: '#f87171', border: 'rgba(248,113,113,0.35)' },
}

export default function AdminContactsPage() {
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all')
  const [search, setSearch] = useState('')
  const [openId, setOpenId] = useState<string | null>(null)

  const queryFn = useMemo(() => {
    return async () => {
      const supabase = getBrowserSupabase()
      if (!supabase) return [] as ContactRow[]
      let q = supabase
        .from('contact_messages')
        .select(
          'id, name, email, subject, message, topic, marketing_opt_in, status, user_id, ip_country, created_at, read_at, replied_at, admin_notes',
        )
        .order('created_at', { ascending: false })
        .limit(500)
      if (statusFilter !== 'all') {
        q = q.eq('status', statusFilter)
      }
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as ContactRow[]
    }
  }, [statusFilter])

  const { data, loading, error, reload } = useSupabaseQuery<ContactRow[]>(queryFn, [statusFilter])

  const rows = useMemo(() => data ?? [], [data])
  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s) ||
        (r.subject ?? '').toLowerCase().includes(s) ||
        r.message.toLowerCase().includes(s),
    )
  }, [rows, search])

  const counts = useMemo(() => {
    const c = { new: 0, total: rows.length, marketing: 0 }
    rows.forEach((r) => {
      if (r.status === 'new') c.new += 1
      if (r.marketing_opt_in) c.marketing += 1
    })
    return c
  }, [rows])

  async function setStatus(id: string, next: Status) {
    // Server-side stamps read_at / replied_at when appropriate, so we
    // only need to send the new status. Was a direct supabase update
    // that silently failed under RLS races; now the API route returns
    // a structured error.
    const res = await fetch('/api/admin/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: next }),
    })
    if (!res.ok) {
      console.error('[admin/contacts] update failed:', res.status)
      return
    }
    reload()
  }

  async function deleteRow(id: string) {
    if (!confirm('Delete this message permanently?')) return
    const res = await fetch('/api/admin/contacts', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (!res.ok) {
      console.error('[admin/contacts] delete failed:', res.status)
      return
    }
    reload()
  }

  function exportMarketingCsv() {
    const subscribers = rows.filter((r) => r.marketing_opt_in)
    const header = 'name,email,topic,signed_up_at\n'
    const body = subscribers
      .map((r) => [r.name, r.email, r.topic, r.created_at].map(csvCell).join(','))
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `greenofig-marketing-list-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex items-start gap-3">
        <Mail
          className="w-6 h-6 mt-1 flex-shrink-0"
          strokeWidth={1.75}
          color="#a3e635"
        />
        <div className="min-w-0">
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            Contacts
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2 max-w-2xl">
            Form submissions and marketing opt-ins from /contact.
          </p>
        </div>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard Icon={Mail}            label="Total messages"      value={counts.total}     tint="#60a5fa" />
        <KpiCard Icon={MailOpen}        label="New / unread"        value={counts.new}       tint="#a3e635" />
        <KpiCard Icon={Download}        label="Marketing opt-ins"   value={counts.marketing} tint="#fbbf24" />
      </section>

      {/* Search + filter — same recipe as Orders/Bookings: right-sized
       * search, segmented filter shell, ghost export action. */}
      <section className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-[280px]">
          <Search
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ insetInlineStart: '12px' }}
            strokeWidth={1.75}
            color="var(--gf-fg-3)"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, subject, message…"
            className="w-full h-10 rounded-lg text-sm text-fg-1 placeholder-fg-3 focus:outline-none"
            style={{
              background: 'var(--gf-input-bg)',
              border: '1px solid var(--gf-border)',
              paddingInlineStart: '36px',
              paddingInlineEnd: '12px',
            }}
          />
        </div>
        <div
          className="inline-flex items-center overflow-x-auto flex-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{
            background: 'var(--gf-input-bg)',
            border: '1px solid var(--gf-border)',
            borderRadius: 8,
            padding: 2,
            gap: 2,
          }}
        >
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.value
            return (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className="shrink-0 inline-flex items-center justify-center h-8 px-3 text-xs font-semibold transition-colors whitespace-nowrap"
                style={{
                  borderRadius: 6,
                  background: active ? 'rgba(132,217,61,0.12)' : 'transparent',
                  color: active ? '#a3e635' : 'var(--gf-fg-2)',
                }}
              >
                {f.label}
              </button>
            )
          })}
        </div>
        <button
          onClick={exportMarketingCsv}
          className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-fg-1 transition-colors"
          style={{
            background: 'var(--gf-input-bg)',
            border: '1px solid var(--gf-border)',
            borderRadius: 8,
          }}
          title="Export everyone who opted in to marketing"
        >
          <Download
            className="w-3.5 h-3.5"
            strokeWidth={1.75}
            color="var(--gf-fg-3)"
          />
          Export marketing list ({counts.marketing})
        </button>
      </section>

      {/* Messages list */}
      {loading && <p className="text-sm text-fg-3">Loading messages…</p>}
      {error && (
        <p className="text-sm" style={{ color: '#f87171' }}>
          Error: {error}
        </p>
      )}
      {!loading && filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <MessageSquare
            className="w-9 h-9 mx-auto mb-3"
            strokeWidth={1.5}
            color="var(--gf-fg-3)"
          />
          <p className="text-sm font-semibold text-fg-1">No messages yet</p>
          <p className="mt-1 text-xs text-fg-3">
            Submissions to <code>/api/contact</code> will show up here.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {filtered.map((r) => {
          const open = openId === r.id
          const tint = STATUS_TINT[r.status]
          return (
            <li
              key={r.id}
              className="rounded-xl"
              style={{
                background: 'var(--gf-surface)',
                border: `1px solid ${r.status === 'new' ? 'rgba(163,230,53,0.4)' : 'var(--gf-border)'}`,
              }}
            >
              <button
                onClick={() => {
                  const willOpen = openId !== r.id
                  setOpenId(willOpen ? r.id : null)
                  if (willOpen && r.status === 'new') void setStatus(r.id, 'read')
                }}
                className="w-full text-start p-4 flex items-start gap-3 hover:bg-bg-deeper/30 rounded-xl transition-colors"
              >
                <span
                  className="mt-1 inline-flex items-center text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5"
                  style={{
                    background: tint.bg,
                    color: tint.fg,
                    border: `1px solid ${tint.border}`,
                  }}
                >
                  {r.status}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <p className="text-sm font-semibold text-fg-1 truncate">
                      {r.name}
                    </p>
                    <p className="text-xs text-fg-3 truncate">{r.email}</p>
                    <span
                      className="text-[10px] uppercase tracking-wide rounded-full px-1.5 py-0.5"
                      style={{
                        background: 'rgba(255,255,255,0.05)',
                        color: 'var(--gf-fg-3)',
                        border: '1px solid var(--gf-border)',
                      }}
                    >
                      {TOPIC_LABEL[r.topic]}
                    </span>
                    {r.marketing_opt_in && (
                      <span
                        className="text-[10px] uppercase tracking-wide rounded-full px-1.5 py-0.5"
                        style={{
                          background: 'rgba(251,191,36,0.10)',
                          color: '#fbbf24',
                          border: '1px solid rgba(251,191,36,0.35)',
                        }}
                      >
                        Marketing
                      </span>
                    )}
                  </div>
                  {r.subject && (
                    <p className="text-sm text-fg-2 mt-0.5 truncate">{r.subject}</p>
                  )}
                  <p className="text-sm text-fg-3 mt-1 line-clamp-2">{r.message}</p>
                </div>
                <div className="flex flex-col items-end shrink-0 gap-1">
                  <span className="text-[11px] text-fg-3 whitespace-nowrap">
                    {fmtDate(r.created_at)}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-fg-3 transition-transform ${open ? 'rotate-180' : ''}`}
                    strokeWidth={1.75}
                  />
                </div>
              </button>

              {open && (
                <div
                  className="border-t px-5 py-4 space-y-4"
                  style={{ borderColor: 'var(--gf-border)' }}
                >
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-fg-3 mb-1.5">
                      Message
                    </p>
                    <p className="text-sm text-fg-1 leading-relaxed whitespace-pre-wrap">
                      {r.message}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-fg-3">
                    <span>Country: {r.ip_country ?? '—'}</span>
                    <span>Account: {r.user_id ? r.user_id.slice(0, 8) + '…' : 'anon'}</span>
                    <span>Read: {r.read_at ? fmtDate(r.read_at) : '—'}</span>
                    <span>Replied: {r.replied_at ? fmtDate(r.replied_at) : '—'}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <a
                      href={`mailto:${r.email}?subject=${encodeURIComponent(
                        'Re: ' + (r.subject ?? 'Your message to Greenofig'),
                      )}`}
                      className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5"
                      style={{
                        background: 'rgba(163,230,53,0.12)',
                        color: '#a3e635',
                        border: '1px solid rgba(163,230,53,0.4)',
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                      Reply via email
                    </a>
                    <ActionBtn
                      onClick={() => setStatus(r.id, 'read')}
                      Icon={MailOpen}
                      label="Mark read"
                      disabled={r.status === 'read'}
                    />
                    <ActionBtn
                      onClick={() => setStatus(r.id, 'replied')}
                      Icon={CheckCircle2}
                      label="Mark replied"
                      disabled={r.status === 'replied'}
                    />
                    <ActionBtn
                      onClick={() => setStatus(r.id, 'archived')}
                      Icon={Archive}
                      label="Archive"
                      disabled={r.status === 'archived'}
                    />
                    <ActionBtn
                      onClick={() => setStatus(r.id, 'spam')}
                      Icon={Archive}
                      label="Spam"
                      disabled={r.status === 'spam'}
                    />
                    <ActionBtn
                      onClick={() => deleteRow(r.id)}
                      Icon={Trash2}
                      label="Delete"
                      danger
                    />
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function KpiCard({
  Icon,
  label,
  value,
  tint,
}: {
  Icon: LucideIcon
  label: string
  value: number
  tint: string
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
        {value.toLocaleString()}
      </p>
    </article>
  )
}

function ActionBtn({
  onClick, Icon, label, disabled, danger,
}: {
  onClick: () => void
  Icon: typeof Mail
  label: string
  disabled?: boolean
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 text-xs rounded-full px-3 py-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: danger ? 'rgba(248,113,113,0.10)' : 'rgba(255,255,255,0.04)',
        color: danger ? '#f87171' : 'var(--gf-fg-2)',
        border: `1px solid ${danger ? 'rgba(248,113,113,0.35)' : 'var(--gf-border)'}`,
      }}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2} />
      {label}
    </button>
  )
}

function csvCell(v: string | number | boolean | null | undefined): string {
  const s = (v ?? '').toString()
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
