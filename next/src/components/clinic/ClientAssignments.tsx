'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Loader2, Check, UtensilsCrossed, BookOpen } from '@/icons'

/**
 * Coach view of meal plans / recipes assigned to a clinic client. The
 * coach assigns; the linked client checks them off in their dashboard
 * (/dashboard/my-plan). Shows adherence (how many they've actually done).
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
  created_at: string
}

export function ClientAssignments({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ kind: 'meal_plan', title: '', details: '', link: '', due_date: '' })

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/nutritionist/clinic-clients/${clientId}/assignments`, { cache: 'no-store' })
      if (res.ok) setItems(((await res.json()) as { assignments: Assignment[] }).assignments ?? [])
    } finally {
      setLoading(false)
    }
  }, [clientId])
  useEffect(() => {
    void refresh()
  }, [refresh])

  async function add() {
    if (busy || !form.title.trim()) return
    setBusy(true)
    try {
      const res = await fetch(`/api/nutritionist/clinic-clients/${clientId}/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setForm({ kind: 'meal_plan', title: '', details: '', link: '', due_date: '' })
        setAdding(false)
        await refresh()
      }
    } finally {
      setBusy(false)
    }
  }
  async function remove(id: string) {
    if (!confirm('Remove this assignment?')) return
    await fetch(`/api/nutritionist/clinic-assignments/${id}`, { method: 'DELETE' })
    await refresh()
  }

  const done = items.filter((a) => a.status === 'done').length

  return (
    <section>
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-base font-semibold text-fg-1 inline-flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4 text-lime-400" strokeWidth={1.75} />
          Plans &amp; recipes
          {items.length > 0 && (
            <span className="text-xs font-medium text-fg-3">· {done}/{items.length} done</span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-8 px-3 text-xs font-semibold text-fg-1 hover:border-primary/40"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          Assign
        </button>
      </div>

      {adding && (
        <div className="rounded-xl border border-border bg-surface p-4 mb-3 space-y-3">
          <div className="flex gap-2">
            {(['meal_plan', 'recipe'] as const).map((k) => {
              const on = form.kind === k
              return (
                <button key={k} type="button" onClick={() => setForm((f) => ({ ...f, kind: k }))}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-pill text-xs font-semibold"
                  style={{ background: on ? 'rgba(163,230,53,0.16)' : 'var(--gf-input-bg)', color: on ? '#3d6b0a' : 'var(--gf-fg-3)', border: `1px solid ${on ? 'rgba(101,163,13,0.5)' : 'var(--gf-border)'}` }}>
                  {k === 'meal_plan' ? <UtensilsCrossed className="w-3.5 h-3.5" strokeWidth={1.75} /> : <BookOpen className="w-3.5 h-3.5" strokeWidth={1.75} />}
                  {k === 'meal_plan' ? 'Meal plan' : 'Recipe'}
                </button>
              )
            })}
          </div>
          <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder={form.kind === 'recipe' ? 'Recipe name' : 'Plan title (e.g. 1500-kcal Mediterranean)'}
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary" />
          <textarea value={form.details} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} rows={2}
            placeholder="Details / instructions (optional)"
            className="w-full rounded-md bg-bg-deeper border border-border px-3 py-2 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary" />
          <div className="grid grid-cols-2 gap-2">
            <input type="url" value={form.link} onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))}
              placeholder="Link (optional)" dir="ltr"
              className="w-full h-9 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary" />
            <input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="w-full h-9 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="rounded-pill bg-surface-raised border border-border h-8 px-3 text-xs font-semibold text-fg-1">Cancel</button>
            <button type="button" onClick={() => void add()} disabled={busy || !form.title.trim()}
              className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-8 px-4 text-xs border border-lime-600/60 disabled:opacity-50">
              {busy ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center">
          <Loader2 className="w-5 h-5 mx-auto animate-spin text-fg-3" strokeWidth={1.75} />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-6 text-center">
          <p className="text-sm text-fg-2">Nothing assigned yet. Assign a meal plan or recipe — the client checks it off when done.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="rounded-xl border border-border bg-surface p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span
                  className="mt-0.5 inline-flex items-center justify-center w-7 h-7 rounded-full shrink-0"
                  style={{ background: a.status === 'done' ? 'rgba(163,230,53,0.16)' : 'var(--gf-input-bg)', color: a.status === 'done' ? '#a3e635' : 'var(--gf-fg-3)', border: `1px solid ${a.status === 'done' ? 'rgba(101,163,13,0.5)' : 'var(--gf-border)'}` }}
                  title={a.status === 'done' ? 'Completed by client' : 'Not done yet'}>
                  {a.status === 'done' ? <Check className="w-4 h-4" strokeWidth={2.5} /> : (a.kind === 'recipe' ? <BookOpen className="w-3.5 h-3.5" strokeWidth={1.75} /> : <UtensilsCrossed className="w-3.5 h-3.5" strokeWidth={1.75} />)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg-1">
                    {a.title}
                    <span className="ms-2 text-[10px] uppercase tracking-eyebrow text-fg-3">{a.kind === 'recipe' ? 'Recipe' : 'Meal plan'}</span>
                  </p>
                  {a.details && <p className="mt-0.5 text-xs text-fg-2 whitespace-pre-wrap">{a.details}</p>}
                  <p className="mt-1 text-[11px] text-fg-3">
                    {a.status === 'done'
                      ? `Done${a.completed_at ? ` ${new Date(a.completed_at).toLocaleDateString()}` : ''}`
                      : a.due_date ? `Due ${a.due_date}` : 'Assigned'}
                    {a.link && (
                      <>
                        {' · '}
                        <a href={a.link} target="_blank" rel="noopener noreferrer" className="text-lime-500 hover:underline">link</a>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <button type="button" onClick={() => void remove(a.id)} aria-label="Remove"
                className="w-8 h-8 rounded-md inline-flex items-center justify-center text-rose-400 hover:bg-rose-400/10 shrink-0">
                <Trash2 className="w-4 h-4" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
