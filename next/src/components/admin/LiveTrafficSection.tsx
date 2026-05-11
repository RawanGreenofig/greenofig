'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  Eye,
  Globe,
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  Wifi,
  type LucideIcon,
} from '@/icons'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface GaSummary {
  activeUsersNow: number
  usersByCountry: { country: string; users: number }[]
  usersByDevice: { device: string; users: number }[]
  topPages: { path: string; views: number }[]
  daily: { date: string; users: number; views: number }[]
  totals: { users30d: number; views30d: number; sessions30d: number }
}

interface GaDiagnostic {
  propertyIdSet: boolean
  jsonSet: boolean
  jsonParsedOk: boolean
  hasClientEmail: boolean
  clientEmailDomain: string | null
  hasPrivateKey: boolean
  privateKeyLooksLikePem: boolean
  privateKeyLength: number
  privateKeyHasRealNewlines: boolean
  privateKeyNewlineCount: number
  privateKeyHeader: string
  parseError: string | null
}

interface GaResponse {
  configured: boolean
  data?: GaSummary
  error?: string
  reason?: string
  code?: number | string
  details?: string
  status?: string
  diagnostic?: GaDiagnostic
}

const DEVICE_ICON: Record<string, LucideIcon> = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
}

/**
 * Live website traffic from GA4 Data API. Hits
 * /api/admin/analytics/google which proxies the GA Data API server-side
 * (service account creds never leave the server). Real-time count
 * polls every 30s; rest of the data refreshes when you click "Refresh".
 */
export function LiveTrafficSection() {
  const [resp, setResp] = useState<GaResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await fetch('/api/admin/analytics/google', { cache: 'no-store' })
      const j = (await r.json()) as GaResponse
      setResp(j)
      if (j.error) setError(j.error)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // Light real-time refresh every 30s (only the active-users number)
    const id = window.setInterval(() => {
      void load()
    }, 30_000)
    return () => window.clearInterval(id)
  }, [])

  if (!resp && loading) {
    return (
      <section className="rounded-xl border border-border bg-surface p-6">
        <p className="text-sm text-fg-3">Loading Google Analytics…</p>
      </section>
    )
  }

  if (resp && !resp.configured) {
    return <NotConfiguredCard reason={resp.reason} />
  }

  const data = resp?.data
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-eyebrow font-semibold text-lime-400">
            Live · Google Analytics
          </p>
          <h2 className="mt-1 text-base font-semibold text-fg-1">
            Website traffic
          </h2>
          <p className="text-xs text-fg-3 mt-0.5">
            Real-time active users plus 30-day rollups from greenofig.com.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-fg-1 rounded-lg border border-border hover:border-lime-400/40 transition-colors disabled:opacity-50"
          style={{ background: 'var(--gf-input-bg)' }}
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
            strokeWidth={1.75}
            color="var(--gf-fg-3)"
          />
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </header>

      {(error || resp?.error) && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/5 px-4 py-3 text-xs text-rose-300 space-y-2">
          <p className="font-semibold">GA Data API error</p>
          <p className="font-mono break-all">{resp?.error ?? error}</p>
          {resp?.diagnostic && (
            <CredentialDiagnosticBlock d={resp.diagnostic} />
          )}
          {(resp?.code !== undefined || resp?.status || resp?.details) && (
            <details className="opacity-80">
              <summary className="cursor-pointer">Raw error payload</summary>
              <pre className="mt-2 whitespace-pre-wrap text-[10px] leading-snug max-h-64 overflow-auto">
                {JSON.stringify(
                  {
                    code: resp?.code,
                    status: resp?.status,
                    details: resp?.details ? safeParse(resp.details) : null,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          )}
          <p className="text-fg-3 pt-1 border-t border-rose-500/20">
            If diagnostic above shows <code>privateKeyLooksLikePem: false</code>,
            the key was pasted with damage — re-paste the JSON file as-is.
            If <code>code: 403</code>, the service account isn&apos;t a Viewer
            on this GA property. If <code>code: 401</code>, the key signature
            is invalid — usually a corrupt private key.
          </p>
        </div>
      )}

      {data && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <LiveKpi
              Icon={Wifi}
              label="Active right now"
              value={data.activeUsersNow}
              tint="#a3e635"
              live
            />
            <LiveKpi
              Icon={Activity}
              label="Users (30d)"
              value={data.totals.users30d}
              tint="#06b6d4"
            />
            <LiveKpi
              Icon={Eye}
              label="Page views (30d)"
              value={data.totals.views30d}
              tint="#a855f7"
            />
            <LiveKpi
              Icon={Globe}
              label="Sessions (30d)"
              value={data.totals.sessions30d}
              tint="#e8912a"
            />
          </div>

          {/* Daily timeseries */}
          <article className="rounded-xl border border-border bg-surface p-5">
            <header className="mb-3">
              <h3 className="text-sm font-semibold text-fg-1">
                Users · last 30 days
              </h3>
            </header>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.daily} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="liveTrafficUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a3e635" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#a3e635" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgb(255 255 255 / 0.05)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} minTickGap={32} />
                  <YAxis stroke="#5c7262" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={28} />
                  <Tooltip
                    contentStyle={{ background: 'var(--gf-card-hover)', border: '1px solid rgb(255 255 255 / 0.08)', borderRadius: 8, fontSize: 11, color: 'var(--gf-fg-1)' }}
                    labelStyle={{ color: '#9baf9f' }}
                  />
                  <Area type="monotone" dataKey="users" stroke="#a3e635" strokeWidth={2} fill="url(#liveTrafficUsers)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          {/* 3-col detail */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Panel title="Top pages (30d)">
              {data.topPages.length === 0 ? (
                <EmptyRow />
              ) : (
                <ul className="space-y-2">
                  {data.topPages.map((p) => (
                    <li key={p.path} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-fg-1 truncate" title={p.path}>
                        {p.path || '/'}
                      </span>
                      <span className="font-mono text-[11px] text-fg-3 shrink-0" dir="ltr">
                        {p.views.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Top countries (30d)">
              {data.usersByCountry.length === 0 ? (
                <EmptyRow />
              ) : (
                <ul className="space-y-2">
                  {data.usersByCountry.map((c) => (
                    <li key={c.country} className="flex items-center justify-between gap-3">
                      <span className="text-xs text-fg-1 truncate">{c.country}</span>
                      <span className="font-mono text-[11px] text-fg-3 shrink-0" dir="ltr">
                        {c.users.toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Devices (30d)">
              {data.usersByDevice.length === 0 ? (
                <EmptyRow />
              ) : (
                <ul className="space-y-2.5">
                  {data.usersByDevice.map((d) => {
                    const total = data.usersByDevice.reduce((a, b) => a + b.users, 0) || 1
                    const pct = Math.round((d.users / total) * 100)
                    const Icon = DEVICE_ICON[d.device.toLowerCase()] ?? Monitor
                    return (
                      <li key={d.device}>
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <span className="inline-flex items-center gap-1.5 text-xs text-fg-1">
                            <Icon className="w-3 h-3" strokeWidth={1.75} color="var(--gf-fg-2)" />
                            <span className="capitalize">{d.device}</span>
                          </span>
                          <span className="font-mono text-[11px] text-fg-3" dir="ltr">
                            {d.users.toLocaleString()} · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-pill bg-bg-deeper overflow-hidden">
                          <div
                            className="h-full rounded-pill bg-lime-400"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>
          </div>
        </>
      )}
    </section>
  )
}

function LiveKpi({
  Icon,
  label,
  value,
  tint,
  live,
}: {
  Icon: LucideIcon
  label: string
  value: number
  tint: string
  live?: boolean
}) {
  return (
    <article
      className="rounded-xl border border-border bg-surface p-4 relative overflow-hidden"
      style={{
        boxShadow: '0 1px 0 rgba(255,255,255,0.03) inset, 0 6px 18px rgba(0,0,0,0.18)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-md flex items-center justify-center"
          style={{ background: `${tint}22` }}
        >
          <Icon className="w-3.5 h-3.5" strokeWidth={2} color={tint} />
        </div>
        <p className="text-[10px] uppercase tracking-eyebrow font-semibold text-fg-3">
          {label}
        </p>
        {live && (
          <span
            aria-hidden
            className="ml-auto inline-flex items-center gap-1 text-[9px] uppercase tracking-eyebrow font-bold"
            style={{ color: tint }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: tint }} />
            Live
          </span>
        )}
      </div>
      <p className="font-mono text-2xl font-bold text-fg-1" dir="ltr">
        {value.toLocaleString()}
      </p>
    </article>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <header className="mb-3">
        <h3 className="text-sm font-semibold text-fg-1">{title}</h3>
      </header>
      {children}
    </article>
  )
}

function EmptyRow() {
  return <p className="text-xs text-fg-3">No data yet.</p>
}

function safeParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return s
  }
}

function CredentialDiagnosticBlock({ d }: { d: GaDiagnostic }) {
  // Rows are tagged ok / warn / fail so the user can scan the column
  // and immediately see what's broken.
  const rows: { label: string; ok: boolean; value: string }[] = [
    { label: 'GA_PROPERTY_ID set', ok: d.propertyIdSet, value: d.propertyIdSet ? 'yes' : 'NO' },
    { label: 'GA_SERVICE_ACCOUNT_JSON set', ok: d.jsonSet, value: d.jsonSet ? 'yes' : 'NO' },
    { label: 'JSON parsed', ok: d.jsonParsedOk, value: d.jsonParsedOk ? 'yes' : 'NO' },
    { label: 'client_email present', ok: d.hasClientEmail, value: d.clientEmailDomain ? `@${d.clientEmailDomain}` : 'NO' },
    { label: 'private_key present', ok: d.hasPrivateKey, value: d.hasPrivateKey ? `${d.privateKeyLength} chars` : 'NO' },
    { label: 'key has real newlines', ok: d.privateKeyHasRealNewlines, value: d.privateKeyHasRealNewlines ? 'yes' : 'NO' },
    {
      label: 'key newline count',
      ok: d.privateKeyNewlineCount >= 20,
      value: `${d.privateKeyNewlineCount}${d.privateKeyNewlineCount >= 20 ? '' : ' (expect ~28 for RSA 2048)'}`,
    },
    { label: 'key looks like PEM', ok: d.privateKeyLooksLikePem, value: d.privateKeyLooksLikePem ? 'yes' : 'NO' },
  ]
  return (
    <details className="opacity-90" open>
      <summary className="cursor-pointer font-semibold">Credential diagnostic</summary>
      <ul className="mt-2 space-y-1 font-mono text-[11px]">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center gap-2">
            <span style={{ color: r.ok ? '#a3e635' : '#fb7185' }}>
              {r.ok ? '✓' : '✗'}
            </span>
            <span className="text-fg-2 flex-1">{r.label}</span>
            <span className={r.ok ? 'text-fg-2' : 'text-rose-300'}>{r.value}</span>
          </li>
        ))}
        {d.privateKeyHeader && (
          <li className="pt-1 text-fg-3">
            key header: <code className="text-fg-2">{d.privateKeyHeader}…</code>
          </li>
        )}
        {d.parseError && (
          <li className="pt-1 text-rose-300">parse error: {d.parseError}</li>
        )}
      </ul>
    </details>
  )
}

function NotConfiguredCard({ reason }: { reason?: string }) {
  return (
    <section
      className="rounded-xl p-6 md:p-8 space-y-5"
      style={{
        background:
          'linear-gradient(135deg, rgba(245,158,11,0.06) 0%, var(--gf-surface) 55%)',
        border: '1px solid rgba(245,158,11,0.35)',
      }}
    >
      <header className="flex items-start gap-4">
        <div
          className="w-10 h-10 rounded-md flex items-center justify-center shrink-0"
          style={{ background: 'rgba(245,158,11,0.16)' }}
        >
          <Globe className="w-5 h-5" strokeWidth={1.75} color="#f59e0b" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-eyebrow font-semibold text-amber">
            Setup required
          </p>
          <h2 className="mt-1 text-base font-semibold text-fg-1">
            Connect Google Analytics
          </h2>
          <p className="mt-1 text-sm text-fg-2 max-w-2xl">
            Wire up the GA4 Data API to see real-time visitors, top pages,
            countries, and devices for greenofig.com right here.
          </p>
          {reason && (
            <p className="mt-3 inline-block rounded-md bg-amber/10 border border-amber/30 px-3 py-1.5 text-[11px] text-amber font-mono">
              {reason}
            </p>
          )}
        </div>
      </header>

      <ol className="space-y-3 text-sm text-fg-2 list-decimal list-inside">
        <li>
          In <strong className="text-fg-1">Google Cloud Console</strong>, enable
          the <em>Google Analytics Data API</em> for your project.
        </li>
        <li>
          Create a <strong className="text-fg-1">Service Account</strong>,
          download its JSON key (Keys → Add Key → Create new key → JSON).
        </li>
        <li>
          In <strong className="text-fg-1">Google Analytics</strong> →
          Admin → Property Access Management, add the service account email
          (looks like <code className="text-[11px] font-mono text-lime-400">…@…iam.gserviceaccount.com</code>)
          with <strong className="text-fg-1">Viewer</strong> permission.
        </li>
        <li>
          Add two env vars in Vercel:
          <ul className="mt-2 ml-5 space-y-1 list-disc">
            <li>
              <code className="text-[11px] font-mono text-lime-400">GA_PROPERTY_ID</code>
              <span className="text-fg-3"> — the numeric GA4 property id (e.g. 412345678)</span>
            </li>
            <li>
              <code className="text-[11px] font-mono text-lime-400">GA_SERVICE_ACCOUNT_JSON</code>
              <span className="text-fg-3"> — the full JSON key file pasted as a single string</span>
            </li>
          </ul>
        </li>
        <li>Redeploy. This panel will light up automatically.</li>
      </ol>
    </section>
  )
}
