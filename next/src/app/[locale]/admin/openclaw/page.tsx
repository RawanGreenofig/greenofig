'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Bot,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react'

interface TestResult {
  configured: boolean
  ok: boolean
  status: number
  body: string
}

interface AuditRow {
  id: string
  action: string
  created_at: string
  new_value: { requestedBy?: string; sent?: number; period?: string } | null
}

const COMMANDS: { name: string; sample: string; body: string }[] = [
  {
    name: 'get_at_risk_clients',
    sample: 'Who hasn\'t logged in this week?',
    body: '{ "action": "get_at_risk_clients" }',
  },
  {
    name: 'get_platform_stats',
    sample: 'Snapshot of the platform right now.',
    body: '{ "action": "get_platform_stats" }',
  },
  {
    name: 'get_todays_bookings',
    sample: 'What sessions do I have today?',
    body: '{ "action": "get_todays_bookings" }',
  },
  {
    name: 'get_revenue_summary',
    sample: 'Revenue for the last week / month / year.',
    body: '{ "action": "get_revenue_summary", "params": { "period": "month" } }',
  },
  {
    name: 'send_reminder',
    sample: 'Send an encouraging note to clients.',
    body: '{ "action": "send_reminder", "params": { "targetTiers": ["premium","vip"], "message": "Quick check-in — keep going!" } }',
  },
  {
    name: 'send_broadcast',
    sample: 'Send a notification to ALL users.',
    body: '{ "action": "send_broadcast", "params": { "message": "We just dropped a new recipe pack." } }',
  },
  {
    name: 'toggle_store',
    sample: 'Open or close the storefront.',
    body: '{ "action": "toggle_store", "params": { "enabled": false } }',
  },
  {
    name: 'export_client_data',
    sample: 'Get a downloadable XLSX of every client.',
    body: '{ "action": "export_client_data", "params": { "format": "xlsx" } }',
  },
]

export default function AdminOpenClawPage() {
  const t = useTranslations('admin')
  const [test, setTest] = useState<TestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [recent, setRecent] = useState<AuditRow[]>([])
  const [copied, setCopied] = useState<string | null>(null)
  const webhookUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/api/openclaw/webhook`
      : '/api/openclaw/webhook'

  // Initial probe
  useEffect(() => {
    void runTest()
    void loadRecent()
  }, [])

  const runTest = async () => {
    setTesting(true)
    try {
      const res = await fetch('/api/openclaw/test', { cache: 'no-store' })
      const data = (await res.json()) as TestResult
      setTest(data)
    } catch {
      setTest({ configured: false, ok: false, status: 0, body: 'Network error' })
    } finally {
      setTesting(false)
    }
  }

  const loadRecent = async () => {
    try {
      // Cluster I switches this to a server-rendered loader. For now,
      // server returns 401 if Supabase env is unset — degrade silently.
      const res = await fetch('/api/openclaw/recent', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as { rows: AuditRow[] }
      setRecent(data.rows ?? [])
    } catch {
      /* ignore — empty state will render */
    }
  }

  const copy = (id: string, value: string) => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(id)
      window.setTimeout(() => setCopied(null), 1100)
    })
  }

  const status = test
    ? test.configured && test.ok
      ? 'connected'
      : test.configured
        ? 'misconfigured'
        : 'not-configured'
    : 'unknown'

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight inline-flex items-center gap-3"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            <Bot className="w-7 h-7 text-lime-400" strokeWidth={1.75} />
            {t('openclaw')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">
            Your AI assistant for managing Greenofig via WhatsApp or Telegram.
          </p>
        </div>
      </header>

      {/* Status card */}
      <article
        className={`rounded-xl border p-5 md:p-6 ${
          status === 'connected'
            ? 'border-primary/40 bg-primary/10'
            : status === 'misconfigured'
              ? 'border-rose-500/30 bg-rose-500/5'
              : 'border-amber-500/30 bg-amber-500/5'
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            {status === 'connected' ? (
              <CheckCircle2
                className="w-6 h-6 text-primary flex-shrink-0"
                strokeWidth={1.75}
              />
            ) : (
              <AlertTriangle
                className={`w-6 h-6 flex-shrink-0 ${
                  status === 'misconfigured' ? 'text-rose-500' : 'text-yellow-500'
                }`}
                strokeWidth={1.75}
              />
            )}
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
                Connection
              </p>
              <h2 className="mt-1 font-display text-2xl md:text-3xl font-bold text-fg-1 tracking-tight">
                {status === 'connected'
                  ? 'Connected'
                  : status === 'misconfigured'
                    ? 'Webhook reachable but not configured'
                    : 'Not configured'}
              </h2>
              <p className="mt-1.5 text-sm text-fg-2 max-w-xl leading-relaxed">
                {status === 'connected'
                  ? 'OpenClaw can call the Greenofig API. Test response is shown below.'
                  : status === 'misconfigured'
                    ? `Probe returned HTTP ${test?.status ?? '?'} — the secret may be wrong, or the route is unreachable.`
                    : 'Set OPENCLAW_WEBHOOK_SECRET in this environment to enable the integration.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={runTest}
            disabled={testing}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`}
              strokeWidth={1.75}
            />
            {testing ? 'Testing…' : 'Test connection'}
          </button>
        </div>
        {test?.body && (
          <pre className="mt-4 rounded-lg bg-bg-deeper/60 border border-border p-3 text-[11px] text-fg-2 font-mono overflow-x-auto whitespace-pre-wrap" dir="ltr">
            {test.body}
          </pre>
        )}
      </article>

      {/* Setup + Webhook URL */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <article className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-fg-1 mb-4">Setup steps</h2>
          <ol className="space-y-3 text-sm text-fg-2">
            {[
              ['Install OpenClaw', 'github.com/steipete/openclaw — local laptop or $5 VPS'],
              ['Connect WhatsApp or Telegram', 'Run npm run setup, scan the QR or create a bot'],
              ['Add your Google Gemini API key', 'aistudio.google.com — separate from the one Greenofig uses'],
              ['Add the Greenofig skill', 'See OPENCLAW_SETUP.md for the skill code'],
              ['Set GREENOFIG_URL + GREENOFIG_SECRET in OpenClaw\'s .env', 'Secret must match OPENCLAW_WEBHOOK_SECRET here'],
              ['Tell OpenClaw your daily / weekly automations', '"Every Monday at 8am, check at-risk clients"'],
            ].map(([title, body], i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-lime-400 text-[11px] font-bold inline-flex items-center justify-center mt-0.5"
                  dir="ltr"
                >
                  {i + 1}
                </span>
                <div>
                  <p className="text-fg-1 font-medium">{title}</p>
                  <p className="mt-0.5 text-xs text-fg-3 leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ol>
          <a
            href="https://github.com/steipete/openclaw"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-xs text-lime-400 hover:underline"
          >
            <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
            Full setup guide on GitHub
          </a>
        </article>

        <article className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold text-fg-1 mb-4">Webhook URL</h2>
          <p className="text-sm text-fg-2 leading-relaxed mb-3">
            Configure this URL in OpenClaw&apos;s skill so its commands reach
            Greenofig.
          </p>
          <div className="flex items-stretch gap-2">
            <code
              className="flex-1 rounded-md bg-bg-deeper border border-border px-3 py-2 text-xs font-mono text-fg-1 overflow-x-auto"
              dir="ltr"
            >
              {webhookUrl}
            </code>
            <button
              type="button"
              onClick={() => copy('webhook', webhookUrl)}
              className="inline-flex items-center gap-1 rounded-md bg-surface-raised border border-border h-9 px-3 text-xs font-semibold text-fg-1 hover:border-primary/40"
            >
              {copied === 'webhook' ? (
                <>
                  <Check className="w-3 h-3 text-lime-400" strokeWidth={2.5} />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" strokeWidth={1.75} />
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="mt-4 rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2.5">
            <p className="text-xs text-fg-1 inline-flex items-start gap-2">
              <AlertTriangle
                className="w-3.5 h-3.5 mt-0.5 shrink-0"
                style={{ color: '#e8912a' }}
                strokeWidth={1.75}
              />
              <span>
                Keep your <code className="font-mono text-fg-1">OPENCLAW_WEBHOOK_SECRET</code> private. Anyone holding it can issue commands to Greenofig.
              </span>
            </p>
          </div>
        </article>
      </section>

      {/* Recent OpenClaw actions */}
      <section>
        <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3 inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3" strokeWidth={2} />
          Recent OpenClaw actions
        </h2>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center text-sm text-fg-3">
            No OpenClaw activity yet — actions will show up here once the webhook starts firing.
          </div>
        ) : (
          <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {recent.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 px-5 py-3 text-sm"
              >
                <span
                  className="shrink-0 w-8 h-8 rounded-md inline-flex items-center justify-center bg-primary/15 text-lime-400"
                >
                  <Bot className="w-4 h-4" strokeWidth={1.75} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-fg-1 font-mono text-xs truncate" dir="ltr">
                    {row.action}
                  </p>
                  <p className="text-[11px] text-fg-3 mt-0.5">
                    {row.new_value?.requestedBy ? `requested by ${row.new_value.requestedBy} · ` : ''}
                    {new Date(row.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Available commands */}
      <section>
        <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
          Available commands
        </h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {COMMANDS.map((cmd) => (
            <CommandCard
              key={cmd.name}
              t={cmd}
              copied={copied === cmd.name}
              onCopy={() => copy(cmd.name, cmd.body)}
              Icon={Bot}
            />
          ))}
        </ul>
      </section>
    </div>
  )
}

function CommandCard({
  t,
  copied,
  onCopy,
  Icon,
}: {
  t: { name: string; sample: string; body: string }
  copied: boolean
  onCopy: () => void
  Icon: LucideIcon
}) {
  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="shrink-0 w-9 h-9 rounded-lg inline-flex items-center justify-center bg-primary/15 text-lime-400">
          <Icon className="w-4 h-4" strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono text-fg-1" dir="ltr">
            {t.name}
          </p>
          <p className="mt-0.5 text-xs text-fg-3 leading-relaxed">{t.sample}</p>
        </div>
        <button
          type="button"
          onClick={onCopy}
          aria-label="Copy"
          className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1 hover:bg-surface-raised"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-lime-400" strokeWidth={2.5} />
          ) : (
            <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
          )}
        </button>
      </div>
    </li>
  )
}
