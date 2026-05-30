'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Loader2, ClipboardList } from '@/icons'

/**
 * Per-client Plan & Progress journal. The coach logs what she GAVE
 * (meal plans), the CHANGES she saw (progress), and free notes — so she
 * always knows what she handed the client and what to give next.
 * Client-submitted updates (from the shareable update link) also land
 * here as 'progress' entries.
 */

type Kind = 'meal_plan' | 'progress' | 'note'
interface LogEntry {
  id: string
  kind: Kind
  body: string
  created_at: string
}

const KIND_META: Record<Kind, { label: string; color: string; bg: string }> = {
  meal_plan: { label: 'Meal plan', color: '#a3e635', bg: 'rgba(163,230,53,0.14)' },
  progress: { label: 'Progress', color: '#4a9ac4', bg: 'rgba(74,154,196,0.14)' },
  note: { label: 'Note', color: '#9baf9f', bg: 'rgba(155,175,159,0.14)' },
}

export function ClientPlanLog({ clientId }: { clientId: string }) {
  const [entries, setEntries] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [kind, setKind] = useState<Kind>('meal_plan')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/nutritionist/clinic-clients/${clientId}/log`, { cache: 'no-store' })
      if (!res.ok) return
      const body = (await res.json()) as { entries: LogEntry[] }
      setEntries(body.entries ?? [])
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function add() {
    if (busy || !text.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`/api/nutritionist/clinic-clients/${clientId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, body: text.trim() }),
      })
      if (res.ok) {
        setText('')
        await refresh()
      }
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this log entry?')) return
    await fetch(`/api/nutritionist/clinic-client-log/${id}`, { method: 'DELETE' })
    await refresh()
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-fg-1 mb-3 inline-flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-lime-400" strokeWidth={1.75} />
        Plan &amp; progress log
      </h2>

      {/* Add entry */}
      <div className="rounded-xl border border-border bg-surface p-4 space-y-3 mb-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(KIND_META) as Kind[]).map((k) => {
            const m = KIND_META[k]
            const on = kind === k
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className="inline-flex items-center h-7 px-3 rounded-pill text-[11px] font-semibold uppercase tracking-eyebrow"
                style={{
                  background: on ? m.bg : 'var(--gf-input-bg)',
                  color: on ? m.color : 'var(--gf-fg-3)',
                  border: `1px solid ${on ? m.color + '66' : 'var(--gf-border)'}`,
                }}
              >
                {m.label}
              </button>
            )
          })}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder={
            kind === 'meal_plan'
              ? 'e.g. Gave 1500-kcal Mediterranean plan v2; added afternoon protein snack.'
              : kind === 'progress'
                ? 'e.g. Down 1.8kg, waist −2cm, energy improved. Increase carbs slightly next.'
                : 'Anything to remember for next time…'
          }
          className="w-full rounded-md bg-bg-deeper border border-border px-3 py-2 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
        />
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => void add()}
            disabled={busy || !text.trim()}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-8 px-4 text-xs shadow-lime-glow border border-lime-600/60 disabled:opacity-50"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            Add to log
          </button>
        </div>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <Loader2 className="w-5 h-5 mx-auto animate-spin text-fg-3" strokeWidth={1.75} />
        </div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center">
          <p className="text-sm text-fg-2">
            Nothing logged yet. Record the meal plan you gave and the progress you see, so you
            know what to adjust next time.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const m = KIND_META[e.kind] ?? KIND_META.note
            return (
              <li key={e.id} className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3">
                <span
                  className="inline-flex items-center shrink-0 mt-0.5"
                  style={{
                    height: 18,
                    padding: '0 8px',
                    borderRadius: 999,
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                    background: m.bg,
                    color: m.color,
                  }}
                >
                  {m.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-fg-1 whitespace-pre-wrap leading-relaxed">{e.body}</p>
                  <p className="mt-1 text-[11px] text-fg-3">
                    {new Date(e.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(e.id)}
                  aria-label="Delete entry"
                  className="w-8 h-8 rounded-md inline-flex items-center justify-center text-rose-400 hover:bg-rose-400/10 shrink-0"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
