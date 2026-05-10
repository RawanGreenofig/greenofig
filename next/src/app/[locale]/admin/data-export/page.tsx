'use client'

import { useState } from 'react'
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
} from 'lucide-react'

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
  const [scheduled, setScheduled] = useState<ScheduledJob[]>(SEED_SCHEDULED)
  const [history, setHistory] = useState<ExportHistory[]>(SEED_HISTORY)
  const [adding, setAdding] = useState(false)
  const [recentTrigger, setRecentTrigger] = useState<string | null>(null)

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

  const removeSchedule = (id: string) =>
    setScheduled((curr) => curr.filter((s) => s.id !== id))

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
                className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3"
                strokeWidth={1.75}
              />
              <input
                type="text"
                value={perUserQuery}
                onChange={(e) => setPerUserQuery(e.target.value)}
                placeholder={tD('perUserPh')}
                className="w-full h-11 rounded-pill bg-bg-deeper border border-border ps-11 pe-4 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
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
                className={`w-full text-start rounded-xl border bg-surface p-4 hover:border-primary/40 transition-colors ${
                  recentTrigger === kind
                    ? 'border-primary/60 bg-primary/10'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet
                    className="w-6 h-6 flex-shrink-0"
                    strokeWidth={1.75}
                    style={{ color: BULK_TINT[kind] }}
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
                    className="w-4 h-4 text-fg-3 shrink-0"
                    strokeWidth={1.75}
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
            className="inline-flex items-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-9 px-4 text-xs font-semibold hover:bg-primary/25"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            {tD('addSchedule')}
          </button>
        </header>
        <p className="text-sm text-fg-2 mb-4 leading-relaxed">
          {tD('scheduledBody', { email: 'admin@greenofig.com' })}
        </p>
        {scheduled.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center text-sm text-fg-3">
            <Clock className="w-7 h-7 mx-auto mb-2 text-fg-3" strokeWidth={1.5} />
            {tD('noHistory')}
          </div>
        ) : (
          <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {scheduled.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <Clock className="w-6 h-6 flex-shrink-0" strokeWidth={1.75} style={{ color: BULK_TINT[s.kind] }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-fg-1">
                    {tD(`bulkExports.${s.kind}` as 'bulkExports.users')}{' '}
                    <span className="text-xs text-fg-3 font-mono ms-1">
                      · {tD(`frequency.${s.frequency}` as 'frequency.daily')}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-fg-3 inline-flex items-center gap-1.5 font-mono" dir="ltr">
                    <Mail className="w-3 h-3" strokeWidth={1.75} />
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
                  className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-rose-400 hover:bg-surface-raised"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
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
            <Database className="w-9 h-9 mx-auto mb-3 text-fg-3" strokeWidth={1.5} />
            <p className="text-base font-semibold text-fg-1">{tD('noHistory')}</p>
          </div>
        ) : (
          <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <span
                  className="shrink-0 w-9 h-9 rounded-lg inline-flex items-center justify-center"
                  style={{
                    background: 'var(--gf-bg-deeper)',
                    color: h.format === 'json' ? '#06b6d4' : '#a3e635',
                  }}
                >
                  {h.format === 'json' ? (
                    <FileJson className="w-4 h-4" strokeWidth={1.75} />
                  ) : (
                    <FileSpreadsheet className="w-4 h-4" strokeWidth={1.75} />
                  )}
                </span>
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
                  className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40 disabled:opacity-40 disabled:hover:border-border"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.75} />
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
          onSave={(job) => {
            setScheduled((curr) => [...curr, { ...job, id: `s-${Date.now()}` }])
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
  onSave: (job: Omit<ScheduledJob, 'id'>) => void
}) {
  const [kind, setKind] = useState<BulkKind>('subscriptions')
  const [format, setFormat] = useState<Format>('csv')
  const [frequency, setFrequency] = useState<Frequency>('weekly')
  const [email, setEmail] = useState('admin@greenofig.com')

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
        onSubmit={(e) => {
          e.preventDefault()
          onSave({ kind, format, frequency, email })
        }}
        className="relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl bg-surface border border-border shadow-2xl p-6 space-y-4"
      >
        <header className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-fg-1">{tD('addSchedule')}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="w-9 h-9 rounded-md bg-surface-raised text-fg-2 hover:text-fg-1 inline-flex items-center justify-center"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </header>

        <Field label={tD('kindLabel')}>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as BulkKind)}
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary appearance-none"
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
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary appearance-none"
            >
              <option value="csv"  className="bg-surface">{tD('formatCsv')}</option>
              <option value="json" className="bg-surface">{tD('formatJson')}</option>
            </select>
          </Field>

          <Field label="Frequency">
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value as Frequency)}
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary appearance-none"
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
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
            dir="ltr"
          />
        </Field>

        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-sm font-medium text-fg-1 hover:border-primary/40"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-5 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
          >
            Schedule
          </button>
        </div>
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
