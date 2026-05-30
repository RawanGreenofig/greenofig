'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLocale } from 'next-intl'
import { Plus, Search, Phone, X, Loader2, Upload } from '@/icons'
import { ImportClientsDialog } from '@/components/clinic/ImportClientsDialog'

/**
 * /nutritionist/clinic-clients
 *
 * Walk-in clients the coach manages outside the website (cash-pay
 * patients who came through the physical clinic door). Distinct from
 * /nutritionist/clients which lists online users with auth accounts.
 *
 * No "link to online account" flow on purpose — the user said to keep
 * the two universes separate.
 */

interface ClinicClient {
  id: string
  full_name: string
  phone: string | null
  email: string | null
  date_of_birth: string | null
  gender: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  total_visits: number
  last_visit_at: string | null
}

export default function ClinicClientsPage() {
  const locale = useLocale()
  const [clients, setClients] = useState<ClinicClient[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)

  const refresh = async () => {
    try {
      const res = await fetch('/api/nutritionist/clinic-clients', {
        cache: 'no-store',
      })
      if (!res.ok) return
      const body = (await res.json()) as { clients: ClinicClient[] }
      setClients(body.clients ?? [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void refresh()
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clients
    return clients.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        (c.phone ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q),
    )
  }, [clients, search])

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            Clinic Clients
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">
            Walk-in patients who came through the clinic. Schedule visits,
            track payments, keep notes — no online account required.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border text-fg-1 hover:border-primary/40 font-semibold text-sm"
            style={{ height: 40, padding: '0 16px' }}
          >
            <Upload className="w-4 h-4" strokeWidth={2} />
            Import
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="btn-primary inline-flex items-center gap-1.5"
            style={{ height: 40, padding: '0 18px' }}
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            Add walk-in
          </button>
        </div>
      </header>

      <div className="relative">
        <Search
          className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3"
          strokeWidth={1.75}
        />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or email…"
          className="w-full h-10 ps-10 pe-3 rounded-pill bg-surface border border-border text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
        />
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center">
          <Loader2
            className="w-6 h-6 mx-auto animate-spin text-fg-3"
            strokeWidth={1.75}
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <p className="text-sm text-fg-2">
            {clients.length === 0
              ? 'No clinic clients yet. Add the first walk-in to get started.'
              : 'No matches for that search.'}
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {filtered.map((c) => (
            <li key={c.id}>
              <Link
                href={`/${locale}/nutritionist/clinic-clients/${c.id}`}
                className="block rounded-xl border border-border bg-surface hover:border-primary/40 p-4 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Avatar name={c.full_name} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-fg-1 truncate">
                      {c.full_name}
                      {!c.is_active && (
                        <span className="ms-2 text-[10px] uppercase tracking-eyebrow text-fg-3 font-mono">
                          inactive
                        </span>
                      )}
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-fg-3">
                      {c.phone && (
                        <span
                          className="inline-flex items-center gap-1 font-mono"
                          dir="ltr"
                        >
                          <Phone className="w-3 h-3" strokeWidth={1.75} />
                          {c.phone}
                        </span>
                      )}
                      <span>
                        {c.total_visits} visit{c.total_visits === 1 ? '' : 's'}
                      </span>
                      {c.last_visit_at && (
                        <span>
                          Last visit{' '}
                          {new Date(c.last_visit_at).toLocaleDateString(
                            undefined,
                            { month: 'short', day: 'numeric' },
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showAdd && (
        <AddWalkInModal
          onClose={() => setShowAdd(false)}
          onCreated={async () => {
            setShowAdd(false)
            await refresh()
          }}
        />
      )}

      {showImport && (
        <ImportClientsDialog
          onClose={() => setShowImport(false)}
          onImported={async () => {
            await refresh()
          }}
        />
      )}
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className="shrink-0 inline-flex items-center justify-center rounded-full text-white text-sm font-bold"
      style={{
        width: 44,
        height: 44,
        background: 'linear-gradient(135deg, #84cc16, #4ade80)',
      }}
    >
      {initials || '?'}
    </span>
  )
}

function AddWalkInModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: () => void | Promise<void>
}) {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!fullName.trim()) {
      setErr('Name is required.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/nutritionist/clinic-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          date_of_birth: dob || null,
          gender: gender || null,
          notes: notes.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setErr(data.error ?? `Save failed (${res.status})`)
        setBusy(false)
        return
      }
      await onCreated()
    } catch {
      setErr('Network error.')
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && !busy && onClose()}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 space-y-4"
      >
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-fg-1">Add walk-in client</h2>
            <p className="mt-1 text-xs text-fg-3">
              Name is required. Phone is highly recommended so you can find
              them by phone next time.
            </p>
          </div>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            aria-label="Close"
            className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </header>

        <Field label="Full name *">
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
            />
          </Field>
          <Field label="Date of birth">
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
            />
          </Field>
          <Field label="Gender">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
            >
              <option value="">—</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </select>
          </Field>
        </div>

        <Field label="Notes">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Allergies, history, goals — anything you want to remember."
            className="w-full rounded-md bg-bg-deeper border border-border px-3 py-2 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
          />
        </Field>

        {err && <p className="text-xs" style={{ color: '#fca5a5' }}>{err}</p>}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs shadow-lime-glow border border-lime-600/60 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Add client'}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
        {label}
      </span>
      {children}
    </label>
  )
}
