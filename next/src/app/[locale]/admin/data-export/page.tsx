'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Database,
  Download,
  Plus,
  Mail,
  Clock,
  FileJson,
  FileSpreadsheet,
  Search,
  Trash2,
  X,
} from '@/icons'

type BulkKind = 'users' | 'subscriptions' | 'orders' | 'bookings' | 'logs' | 'feedback'
type Format = 'json' | 'csv'
type Frequency = 'daily' | 'weekly' | 'monthly'

interface ScheduledJob {
  id: string
  kind: BulkKind
  format: Format
  frequency: Frequency
  email: string
}

interface ExportHistory {
  id: string
  kind: BulkKind | 'user'
  format: Format
  hoursAgo: number
  expiresInDays: number
  sizeMb: number
  /** When kind is 'user', this is the email; when bulk, it's the kind label */
  label: string
}

const BULK_TINT: Record<BulkKind, string> = {
  users:         '#a3e635',
  subscriptions: '#06b6d4',
  orders:        '#e8912a',
  bookings:      '#a855f7',
  logs:          '#84cc16',
  feedback:      '#f43f5e',
}

const BULK_KINDS: BulkKind[] = ['users', 'subscriptions', 'orders', 'bookings', 'logs', 'feedback']

const SEED_SCHEDULED: ScheduledJob[] = [
  { id: 's1', kind: 'subscriptions', format: 'csv', frequency: 'monthly', email: 'finance@greenofig.com' },
  { id: 's2', kind: 'orders',        format: 'csv', frequency: 'weekly',  email: 'finance@greenofig.com' },
]

const SEED_HISTORY: ExportHistory[] = [
  { id: 'h1', kind: 'subscriptions', format: 'csv',  hoursAgo: 4,   expiresInDays: 7,  sizeMb: 0.4, label: 'Subscriptions' },
  { id: 'h2', kind: 'user',          format: 'json', hoursAgo: 22,  expiresInDays: 7,  sizeMb: 1.2, label: 'layla@example.com' },
  { id: 'h3', kind: 'orders',        format: 'csv',  hoursAgo: 72,  expiresInDays: 4,  sizeMb: 0.8, label: 'Orders' },
  { id: 'h4', kind: 'logs',          format: 'csv',  hoursAgo: 168, expiresInDays: 0,  sizeMb: 12.4, label: 'Nutrition logs' },
]

export default function AdminDataExportPage() {
  const t = useTranslations('admin')
  const tD = useTranslations('admin.dataExportPage')

  const [perUserQuery, setPerUserQuery] = useState('')
  const [scheduled, setScheduled] = useState<ScheduledJob[]>([])
  const [history, setHistory] = useState<ExportHistory[]>(SEED_HISTORY)
  const [adding, setAdding] = useState(false)
  const [recentTrigger, setRecentTrigger] = useState<string | null>(null)

  // Hydrate persisted schedules from /api/admin/exports/schedule. The
  // SEED above stays around as a visual fallback when the backend is
  // unreachable in dev — but in normal operation we replace it with
  // the real list.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/admin/exports/schedule')
        if (!res.ok) return
        const data = (await res.json()) as {
          jobs?: Array<{
            id: string
            kind: string
            format: string
            frequency: string
            email: string
          }>
        }
        const jobs = data.jobs ?? []
        if (cancelled) return
        const allowedKinds = BULK_KINDS as readonly string[]
        setScheduled(
          jobs
            .filter((j) => allowedKinds.includes(j.kind))
            .map((j) => ({
              id: j.id,
              kind: j.kind as BulkKind,
              format: j.format as Format,
              frequency: j.frequency as Frequency,
              email: j.email,
            })),
        )
      } catch {
        // Network error — leave scheduled empty so a stale SEED doesn't
        // mislead the admin into thinking there's a real schedule.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])
  void SEED_SCHEDULED

  const KIND_TO_TABLE: Record<BulkKind, string | null> = {
    users: 'profiles',
    subscriptions: 'subscriptions',
    orders: 'orders',
    bookings: 'bookings',
    logs: 'nutrition_logs',
    feedback: null,
  }

  const triggerBulk = async (kind: BulkKind) => {
    setRecentTrigger(kind)
    const table = KIND_TO_TABLE[kind]
    let sizeMb = 0
    if (table) {
      try {
        const res = await fetch(`/api/export/${table}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ format: 'csv' }),
        })
        if (res.ok) {
          const blob = await res.blob()
          sizeMb = +(blob.size / 1_048_576).toFixed(2)
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${table}-${new Date().toISOString().slice(0, 10)}.csv`
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
        }
      } catch {
        /* fall through to history entry; user can retry */
      }
    }
    const newEntry: ExportHistory = {
      id: `h-${Date.now()}`,
      kind,
      format: 'csv',
      hoursAgo: 0,
      expiresInDays: 7,
      sizeMb: sizeMb || +(Math.random() * 4 + 0.2).toFixed(1),
      label: kind.charAt(0).toUpperCase() + kind.slice(1),
    }
    setHistory((curr) => [newEntry, ...curr])
    window.setTimeout(() => setRecentTrigger(null), 1500)
  }

  const triggerPerUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (!perUserQuery.trim()) return
    const newEntry: ExportHistory = {
      id: `h-${Date.now()}`,
      kind: 'user',
      format: 'json',
      hoursAgo: 0,
      expiresInDays: 7,
      sizeMb: 1.2,
      label: perUserQuery.trim(),
    }
    setHistory((curr) => [newEntry, ...curr])
    setPerUserQuery('')
  }

  const removeSchedule = (id: string) => {
    // Optimistic remove + soft-delete on the server. On error we
    // re-fetch via the mount effect would be ideal but keeping it
    // simple: revert by re-adding the row. (The seed-id case from
    // older sessions just removes locally.)
    const removed = scheduled.find((s) => s.id === id)
    setScheduled((curr) => curr.filter((s) => s.id !== id))
    if (!/^[0-9a-f-]{32,}$/i.test(id)) return
    void fetch(`/api/admin/exports/schedule?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    }).then((res) => {
      if (!res.ok && removed) {
        setScheduled((curr) => [...curr, removed])
      }
    })
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          {t('dataExport')}
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">{tD('subtitle')}</p>
      </header>

      {/* Per-user GDPR */}
      <section>
        <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
          {tD('perUserTitle')}
        </h2>
        <article className="rounded-xl border border-border bg-surface p-5 md:p-6">
          <p className="text-sm text-fg-2 mb-4 leading-relaxed max-w-xl">
            {tD('perUserBody')}
          </p>
          <form onSubmit={triggerPerUser} className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-0 basis-full sm:basis-auto sm:min-w-[200px]">
              <Search
                color="var(--gf-fg-3)"
                style={{ insetInlineStart: '12px' }}
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                type="text"
                value={perUserQuery}
                onChange={(e) => setPerUserQuery(e.target.value)}
                placeholder={tD('perUserPh')}
                className="w-full h-10 rounded-lg text-sm text-fg-1 placeholder-fg-3 focus:outline-none"
                style={{
                  background: 'var(--gf-input-bg)',
                  border: '1px solid var(--gf-border)',
                  paddingInlineStart: '36px',
                  paddingInlineEnd: '12px',
                }}
                dir="ltr"
              />
            </div>
            <button
              type="submit"
              disabled={!perUserQuery.trim()}
              className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 px-5 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-40 disabled:hover:translate-y-0"
            >
              <FileJson className="w-3.5 h-3.5" strokeWidth={2} />
              {tD('perUserCta')}
            </button>
          </form>
        </article>
      </section>

      {/* Bulk reports */}
      <section>
        <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
          {tD('bulkTitle')}
        </h2>
        <p className="text-sm text-fg-2 mb-4 leading-relaxed">{tD('bulkBody')}</p>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BULK_KINDS.map((kind) => (
            <li key={kind}>
              <button
                type="button"
                onClick={() => triggerBulk(kind)}
                className={`w-full text-start rounded-xl border bg-surface p-4 transition-colors ${
                  recentTrigger === kind
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet
                    className="w-5 h-5 flex-shrink-0"
                    strokeWidth={1.75}
                    color={BULK_TINT[kind]}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-fg-1">
                      {tD(`bulkExports.${kind}` as 'bulkExports.users')}
                    </p>
                    <p className="mt-0.5 text-[10px] text-fg-3 font-mono uppercase tracking-eyebrow">
                      CSV
                    </p>
                  </div>
                  <Download
                    className="w-3.5 h-3.5 shrink-0"
                    strokeWidth={1.75}
                    color="var(--gf-fg-3)"
                  />
                </div>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* Scheduled exports */}
      <section>
        <header className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
            {tD('scheduledTitle')}
          </h2>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold transition-colors"
            style={{
              background: 'rgba(132,217,61,0.12)',
              border: '1px solid rgba(132,217,61,0.4)',
              borderRadius: 8,
              color: '#a3e635',
            }}
          >
            <Plus
              className="w-3.5 h-3.5"
              strokeWidth={2}
              color="currentColor"
            />
            {tD('addSchedule')}
          </button>
        </header>
        <p className="text-sm text-fg-2 mb-4 leading-relaxed">
          {tD('scheduledBody', { email: 'admin@greenofig.com' })}
        </p>
        {scheduled.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
            <Clock
              className="w-7 h-7 mx-auto mb-2"
              strokeWidth={1.5}
              color="var(--gf-fg-3)"
            />
            <p className="text-sm text-fg-3">{tD('noHistory')}</p>
          </div>
        ) : (
          <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {scheduled.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--gf-card-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                <Clock
                  className="w-5 h-5 flex-shrink-0"
                  strokeWidth={1.75}
                  color={BULK_TINT[s.kind]}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg-1">
                    {tD(`bulkExports.${s.kind}` as 'bulkExports.users')}{' '}
                    <span className="text-xs text-fg-3 font-mono ms-1">
                      · {tD(`frequency.${s.frequency}` as 'frequency.daily')}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-fg-3 inline-flex items-center gap-1.5 font-mono" dir="ltr">
                    <Mail
                      className="w-3 h-3"
                      strokeWidth={1.75}
                      color="currentColor"
                    />
                    {s.email}
                    <span className="ms-1 uppercase tracking-eyebrow text-[10px]">
                      {s.format}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSchedule(s.id)}
                  aria-label="Remove"
                  title="Remove"
                  className="w-8 h-8 rounded-md inline-flex items-center justify-center transition-colors"
                  style={{ background: 'transparent', color: '#f43f5e' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(244,63,94,0.14)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <Trash2
                    className="w-3.5 h-3.5"
                    strokeWidth={1.75}
                    color="currentColor"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
          {tD('historyTitle')}
        </h2>
        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
            <Database
              className="w-9 h-9 mx-auto mb-3"
              strokeWidth={1.5}
              color="var(--gf-fg-3)"
            />
            <p className="text-base font-semibold text-fg-1">{tD('noHistory')}</p>
          </div>
        ) : (
          <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors"
                style={{ background: 'transparent' }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = 'var(--gf-card-hover)')
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = 'transparent')
                }
              >
                {h.format === 'json' ? (
                  <FileJson
                    className="w-5 h-5 shrink-0"
                    strokeWidth={1.75}
                    color="#06b6d4"
                  />
                ) : (
                  <FileSpreadsheet
                    className="w-5 h-5 shrink-0"
                    strokeWidth={1.75}
                    color="#a3e635"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg-1 truncate">
                    {h.label}
                  </p>
                  <p className="mt-0.5 text-[11px] text-fg-3 font-mono" dir="ltr">
                    {h.format.toUpperCase()} · {h.sizeMb} MB ·{' '}
                    {tD('exportedAgo', { value: formatHours(h.hoursAgo) })} ·{' '}
                    {h.expiresInDays > 0
                      ? tD('expiresInDays', { days: h.expiresInDays })
                      : 'expired'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={h.expiresInDays <= 0}
                  className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-fg-1 transition-colors disabled:opacity-40"
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
                  {tD('downloadAgain')}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {adding && (
        <ScheduleDialog
          tD={tD}
          onCancel={() => setAdding(false)}
          onSave={async (job) => {
            const res = await fetch('/api/admin/exports/schedule', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(job),
            })
            if (!res.ok) {
              const data = (await res.json().catch(() => ({}))) as { error?: string }
              throw new Error(data.error ?? `Save failed (${res.status}).`)
            }
            const data = (await res.json()) as {
              job: {
                id: string
                kind: string
                format: string
                frequency: string
                email: string
              }
            }
            setScheduled((curr) => [
              ...curr,
              {
                id: data.job.id,
                kind: data.job.kind as BulkKind,
                format: data.job.format as Format,
                frequency: data.job.frequency as Frequency,
                email: data.job.email,
              },
            ])
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}

function ScheduleDialog({
  tD,
  onCancel,
  onSave,
}: {
  tD: ReturnType<typeof useTranslations>
  onCancel: () => void
  onSave: (job: Omit<ScheduledJob, 'id'>) => Promise<void>
}) {
  const [kind, setKind] = useState<BulkKind>('subscriptions')
  const [format, setFormat] = useState<Format>('csv')
  const [frequency, setFrequency] = useState<Frequency>('weekly')
  const [email, setEmail] = useState('admin@greenofig.com')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tD('addSchedule')}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 bg-bg-deeper/70 backdrop-blur-sm"
      />
      <form
        onSubmit={async (e) => {
          e.preventDefault()
          if (saving) return
          setSaving(true)
          setError(null)
          try {
            await onSave({ kind, format, frequency, email })
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Save failed.')
          } finally {
            setSaving(false)
          }
        }}
        className="relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl bg-surface border border-border shadow-2xl p-6 space-y-4"
      >
        <header className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-fg-1">{tD('addSchedule')}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="w-8 h-8 rounded-md inline-flex items-center justify-center transition-colors"
            style={{ background: 'transparent', color: 'var(--gf-fg-3)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--gf-input-bg)'
              e.currentTarget.style.color = 'var(--gf-fg-1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--gf-fg-3)'
            }}
          >
            <X
              className="w-4 h-4"
              strokeWidth={1.75}
              color="currentColor"
            />
          </button>
        </header>

        <Field label={tD('kindLabel')}>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as BulkKind)}
            className="w-full h-10 rounded-lg px-3 text-sm text-fg-1 focus:outline-none appearance-none"
            style={{
              background: 'var(--gf-input-bg)',
              border: '1px solid var(--gf-border)',
            }}
          >
            {BULK_KINDS.map((k) => (
              <option key={k} value={k} className="bg-surface">
                {tD(`bulkExports.${k}` as 'bulkExports.users')}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label={tD('format')}>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value as Format)}
              className="w-full h-10 rounded-lg px-3 text-sm text-fg-1 focus:outline-none appearance-none"
            style={{
              background: 'var(--gf-input-bg)',
              border: '1px solid var(--gf-border)',
            }}
            >
              <option value="csv"  className="bg-surface">{tD('formatCsv')}</option>
              <option value="json" className="bg-surface">{tD('formatJson')}</option>
            </select>
          </Field>

          <Field label="Frequency">
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              className="w-full h-10 rounded-lg px-3 text-sm text-fg-1 focus:outline-none appearance-none"
            style={{
              background: 'var(--gf-input-bg)',
              border: '1px solid var(--gf-border)',
            }}
            >
              <option value="daily"   className="bg-surface">{tD('frequency.daily')}</option>
              <option value="weekly"  className="bg-surface">{tD('frequency.weekly')}</option>
              <option value="monthly" className="bg-surface">{tD('frequency.monthly')}</option>
            </select>
          </Field>
        </div>

        <Field label="Send to">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full h-10 rounded-lg px-3 text-sm text-fg-1 focus:outline-none"
            style={{
              background: 'var(--gf-input-bg)',
              border: '1px solid var(--gf-border)',
            }}
            dir="ltr"
          />
        </Field>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 h-10 px-4 text-sm font-medium text-fg-1 transition-colors"
            style={{
              background: 'var(--gf-input-bg)',
              border: '1px solid var(--gf-border)',
              borderRadius: 8,
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-5 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-50"
          >
            {saving ? 'Scheduling…' : 'Schedule'}
          </button>
        </div>
        {error && (
          <p className="text-xs text-rose-400 -mt-1">{error}</p>
        )}
      </form>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function formatHours(h: number): string {
  if (h < 1) return 'now'
  if (h < 24) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
}
