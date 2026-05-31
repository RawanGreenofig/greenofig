'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  TrendingUp,
  Check,
  Edit3,
  X,
} from '@/icons'

/**
 * Structured progress for one clinic client: check-in history (body
 * metrics + 1-5 ratings + wins/challenges) the coach or client fills in,
 * plus an AI-assisted analysis of what's improving and what needs work.
 * This is the "real" progress tool — not free-text notes.
 */
interface Assessment {
  id: string
  source: 'coach' | 'client'
  weight_kg: number | null
  waist_cm: number | null
  hip_cm: number | null
  arm_cm: number | null
  thigh_cm: number | null
  energy: number | null
  sleep: number | null
  adherence: number | null
  appetite: number | null
  wins: string | null
  challenges: string | null
  notes: string | null
  created_at: string
}
interface Analysis {
  summary: string | null
  improvements: string | null
  needs_improvement: string | null
  updated_at?: string
}

const EMPTY_FORM = {
  weight_kg: '', waist_cm: '', hip_cm: '', arm_cm: '', thigh_cm: '',
  energy: null as number | null, sleep: null as number | null,
  adherence: null as number | null, appetite: null as number | null,
  wins: '', notes: '',
}

export function ClientProgress({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<Assessment[]>([])
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Analysis>({ summary: '', improvements: '', needs_improvement: '' })

  const refresh = useCallback(async () => {
    try {
      const [aRes, anRes] = await Promise.all([
        fetch(`/api/nutritionist/clinic-clients/${clientId}/assessments`, { cache: 'no-store' }),
        fetch(`/api/nutritionist/clinic-clients/${clientId}/analysis`, { cache: 'no-store' }),
      ])
      if (aRes.ok) setItems(((await aRes.json()) as { assessments: Assessment[] }).assessments ?? [])
      if (anRes.ok) setAnalysis(((await anRes.json()) as { analysis: Analysis | null }).analysis)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function addCheckin() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch(`/api/nutritionist/clinic-clients/${clientId}/assessments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (res.ok) {
        setForm(EMPTY_FORM)
        setAdding(false)
        await refresh()
      }
    } finally {
      setBusy(false)
    }
  }
  async function removeCheckin(id: string) {
    if (!confirm('Delete this check-in?')) return
    await fetch(`/api/nutritionist/clinic-assessments/${id}`, { method: 'DELETE' })
    await refresh()
  }
  async function generate() {
    if (generating) return
    setGenerating(true)
    try {
      const res = await fetch(`/api/nutritionist/clinic-clients/${clientId}/analysis`, { method: 'POST' })
      const data = (await res.json().catch(() => ({}))) as { analysis?: Analysis; error?: string }
      if (res.ok && data.analysis) setAnalysis(data.analysis)
      else alert(data.error ?? 'Could not generate analysis.')
    } finally {
      setGenerating(false)
    }
  }
  function startEdit() {
    setDraft({
      summary: analysis?.summary ?? '',
      improvements: analysis?.improvements ?? '',
      needs_improvement: analysis?.needs_improvement ?? '',
    })
    setEditing(true)
  }
  async function saveEdit() {
    await fetch(`/api/nutritionist/clinic-clients/${clientId}/analysis`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(draft),
    })
    setEditing(false)
    await refresh()
  }

  const setF = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((c) => ({ ...c, [k]: v }))

  // latest weight delta
  const weights = items.filter((a) => a.weight_kg != null)
  const latestW = weights[0]?.weight_kg ?? null
  const prevW = weights[1]?.weight_kg ?? null
  const wDelta = latestW != null && prevW != null ? +(latestW - prevW).toFixed(1) : null

  return (
    <section>
      <h2 className="text-base font-semibold text-fg-1 mb-3 inline-flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-lime-400" strokeWidth={1.75} />
        Progress &amp; analysis
      </h2>

      {/* Analysis card */}
      <div className="rounded-xl border border-border bg-surface p-5 mb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-sm font-semibold text-fg-1">Analysis</p>
          <div className="flex items-center gap-1.5">
            {!editing && (
              <button type="button" onClick={() => void generate()} disabled={generating}
                className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-8 px-3 text-xs shadow-lime-glow border border-lime-600/60 disabled:opacity-50">
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.25} /> : <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />}
                {generating ? 'Analyzing…' : analysis ? 'Regenerate' : 'Generate with AI'}
              </button>
            )}
            {!editing ? (
              <button type="button" onClick={startEdit} aria-label="Edit"
                className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1 hover:bg-surface-raised">
                <Edit3 className="w-4 h-4" strokeWidth={1.75} />
              </button>
            ) : (
              <>
                <button type="button" onClick={() => void saveEdit()}
                  className="inline-flex items-center gap-1 rounded-pill bg-surface-raised border border-border h-8 px-3 text-xs font-semibold text-fg-1">
                  <Check className="w-3.5 h-3.5 text-lime-400" strokeWidth={2} /> Save
                </button>
                <button type="button" onClick={() => setEditing(false)} aria-label="Cancel"
                  className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1">
                  <X className="w-4 h-4" strokeWidth={1.75} />
                </button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-3">
            <EditArea label="Summary" value={draft.summary ?? ''} onChange={(v) => setDraft((d) => ({ ...d, summary: v }))} rows={2} />
            <EditArea label="What's improving" value={draft.improvements ?? ''} onChange={(v) => setDraft((d) => ({ ...d, improvements: v }))} rows={4} />
            <EditArea label="What needs to improve" value={draft.needs_improvement ?? ''} onChange={(v) => setDraft((d) => ({ ...d, needs_improvement: v }))} rows={4} />
          </div>
        ) : analysis && (analysis.summary || analysis.improvements || analysis.needs_improvement) ? (
          <div className="space-y-3">
            {analysis.summary && <p className="text-sm text-fg-1 leading-relaxed">{analysis.summary}</p>}
            <div className="grid md:grid-cols-2 gap-3">
              <AnalysisCol title="Improving" color="#a3e635" bg="rgba(163,230,53,0.08)" text={analysis.improvements} />
              <AnalysisCol title="Needs work" color="#e8912a" bg="rgba(232,145,42,0.08)" text={analysis.needs_improvement} />
            </div>
          </div>
        ) : (
          <p className="text-sm text-fg-2">
            No analysis yet. Record a few check-ins, then tap <b>Generate with AI</b> to see what&rsquo;s
            improving and what to adjust — or write it yourself with the edit button.
          </p>
        )}
      </div>

      {/* Check-in history + add */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-sm font-semibold text-fg-1">
          Check-ins
          {wDelta != null && (
            <span className="ms-2 text-xs font-medium" style={{ color: wDelta <= 0 ? '#a3e635' : '#e8912a' }}>
              {wDelta <= 0 ? '▼' : '▲'} {Math.abs(wDelta)}kg vs last
            </span>
          )}
        </p>
        <button type="button" onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-lime-400 hover:underline">
          <Plus className="w-3.5 h-3.5" strokeWidth={2} /> Add check-in
        </button>
      </div>

      {adding && (
        <div className="rounded-xl border border-border bg-surface p-4 mb-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {(['weight_kg', 'waist_cm', 'hip_cm', 'arm_cm', 'thigh_cm'] as const).map((k) => (
              <label key={k} className="block">
                <span className="block text-[10px] text-fg-3 mb-1">{LABELS[k]}</span>
                <input type="number" step="0.1" min="0" value={form[k]} onChange={(e) => setF(k, e.target.value)}
                  dir="ltr" className="w-full h-9 rounded-md bg-bg-deeper border border-border px-2 text-sm text-fg-1 font-mono focus:outline-none focus:border-primary" />
              </label>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {(['energy', 'sleep', 'adherence', 'appetite'] as const).map((k) => (
              <MiniRating key={k} label={LABELS[k]} value={form[k]} onChange={(v) => setF(k, v)} />
            ))}
          </div>
          <textarea value={form.wins} onChange={(e) => setF('wins', e.target.value)} rows={2} placeholder="Wins"
            className="w-full rounded-md bg-bg-deeper border border-border px-3 py-2 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary" />
          <textarea value={form.notes} onChange={(e) => setF('notes', e.target.value)} rows={2} placeholder="Notes / challenges"
            className="w-full rounded-md bg-bg-deeper border border-border px-3 py-2 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary" />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setAdding(false); setForm(EMPTY_FORM) }}
              className="rounded-pill bg-surface-raised border border-border h-8 px-3 text-xs font-semibold text-fg-1">Cancel</button>
            <button type="button" onClick={() => void addCheckin()} disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-8 px-4 text-xs border border-lime-600/60 disabled:opacity-50">
              {busy ? 'Saving…' : 'Save check-in'}
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
          <p className="text-sm text-fg-2">No check-ins yet. Add one, or send the client their update link.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="rounded-xl border border-border bg-surface p-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-fg-3">{new Date(a.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span className="inline-flex items-center rounded-pill px-2 py-0.5 text-[9px] font-bold uppercase tracking-eyebrow"
                    style={{ background: a.source === 'client' ? 'rgba(74,154,196,0.16)' : 'rgba(155,175,159,0.14)', color: a.source === 'client' ? '#4a9ac4' : 'var(--gf-fg-3)' }}>
                    {a.source === 'client' ? 'From client' : 'Coach'}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-fg-2 font-mono" dir="ltr">
                  {a.weight_kg != null && <span>⚖ {a.weight_kg}kg</span>}
                  {a.waist_cm != null && <span>waist {a.waist_cm}</span>}
                  {a.hip_cm != null && <span>hip {a.hip_cm}</span>}
                  {a.arm_cm != null && <span>arm {a.arm_cm}</span>}
                  {a.thigh_cm != null && <span>thigh {a.thigh_cm}</span>}
                  {a.energy != null && <span>energy {a.energy}/5</span>}
                  {a.sleep != null && <span>sleep {a.sleep}/5</span>}
                  {a.adherence != null && <span>plan {a.adherence}/5</span>}
                  {a.appetite != null && <span>appetite {a.appetite}/5</span>}
                </div>
                {a.wins && <p className="mt-1.5 text-xs text-fg-1"><b className="text-lime-500">Wins:</b> {a.wins}</p>}
                {a.challenges && <p className="mt-1 text-xs text-fg-1"><b style={{ color: '#e8912a' }}>Struggles:</b> {a.challenges}</p>}
                {a.notes && <p className="mt-1 text-xs text-fg-2 whitespace-pre-wrap">{a.notes}</p>}
              </div>
              <button type="button" onClick={() => void removeCheckin(a.id)} aria-label="Delete"
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

const LABELS: Record<string, string> = {
  weight_kg: 'Weight (kg)', waist_cm: 'Waist (cm)', hip_cm: 'Hips (cm)', arm_cm: 'Arm (cm)', thigh_cm: 'Thigh (cm)',
  energy: 'Energy', sleep: 'Sleep', adherence: 'Plan adherence', appetite: 'Appetite',
}

function AnalysisCol({ title, color, bg, text }: { title: string; color: string; bg: string; text: string | null }) {
  return (
    <div className="rounded-lg p-3" style={{ background: bg, border: `1px solid ${color}33` }}>
      <p className="text-[11px] uppercase tracking-eyebrow font-bold mb-1.5" style={{ color }}>{title}</p>
      {text ? (
        <p className="text-xs text-fg-1 whitespace-pre-wrap leading-relaxed">{text}</p>
      ) : (
        <p className="text-xs text-fg-3">—</p>
      )}
    </div>
  )
}
function EditArea({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows}
        className="w-full rounded-md bg-bg-deeper border border-border px-3 py-2 text-sm text-fg-1 focus:outline-none focus:border-primary" />
    </label>
  )
}
function MiniRating({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-fg-2">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const on = value === n
          return (
            <button key={n} type="button" onClick={() => onChange(on ? null : n)}
              className="w-6 h-6 rounded text-[11px] font-semibold"
              style={{ background: on ? 'rgba(163,230,53,0.18)' : 'var(--gf-input-bg)', color: on ? '#3d6b0a' : 'var(--gf-fg-3)', border: `1px solid ${on ? 'rgba(101,163,13,0.5)' : 'var(--gf-border)'}` }}>
              {n}
            </button>
          )
        })}
      </div>
    </div>
  )
}
