'use client'

import { useCallback, useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import {
  Plus,
  X,
  Check,
  Trash2,
  Loader2,
  Edit3,
  AlertTriangle,
  CreditCard,
  Send,
} from '@/icons'

/**
 * Payment ledger for one walk-in clinic client. Lists charges/payments
 * with amounts and DUE DATES, lets the coach add/edit/mark-paid/delete,
 * and shows what's outstanding vs overdue. Overdue rows are surfaced in
 * the notification bell by the /due-check route when the coach opens the
 * clinic area.
 */

interface Payment {
  id: string
  amount_cents: number
  currency: string
  status: 'due' | 'paid'
  due_date: string | null
  paid_at: string | null
  method: 'cash' | 'card' | 'transfer' | 'online' | 'other' | null
  notes: string | null
  created_at: string
}

type Draft = {
  id?: string
  amount: string
  currency: string
  due_date: string
  method: '' | 'cash' | 'card' | 'transfer' | 'online' | 'other'
  status: 'due' | 'paid'
  notes: string
}

const EMPTY: Draft = {
  amount: '',
  currency: 'USD',
  due_date: '',
  method: '',
  status: 'due',
  notes: '',
}

const todayISO = () => new Date().toISOString().slice(0, 10)
const fmtMoney = (cents: number, currency: string) =>
  `${(cents / 100).toFixed(2)} ${currency}`
const isOverdue = (p: Payment) =>
  p.status === 'due' && !!p.due_date && p.due_date < todayISO()

export function ClientPayments({ clientId }: { clientId: string }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Draft | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const locale = useLocale()

  const copyPayLink = async (p: Payment) => {
    const url = `${window.location.origin}/${locale}/clinic-pay/${p.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedId(p.id)
      setTimeout(() => setCopiedId((c) => (c === p.id ? null : c)), 2000)
    } catch {
      window.prompt('Copy this pay link to send the client:', url)
    }
  }

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/nutritionist/clinic-clients/${clientId}/payments`,
        { cache: 'no-store' },
      )
      if (!res.ok) return
      const body = (await res.json()) as { payments: Payment[] }
      setPayments(body.payments ?? [])
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const outstanding = payments
    .filter((p) => p.status === 'due')
    .reduce((sum, p) => sum + p.amount_cents, 0)
  const paidTotal = payments
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount_cents, 0)
  const overdueCount = payments.filter(isOverdue).length
  const currency = payments[0]?.currency ?? 'USD'

  async function markPaid(p: Payment) {
    await fetch(`/api/nutritionist/clinic-payments/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' }),
    })
    await refresh()
  }
  async function reopen(p: Payment) {
    await fetch(`/api/nutritionist/clinic-payments/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'due' }),
    })
    await refresh()
  }
  async function remove(p: Payment) {
    if (!confirm('Delete this payment record? This cannot be undone.')) return
    await fetch(`/api/nutritionist/clinic-payments/${p.id}`, { method: 'DELETE' })
    await refresh()
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-base font-semibold text-fg-1 inline-flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-lime-400" strokeWidth={1.75} />
          Payments
        </h2>
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY })}
          className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-8 px-3 text-xs font-semibold text-fg-1 hover:border-primary/40"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Add payment
        </button>
      </div>

      {!loading && payments.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface border border-border px-3 h-7 text-xs text-fg-2">
            Outstanding{' '}
            <b className={outstanding > 0 ? 'text-fg-1' : 'text-fg-3'} dir="ltr">
              {fmtMoney(outstanding, currency)}
            </b>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-pill bg-surface border border-border px-3 h-7 text-xs text-fg-2">
            Paid <b className="text-fg-1" dir="ltr">{fmtMoney(paidTotal, currency)}</b>
          </span>
          {overdueCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-pill bg-rose-500/15 text-rose-400 px-3 h-7 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.75} />
              {overdueCount} overdue
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <Loader2 className="w-5 h-5 mx-auto animate-spin text-fg-3" strokeWidth={1.75} />
        </div>
      ) : payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
          <p className="text-sm text-fg-2">
            No payments recorded. Add a charge with a due date and you&apos;ll be
            notified when it&apos;s due.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {payments.map((p) => {
            const overdue = isOverdue(p)
            return (
              <li
                key={p.id}
                className="rounded-xl border bg-surface p-4 flex items-start justify-between gap-3 flex-wrap"
                style={{ borderColor: overdue ? 'rgba(244,63,94,0.4)' : 'var(--gf-border)' }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-fg-1 font-mono" dir="ltr">
                      {fmtMoney(p.amount_cents, p.currency)}
                    </span>
                    <StatusPill status={p.status} overdue={overdue} />
                    {p.method && (
                      <span className="text-[11px] text-fg-3 capitalize">{p.method}</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-fg-3">
                    {p.status === 'paid'
                      ? `Paid${p.paid_at ? ` ${new Date(p.paid_at).toLocaleDateString()}` : ''}`
                      : p.due_date
                        ? `Due ${p.due_date}`
                        : 'No due date'}
                  </p>
                  {p.notes && (
                    <p className="mt-1.5 text-xs text-fg-2 whitespace-pre-wrap">{p.notes}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {p.status === 'due' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void copyPayLink(p)}
                        title="Copy a card / Zelle pay link to send the client"
                        className="inline-flex items-center gap-1 rounded-pill bg-surface-raised border border-border h-8 px-3 text-[11px] font-semibold text-fg-2 hover:text-fg-1"
                      >
                        {copiedId === p.id ? (
                          <Check className="w-3 h-3 text-lime-400" strokeWidth={2} />
                        ) : (
                          <Send className="w-3 h-3" strokeWidth={2} />
                        )}
                        {copiedId === p.id ? 'Copied!' : 'Pay link'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void markPaid(p)}
                        className="inline-flex items-center gap-1 rounded-pill bg-surface-raised border border-border h-8 px-3 text-[11px] font-semibold text-fg-2 hover:text-fg-1"
                      >
                        <Check className="w-3 h-3" strokeWidth={2} />
                        Mark paid
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void reopen(p)}
                      className="rounded-pill bg-surface-raised border border-border h-8 px-3 text-[11px] font-semibold text-fg-3 hover:text-fg-1"
                    >
                      Reopen
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setEditing({
                        id: p.id,
                        amount: (p.amount_cents / 100).toFixed(2),
                        currency: p.currency,
                        due_date: p.due_date ?? '',
                        method: p.method ?? '',
                        status: p.status,
                        notes: p.notes ?? '',
                      })
                    }
                    aria-label="Edit"
                    className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1 hover:bg-surface-raised"
                  >
                    <Edit3 className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(p)}
                    aria-label="Delete"
                    className="w-8 h-8 rounded-md inline-flex items-center justify-center text-rose-400 hover:bg-rose-400/10"
                  >
                    <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editing && (
        <PaymentModal
          clientId={clientId}
          draft={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null)
            await refresh()
          }}
        />
      )}
    </section>
  )
}

function StatusPill({ status, overdue }: { status: 'due' | 'paid'; overdue: boolean }) {
  const map = overdue
    ? { bg: 'rgba(244,63,94,0.16)', color: '#fb7185', label: 'Overdue' }
    : status === 'paid'
      ? { bg: 'rgba(163,230,53,0.16)', color: '#a3e635', label: 'Paid' }
      : { bg: 'rgba(232,145,42,0.16)', color: '#e8912a', label: 'Due' }
  return (
    <span
      className="inline-flex items-center"
      style={{
        height: 18,
        padding: '0 8px',
        borderRadius: 999,
        fontSize: 9.5,
        fontWeight: 800,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        lineHeight: 1,
        background: map.bg,
        color: map.color,
      }}
    >
      {map.label}
    </span>
  )
}

function PaymentModal({
  clientId,
  draft,
  onClose,
  onSaved,
}: {
  clientId: string
  draft: Draft
  onClose: () => void
  onSaved: () => void | Promise<void>
}) {
  const [d, setD] = useState<Draft>(draft)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((c) => ({ ...c, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    const amountNum = Number(d.amount)
    if (!Number.isFinite(amountNum) || amountNum < 0 || d.amount.trim() === '') {
      setErr('Enter a valid amount.')
      return
    }
    setBusy(true)
    setErr(null)
    const payload = {
      amount_cents: Math.round(amountNum * 100),
      currency: d.currency.trim() || 'USD',
      due_date: d.due_date || null,
      method: d.method || null,
      status: d.status,
      notes: d.notes.trim() || null,
    }
    try {
      const res = d.id
        ? await fetch(`/api/nutritionist/clinic-payments/${d.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch(`/api/nutritionist/clinic-clients/${clientId}/payments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
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
          <h2 className="text-lg font-bold text-fg-1">
            {d.id ? 'Edit payment' : 'Add payment'}
          </h2>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="grid grid-cols-3 gap-3">
          <label className="block col-span-2">
            <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
              Amount *
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={d.amount}
              onChange={(e) => set('amount', e.target.value)}
              placeholder="0.00"
              dir="ltr"
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 font-mono focus:outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
              Currency
            </span>
            <input
              type="text"
              value={d.currency}
              onChange={(e) => set('currency', e.target.value.toUpperCase())}
              maxLength={8}
              dir="ltr"
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
              Due date
            </span>
            <input
              type="date"
              value={d.due_date}
              onChange={(e) => set('due_date', e.target.value)}
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
              Method
            </span>
            <select
              value={d.method}
              onChange={(e) => set('method', e.target.value as Draft['method'])}
              className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
            >
              <option value="">—</option>
              <option value="cash">Cash</option>
              <option value="card">Card (in person)</option>
              <option value="online">Online</option>
              <option value="transfer">Bank transfer</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={d.status === 'paid'}
            onChange={(e) => set('status', e.target.checked ? 'paid' : 'due')}
            className="w-4 h-4 rounded accent-lime-500"
          />
          <span className="text-xs text-fg-1">Already paid</span>
        </label>

        <label className="block">
          <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
            Notes
          </span>
          <textarea
            value={d.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={2}
            placeholder="e.g. 1st installment of 3, package deal…"
            className="w-full rounded-md bg-bg-deeper border border-border px-3 py-2 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
          />
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
            {busy ? 'Saving…' : d.id ? 'Save' : 'Add payment'}
          </button>
        </div>
      </form>
    </div>
  )
}
