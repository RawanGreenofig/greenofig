'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Check, Loader2 } from '@/icons'

/**
 * Public client-intake form behind a coach's shareable link
 * (/clinic-intake/<coachId>). A prospective walk-in fills this in; on
 * submit we create a clinic_clients row for that coach and notify them.
 * No auth — anyone with the link can submit.
 */
export default function ClinicIntakePage() {
  const params = useParams<{ id: string }>()
  const coachId = params.id

  const [f, setF] = useState({
    full_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    gender: '',
    start_date: '',
    notes: '',
    hp: '',
  })
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const set = (k: keyof typeof f, v: string) => setF((c) => ({ ...c, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!f.full_name.trim()) return setErr('Please enter your full name.')
    if (!f.phone.trim()) return setErr('Please enter your phone number.')
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/clinic-intake/${coachId}`, {
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
            New client registration
          </h1>
          <p className="mt-2 text-sm text-fg-2">
            Fill in your details and your coach will be in touch.
          </p>
        </div>

        {done ? (
          <div className="rounded-2xl border border-lime-600/40 bg-surface p-8 text-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-lime-400/15 mb-3">
              <Check className="w-6 h-6 text-lime-400" strokeWidth={2.25} />
            </span>
            <h2 className="text-lg font-bold text-fg-1">Thank you!</h2>
            <p className="mt-2 text-sm text-fg-2">
              Your details were submitted. Your coach has been notified and will reach out soon.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-6 space-y-4">
            {/* honeypot — hidden from humans */}
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={f.hp}
              onChange={(e) => set('hp', e.target.value)}
              style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
              aria-hidden
            />

            <Field label="Full name" required>
              <input type="text" value={f.full_name} onChange={(e) => set('full_name', e.target.value)} required className={INPUT} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone" required>
                <input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} dir="ltr" required className={INPUT} />
              </Field>
              <Field label="Email">
                <input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} dir="ltr" className={INPUT} />
              </Field>
              <Field label="Date of birth">
                <input type="date" value={f.date_of_birth} onChange={(e) => set('date_of_birth', e.target.value)} className={INPUT} />
              </Field>
              <Field label="Gender">
                <select value={f.gender} onChange={(e) => set('gender', e.target.value)} className={INPUT}>
                  <option value="">—</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                </select>
              </Field>
            </div>
            <Field label="Preferred start date">
              <input type="date" value={f.start_date} onChange={(e) => set('start_date', e.target.value)} className={INPUT} />
            </Field>
            <Field label="Anything we should know? (goals, conditions, allergies)">
              <textarea value={f.notes} onChange={(e) => set('notes', e.target.value)} rows={3} className={`${INPUT} h-auto py-2`} />
            </Field>

            {err && <p className="text-xs" style={{ color: '#fca5a5' }}>{err}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 text-sm shadow-lime-glow border border-lime-600/60 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.25} /> : null}
              {busy ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        )}
      </div>
    </main>
  )
}

const INPUT =
  'w-full h-11 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
        {label}
        {required && <span className="text-lime-500"> *</span>}
      </span>
      {children}
    </label>
  )
}
