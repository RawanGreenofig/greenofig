'use client'

import { useCallback, useEffect, useState } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { Switch } from '@/components/Switch'
import { Check, Loader2, Tag } from '@/icons'

/**
 * Owner-coach controls that don't belong in the per-tab settings flow and
 * (until now) only lived in the admin-only /admin/store page — which the
 * head coach can't reach. Renders ONLY for the head coach. Each control
 * persists immediately to platform_settings via /api/settings/[key]
 * (server allows the head coach to write this small whitelist).
 *
 *  - Pricing page on/off  → so walk-in clients never see online prices
 *  - Zelle handle         → shown on walk-in pay links
 */
export function ClinicControls() {
  const { profile } = useUser()
  const isHeadCoach = !!(profile as { is_head_coach?: boolean } | null)?.is_head_coach

  const [loading, setLoading] = useState(true)
  const [pricingOn, setPricingOn] = useState(true)
  const [zelle, setZelle] = useState('')
  const [savingPricing, setSavingPricing] = useState(false)
  const [savedZelle, setSavedZelle] = useState(false)
  const [savingZelle, setSavingZelle] = useState(false)

  const load = useCallback(async () => {
    try {
      const [p, z] = await Promise.all([
        fetch('/api/settings/pricing_page_enabled', { cache: 'no-store' }),
        fetch('/api/settings/clinic_zelle_handle', { cache: 'no-store' }),
      ])
      if (p.ok) {
        const v = ((await p.json()) as { value?: unknown }).value
        // Default ON: only explicit false (or {enabled:false}) turns it off.
        const off = v === false || (typeof v === 'object' && v !== null && (v as { enabled?: unknown }).enabled === false)
        setPricingOn(!off)
      }
      if (z.ok) {
        const v = ((await z.json()) as { value?: unknown }).value
        if (typeof v === 'string') setZelle(v)
      }
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    if (isHeadCoach) void load()
  }, [isHeadCoach, load])

  if (!isHeadCoach) return null

  async function persist(key: string, value: unknown) {
    await fetch(`/api/settings/${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    })
  }

  async function togglePricing(next: boolean) {
    setPricingOn(next)
    setSavingPricing(true)
    try {
      await persist('pricing_page_enabled', next)
    } finally {
      setSavingPricing(false)
    }
  }

  async function saveZelle() {
    setSavingZelle(true)
    setSavedZelle(false)
    try {
      await persist('clinic_zelle_handle', zelle.trim())
      setSavedZelle(true)
      setTimeout(() => setSavedZelle(false), 1500)
    } finally {
      setSavingZelle(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 md:p-6">
      <h2 className="text-base font-semibold text-fg-1 inline-flex items-center gap-2">
        <Tag className="w-4 h-4 text-lime-400" strokeWidth={1.75} />
        Clinic &amp; pricing
        <span className="ms-1 text-[10px] uppercase tracking-eyebrow text-fg-3 font-bold">Owner</span>
      </h2>
      <p className="mt-1 text-sm text-fg-2">Controls for your walk-in clinic. Saved instantly.</p>

      {loading ? (
        <div className="mt-5 flex items-center gap-2 text-sm text-fg-3">
          <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} /> Loading…
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          {/* Pricing page on/off */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-fg-1">Show the public pricing page</p>
              <p className="text-xs text-fg-3 mt-0.5">
                Turn OFF so walk-in clients never see the online subscription prices. Hides the page and its nav link
                for everyone.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {savingPricing && <Loader2 className="w-4 h-4 animate-spin text-fg-3" strokeWidth={1.75} />}
              <Switch on={pricingOn} onChange={(v) => void togglePricing(v)} ariaLabel="Pricing page on/off" />
            </div>
          </div>

          {/* Zelle handle */}
          <div className="pt-4 border-t border-border">
            <label className="block">
              <span className="text-sm font-semibold text-fg-1">Zelle handle (clinic pay links)</span>
              <p className="text-xs text-fg-3 mt-0.5 mb-2">
                Shown on the payment link so walk-in clients can pay you by Zelle. Email or phone.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={zelle}
                  dir="ltr"
                  onChange={(e) => setZelle(e.target.value)}
                  placeholder="you@email.com or +1 404 903 0581"
                  className="flex-1 h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => void saveZelle()}
                  disabled={savingZelle}
                  className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-4 text-sm border border-lime-600/60 disabled:opacity-50"
                >
                  {savingZelle ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> : savedZelle ? <Check className="w-4 h-4" strokeWidth={2.5} /> : null}
                  {savedZelle ? 'Saved' : 'Save'}
                </button>
              </div>
            </label>
          </div>
        </div>
      )}
    </section>
  )
}
