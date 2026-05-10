'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
// Brand-coloured icon module — Gift / Sparkles ship in amber, Check
// in green, etc. Anything not enumerated re-exports from lucide-react.
import {
  Gift,
  Send,
  Copy,
  Check,
  Trash2,
  Sparkles,
} from '@/icons'
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
      <header className="mb-4 flex items-center gap-2.5">
        {/* Gift comes in lime by default from @/icons but the brand
         * lime here matches the rest of the discount-section accents.
         * `color="currentColor"` defeated would let CSS override. */}
        <Gift className="w-5 h-5" strokeWidth={1.75} />
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
                {type === 'percent' ? '% off' : 'USD off'}
              </span>
            </div>
          </Field>

          {/* MIN ORDER — input + inline "No minimum" toggle on a
           * single row so the field's baseline lines up with the
           * sibling fields in the grid. The input disables (not
           * hides) when the toggle is on, keeping the row height
           * stable and avoiding the column-misalignment that the
           * old stacked layout caused. */}
          <Field label={t('minOrder')}>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[140px]">
                <input
                  type="number"
                  min={0}
                  value={noMin ? '' : minOrder}
                  onChange={(e) => setMinOrder(Number(e.target.value || 0))}
                  disabled={noMin}
                  placeholder={noMin ? '∞' : '0'}
                  className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 pe-12 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary disabled:opacity-50"
                  dir="ltr"
                />
                <span className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-fg-3 font-mono pointer-events-none">
                  USD
                </span>
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs text-fg-2 whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={noMin}
                  onChange={(e) => setNoMin(e.target.checked)}
                  className="accent-lime-400"
                />
                {t('noMinimum')}
              </label>
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

          {/* MAX USES — same single-row pattern as MIN ORDER. Disabled
           * (not hidden) input keeps the field at a stable height so
           * the EXPIRY DATE column stays vertically aligned with it. */}
          <Field label={t('maxUses')}>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="number"
                min={1}
                value={unlimitedUses ? '' : maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value || 1))}
                disabled={unlimitedUses}
                placeholder={unlimitedUses ? '∞' : '1'}
                className="flex-1 min-w-[140px] h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary disabled:opacity-50"
                dir="ltr"
              />
              <label className="inline-flex items-center gap-1.5 text-xs text-fg-2 whitespace-nowrap cursor-pointer">
                <input
                  type="checkbox"
                  checked={unlimitedUses}
                  onChange={(e) => setUnlimitedUses(e.target.checked)}
                  className="accent-lime-400"
                />
                {t('unlimited')}
              </label>
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

        {/* Generated code preview. On phones the input + Generate Code
         * button stack into two rows so the button text never has to
         * wrap. On md+ they sit side-by-side with the button hugging
         * its content (whitespace-nowrap). */}
        <Field label="Code">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="flex-1 min-w-0 h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary uppercase"
              dir="ltr"
            />
            <button
              type="button"
              onClick={handleGenerate}
              className="inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              style={{
                height: 40,
                padding: '0 14px',
                borderRadius: 8,
                background: 'var(--gf-input-bg)',
                border: '1px solid var(--gf-border)',
                color: 'var(--gf-fg-1)',
                fontSize: 12,
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--gf-card-hover)'
                e.currentTarget.style.borderColor = 'rgba(132,217,61,0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--gf-input-bg)'
                e.currentTarget.style.borderColor = 'var(--gf-border)'
              }}
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
                      className="inline-flex items-center justify-center transition-colors"
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: 'transparent',
                        border: 'none',
                        color:
                          copiedId === c.id ? '#a3e635' : 'var(--gf-fg-3)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'var(--gf-card-hover)'
                        if (copiedId !== c.id)
                          e.currentTarget.style.color = 'var(--gf-fg-1)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent'
                        if (copiedId !== c.id)
                          e.currentTarget.style.color = 'var(--gf-fg-3)'
                      }}
                    >
                      {copiedId === c.id ? (
                        <Check
                          className="w-3.5 h-3.5"
                          strokeWidth={2.5}
                          color="currentColor"
                        />
                      ) : (
                        <Copy
                          className="w-3.5 h-3.5"
                          strokeWidth={1.75}
                          color="currentColor"
                        />
                      )}
                    </button>
                  </div>
                  <span className="text-sm text-fg-1 font-mono" dir="ltr">
                    {c.type === 'percent' ? `${c.value}% off` : `$${c.value} off`}
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
                    className="inline-flex items-center justify-center w-fit"
                    style={{
                      height: 18,
                      padding: '0 8px',
                      borderRadius: 999,
                      background: `${status.tint}1f`,
                      color: status.tint,
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                    }}
                  >
                    {status.label}
                  </span>
                  <div className="md:justify-self-end">
                    {c.is_active && (
                      <button
                        type="button"
                        onClick={() => handleDeactivate(c.id)}
                        aria-label={t('deactivate')}
                        className="inline-flex items-center justify-center transition-colors"
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 8,
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--gf-fg-3)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            'rgba(244,63,94,0.08)'
                          e.currentTarget.style.color = '#f43f5e'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent'
                          e.currentTarget.style.color = 'var(--gf-fg-3)'
                        }}
                      >
                        <Trash2
                          className="w-3.5 h-3.5"
                          strokeWidth={1.75}
                          color="currentColor"
                        />
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

/**
 * Selectable chip — used for "Specific client / Basic / Premium / VIP"
 * and the "Percentage / Fixed amount" toggles. Switched from
 * rounded-pill old style to the dashboard input chrome (8px radius,
 * --gf-input-bg, --gf-border) so the chips read as the same control
 * family as text inputs and dropdowns elsewhere on the page.
 */
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
      aria-pressed={checked}
      className="inline-flex items-center gap-2 transition-colors"
      style={{
        height: 36,
        padding: '0 14px',
        borderRadius: 8,
        background: checked
          ? 'rgba(132,217,61,0.12)'
          : 'var(--gf-input-bg)',
        border: `1px solid ${checked ? 'rgba(132,217,61,0.5)' : 'var(--gf-border)'}`,
        color: checked ? '#a3e635' : 'var(--gf-fg-2)',
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: '-0.005em',
      }}
      onMouseEnter={(e) => {
        if (!checked) {
          e.currentTarget.style.background = 'var(--gf-card-hover)'
          e.currentTarget.style.color = 'var(--gf-fg-1)'
        }
      }}
      onMouseLeave={(e) => {
        if (!checked) {
          e.currentTarget.style.background = 'var(--gf-input-bg)'
          e.currentTarget.style.color = 'var(--gf-fg-2)'
        }
      }}
    >
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: checked ? '#a3e635' : 'var(--gf-fg-4)',
          flexShrink: 0,
        }}
      />
      {label}
    </button>
  )
}
