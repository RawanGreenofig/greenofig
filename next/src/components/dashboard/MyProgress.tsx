'use client'

import { useCallback, useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import { Plus, Loader2, Check, TrendingUp } from '@/icons'
import { FetchError } from '@/components/dashboard/FetchError'

/**
 * Walk-in client's own progress check-ins, right inside their dashboard —
 * no coach-shared link needed. Structured boxes (weight, measurements,
 * 1-5 ratings, wins, notes) → POST /api/my-progress. Their coach sees
 * every entry and it feeds her AI analysis.
 */
interface Checkin {
  id: string
  source: 'coach' | 'client'
  weight_kg: number | null
  waist_cm: number | null
  hip_cm: number | null
  arm_cm: number | null
  thigh_cm: number | null
  energy: number | null
  sleep: number | null
  adherence: number | null
  appetite: number | null
  wins: string | null
  challenges: string | null
  notes: string | null
  created_at: string
}

const EMPTY = {
  weight_kg: '', waist_cm: '', hip_cm: '', arm_cm: '', thigh_cm: '',
  energy: null as number | null, sleep: null as number | null,
  adherence: null as number | null, appetite: null as number | null,
  wins: '', challenges: '', notes: '',
}

const LABEL_KEYS: Record<string, string> = {
  weight_kg: 'fieldWeight', waist_cm: 'fieldWaist', hip_cm: 'fieldHips', arm_cm: 'fieldArm', thigh_cm: 'fieldThigh',
  energy: 'fieldEnergy', sleep: 'fieldSleep', adherence: 'fieldAdherence', appetite: 'fieldAppetite',
}

export function MyProgress() {
  const t = useTranslations('clinic')
  const [items, setItems] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const refresh = useCallback(async () => {
    setError(false)
    try {
      const res = await fetch('/api/my-progress', { cache: 'no-store' })
      if (res.ok) setItems(((await res.json()) as { checkins: Checkin[] }).checkins ?? [])
      else setError(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void refresh()
  }, [refresh])

  const setF = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((c) => ({ ...c, [k]: v }))

  async function submit() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/my-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setForm(EMPTY)
        setAdding(false)
        toast.success(t('checkinSent'))
        await refresh()
      } else {
        toast.error(t('checkinSaveError'))
      }
    } catch {
      toast.error(t('networkError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-base font-semibold text-fg-1 inline-flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-lime-400" strokeWidth={1.75} />
          {t('myProgressTitle')}
        </h2>
        <button type="button" onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-8 px-3 text-xs font-semibold text-fg-1 hover:border-primary/40">
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          {t('logCheckin')}
        </button>
      </div>

      {adding && (
        <div className="rounded-xl border border-border bg-surface p-4 mb-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['weight_kg', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm'] as const).map((k) => (
              <label key={k} className="block">
                <span className="block text-[10px] text-fg-3 mb-1">{t(LABEL_KEYS[k])}</span>
                <input type="number" step="0.1" min="0" value={form[k]} onChange={(e) => setF(k, e.target.value)}
                  dir="ltr" className="w-full h-9 rounded-md bg-bg-deeper border border-border px-2 text-sm text-fg-1 font-mono focus:outline-none focus:border-primary" />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {(['energy', 'sleep', 'adherence', 'appetite'] as const).map((k) => (
              <MiniRating key={k} label={t(LABEL_KEYS[k])} value={form[k]} onChange={(v) => setF(k, v)} />
            ))}
          </div>
          <textarea value={form.wins} onChange={(e) => setF('wins', e.target.value)} rows={2} placeholder={t('winsPlaceholder')}
            className="w-full rounded-md bg-bg-deeper border border-border px-3 py-2 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary" />
          <textarea value={form.challenges} onChange={(e) => setF('challenges', e.target.value)} rows={2} placeholder={t('challengesPlaceholder')}
            className="w-full rounded-md bg-bg-deeper border border-border px-3 py-2 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary" />
          <textarea value={form.notes} onChange={(e) => setF('notes', e.target.value)} rows={2} placeholder={t('notesPlaceholder')}
            className="w-full rounded-md bg-bg-deeper border border-border px-3 py-2 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setAdding(false); setForm(EMPTY) }}
              className="rounded-pill bg-surface-raised border border-border h-8 px-3 text-xs font-semibold text-fg-1">{t('cancel')}</button>
            <button type="button" onClick={() => void submit()} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-8 px-4 text-xs border border-lime-600/60 disabled:opacity-50">
              {busy ? t('saving') : t('sendToCoach')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <Loader2 className="w-5 h-5 mx-auto animate-spin text-fg-3" strokeWidth={1.75} />
        </div>
      ) : error ? (
        <FetchError onRetry={() => { setLoading(true); void refresh() }} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center">
          <p className="text-sm text-fg-2">{t('noCheckins')}</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-fg-3">{new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                <span className="inline-flex items-center rounded-pill px-2 py-0.5 text-[9px] font-bold uppercase tracking-eyebrow"
                  style={{ background: a.source === 'client' ? 'rgba(163,230,53,0.16)' : 'rgba(74,154,196,0.16)', color: a.source === 'client' ? '#65a30d' : '#4a9ac4' }}>
                  {a.source === 'client' ? t('you') : t('coach')}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-2 font-mono" dir="ltr">
                {a.weight_kg != null && <span>⚖ {a.weight_kg}kg</span>}
                {a.waist_cm != null && <span>waist {a.waist_cm}</span>}
                {a.hip_cm != null && <span>hip {a.hip_cm}</span>}
                {a.arm_cm != null && <span>arm {a.arm_cm}</span>}
                {a.thigh_cm != null && <span>thigh {a.thigh_cm}</span>}
                {a.energy != null && <span>energy {a.energy}/5</span>}
                {a.sleep != null && <span>sleep {a.sleep}/5</span>}
                {a.adherence != null && <span>plan {a.adherence}/5</span>}
                {a.appetite != null && <span>appetite {a.appetite}/5</span>}
              </div>
              {a.wins && <p className="mt-1.5 text-xs text-fg-1"><b className="text-lime-500">{t('winsLabel')}</b> {a.wins}</p>}
              {a.challenges && <p className="mt-1 text-xs text-fg-1"><b style={{ color: '#e8912a' }}>{t('strugglesLabel')}</b> {a.challenges}</p>}
              {a.notes && <p className="mt-1 text-xs text-fg-2 whitespace-pre-wrap">{a.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function MiniRating({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-fg-2">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value === n
          return (
            <button key={n} type="button" onClick={() => onChange(on ? null : n)}
              className="w-6 h-6 rounded text-[11px] font-semibold inline-flex items-center justify-center"
              style={{ background: on ? 'rgba(163,230,53,0.18)' : 'var(--gf-input-bg)', color: on ? '#3d6b0a' : 'var(--gf-fg-3)', border: `1px solid ${on ? 'rgba(101,163,13,0.5)' : 'var(--gf-border)'}` }}>
              {on ? <Check className="w-3 h-3" strokeWidth={3} /> : n}
            </button>
          )
        })}
      </div>
    </div>
  )
}
