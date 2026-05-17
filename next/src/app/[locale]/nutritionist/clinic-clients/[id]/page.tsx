'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Link } from '@/i18n/navigation'
import {
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Plus,
  X,
  Check,
  Loader2,
  Edit3,
  Trash2,
} from '@/icons'

/**
 * /nutritionist/clinic-clients/[id]
 *
 * Full record of one walk-in client + their visit history. The coach
 * can schedule a new visit, mark a past visit paid, edit basic info,
 * or remove the client (cascades all their bookings — only do that
 * for typos and test rows).
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
}

interface Visit {
  id: string
  scheduled_at: string
  duration_min: number
  status: string
  type: string | null
  notes: string | null
  nutritionist_notes: string | null
  payment_method: 'cash' | 'card' | 'transfer' | 'online' | 'other' | null
  is_paid: boolean
  amount_paid_cents: number | null
}

export default function ClinicClientDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [client, setClient] = useState<ClinicClient | null>(null)
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(true)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const refresh = async () => {
    try {
      const res = await fetch(
        `/api/nutritionist/clinic-clients/${id}`,
        { cache: 'no-store' },
      )
      if (!res.ok) {
        setLoading(false)
        return
      }
      const body = (await res.json()) as {
        client: ClinicClient
        visits: Visit[]
      }
      setClient(body.client)
      setVisits(body.visits ?? [])
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const deleteClient = async () => {
    const res = await fetch(`/api/nutritionist/clinic-clients/${id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      window.location.href = '../clinic-clients'
    }
  }

  if (loading) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-lg mx-auto">
        <Loader2
          className="w-6 h-6 mx-auto animate-spin text-fg-3"
          strokeWidth={1.75}
        />
      </div>
    )
  }
  if (!client) {
    return (
      <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-lg mx-auto text-center">
        <p className="text-sm text-fg-2">Client not found.</p>
        <Link
          href="/nutritionist/clinic-clients"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-lime-400"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} />
          Back to list
        </Link>
      </div>
    )
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-lg mx-auto space-y-6">
      <Link
        href="/nutritionist/clinic-clients"
        className="inline-flex items-center gap-1.5 text-xs text-fg-3 hover:text-fg-1"
      >
        <ArrowLeft className="w-3 h-3" strokeWidth={1.75} />
        All clinic clients
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', lineHeight: 1.1 }}
          >
            {client.full_name}
          </h1>
          <div className="mt-2 flex items-center gap-4 flex-wrap text-sm text-fg-3">
            {client.phone && (
              <a
                href={`tel:${client.phone.replace(/\s+/g, '')}`}
                className="inline-flex items-center gap-1.5 hover:text-fg-1 font-mono"
                dir="ltr"
              >
                <Phone className="w-3.5 h-3.5" strokeWidth={1.75} />
                {client.phone}
              </a>
            )}
            {client.email && (
              <a
                href={`mailto:${client.email}`}
                className="inline-flex items-center gap-1.5 hover:text-fg-1"
                dir="ltr"
              >
                <Mail className="w-3.5 h-3.5" strokeWidth={1.75} />
                {client.email}
              </a>
            )}
            {client.date_of_birth && <span>DOB: {client.date_of_birth}</span>}
            {client.gender && <span>{client.gender}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
          >
            <Edit3 className="w-3.5 h-3.5" strokeWidth={1.75} />
            Edit
          </button>
          <button
            type="button"
            onClick={() => setScheduleOpen(true)}
            className="btn-primary inline-flex items-center gap-1.5"
            style={{ height: 36, padding: '0 16px', fontSize: 13 }}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            Schedule visit
          </button>
        </div>
      </header>

      {client.notes && (
        <section className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-2">
            Notes
          </p>
          <p className="text-sm text-fg-1 whitespace-pre-wrap leading-relaxed">
            {client.notes}
          </p>
        </section>
      )}

      <section>
        <h2 className="text-base font-semibold text-fg-1 mb-3">
          Visit history
        </h2>
        {visits.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
            <Calendar
              className="w-7 h-7 mx-auto mb-3 text-fg-3"
              strokeWidth={1.5}
            />
            <p className="text-sm text-fg-2">No visits scheduled yet.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {visits.map((v) => (
              <VisitRow key={v.id} visit={v} onChange={refresh} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-4 flex items-center justify-between gap-4">
        <p className="text-xs text-fg-3 leading-relaxed">
          Delete this client and every booking attached to them. Use only
          for typos or test rows — there is no undo.
        </p>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="inline-flex items-center gap-1.5 rounded-pill bg-rose-500/15 text-rose-400 h-9 px-4 text-xs font-semibold hover:bg-rose-500/25 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
          Delete client
        </button>
      </section>

      {scheduleOpen && (
        <ScheduleVisitModal
          clientId={client.id}
          onClose={() => setScheduleOpen(false)}
          onCreated={async () => {
            setScheduleOpen(false)
            await refresh()
          }}
        />
      )}

      {editOpen && (
        <EditClientModal
          client={client}
          onClose={() => setEditOpen(false)}
          onSaved={async () => {
            setEditOpen(false)
            await refresh()
          }}
        />
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
        >
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/40 bg-surface p-6 space-y-4">
            <h3 className="text-base font-bold text-fg-1">Delete client?</h3>
            <p className="text-xs text-fg-3">
              This removes {client.full_name} and all {visits.length} of
              their visit records. There is no undo.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void deleteClient()}
                className="rounded-pill bg-rose-500/20 text-rose-300 h-9 px-4 text-xs font-semibold hover:bg-rose-500/30"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function VisitRow({
  visit,
  onChange,
}: {
  visit: Visit
  onChange: () => void | Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const [method, setMethod] = useState<
    'cash' | 'card' | 'transfer' | 'online' | 'other' | ''
  >(visit.payment_method ?? '')
  const [amount, setAmount] = useState<string>(
    visit.amount_paid_cents != null
      ? (visit.amount_paid_cents / 100).toFixed(2)
      : '',
  )

  const togglePaid = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/bookings/${visit.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          is_paid: !visit.is_paid,
          payment_method: method || undefined,
          amount_paid_cents:
            amount.trim() === '' ? undefined : Math.round(Number(amount) * 100),
        }),
      })
      if (res.ok) await onChange()
    } finally {
      setBusy(false)
    }
  }

  const savePaymentDetails = async () => {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/bookings/${visit.id}/payment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: method || undefined,
          amount_paid_cents:
            amount.trim() === '' ? undefined : Math.round(Number(amount) * 100),
        }),
      })
      if (res.ok) await onChange()
    } finally {
      setBusy(false)
    }
  }

  const date = new Date(visit.scheduled_at)
  return (
    <li className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-fg-1">
            {date.toLocaleString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
          <p className="text-xs text-fg-3 mt-0.5">
            {visit.duration_min} min · {visit.status}
            {visit.type ? ` · ${visit.type}` : ''}
          </p>
          {visit.notes && (
            <p className="mt-2 text-xs text-fg-2 whitespace-pre-wrap">
              {visit.notes}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void togglePaid()}
          disabled={busy}
          className={`inline-flex items-center gap-1.5 rounded-pill h-8 px-3 text-[11px] font-semibold ${
            visit.is_paid
              ? 'bg-primary/15 text-lime-400'
              : 'bg-surface-raised border border-border text-fg-2 hover:text-fg-1'
          }`}
        >
          {visit.is_paid ? (
            <>
              <Check className="w-3 h-3" strokeWidth={2} />
              Paid
            </>
          ) : (
            'Mark paid'
          )}
        </button>
      </div>

      <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1">
            Method
          </span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
            onBlur={() => void savePaymentDetails()}
            className="w-full h-8 rounded-md bg-bg-deeper border border-border px-2 text-xs text-fg-1 focus:outline-none focus:border-primary"
          >
            <option value="">—</option>
            <option value="cash">Cash</option>
            <option value="card">Card (in person)</option>
            <option value="online">Online</option>
            <option value="transfer">Bank transfer</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1">
            Amount
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onBlur={() => void savePaymentDetails()}
            placeholder="0.00"
            className="w-full h-8 rounded-md bg-bg-deeper border border-border px-2 text-xs text-fg-1 font-mono focus:outline-none focus:border-primary"
            dir="ltr"
          />
        </label>
      </div>
    </li>
  )
}

function ScheduleVisitModal({
  clientId,
  onClose,
  onCreated,
}: {
  clientId: string
  onClose: () => void
  onCreated: () => void | Promise<void>
}) {
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState('30')
  const [type, setType] = useState('inClinicVisit')
  const [notes, setNotes] = useState('')
  const [method, setMethod] = useState<
    'cash' | 'card' | 'transfer' | 'online' | 'other' | ''
  >('')
  const [amount, setAmount] = useState('')
  const [isPaid, setIsPaid] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!scheduledAt) {
      setErr('Choose a date and time.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/nutritionist/clinic-bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clinic_client_id: clientId,
          scheduled_at: new Date(scheduledAt).toISOString(),
          duration_minutes: Number(duration) || 30,
          type,
          notes: notes.trim() || undefined,
          payment_method: method || undefined,
          is_paid: isPaid,
          amount_paid_cents:
            amount.trim() === '' ? undefined : Math.round(Number(amount) * 100),
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
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 space-y-4"
      >
        <header className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-fg-1">Schedule visit</h2>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </header>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
            When *
          </span>
          <input
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            required
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
              Duration (min)
            </span>
            <input
              type="number"
              min="5"
              max="240"
              step="5"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 font-mono focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
              Type
            </span>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
            >
              <option value="inClinicVisit">In-clinic visit</option>
              <option value="followUp">Follow-up</option>
              <option value="deepDive">Deep dive</option>
              <option value="introCall">Intro call</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
            Notes
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md bg-bg-deeper border border-border px-3 py-2 text-sm text-fg-1 focus:outline-none focus:border-primary"
          />
        </label>

        <div className="rounded-xl border border-border bg-bg-deeper/40 p-3 space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPaid}
              onChange={(e) => setIsPaid(e.target.checked)}
              className="w-4 h-4 rounded accent-lime-500"
            />
            <span className="text-xs text-fg-1">Already paid</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
                Method
              </span>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as typeof method)}
                className="w-full h-9 rounded-md bg-bg-deeper border border-border px-2 text-xs text-fg-1 focus:outline-none focus:border-primary"
              >
                <option value="">—</option>
                <option value="cash">Cash</option>
                <option value="card">Card (in person)</option>
                <option value="online">Online</option>
                <option value="transfer">Bank transfer</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label className="block">
              <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
                Amount
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full h-9 rounded-md bg-bg-deeper border border-border px-2 text-xs text-fg-1 font-mono focus:outline-none focus:border-primary"
                dir="ltr"
              />
            </label>
          </div>
        </div>

        {err && <p className="text-xs" style={{ color: '#fca5a5' }}>{err}</p>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs shadow-lime-glow border border-lime-600/60 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Schedule'}
          </button>
        </div>
      </form>
    </div>
  )
}

function EditClientModal({
  client,
  onClose,
  onSaved,
}: {
  client: ClinicClient
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const [fullName, setFullName] = useState(client.full_name)
  const [phone, setPhone] = useState(client.phone ?? '')
  const [email, setEmail] = useState(client.email ?? '')
  const [notes, setNotes] = useState(client.notes ?? '')
  const [isActive, setIsActive] = useState(client.is_active)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch(`/api/nutritionist/clinic-clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          notes: notes.trim() || null,
          is_active: isActive,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        setErr(data.error ?? `Save failed (${res.status})`)
        setBusy(false)
        return
      }
      await onSaved()
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
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 space-y-4"
      >
        <header className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-fg-1">Edit client</h2>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </header>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
            Full name *
          </span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
              Phone
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              dir="ltr"
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
            />
          </label>
        </div>
        <label className="block">
          <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
            Notes
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md bg-bg-deeper border border-border px-3 py-2 text-sm text-fg-1 focus:outline-none focus:border-primary"
          />
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="w-4 h-4 rounded accent-lime-500"
          />
          <span className="text-xs text-fg-1">Active</span>
        </label>

        {err && <p className="text-xs" style={{ color: '#fca5a5' }}>{err}</p>}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => !busy && onClose()}
            disabled={busy}
            className="rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs shadow-lime-glow border border-lime-600/60 disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  )
}
