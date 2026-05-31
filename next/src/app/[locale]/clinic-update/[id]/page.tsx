'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Check, Loader2 } from '@/icons'

/**
 * Public structured check-in form behind the per-client "send update
 * link". Saves a clinic_assessments row (source 'client') and notifies
 * the coach. Questions + boxes — not free notes.
 */
type Form = {
  weight_kg: string
  waist_cm: string
  hip_cm: string
  arm_cm: string
  thigh_cm: string
  energy: number | null
  sleep: number | null
  adherence: number | null
  appetite: number | null
  wins: string
  challenges: string
  hp: string
}

const EMPTY: Form = {
  weight_kg: '', waist_cm: '', hip_cm: '', arm_cm: '', thigh_cm: '',
  energy: null, sleep: null, adherence: null, appetite: null,
  wins: '', challenges: '', hp: '',
}

export default function ClinicUpdatePage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [f, setF] = useState<Form>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((c) => ({ ...c, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    const filled =
      f.weight_kg || f.waist_cm || f.hip_cm || f.arm_cm || f.thigh_cm ||
      f.energy || f.sleep || f.adherence || f.appetite || f.wins.trim() || f.challenges.trim()
    if (!filled) return setErr('Please fill in at least one field.')
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/clinic-update/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(f),
      })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setErr(data.error ?? `Could not submit (${res.status}).`)
        setBusy(false)
        return
      }
      setDone(true)
    } catch {
      setErr('Network error — please try again.')
      setBusy(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--gf-bg-deeper)' }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-5">
          <h1 className="font-display font-bold text-fg-1" style={{ fontSize: 'clamp(24px,5vw,32px)', lineHeight: 1.1 }}>
            Your weekly check-in
          </h1>
          <p className="mt-2 text-sm text-fg-2">Fill in what you can — your coach uses this to adjust your plan.</p>
        </div>

        {done ? (
          <div className="rounded-2xl border border-lime-600/40 bg-surface p-8 text-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-lime-400/15 mb-3">
              <Check className="w-6 h-6 text-lime-400" strokeWidth={2.25} />
            </span>
            <h2 className="text-lg font-bold text-fg-1">Sent — thank you!</h2>
            <p className="mt-2 text-sm text-fg-2">Your coach has been notified and will review your check-in.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-6 space-y-5">
            <input type="text" tabIndex={-1} autoComplete="off" value={f.hp}
              onChange={(e) => set('hp', e.target.value)}
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} aria-hidden />

            <Section title="Measurements">
              <div className="grid grid-cols-2 gap-3">
                <NumField label="Weight (kg)" value={f.weight_kg} onChange={(v) => set('weight_kg', v)} />
                <NumField label="Waist (cm)" value={f.waist_cm} onChange={(v) => set('waist_cm', v)} />
                <NumField label="Hips (cm)" value={f.hip_cm} onChange={(v) => set('hip_cm', v)} />
                <NumField label="Arm (cm)" value={f.arm_cm} onChange={(v) => set('arm_cm', v)} />
                <NumField label="Thigh (cm)" value={f.thigh_cm} onChange={(v) => set('thigh_cm', v)} />
              </div>
            </Section>

            <Section title="How have you felt? (1 = poor, 5 = great)">
              <Rating label="Energy" value={f.energy} onChange={(v) => set('energy', v)} />
              <Rating label="Sleep" value={f.sleep} onChange={(v) => set('sleep', v)} />
              <Rating label="Stuck to the plan" value={f.adherence} onChange={(v) => set('adherence', v)} />
              <Rating label="Appetite / cravings control" value={f.appetite} onChange={(v) => set('appetite', v)} />
            </Section>

            <Field label="Wins this week 🎉">
              <textarea value={f.wins} onChange={(e) => set('wins', e.target.value)} rows={2} className={INPUT + ' h-auto py-2'} placeholder="What went well?" />
            </Field>
            <Field label="Struggles / questions">
              <textarea value={f.challenges} onChange={(e) => set('challenges', e.target.value)} rows={2} className={INPUT + ' h-auto py-2'} placeholder="What was hard or confusing?" />
            </Field>

            {err && <p className="text-xs" style={{ color: '#fca5a5' }}>{err}</p>}
            <button type="submit" disabled={busy}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 text-sm shadow-lime-glow border border-lime-600/60 disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.25} /> : null}
              {busy ? 'Sending…' : 'Send check-in'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

const INPUT = 'w-full h-11 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-2">{title}</p>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">{label}</span>
      {children}
    </label>
  )
}
function NumField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="block text-[10px] text-fg-3 mb-1">{label}</span>
      <input type="number" step="0.1" min="0" value={value} onChange={(e) => onChange(e.target.value)} dir="ltr" className={INPUT + ' h-10 font-mono'} />
    </label>
  )
}
function Rating({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-fg-1">{label}</span>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value === n
          return (
            <button key={n} type="button" onClick={() => onChange(on ? null : n)}
              className="w-8 h-8 rounded-md text-sm font-semibold"
              style={{
                background: on ? 'rgba(163,230,53,0.18)' : 'var(--gf-input-bg)',
                color: on ? '#3d6b0a' : 'var(--gf-fg-3)',
                border: `1px solid ${on ? 'rgba(101,163,13,0.5)' : 'var(--gf-border)'}`,
              }}>
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}
