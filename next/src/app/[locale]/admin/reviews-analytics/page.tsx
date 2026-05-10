'use client'

import { useMemo, useState } from 'react'
import {
  Sparkles, Star, ThumbsUp, ThumbsDown, Filter, RefreshCw,
  MessageSquare, TrendingUp,
} from '@/icons'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import { getBrowserSupabase } from '@/lib/supabase/client'

type Sentiment = 'positive' | 'mixed' | 'negative'

interface Theme {
  name: string
  summary: string
  sentiment: Sentiment
  count: number
  review_ids: string[]
}

interface ReviewLite {
  id: string
  rating: number
  title: string | null
  body: string
  auto_themes: string[]
  created_at: string
}

const SENT_TINT: Record<Sentiment, { bg: string; fg: string; border: string; Icon: typeof ThumbsUp }> = {
  positive: { bg: 'rgba(74,222,128,0.10)', fg: '#4ade80', border: 'rgba(74,222,128,0.35)', Icon: ThumbsUp },
  mixed:    { bg: 'rgba(251,191,36,0.10)', fg: '#fbbf24', border: 'rgba(251,191,36,0.35)', Icon: TrendingUp },
  negative: { bg: 'rgba(248,113,113,0.10)', fg: '#f87171', border: 'rgba(248,113,113,0.35)', Icon: ThumbsDown },
}

export default function ReviewsAnalyticsPage() {
  const [themes, setThemes] = useState<Theme[]>([])
  const [analyzed, setAnalyzed] = useState(0)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [activeTheme, setActiveTheme] = useState<string | null>(null)

  const queryFn = useMemo(
    () => async () => {
      const supabase = getBrowserSupabase()
      if (!supabase) return [] as ReviewLite[]
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, title, body, auto_themes, created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(300)
      if (error) throw error
      return (data ?? []) as unknown as ReviewLite[]
    },
    [],
  )

  const { data, loading, error: queryErr, reload } = useSupabaseQuery<ReviewLite[]>(queryFn, [])
  const reviews = data ?? []

  const stats = useMemo(() => {
    if (!reviews.length) return { total: 0, avg: 0, dist: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } as Record<number, number> }
    const dist: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    let sum = 0
    for (const r of reviews) {
      sum += r.rating
      dist[r.rating] = (dist[r.rating] ?? 0) + 1
    }
    return { total: reviews.length, avg: sum / reviews.length, dist }
  }, [reviews])

  // Reviews matching the active theme — pulled from the auto_themes
  // array on each row (populated by the cluster endpoint with ?write=1)
  const filtered = useMemo(() => {
    if (!activeTheme) return reviews
    return reviews.filter((r) => r.auto_themes.includes(activeTheme))
  }, [activeTheme, reviews])

  async function runClustering() {
    setRunning(true)
    setError('')
    try {
      const res = await fetch('/api/reviews/cluster?write=1', { method: 'POST' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Cluster failed')
      }
      const j = (await res.json()) as { themes: Theme[]; analyzed: number }
      setThemes(j.themes ?? [])
      setAnalyzed(j.analyzed ?? 0)
      // Refetch reviews so auto_themes show on each card
      reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cluster failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-fg-1 flex items-center gap-2">
            <Sparkles className="w-6 h-6" strokeWidth={1.75} style={{ color: '#a3e635' }} />
            Reviews analytics
          </h1>
          <p className="text-sm text-fg-3 mt-1 max-w-xl">
            Autopilot theme clustering. Run the AI grouping to see what
            customers keep talking about — patterns, sentiment, and
            sample reviews per theme.
          </p>
        </div>
        <button
          type="button"
          onClick={runClustering}
          disabled={running || reviews.length === 0}
          className="btn-primary inline-flex disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ height: 40, padding: '0 22px', fontSize: 13 }}
        >
          {running ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" strokeWidth={2} />
              Clustering…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" strokeWidth={2} />
              {themes.length > 0 ? 'Re-cluster reviews' : 'Cluster reviews'}
            </>
          )}
        </button>
      </header>

      {/* Top-line stats */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Total reviews" value={stats.total.toString()} tint="#60a5fa" />
        <KpiCard
          label="Average rating"
          value={stats.avg ? stats.avg.toFixed(2) : '—'}
          tint="#fbbf24"
        />
        <KpiCard
          label="5-star share"
          value={
            stats.total
              ? `${Math.round((stats.dist[5] / stats.total) * 100)}%`
              : '—'
          }
          tint="#a3e635"
        />
        <KpiCard
          label="Themes detected"
          value={themes.length.toString()}
          tint="#a855f7"
        />
      </section>

      {/* Rating distribution */}
      {stats.total > 0 && (
        <section
          className="rounded-xl p-4"
          style={{ background: 'var(--gf-surface)', border: '1px solid var(--gf-border)' }}
        >
          <p className="text-xs uppercase tracking-eyebrow text-fg-3 mb-3">
            Rating distribution
          </p>
          <div className="space-y-1.5">
            {[5, 4, 3, 2, 1].map((rating) => {
              const c = stats.dist[rating] ?? 0
              const pct = stats.total ? (c / stats.total) * 100 : 0
              return (
                <div key={rating} className="flex items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1 font-mono w-7 text-fg-2">
                    {rating}
                    <Star
                      className="w-3 h-3"
                      fill="var(--gf-amber)"
                      stroke="var(--gf-amber)"
                    />
                  </span>
                  <div
                    className="flex-1 rounded-full overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.05)', height: 8 }}
                  >
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background:
                          'linear-gradient(90deg, #a3e635, #65a30d)',
                      }}
                    />
                  </div>
                  <span className="font-mono w-12 text-end text-fg-3">{c}</span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Theme cards */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-fg-3">
            Themes ({themes.length})
          </h2>
          {analyzed > 0 && (
            <span className="text-xs text-fg-3">
              Analyzed {analyzed} review{analyzed === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {error && (
          <p
            className="rounded-lg p-3 text-sm mb-3"
            style={{
              background: 'rgba(248,113,113,0.10)',
              color: '#f87171',
              border: '1px solid rgba(248,113,113,0.30)',
            }}
          >
            {error}
          </p>
        )}

        {themes.length === 0 ? (
          <div
            className="rounded-xl p-10 text-center"
            style={{ background: 'var(--gf-surface)', border: '1px solid var(--gf-border)' }}
          >
            <Sparkles className="w-10 h-10 mx-auto text-fg-3 mb-3" strokeWidth={1.5} />
            <p className="text-sm text-fg-2 leading-relaxed max-w-md mx-auto">
              Click <strong>Cluster reviews</strong> above to ask the AI to
              group every approved review into themes. Each theme shows the
              count, sentiment, and which reviews matched.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {themes.map((t) => {
              const tint = SENT_TINT[t.sentiment]
              const active = activeTheme === t.name
              return (
                <li key={t.name}>
                  <button
                    type="button"
                    onClick={() => setActiveTheme(active ? null : t.name)}
                    className="w-full text-start rounded-xl p-4 transition-all"
                    style={{
                      background: active ? tint.bg : 'var(--gf-surface)',
                      border: `1px solid ${active ? tint.border : 'var(--gf-border)'}`,
                      transform: active ? 'translateY(-2px)' : 'translateY(0)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-sm font-semibold text-fg-1 truncate">
                        {t.name}
                      </p>
                      <span
                        className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide rounded-full px-1.5 py-0.5 shrink-0"
                        style={{
                          background: tint.bg,
                          color: tint.fg,
                          border: `1px solid ${tint.border}`,
                        }}
                      >
                        <tint.Icon className="w-3 h-3" strokeWidth={2} />
                        {t.sentiment}
                      </span>
                    </div>
                    <p className="text-xs text-fg-3 leading-relaxed line-clamp-2 mb-2.5">
                      {t.summary}
                    </p>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-fg-3 inline-flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" strokeWidth={2} />
                        {t.count} review{t.count === 1 ? '' : 's'}
                      </span>
                      <span className="text-fg-3">
                        {active ? 'Showing below' : 'Click to filter'}
                      </span>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* Filtered reviews */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold uppercase tracking-eyebrow text-fg-3 inline-flex items-center gap-2">
            <Filter className="w-3.5 h-3.5" strokeWidth={2} />
            {activeTheme
              ? `Reviews in "${activeTheme}" (${filtered.length})`
              : `All approved reviews (${stats.total})`}
          </h2>
          {activeTheme && (
            <button
              type="button"
              onClick={() => setActiveTheme(null)}
              className="text-xs text-lime-400 hover:underline"
            >
              Clear filter
            </button>
          )}
        </div>

        {loading && <p className="text-sm text-fg-3">Loading reviews…</p>}
        {queryErr && (
          <p className="text-sm" style={{ color: '#f87171' }}>
            {queryErr}
          </p>
        )}
        {!loading && filtered.length === 0 && (
          <p className="text-sm text-fg-3 italic">
            No reviews match this filter.
          </p>
        )}

        <ul className="space-y-2.5">
          {filtered.slice(0, 80).map((r) => (
            <li
              key={r.id}
              className="rounded-xl p-4"
              style={{
                background: 'var(--gf-surface)',
                border: '1px solid var(--gf-border)',
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="w-3.5 h-3.5"
                    fill={i < r.rating ? 'var(--gf-amber)' : 'transparent'}
                    stroke={i < r.rating ? 'var(--gf-amber)' : 'rgba(255,255,255,0.30)'}
                  />
                ))}
                <span className="ms-2 text-[11px] text-fg-3">
                  {fmtDate(r.created_at)}
                </span>
              </div>
              {r.title && (
                <p className="text-sm font-semibold text-fg-1 mb-0.5">
                  {r.title}
                </p>
              )}
              <p className="text-sm text-fg-2 leading-relaxed line-clamp-3">
                {r.body}
              </p>
              {r.auto_themes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {r.auto_themes.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase tracking-wide rounded-full px-1.5 py-0.5"
                      style={{
                        background: 'rgba(163,230,53,0.10)',
                        color: '#a3e635',
                        border: '1px solid rgba(163,230,53,0.30)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function KpiCard({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--gf-surface)', border: '1px solid var(--gf-border)' }}
    >
      <p className="text-xs uppercase tracking-eyebrow text-fg-3">{label}</p>
      <p className="mt-1.5 font-mono text-2xl font-bold" style={{ color: tint }}>
        {value}
      </p>
    </div>
  )
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
