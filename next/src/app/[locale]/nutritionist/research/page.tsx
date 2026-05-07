'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  Search,
  Send,
  Sparkles,
  Bookmark,
  Copy,
  RefreshCw,
  FileText,
  Plus,
  Microscope,
  Check,
  Library,
} from 'lucide-react'

interface Doc {
  id: string
  name: string
  uploadedISO: string
  sizeMb: number
}

interface Source {
  docId: string
  passage: string
}

interface Turn {
  id: string
  role: 'user' | 'assistant'
  body: string
  sources?: Source[]
  saved?: boolean
}

const DOCS: Doc[] = [
  { id: 'd1', name: 'NIH — Magnesium fact sheet 2024.pdf',                       uploadedISO: '2026-04-12', sizeMb: 1.4 },
  { id: 'd2', name: 'Hawley et al — Protein timing & MPS.pdf',                   uploadedISO: '2026-03-30', sizeMb: 2.1 },
  { id: 'd3', name: 'Mediterranean diet & PCOS systematic review.pdf',           uploadedISO: '2026-03-18', sizeMb: 3.6 },
  { id: 'd4', name: 'Vitamin D guidelines — Endocrine Society 2023.pdf',         uploadedISO: '2026-02-22', sizeMb: 0.9 },
  { id: 'd5', name: 'Intermittent fasting — women specific responses.pdf',      uploadedISO: '2026-02-05', sizeMb: 4.2 },
]

const PRESET_ANSWER =
  "Magnesium glycinate generally reaches peak plasma concentration faster than citrate (about 90 minutes vs. 2.5 hours), and it tends to be better tolerated by clients with sensitive GI systems because glycine acts as a buffering ligand. For sleep onset specifically, the literature is mixed, but the small RCTs that show benefit (Abbasi 2012, Boyle 2017) used 200–400 mg of elemental magnesium 60–90 min before bed.\n\nClinically, I would start at 200 mg glycinate 60 min before bed, hold for 14 days, and use sleep latency as the outcome rather than sleep quality scores."

export default function ResearchPage() {
  const t = useTranslations('nutritionist.researchPage')
  const tNut = useTranslations('nutritionist')

  const [query, setQuery] = useState('')
  const [docQuery, setDocQuery] = useState('')
  const [docs, setDocs] = useState<Doc[]>(DOCS)
  const [turns, setTurns] = useState<Turn[]>([])
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [thinking, setThinking] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Hydrate document library
  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    void (async () => {
      type Row = { id: string; name: string; size_mb: number; created_at: string }
      const { data } = await supabase
        .from('research_documents')
        .select('id, name, size_mb, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
      if (cancelled) return
      const rows = (data as Row[] | null) ?? []
      if (rows.length === 0) return
      setDocs(rows.map((r) => ({
        id: r.id,
        name: r.name,
        sizeMb: r.size_mb,
        uploadedISO: r.created_at,
      })))
    })()
    return () => { cancelled = true }
  }, [])

  const visibleDocs = docs.filter((d) =>
    d.name.toLowerCase().includes(docQuery.trim().toLowerCase()),
  )
  const savedAnswers = turns.filter((t) => t.role === 'assistant' && t.saved)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [turns.length, thinking])

  const ask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim() || thinking) return
    const q = query.trim()
    setQuery('')
    setTurns((curr) => [
      ...curr,
      { id: `u-${Date.now()}`, role: 'user', body: q },
    ])
    setThinking(true)

    void (async () => {
      try {
        const res = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q, conversationId }),
        })
        if (res.ok) {
          const data = (await res.json()) as {
            answer: string
            sources: { docId: string; passage: string }[]
            conversationId: string
          }
          setConversationId(data.conversationId || null)
          setTurns((curr) => [
            ...curr,
            {
              id: `a-${Date.now()}`,
              role: 'assistant',
              body: data.answer,
              sources: data.sources ?? [],
            },
          ])
          setThinking(false)
          return
        }
      } catch {
        /* fall through to demo answer */
      }
      // Fallback demo answer (env unset / API error)
      setTurns((curr) => [
        ...curr,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          body: PRESET_ANSWER,
          sources: [
            { docId: 'd1', passage: 'Magnesium glycinate has been shown to be highly bioavailable in clinical settings…' },
            { docId: 'd5', passage: 'Female-specific responses to magnesium intake during luteal phase…' },
          ],
        },
      ])
      setThinking(false)
    })()
  }

  const tryExample = (key: '1' | '2' | '3') => {
    setQuery(t(`askPrompt.examples.${key}` as 'askPrompt.examples.1'))
  }

  const toggleSave = (id: string) =>
    setTurns((curr) =>
      curr.map((tn) =>
        tn.id === id && tn.role === 'assistant' ? { ...tn, saved: !tn.saved } : tn,
      ),
    )

  const regenerate = (id: string) => {
    const idx = turns.findIndex((t) => t.id === id)
    if (idx <= 0) return
    setThinking(true)
    setTurns((curr) => curr.filter((_, i) => i !== idx))
    window.setTimeout(() => {
      setTurns((curr) => [
        ...curr,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          body: PRESET_ANSWER,
          sources: [{ docId: 'd1', passage: 'Magnesium glycinate has been shown…' }],
        },
      ])
      setThinking(false)
    }, 900)
  }

  return (
    <div className="flex flex-col lg:flex-row gap-0 lg:gap-0 h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] max-w-screen-2xl mx-auto">
      {/* Library */}
      <aside className="w-full lg:w-72 lg:shrink-0 lg:border-e border-b lg:border-b-0 border-border bg-surface/40 flex flex-col">
        <header className="px-4 py-4 border-b border-border space-y-3">
          <div className="flex items-center gap-2">
            <Library className="w-4 h-4 text-lime-400" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-fg-1">{t('library')}</h2>
          </div>
          <button
            type="button"
            className="w-full inline-flex items-center justify-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-9 px-4 text-xs font-semibold hover:bg-primary/25"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            {t('addDocument')}
          </button>
          <div className="relative">
            <Search
              className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-3"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={docQuery}
              onChange={(e) => setDocQuery(e.target.value)}
              placeholder={t('documentSearch')}
              className="w-full h-9 rounded-pill bg-bg-deeper border border-border ps-9 pe-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          {visibleDocs.length === 0 ? (
            <div className="p-6 text-center">
              <FileText className="w-7 h-7 mx-auto mb-2 text-fg-3" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-fg-1">{t('noDocuments')}</p>
              <p className="mt-1 text-xs text-fg-3">{t('noDocumentsBody')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {visibleDocs.map((d) => (
                <li
                  key={d.id}
                  className="px-4 py-3 hover:bg-surface-raised flex items-start gap-3"
                >
                  <span className="shrink-0 w-9 h-9 rounded-md bg-bg-deeper border border-border inline-flex items-center justify-center">
                    <FileText
                      className="w-4 h-4 text-lime-400"
                      strokeWidth={1.5}
                    />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-fg-1 leading-tight line-clamp-2">
                      {d.name}
                    </p>
                    <p className="mt-1 text-[10px] text-fg-3 font-mono" dir="ltr">
                      {t('uploaded', {
                        date: new Date(d.uploadedISO).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        }),
                      })}{' '}
                      · {t('sizeMb', { size: d.sizeMb })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Saved answers */}
        <div className="border-t border-border">
          <div className="px-4 py-3 flex items-center gap-2">
            <Bookmark className="w-3.5 h-3.5 text-lime-400" strokeWidth={1.75} />
            <h3 className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
              {t('savedAnswers')}
            </h3>
          </div>
          {savedAnswers.length === 0 ? (
            <p className="px-4 pb-4 text-[11px] text-fg-3 leading-relaxed">
              {t('noSavedYet')}
            </p>
          ) : (
            <ul className="px-2 pb-3 space-y-1 max-h-40 overflow-y-auto">
              {savedAnswers.map((a) => (
                <li
                  key={a.id}
                  className="rounded-md bg-bg-deeper/40 border border-border px-3 py-2 text-xs text-fg-1 line-clamp-2"
                >
                  {a.body}
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      {/* Conversation */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="shrink-0 px-4 md:px-6 py-4 border-b border-border bg-surface/60 backdrop-blur flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <h1
              className="font-display font-bold text-fg-1 tracking-tight"
              style={{ fontSize: 'clamp(20px, 2.5vw, 24px)', lineHeight: 1.1 }}
            >
              {tNut('research')}
            </h1>
            <p className="text-xs text-fg-3 mt-0.5">{t('subtitle')}</p>
          </div>
          <button
            type="button"
            onClick={() => setTurns([])}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            {t('newConversation')}
          </button>
        </header>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 md:px-8 py-6"
        >
          {turns.length === 0 && !thinking ? (
            <EmptyPrompt t={t} onPick={tryExample} />
          ) : (
            <ul className="space-y-6 max-w-3xl mx-auto">
              {turns.map((turn) => (
                <Turn
                  key={turn.id}
                  t={t}
                  turn={turn}
                  docs={docs}
                  onToggleSave={() => toggleSave(turn.id)}
                  onRegenerate={() => regenerate(turn.id)}
                />
              ))}
              {thinking && <ThinkingBubble t={t} />}
            </ul>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={ask}
          className="shrink-0 border-t border-border bg-surface px-3 md:px-6 py-3"
        >
          <div className="max-w-3xl mx-auto flex items-end gap-2">
            <div className="flex-1 relative">
              <Microscope
                className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3"
                strokeWidth={1.75}
              />
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    ask(e as unknown as React.FormEvent)
                  }
                }}
                rows={1}
                placeholder={t('askPlaceholder')}
                maxLength={1500}
                className="w-full min-h-[40px] max-h-32 resize-none rounded-2xl bg-bg-deeper border border-border ps-10 pe-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary leading-snug"
              />
            </div>
            <button
              type="submit"
              disabled={!query.trim() || thinking}
              aria-label={t('send')}
              className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-b from-lime-400 to-lime-600 text-bg shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-40 disabled:hover:translate-y-0"
            >
              <Send className="w-4 h-4 rtl:-scale-x-100" strokeWidth={2.25} />
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

function EmptyPrompt({
  t,
  onPick,
}: {
  t: ReturnType<typeof useTranslations>
  onPick: (k: '1' | '2' | '3') => void
}) {
  return (
    <div className="max-w-2xl mx-auto py-8 text-center">
      <Microscope
        className="w-8 h-8 text-primary mx-auto mb-5"
        strokeWidth={1.75}
      />
      <h2 className="font-display text-xl md:text-2xl font-bold text-fg-1 tracking-tight">
        {t('askPrompt.title')}
      </h2>
      <p className="mt-2 text-sm text-fg-2 leading-relaxed max-w-md mx-auto">
        {t('askPrompt.body')}
      </p>
      <ul className="mt-6 space-y-2 max-w-md mx-auto">
        {(['1', '2', '3'] as const).map((k) => (
          <li key={k}>
            <button
              type="button"
              onClick={() => onPick(k)}
              className="w-full text-start rounded-lg border border-border bg-surface px-4 py-3 text-sm text-fg-1 hover:border-primary/40 transition-colors flex items-start gap-2"
            >
              <Sparkles
                className="w-3.5 h-3.5 text-lime-400 mt-0.5 shrink-0"
                strokeWidth={2}
              />
              {t(`askPrompt.examples.${k}` as 'askPrompt.examples.1')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Turn({
  t,
  turn,
  docs,
  onToggleSave,
  onRegenerate,
}: {
  t: ReturnType<typeof useTranslations>
  turn: Turn
  docs: Doc[]
  onToggleSave: () => void
  onRegenerate: () => void
}) {
  if (turn.role === 'user') {
    return (
      <li className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl bg-gradient-to-b from-lime-400 to-lime-600 text-bg rounded-br-md px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed">
          {turn.body}
        </div>
      </li>
    )
  }
  return (
    <li>
      <div className="flex items-start gap-3">
        <span
          className="shrink-0 w-9 h-9 rounded-full inline-flex items-center justify-center"
          style={{ background: 'rgb(61 122 74 / 0.18)', color: 'var(--gf-lime-400)' }}
        >
          <Microscope className="w-4 h-4" strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0 rounded-2xl border border-border bg-surface px-5 py-4">
          <p className="text-sm text-fg-1 whitespace-pre-wrap leading-relaxed">
            {turn.body}
          </p>
          {turn.sources && turn.sources.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-2">
                {t('sources')}
              </p>
              <ul className="space-y-1.5">
                {turn.sources.map((src, i) => {
                  const doc = docs.find((d) => d.id === src.docId)
                  return (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-xs text-fg-2"
                    >
                      <span
                        className="shrink-0 w-5 h-5 rounded bg-primary/15 text-lime-400 inline-flex items-center justify-center font-mono text-[10px] font-bold"
                        dir="ltr"
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-fg-1 font-medium leading-snug truncate">
                          {doc?.name ?? src.docId}
                        </p>
                        <p className="text-fg-3 line-clamp-1 italic">
                          {src.passage}
                        </p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          <div className="mt-4 flex items-center gap-1">
            <ActionBtn
              Icon={Bookmark}
              label={turn.saved ? t('savedAnswerLabel') : t('saveAnswer')}
              active={turn.saved}
              onClick={onToggleSave}
              activeIcon={turn.saved ? Check : undefined}
            />
            <ActionBtn Icon={Copy}     label={t('copyAnswer')} />
            <ActionBtn Icon={RefreshCw} label={t('regenerate')} onClick={onRegenerate} />
          </div>
        </div>
      </div>
    </li>
  )
}

function ActionBtn({
  Icon,
  activeIcon: ActiveIcon,
  label,
  active,
  onClick,
}: {
  Icon: typeof Sparkles
  activeIcon?: typeof Sparkles
  label: string
  active?: boolean
  onClick?: () => void
}) {
  const I = active && ActiveIcon ? ActiveIcon : Icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md h-8 px-2.5 text-[11px] font-medium transition-colors ${
        active
          ? 'text-lime-400 bg-primary/15'
          : 'text-fg-3 hover:text-fg-1 hover:bg-surface-raised'
      }`}
    >
      <I
        className="w-3 h-3"
        strokeWidth={1.75}
        fill={active ? 'currentColor' : 'none'}
      />
      {label}
    </button>
  )
}

function ThinkingBubble({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <li>
      <div className="flex items-start gap-3">
        <span
          className="shrink-0 w-9 h-9 rounded-full inline-flex items-center justify-center"
          style={{ background: 'rgb(61 122 74 / 0.18)', color: 'var(--gf-lime-400)' }}
        >
          <Microscope className="w-4 h-4 animate-pulse" strokeWidth={1.75} />
        </span>
        <div className="rounded-2xl border border-border bg-surface px-5 py-3 text-sm text-fg-3 inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Dot delay={0} />
            <Dot delay={150} />
            <Dot delay={300} />
          </span>
          {t('thinking')}
        </div>
      </div>
    </li>
  )
}

function Dot({ delay }: { delay: number }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
      aria-hidden
    />
  )
}
