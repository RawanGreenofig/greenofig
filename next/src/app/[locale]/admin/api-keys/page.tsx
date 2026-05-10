'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  Search,
  Plus,
  Key,
  KeyRound,
  Eye,
  EyeOff,
  Copy,
  Check,
  RotateCcw,
  XCircle,
  AlertTriangle,
  X,
} from '@/icons'

type Provider =
  | 'stripe'
  | 'gemini'
  | 'openai'
  | 'n8n'
  | 'sendgrid'
  | 'twilio'
  | 'supabase_service'

interface ApiKey {
  id: string
  name: string
  provider: Provider
  /** masked secret (we never store the actual secret in the UI) */
  masked: string
  active: boolean
  addedISO: string
  lastUsedHoursAgo: number | null
}

const PROVIDER_TINT: Record<Provider, string> = {
  stripe:           '#a3e635',
  gemini:           '#06b6d4',
  openai:           '#a855f7',
  n8n:              '#e8912a',
  sendgrid:         '#06b6d4',
  twilio:           '#f43f5e',
  supabase_service: '#84cc16',
}

const PROVIDERS: Provider[] = [
  'stripe', 'gemini', 'openai', 'n8n', 'sendgrid', 'twilio', 'supabase_service',
]

const SEED: ApiKey[] = [
  { id: 'k1', name: 'Stripe Live (production)',  provider: 'stripe',           masked: 'sk_live_•••••••••••••••••••8a4z', active: true,  addedISO: '2026-02-12', lastUsedHoursAgo: 2 },
  { id: 'k2', name: 'Stripe Restricted (read)',  provider: 'stripe',           masked: 'rk_live_•••••••••••••••••••2k1m', active: true,  addedISO: '2026-02-12', lastUsedHoursAgo: 18 },
  { id: 'k3', name: 'Gemini API',                provider: 'gemini',           masked: 'AIza•••••••••••••••••••••••XPq8', active: true,  addedISO: '2026-03-01', lastUsedHoursAgo: 0 },
  { id: 'k4', name: 'OpenAI fallback',            provider: 'openai',           masked: 'sk-proj-•••••••••••••••••••••pQk', active: true,  addedISO: '2026-03-22', lastUsedHoursAgo: 6 },
  { id: 'k5', name: 'n8n webhook signing',        provider: 'n8n',              masked: '•••••••••••••••••••••••••e9bA', active: true,  addedISO: '2026-04-04', lastUsedHoursAgo: 14 },
  { id: 'k6', name: 'SendGrid (transactional)',   provider: 'sendgrid',         masked: 'SG.••••••••••••••••••••••••.gXy', active: true,  addedISO: '2026-01-15', lastUsedHoursAgo: 4 },
  { id: 'k7', name: 'Supabase service role',      provider: 'supabase_service', masked: 'eyJh•••••••••••••••••••••••P3Wq', active: true,  addedISO: '2025-09-08', lastUsedHoursAgo: 1 },
  { id: 'k8', name: 'Twilio SMS (paused)',        provider: 'twilio',           masked: 'AC••••••••••••••••••••••••8d1b', active: false, addedISO: '2025-11-22', lastUsedHoursAgo: null },
]

export default function AdminApiKeysPage() {
  const t = useTranslations('admin')
  const tA = useTranslations('admin.apiKeysPage')

  const [keys, setKeys] = useState<ApiKey[]>(SEED)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      type Row = {
        id: string
        name: string
        provider: string
        key_encrypted: string
        active: boolean | null
        last_used_at: string | null
        created_at: string
      }
      const { data: rows } = await supabase
        .from('api_keys')
        .select('id, name, provider, key_encrypted, active, last_used_at, created_at')
        .order('created_at', { ascending: false })
      const list = (rows as Row[] | null) ?? []
      if (cancelled || list.length === 0) return

      const allowed: Provider[] = PROVIDERS
      const tail = (s: string) => (s.length >= 4 ? s.slice(-4) : s)
      const now = Date.now()
      const hoursSince = (iso: string | null) =>
        iso ? Math.max(0, Math.round((now - new Date(iso).getTime()) / 3_600_000)) : null

      const mapped: ApiKey[] = list.map((r) => ({
        id: r.id,
        name: r.name,
        provider: (allowed as string[]).includes(r.provider) ? (r.provider as Provider) : 'stripe',
        masked: `••••••••••••••••••••••${tail(r.key_encrypted ?? 'xxxx')}`,
        active: r.active ?? true,
        addedISO: r.created_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        lastUsedHoursAgo: hoursSince(r.last_used_at),
      }))
      if (!cancelled) setKeys(mapped)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const [query, setQuery] = useState('')
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState<string | null>(null)
  const [tested, setTested] = useState<{ id: string; ok: boolean } | null>(null)
  const [confirm, setConfirm] = useState<null | { id: string; action: 'rotate' | 'revoke' }>(null)
  const [adding, setAdding] = useState(false)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return keys.filter((k) => {
      if (filter === 'active' && !k.active) return false
      if (filter === 'inactive' && k.active) return false
      if (q && !k.name.toLowerCase().includes(q) && !k.provider.toLowerCase().includes(q)) return false
      return true
    })
  }, [keys, filter, query])

  const toggleReveal = (id: string) => {
    setRevealed((curr) => {
      const next = new Set(curr)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const copyKey = async (id: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(id)
      window.setTimeout(() => setCopied(null), 1100)
    } catch {
      // ignore — Cluster H wires real testing
    }
  }

  const testKey = (id: string) => {
    // Wired to /api/api-keys/test in Cluster H
    setTested({ id, ok: Math.random() > 0.15 })
    window.setTimeout(() => setTested(null), 2000)
  }

  const applyAction = () => {
    if (!confirm) return
    const id = confirm.id
    if (confirm.action === 'rotate') {
      setKeys((curr) =>
        curr.map((k) =>
          k.id === id
            ? { ...k, masked: maskedRotate(k.masked), addedISO: new Date().toISOString().slice(0, 10) }
            : k,
        ),
      )
    } else {
      setKeys((curr) => curr.filter((k) => k.id !== id))
      const supabase = getBrowserSupabase()
      if (supabase && /^[0-9a-f-]{32,}$/i.test(id)) {
        void supabase.from('api_keys').update({ active: false } as never).eq('id', id)
      }
    }
    setConfirm(null)
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {t('apiKeys')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{tA('subtitle')}</p>
          <p className="mt-2 text-xs text-fg-3 inline-flex items-center gap-1.5">
            <Key className="w-3 h-3" strokeWidth={2} />
            {tA('totalKeys', { count: keys.length })}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
          {tA('addKey')}
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tA('search')}
            className="w-full h-11 rounded-pill bg-surface border border-border ps-11 pe-4 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
          />
        </div>
        <div className="inline-flex items-center gap-0.5 rounded-pill bg-bg-deeper border border-border p-0.5">
          {(['all', 'active', 'inactive'] as const).map((f) => (
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
              {f === 'all' ? tA('filterAll') : f === 'active' ? tA('filterActive') : tA('filterInactive')}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <KeyRound className="w-9 h-9 mx-auto mb-3 text-fg-3" strokeWidth={1.5} />
          <p className="text-base font-semibold text-fg-1">{tA('noKeys')}</p>
          <p className="mt-1 text-sm text-fg-2">{tA('noKeysBody')}</p>
        </div>
      ) : (
        <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
          {visible.map((k) => (
            <KeyRow
              key={k.id}
              tA={tA}
              apiKey={k}
              revealed={revealed.has(k.id)}
              copied={copied === k.id}
              tested={tested && tested.id === k.id ? tested.ok : null}
              onToggleReveal={() => toggleReveal(k.id)}
              onCopy={() => copyKey(k.id, k.masked)}
              onTest={() => testKey(k.id)}
              onRotate={() => setConfirm({ id: k.id, action: 'rotate' })}
              onRevoke={() => setConfirm({ id: k.id, action: 'revoke' })}
            />
          ))}
        </ul>
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.action === 'rotate' ? tA('rotateConfirm') : tA('revokeConfirm')}
          body={confirm.action === 'rotate' ? tA('rotateBody') : tA('revokeBody')}
          confirmLabel={confirm.action === 'rotate' ? tA('yesRotate') : tA('yesRevoke')}
          cancelLabel={tA('addForm.cancel')}
          tone={confirm.action === 'rotate' ? 'warn' : 'danger'}
          onCancel={() => setConfirm(null)}
          onConfirm={applyAction}
        />
      )}

      {adding && (
        <AddKeyDialog
          tA={tA}
          onCancel={() => setAdding(false)}
          onSave={(name, provider) => {
            setKeys((curr) => [
              {
                id: `k-${Date.now()}`,
                name,
                provider,
                masked: '•••••••••••••••••••••••••new',
                active: true,
                addedISO: new Date().toISOString().slice(0, 10),
                lastUsedHoursAgo: null,
              },
              ...curr,
            ])
            setAdding(false)
          }}
        />
      )}
    </div>
  )
}

/* ── Row ────────────────────────────────────────────────────────── */

function KeyRow({
  tA,
  apiKey,
  revealed,
  copied,
  tested,
  onToggleReveal,
  onCopy,
  onTest,
  onRotate,
  onRevoke,
}: {
  tA: ReturnType<typeof useTranslations>
  apiKey: ApiKey
  revealed: boolean
  copied: boolean
  tested: boolean | null
  onToggleReveal: () => void
  onCopy: () => void
  onTest: () => void
  onRotate: () => void
  onRevoke: () => void
}) {
  const tint = PROVIDER_TINT[apiKey.provider]
  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3 hover:bg-surface-raised transition-colors">
      <Key className="w-6 h-6 flex-shrink-0" strokeWidth={1.75} style={{ color: tint }} />
      <div className="flex-1 min-w-[200px]">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-sm font-semibold text-fg-1">{apiKey.name}</p>
          <span
            className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
            style={{ background: `${tint}1a`, color: tint }}
          >
            {tA(`providers.${apiKey.provider}` as 'providers.stripe')}
          </span>
          {!apiKey.active && (
            <span
              className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
              style={{ background: 'rgb(155 175 159 / 0.14)', color: '#9baf9f' }}
            >
              {tA('inactive')}
            </span>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <code className="text-xs text-fg-3 font-mono select-all" dir="ltr">
            {revealed ? apiKey.masked.replace(/•/g, 'x') : apiKey.masked}
          </code>
          <button
            type="button"
            onClick={onToggleReveal}
            aria-label={revealed ? tA('hide') : tA('reveal')}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1 hover:bg-surface"
          >
            {revealed ? (
              <EyeOff className="w-3 h-3" strokeWidth={1.75} />
            ) : (
              <Eye className="w-3 h-3" strokeWidth={1.75} />
            )}
          </button>
          <button
            type="button"
            onClick={onCopy}
            aria-label={copied ? tA('copied') : tA('copy')}
            className="w-6 h-6 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1 hover:bg-surface"
          >
            {copied ? (
              <Check className="w-3 h-3 text-lime-400" strokeWidth={2.5} />
            ) : (
              <Copy className="w-3 h-3" strokeWidth={1.75} />
            )}
          </button>
        </div>
        <p className="mt-1 text-[10px] text-fg-3 font-mono" dir="ltr">
          {apiKey.lastUsedHoursAgo == null
            ? tA('lastUsedNever')
            : tA('lastUsedAgo', { value: formatHours(apiKey.lastUsedHoursAgo) })}
          {' · added '}
          {new Date(apiKey.addedISO).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onTest}
          className={`inline-flex items-center gap-1 rounded-md h-8 px-2.5 text-[11px] font-semibold transition-colors ${
            tested === true
              ? 'bg-primary/20 text-lime-400'
              : tested === false
                ? 'bg-rose-500/15 text-rose-400'
                : 'bg-surface-raised border border-border text-fg-1 hover:border-primary/40'
          }`}
        >
          {tested === true ? (
            <>
              <Check className="w-3 h-3" strokeWidth={2.5} />
              {tA('testResult.ok')}
            </>
          ) : tested === false ? (
            <>
              <XCircle className="w-3 h-3" strokeWidth={2} />
              {tA('testResult.fail')}
            </>
          ) : (
            tA('test')
          )}
        </button>
        <button
          type="button"
          onClick={onRotate}
          aria-label={tA('rotate')}
          className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-amber-400 hover:bg-surface-raised"
          style={{ color: '#e8912a' }}
        >
          <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={onRevoke}
          aria-label={tA('revoke')}
          className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-rose-400 hover:bg-surface-raised"
        >
          <XCircle className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </li>
  )
}

/* ── Add dialog ─────────────────────────────────────────────────── */

function AddKeyDialog({
  tA,
  onCancel,
  onSave,
}: {
  tA: ReturnType<typeof useTranslations>
  onCancel: () => void
  onSave: (name: string, provider: Provider) => void
}) {
  const [name, setName] = useState('')
  const [provider, setProvider] = useState<Provider>('stripe')
  const [value, setValue] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !value.trim()) return
    onSave(name.trim(), provider)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={tA('addForm.title')}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 bg-bg-deeper/70 backdrop-blur-sm"
      />
      <form
        onSubmit={submit}
        className="relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl bg-surface border border-border shadow-2xl p-6 space-y-4"
      >
        <header className="flex items-center justify-between gap-3">
          <h3 className="text-base font-semibold text-fg-1">{tA('addForm.title')}</h3>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="w-9 h-9 rounded-md bg-surface-raised text-fg-2 hover:text-fg-1 inline-flex items-center justify-center"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </header>
        <Field label={tA('addForm.name')}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={tA('addForm.namePh')}
            autoFocus
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
          />
        </Field>
        <Field label={tA('addForm.provider')}>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value as Provider)}
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary appearance-none"
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p} className="bg-surface">
                {tA(`providers.${p}` as 'providers.stripe')}
              </option>
            ))}
          </select>
        </Field>
        <Field label={tA('addForm.value')}>
          <input
            type="password"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={tA('addForm.valuePh')}
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
            dir="ltr"
          />
        </Field>
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-sm font-medium text-fg-1 hover:border-primary/40"
          >
            {tA('addForm.cancel')}
          </button>
          <button
            type="submit"
            disabled={!name.trim() || !value.trim()}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-5 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-40"
          >
            {tA('addForm.save')}
          </button>
        </div>
      </form>
    </div>
  )
}

/* ── Reusables ──────────────────────────────────────────────────── */

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

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  confirmLabel: string
  cancelLabel: string
  tone: 'warn' | 'danger'
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onCancel}
        className="absolute inset-0 bg-bg-deeper/70 backdrop-blur-sm"
      />
      <div className="relative w-full md:max-w-md rounded-t-2xl md:rounded-2xl bg-surface border border-border shadow-2xl p-6">
        <h3 className="text-base font-semibold text-fg-1 inline-flex items-center gap-2">
          <AlertTriangle
            className={`w-4 h-4 ${tone === 'danger' ? 'text-rose-400' : ''}`}
            strokeWidth={1.75}
            style={tone === 'warn' ? { color: '#e8912a' } : undefined}
          />
          {title}
        </h3>
        <p className="mt-2 text-sm text-fg-2 leading-relaxed">{body}</p>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-sm font-medium text-fg-1 hover:border-primary/40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex items-center gap-1.5 rounded-pill h-10 px-5 text-sm font-semibold transition-colors ${
              tone === 'danger'
                ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                : 'bg-amber-500/20 hover:bg-amber-500/30'
            }`}
            style={tone === 'warn' ? { color: '#e8912a' } : undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

function maskedRotate(masked: string): string {
  const tail = Math.random().toString(36).slice(2, 6)
  return masked.replace(/.{4}$/, tail)
}

function formatHours(h: number): string {
  if (h < 1) return 'now'
  if (h < 24) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
}
