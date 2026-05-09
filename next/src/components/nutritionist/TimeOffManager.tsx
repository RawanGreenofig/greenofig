'use client'

import { useEffect, useState } from 'react'
import { Calendar, Plus, Trash2 } from 'lucide-react'
import { getBrowserSupabase } from '@/lib/supabase/client'

interface TimeOffRow {
  id: string
  starts_at: string
  ends_at: string
  reason: string | null
}

/**
 * Manages a nutritionist's vacation / time-off windows. The booking
 * availability API (`/api/bookings/availability`) reads from the same
 * table, so any window added here immediately removes those slots from
 * the customer's picker.
 *
 * `nutritionistId` is a prop so this component is reusable from the
 * admin override page (admin edits a different nutritionist's calendar)
 * as well as the nutritionist's own settings page.
 */
export function TimeOffManager({
  nutritionistId,
}: {
  nutritionistId: string | null
}) {
  const [rows, setRows] = useState<TimeOffRow[]>([])
  const [loading, setLoading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!nutritionistId) return
    let cancelled = false
    void (async () => {
      const supabase = getBrowserSupabase()
      if (!supabase) return
      setLoading(true)
      const { data } = await supabase
        .from('nutritionist_time_off')
        .select('id, starts_at, ends_at, reason')
        .eq('nutritionist_id', nutritionistId)
        .order('starts_at', { ascending: true })
      if (cancelled) return
      setRows((data as TimeOffRow[] | null) ?? [])
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [nutritionistId])

  const add = async () => {
    if (!nutritionistId || !startsAt || !endsAt) return
    if (new Date(endsAt) <= new Date(startsAt)) {
      setError('End must be after start.')
      return
    }
    const supabase = getBrowserSupabase()
    if (!supabase) return
    setError(null)
    setAdding(true)
    const { data, error: insertErr } = await supabase
      .from('nutritionist_time_off')
      .insert({
        nutritionist_id: nutritionistId,
        starts_at: new Date(startsAt).toISOString(),
        ends_at: new Date(endsAt).toISOString(),
        reason: reason.trim() || null,
      } as never)
      .select('id, starts_at, ends_at, reason')
      .maybeSingle()
    setAdding(false)
    if (insertErr || !data) {
      setError('Could not save. Please try again.')
      return
    }
    setRows((curr) =>
      [...curr, data as TimeOffRow].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      ),
    )
    setStartsAt('')
    setEndsAt('')
    setReason('')
  }

  const remove = async (id: string) => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    setRows((curr) => curr.filter((r) => r.id !== id))
    await supabase.from('nutritionist_time_off').delete().eq('id', id)
  }

  return (
    <article className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-fg-3" strokeWidth={1.75} />
          <h3 className="text-sm font-semibold text-fg-1">Time off / vacation</h3>
        </div>
        <p className="text-xs text-fg-3">
          Customers won&apos;t see slots inside these windows.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-fg-3">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-fg-3">No time off scheduled.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-bg-deeper/40 px-3 py-2"
            >
              <div className="flex-1 min-w-[220px]">
                <p className="text-sm text-fg-1 font-mono" dir="ltr">
                  {fmtDt(r.starts_at)} → {fmtDt(r.ends_at)}
                </p>
                {r.reason && (
                  <p className="text-xs text-fg-3 mt-0.5">{r.reason}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => remove(r.id)}
                aria-label="Delete time off"
                className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-surface-raised border border-border text-fg-3 hover:text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border pt-4 space-y-3">
        <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
          Add new
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fg-3">Starts</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-fg-3">Ends</span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              className="h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary"
              dir="ltr"
            />
          </label>
        </div>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason (optional) — e.g. conference, vacation"
          maxLength={120}
          className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
        />
        {error && (
          <p className="text-xs" style={{ color: '#fca5a5' }}>{error}</p>
        )}
        <button
          type="button"
          onClick={add}
          disabled={adding || !startsAt || !endsAt || !nutritionistId}
          className="inline-flex items-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-9 px-4 text-xs font-semibold hover:bg-primary/25 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          {adding ? 'Adding…' : 'Add time off'}
        </button>
      </div>
    </article>
  )
}

function fmtDt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
