'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Loader2, UtensilsCrossed, BookOpen, ExternalLink } from '@/icons'

/**
 * /dashboard/my-plan — a linked walk-in client sees the meal plans /
 * recipes their coach assigned and checks them off when done. Checking
 * one signals adherence back to the coach (and feeds her AI analysis).
 */
interface Assignment {
  id: string
  kind: 'meal_plan' | 'recipe'
  title: string
  details: string | null
  link: string | null
  status: 'assigned' | 'done'
  due_date: string | null
  completed_at: string | null
}

export default function MyPlanPage() {
  const [items, setItems] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/my-plan', { cache: 'no-store' })
      if (res.ok) setItems(((await res.json()) as { assignments: Assignment[] }).assignments ?? [])
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => {
    void refresh()
  }, [refresh])

  async function toggle(a: Assignment) {
    if (pending) return
    setPending(a.id)
    // optimistic
    setItems((cur) => cur.map((x) => (x.id === a.id ? { ...x, status: x.status === 'done' ? 'assigned' : 'done' } : x)))
    try {
      await fetch(`/api/clinic-assignments/${a.id}/toggle`, { method: 'POST' })
      await refresh()
    } finally {
      setPending(null)
    }
  }

  const done = items.filter((a) => a.status === 'done').length

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-md mx-auto space-y-5">
      <header>
        <h1 className="font-display font-bold text-fg-1 tracking-tight" style={{ fontSize: 'clamp(24px,4vw,34px)', lineHeight: 1.1 }}>
          My plan
        </h1>
        <p className="mt-2 text-sm text-fg-2">
          What your coach assigned. Tap the circle when you&rsquo;ve done it — she&rsquo;ll see your progress.
          {items.length > 0 && <b className="ms-1 text-fg-1">{done}/{items.length} done.</b>}
        </p>
      </header>

      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-10 text-center">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-fg-3" strokeWidth={1.75} />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center">
          <p className="text-sm text-fg-2">Nothing assigned yet. Your coach will add meal plans and recipes here.</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {items.map((a) => {
            const isDone = a.status === 'done'
            return (
              <li key={a.id} className="rounded-xl border border-border bg-surface p-4 flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => void toggle(a)}
                  disabled={pending === a.id}
                  aria-label={isDone ? 'Mark not done' : 'Mark done'}
                  className="mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-full shrink-0 transition-colors"
                  style={{
                    background: isDone ? 'var(--gf-lime-400)' : 'transparent',
                    border: `2px solid ${isDone ? 'var(--gf-lime-400)' : 'var(--gf-border)'}`,
                    color: isDone ? '#fff' : 'var(--gf-fg-3)',
                  }}
                >
                  {pending === a.id ? <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2} /> : isDone ? <Check className="w-4 h-4" strokeWidth={3} /> : null}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold" style={{ color: isDone ? 'var(--gf-fg-3)' : 'var(--gf-fg-1)', textDecoration: isDone ? 'line-through' : 'none' }}>
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-eyebrow text-fg-3 inline-flex items-center gap-1">
                    {a.kind === 'recipe' ? <BookOpen className="w-3 h-3" strokeWidth={1.75} /> : <UtensilsCrossed className="w-3 h-3" strokeWidth={1.75} />}
                    {a.kind === 'recipe' ? 'Recipe' : 'Meal plan'}
                    {a.due_date && !isDone && <span className="normal-case tracking-normal">· due {a.due_date}</span>}
                  </p>
                  {a.details && <p className="mt-1.5 text-xs text-fg-2 whitespace-pre-wrap leading-relaxed">{a.details}</p>}
                  {a.link && (
                    <a href={a.link} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs text-lime-500 hover:underline">
                      <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
                      Open
                    </a>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
