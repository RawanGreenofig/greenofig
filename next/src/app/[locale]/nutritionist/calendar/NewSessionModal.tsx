'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'
import { X, Plus } from '@/icons'
import { getBrowserSupabase } from '@/lib/supabase/client'

type ClientKind = 'online' | 'walkin'
type OnlineType = 'introCall' | 'followUp' | 'deepDive'
type PaymentMethod = 'cash' | 'card' | 'transfer' | 'other'

interface OnlineClient {
  id: string
  full_name: string | null
}
interface WalkInClient {
  id: string
  full_name: string
}

export interface NewSessionModalProps {
  coachId: string
  isHeadCoach: boolean
  /** Pre-selected day `YYYY-MM-DD` from the calendar, if any. */
  defaultDate: string | null
  onClose: () => void
  /** Called after a booking is created so the calendar can reload. */
  onCreated: () => void
}

export default function NewSessionModal({
  coachId,
  isHeadCoach,
  defaultDate,
  onClose,
  onCreated,
}: NewSessionModalProps) {
  const t = useTranslations('nutritionist.calendarPage.modal')
  const tBookings = useTranslations('bookings')

  const [kind, setKind] = useState<ClientKind>('online')
  const [online, setOnline] = useState<OnlineClient[]>([])
  const [walkIns, setWalkIns] = useState<WalkInClient[]>([])
  const [loadingClients, setLoadingClients] = useState(true)

  const [clientId, setClientId] = useState('')
  const [onlineType, setOnlineType] = useState<OnlineType>('introCall')
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('09:00')
  const [duration, setDuration] = useState(30)
  const [notes, setNotes] = useState('')

  // Walk-in payment tracking.
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [isPaid, setIsPaid] = useState(true)
  const [amount, setAmount] = useState('')

  const [busy, setBusy] = useState(false)

  // Load both client lists once on mount.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const supabase = getBrowserSupabase()
        const onlineP = supabase
          ? (async () => {
              await supabase.auth.getSession()
              let q = supabase
                .from('profiles')
                .select('id, full_name')
                .eq('role', 'user')
                .order('full_name', { ascending: true })
                .limit(200)
              if (!isHeadCoach) q = q.eq('assigned_coach_id', coachId)
              const { data } = await q
              return (data as OnlineClient[] | null) ?? []
            })()
          : Promise.resolve<OnlineClient[]>([])

        const walkP = fetch('/api/nutritionist/clinic-clients')
          .then((r) => (r.ok ? r.json() : { clients: [] }))
          .then((j) => (j.clients as WalkInClient[] | undefined) ?? [])
          .catch(() => [] as WalkInClient[])

        const [on, wk] = await Promise.all([onlineP, walkP])
        if (cancelled) return
        setOnline(on)
        setWalkIns(wk)
      } finally {
        if (!cancelled) setLoadingClients(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [coachId, isHeadCoach])

  // Keep the client dropdown valid when switching client type.
  useEffect(() => {
    setClientId('')
  }, [kind])

  const currentList = kind === 'online' ? online : walkIns
  const onlineDuration = useMemo(
    () => (onlineType === 'introCall' ? 20 : onlineType === 'followUp' ? 30 : 60),
    [onlineType],
  )

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId) {
      toast.error(t('pickClient'))
      return
    }
    setBusy(true)
    try {
      let res: Response
      if (kind === 'online') {
        res = await fetch('/api/nutritionist/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            type: onlineType,
            date,
            time,
            notes: notes || null,
          }),
        })
      } else {
        // Walk-in: combine the local date + time into an absolute instant.
        const scheduledAt = new Date(`${date}T${time}:00`)
        res = await fetch('/api/nutritionist/clinic-bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clinic_client_id: clientId,
            scheduled_at: scheduledAt.toISOString(),
            duration_minutes: duration,
            type: 'inClinicVisit',
            notes: notes || null,
            payment_method: method,
            is_paid: isPaid,
            amount_paid_cents: amount ? Math.round(parseFloat(amount) * 100) : null,
          }),
        })
      }

      if (res.ok) {
        toast.success(t('created'))
        onCreated()
        onClose()
        return
      }

      let errBody: { error?: string } = {}
      try {
        errBody = await res.json()
      } catch {
        /* non-JSON error */
      }
      if (res.status === 409 || errBody.error === 'slot_taken') {
        toast.error(t('slotTaken'))
      } else {
        toast.error(t('failed'))
      }
    } catch {
      toast.error(t('failed'))
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary'
  const labelCls =
    'text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5 block'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 space-y-5 max-h-[90vh] overflow-y-auto"
      >
        <header className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-bold text-fg-1">{t('title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-3 hover:text-fg-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </header>

        {/* Client type toggle */}
        <div>
          <span className={labelCls}>{t('clientType')}</span>
          <div className="inline-flex items-center gap-0.5 rounded-pill bg-bg-deeper border border-border p-1 w-full">
            {(['online', 'walkin'] as ClientKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`flex-1 h-8 rounded-pill text-xs font-semibold transition-colors ${
                  kind === k
                    ? 'bg-primary/20 text-lime-400'
                    : 'text-fg-3 hover:text-fg-1'
                }`}
              >
                {k === 'online' ? t('online') : t('walkIn')}
              </button>
            ))}
          </div>
        </div>

        {/* Client select */}
        <label className="block">
          <span className={labelCls}>{t('selectClient')}</span>
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={loadingClients}
            className={inputCls}
          >
            <option value="">{t('selectClientPlaceholder')}</option>
            {currentList.map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name || '—'}
              </option>
            ))}
          </select>
          {!loadingClients && currentList.length === 0 && (
            <p className="mt-1.5 text-xs text-fg-3">
              {kind === 'online' ? t('noOnline') : t('noWalkIns')}
            </p>
          )}
        </label>

        {/* Session type */}
        <div>
          <span className={labelCls}>{t('sessionType')}</span>
          {kind === 'online' ? (
            <select
              value={onlineType}
              onChange={(e) => setOnlineType(e.target.value as OnlineType)}
              className={inputCls}
            >
              <option value="introCall">{tBookings('introCall')}</option>
              <option value="followUp">{tBookings('followUp')}</option>
              <option value="deepDive">{tBookings('deepDive')}</option>
            </select>
          ) : (
            <div className={`${inputCls} flex items-center text-fg-2`}>
              {t('inClinicVisit')}
            </div>
          )}
        </div>

        {/* Date + time */}
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelCls}>{t('date')}</span>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls}
            />
          </label>
          <label className="block">
            <span className={labelCls}>{t('time')}</span>
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputCls}
            />
          </label>
        </div>

        {/* Duration — auto for online, editable for walk-in */}
        {kind === 'walkin' && (
          <label className="block">
            <span className={labelCls}>{t('duration')}</span>
            <input
              type="number"
              min={5}
              max={480}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className={inputCls}
            />
          </label>
        )}

        {/* Walk-in payment */}
        {kind === 'walkin' && (
          <div>
            <span className={labelCls}>{t('payment')}</span>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className={inputCls}
                aria-label={t('paymentMethod')}
              >
                <option value="cash">{t('cash')}</option>
                <option value="card">{t('card')}</option>
                <option value="transfer">{t('transfer')}</option>
                <option value="other">{t('other')}</option>
              </select>
              <input
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t('amount')}
                className={inputCls}
              />
            </div>
            <label className="mt-2 inline-flex items-center gap-2 text-sm text-fg-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPaid}
                onChange={(e) => setIsPaid(e.target.checked)}
                className="accent-lime-500"
              />
              {t('markPaid')}
            </label>
          </div>
        )}

        {/* Notes */}
        <label className="block">
          <span className={labelCls}>{t('notes')}</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('notesPlaceholder')}
            rows={2}
            className="w-full rounded-md bg-bg-deeper border border-border px-3 py-2 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary resize-none"
          />
        </label>

        {kind === 'online' && (
          <p className="text-xs text-fg-3">
            {tBookings('min', { count: onlineDuration })}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
          >
            {t('cancel')}
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs shadow-lime-glow border border-lime-600/60 disabled:opacity-50 disabled:cursor-wait"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
            {busy ? t('creating') : t('create')}
          </button>
        </div>
      </form>
    </div>
  )
}
