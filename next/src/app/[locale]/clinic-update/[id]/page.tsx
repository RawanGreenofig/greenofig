'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Check, Loader2 } from '@/icons'

/**
 * Public per-client progress-update form behind the link the coach
 * shares with an existing walk-in client (/clinic-update/<clientId>).
 * The client reports how they're doing; it appends to their Plan &
 * Progress log and notifies the coach. No auth.
 */
export default function ClinicUpdatePage() {
  const params = useParams<{ id: string }>()
  const clientId = params.id

  const [f, setF] = useState({ weight: '', measurements: '', trend: '', notes: '', hp: '' })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF((c) => ({ ...c, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!f.trend && !f.weight.trim() && !f.notes.trim() && !f.measurements.trim()) {
      return setErr('Please fill in at least one field.')
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/clinic-update/${clientId}`, {
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

  const TRENDS = [
    { v: 'improved', l: 'Improving 🙂' },
    { v: 'same', l: 'About the same 😐' },
    { v: 'worse', l: 'Struggling 🙁' },
  ]

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--gf-bg-deeper)' }}>
      <div className="w-full max-w-lg">
        <div className="text-center mb-5">
          <h1 className="font-display font-bold text-fg-1" style={{ fontSize: 'clamp(24px,5vw,32px)', lineHeight: 1.1 }}>
            How are you doing?
          </h1>
          <p className="mt-2 text-sm text-fg-2">
            Send your coach a quick progress update so she can fine-tune your plan.
          </p>
        </div>

        {done ? (
          <div className="rounded-2xl border border-lime-600/40 bg-surface p-8 text-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-lime-400/15 mb-3">
              <Check className="w-6 h-6 text-lime-400" strokeWidth={2.25} />
            </span>
            <h2 className="text-lg font-bold text-fg-1">Sent — thank you!</h2>
            <p className="mt-2 text-sm text-fg-2">Your coach has been notified and will review your update.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={f.hp}
              onChange={(e) => set('hp', e.target.value)}
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              aria-hidden
            />

            <div>
              <span className="block text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-2">
                How is it going overall?
              </span>
              <div className="flex flex-wrap gap-2">
                {TRENDS.map((t) => {
                  const on = f.trend === t.v
                  return (
                    <button
                      key={t.v}
                      type="button"
                      onClick={() => set('trend', on ? '' : t.v)}
                      className="inline-flex items-center h-9 px-3 rounded-pill text-sm font-medium"
                      style={{
                        background: on ? 'rgba(163,230,53,0.16)' : 'var(--gf-input-bg)',
                        color: on ? '#3d6b0a' : 'var(--gf-fg-2)',
                        border: `1px solid ${on ? 'rgba(101,163,13,0.5)' : 'var(--gf-border)'}`,
                      }}
                    >
                      {t.l}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Current weight">
                <input type="text" value={f.weight} onChange={(e) => set('weight', e.target.value)} placeholder="e.g. 78 kg" dir="ltr" className={INPUT} />
              </Field>
              <Field label="Measurements (optional)">
                <input type="text" value={f.measurements} onChange={(e) => set('measurements', e.target.value)} placeholder="waist, etc." className={INPUT} />
              </Field>
            </div>
            <Field label="What's working / what's hard?">
              <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className={`${INPUT} h-auto py-2`} />
            </Field>

            {err && <p className="text-xs" style={{ color: '#fca5a5' }}>{err}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 text-sm shadow-lime-glow border border-lime-600/60 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.25} /> : null}
              {busy ? 'Sending…' : 'Send update'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

const INPUT =
  'w-full h-11 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">{label}</span>
      {children}
    </label>
  )
}
