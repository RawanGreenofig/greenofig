'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Gift,
  Send,
  Copy,
  Check,
  Trash2,
  Sparkles,
} from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

type DiscountType = 'percent' | 'fixed'
type Tier = 'free' | 'basic' | 'premium' | 'vip'
type Target = 'client' | 'tier'

interface ClientOption {
  id: string
  name: string
  tier: Tier
}

interface CouponRow {
  id: string
  code: string
  type: DiscountType
  value: number
  max_uses: number | null
  times_used: number
  valid_until: string | null
  is_active: boolean
  sent_to_user_id: string | null
  sent_to_tier: Tier | null
  created_at: string
}

const TIERS: Tier[] = ['basic', 'premium', 'vip']

function todayPlus(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function randomCode(value: number): string {
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `RAWAN-${Math.round(value)}-${suffix}`
}

export function SendDiscountSection() {
  const t = useTranslations('nutritionist')

  const [target, setTarget] = useState<Target>('client')
  const [clientId, setClientId] = useState<string>('')
  const [tier, setTier] = useState<Tier>('basic')
  const [type, setType] = useState<DiscountType>('percent')
  const [value, setValue] = useState<number>(20)
  const [noMin, setNoMin] = useState<boolean>(true)
  const [minOrder, setMinOrder] = useState<number>(0)
  const [validUntil, setValidUntil] = useState<string>(todayPlus(30))
  const [unlimitedUses, setUnlimitedUses] = useState<boolean>(false)
  const [maxUses, setMaxUses] = useState<number>(1)
  const [note, setNote] = useState<string>('')
  const [code, setCode] = useState<string>(randomCode(20))
  const [pending, setPending] = useState<boolean>(false)
  const [flash, setFlash] = useState<string | null>(null)

  const [clients, setClients] = useState<ClientOption[]>([])
  const [coupons, setCoupons] = useState<CouponRow[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Load clients + own coupons
  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, tier')
        .eq('role', 'user')
        .order('full_name', { ascending: true })
        .limit(200)
      if (cancelled) return
      type ProfileRow = { id: string; full_name: string | null; tier: Tier }
      const list: ClientOption[] = ((profilesData as ProfileRow[] | null) ?? []).map(
        (p) => ({ id: p.id, name: p.full_name ?? 'Unnamed user', tier: p.tier }),
      )
      setClients(list)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: couponsData } = await supabase
        .from('coupons')
        .select(
          'id, code, type, value, max_uses, times_used, valid_until, is_active, sent_to_user_id, sent_to_tier, created_at',
        )
        .eq('created_by', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      if (!cancelled) setCoupons((couponsData as CouponRow[] | null) ?? [])
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const clientById = useMemo(
    () => new Map(clients.map((c) => [c.id, c])),
    [clients],
  )

  const handleGenerate = () => setCode(randomCode(value))

  const handleSubmit = async () => {
    if (target === 'client' && !clientId) {
      setFlash('Please select a client')
      return
    }
    if (!code || value <= 0) {
      setFlash('Please enter a code and a value')
      return
    }
    setPending(true)
    setFlash(null)
    try {
      const res = await fetch('/api/coupons/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          type,
          value,
          minOrderCents: noMin ? 0 : Math.round(minOrder * 100),
          maxUses: unlimitedUses ? null : maxUses,
          validUntil: new Date(validUntil + 'T23:59:59Z').toISOString(),
          sentToUserId: target === 'client' ? clientId : null,
          sentToTier: target === 'tier' ? tier : null,
          personalNote: note.trim() || null,
        }),
      })
      const payload = (await res.json()) as {
        success?: boolean
        message?: string
        error?: { message?: string } | string
        coupon?: { id: string; code: string }
      }
      if (!res.ok) {
        const msg =
          typeof payload.error === 'string'
            ? payload.error
            : payload.error?.message ?? 'Failed to create discount.'
        setFlash(msg)
        setPending(false)
        return
      }
      setFlash(
        `✅ ${payload.message ?? `Discount code ${code} created`}` +
          (target === 'client' && clientId
            ? ` — ${clientById.get(clientId)?.name ?? ''}`
            : ''),
      )
      // Reset form (keep targeting + value) and refresh list
      setNote('')
      setCode(randomCode(value))
      const supabase = getBrowserSupabase()
      if (supabase) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          const { data } = await supabase
            .from('coupons')
            .select(
              'id, code, type, value, max_uses, times_used, valid_until, is_active, sent_to_user_id, sent_to_tier, created_at',
            )
            .eq('created_by', user.id)
            .order('created_at', { ascending: false })
            .limit(50)
          setCoupons((data as CouponRow[] | null) ?? [])
        }
      }
    } catch {
      setFlash('Network error. Please try again.')
    } finally {
      setPending(false)
    }
  }

  const handleDeactivate = async (id: string) => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    setCoupons((curr) =>
      curr.map((c) => (c.id === id ? { ...c, is_active: false } : c)),
    )
    await supabase
      .from('coupons')
      .update({ is_active: false } as never)
      .eq('id', id)
  }

  const copyCode = async (id: string, codeText: string) => {
    try {
      await navigator.clipboard.writeText(codeText)
      setCopiedId(id)
      window.setTimeout(() => setCopiedId(null), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="mt-10">
      <header className="mb-4 flex items-center gap-2">
        <Gift className="w-5 h-5 text-lime-400" strokeWidth={1.75} />
        <h2 className="font-display font-bold text-fg-1 text-xl">
          {t('sendDiscount')}
        </h2>
      </header>

      {/* Form card */}
      <article className="rounded-xl border border-border bg-surface p-5 md:p-6 space-y-5">
        <p className="text-sm text-fg-2">{t('createPromoCode')}</p>

        {/* Target: specific client OR tier */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t('orSendToTier')}>
            <div className="flex flex-wrap gap-2">
              <Radio
                checked={target === 'client'}
                onChange={() => setTarget('client')}
                label={t('specificClient')}
              />
              {TIERS.map((tr) => (
                <Radio
                  key={tr}
                  checked={target === 'tier' && tier === tr}
                  onChange={() => {
                    setTarget('tier')
                    setTier(tr)
                  }}
                  label={
                    tr === 'basic' ? 'Basic' : tr === 'premium' ? 'Premium' : 'VIP'
                  }
                />
              ))}
            </div>
          </Field>

          {target === 'client' && (
            <Field label={t('selectClient')}>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary appearance-none"
              >
                <option value="">{t('selectClient')}</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id} className="bg-surface">
                    {c.name} · {c.tier}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {/* Discount type + value + min order */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label={t('discountType')}>
            <div className="flex gap-2">
              <Radio
                checked={type === 'percent'}
                onChange={() => setType('percent')}
                label={t('percentOff')}
              />
              <Radio
                checked={type === 'fixed'}
                onChange={() => setType('fixed')}
                label={t('fixedOff')}
              />
            </div>
          </Field>

          <Field label={t('discountValue')}>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={type === 'percent' ? 100 : undefined}
                value={value}
                onChange={(e) => setValue(Number(e.target.value || 0))}
                className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary"
                dir="ltr"
              />
              <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-fg-3 font-mono">
                {type === 'percent' ? '% off' : 'SAR off'}
              </span>
            </div>
          </Field>

          <Field label={t('minOrder')}>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-xs text-fg-2">
                <input
                  type="checkbox"
                  checked={noMin}
                  onChange={(e) => setNoMin(e.target.checked)}
                  className="accent-lime-400"
                />
                {t('noMinimum')}
              </label>
              {!noMin && (
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    value={minOrder}
                    onChange={(e) => setMinOrder(Number(e.target.value || 0))}
                    className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary"
                    dir="ltr"
                  />
                  <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-fg-3 font-mono">
                    SAR
                  </span>
                </div>
              )}
            </div>
          </Field>
        </div>

        {/* Expiry + max uses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label={t('expiryDate')}>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </Field>

          <Field label={t('maxUses')}>
            <div className="space-y-2">
              <label className="inline-flex items-center gap-2 text-xs text-fg-2">
                <input
                  type="checkbox"
                  checked={unlimitedUses}
                  onChange={(e) => setUnlimitedUses(e.target.checked)}
                  className="accent-lime-400"
                />
                {t('unlimited')}
              </label>
              {!unlimitedUses && (
                <input
                  type="number"
                  min={1}
                  value={maxUses}
                  onChange={(e) => setMaxUses(Number(e.target.value || 1))}
                  className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary"
                  dir="ltr"
                />
              )}
            </div>
          </Field>
        </div>

        {/* Personal note */}
        <Field label={t('personalNote')}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Add a personal message to the client…"
            className="w-full resize-none rounded-md bg-bg-deeper border border-border px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary leading-relaxed"
          />
        </Field>

        {/* Generated code preview */}
        <Field label="Code">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="flex-1 h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary uppercase"
              dir="ltr"
            />
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
              {t('generateCode')}
            </button>
          </div>
        </Field>

        {/* Submit */}
        <footer className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
          {flash && (
            <p
              className="text-xs flex-1"
              style={{ color: flash.startsWith('✅') ? '#a3e635' : '#f43f5e' }}
            >
              {flash}
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={pending}
            className="ms-auto inline-flex items-center gap-2 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 px-6 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <Send className="w-4 h-4" strokeWidth={2} />
            {pending ? '…' : t('createAndSend')}
          </button>
        </footer>
      </article>

      {/* Active codes list */}
      <section className="mt-8">
        <h3 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
          {t('activePromoCodes')}
        </h3>

        {coupons.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center text-sm text-fg-3">
            {t('noPromoCodesYet')}
          </div>
        ) : (
          <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
            {coupons.map((c) => {
              const expired =
                !!c.valid_until && new Date(c.valid_until).getTime() < Date.now()
              const used =
                c.max_uses != null && c.times_used >= c.max_uses
              const status = !c.is_active
                ? { tint: '#9baf9f', label: t('deactivate') }
                : expired
                  ? { tint: '#f43f5e', label: 'Expired' }
                  : used
                    ? { tint: '#e8912a', label: 'Used up' }
                    : { tint: '#a3e635', label: 'Active' }
              const targetLabel = c.sent_to_user_id
                ? clientById.get(c.sent_to_user_id)?.name ?? '—'
                : c.sent_to_tier
                  ? `All ${c.sent_to_tier}`
                  : '—'
              const usesLabel = `${c.times_used}/${c.max_uses ?? '∞'}`
              return (
                <li
                  key={c.id}
                  className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr_1fr_0.7fr_1fr_0.7fr_auto] gap-3 items-center px-5 py-3"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <code className="font-mono text-sm font-bold text-fg-1 truncate" dir="ltr">
                      {c.code}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyCode(c.id, c.code)}
                      aria-label="Copy"
                      className="w-7 h-7 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-lime-400 hover:bg-bg-deeper"
                    >
                      {copiedId === c.id ? (
                        <Check className="w-3.5 h-3.5 text-lime-400" strokeWidth={2.5} />
                      ) : (
                        <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
                      )}
                    </button>
                  </div>
                  <span className="text-sm text-fg-1 font-mono" dir="ltr">
                    {c.type === 'percent' ? `${c.value}% off` : `SAR ${c.value} off`}
                  </span>
                  <span className="text-xs text-fg-2 truncate">{targetLabel}</span>
                  <span className="text-xs text-fg-3 font-mono" dir="ltr">
                    {usesLabel}
                  </span>
                  <span className="text-xs text-fg-3 font-mono" dir="ltr">
                    {c.valid_until
                      ? new Date(c.valid_until).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </span>
                  <span
                    className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold w-fit"
                    style={{ background: `${status.tint}1a`, color: status.tint }}
                  >
                    {status.label}
                  </span>
                  <div className="md:justify-self-end">
                    {c.is_active && (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(c.id)}
                        aria-label={t('deactivate')}
                        className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-rose-400 hover:bg-bg-deeper"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </section>
  )
}

/* ── Reusables ──────────────────────────────────────────────────── */

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function Radio({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`inline-flex items-center gap-2 rounded-pill h-9 px-4 text-xs font-semibold transition-colors ${
        checked
          ? 'bg-primary/20 text-lime-400 border border-primary/40'
          : 'bg-bg-deeper border border-border text-fg-3 hover:text-fg-1'
      }`}
    >
      <span
        aria-hidden
        className={`w-2 h-2 rounded-full ${checked ? 'bg-lime-400' : 'bg-fg-3'}`}
      />
      {label}
    </button>
  )
}
