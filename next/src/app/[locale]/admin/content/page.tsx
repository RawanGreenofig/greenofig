'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Search,
  Plus,
  Pin,
  Edit3,
  Eye,
  Heart,
  MessageCircle,
  Trash2,
  EyeOff,
  PenLine,
  type LucideIcon,
} from '@/icons'
import { getBrowserSupabase } from '@/lib/supabase/client'

type Status = 'draft' | 'scheduled' | 'published'
type Category = 'tip' | 'article' | 'announcement' | 'recipe' | 'story'

interface AdminPost {
  id: string
  title: string
  authorName: string
  authorInitials: string
  authorRole: 'nutritionist' | 'admin'
  category: Category
  status: Status
  publishedISO: string
  views: number
  likes: number
  comments: number
  pinned: boolean
  hue: string
}

const STATUS_META: Record<Status, { tint: string; bg: string }> = {
  draft:     { tint: '#9baf9f', bg: 'rgb(155 175 159 / 0.14)' },
  scheduled: { tint: '#06b6d4', bg: 'rgb(6 182 212 / 0.14)' },
  published: { tint: '#a3e635', bg: 'rgb(163 230 53 / 0.14)' },
}

const CATEGORY_TINT: Record<Category, string> = {
  tip:          '#a3e635',
  article:      '#06b6d4',
  announcement: '#e8912a',
  recipe:       '#84cc16',
  story:        '#a855f7',
}

const SEED: AdminPost[] = [
  { id: 'p1', title: 'Why protein at breakfast changes your day', authorName: 'Dr. Rawan Othman', authorInitials: 'RO', authorRole: 'nutritionist', category: 'tip',          status: 'published', publishedISO: '2026-04-29T08:00:00Z', views: 1842, likes: 312, comments: 47, pinned: true,  hue: 'rgb(163 230 53 / 0.18)' },
  { id: 'p2', title: 'The PCOS plate, simplified',                authorName: 'Dr. Rawan Othman', authorInitials: 'RO', authorRole: 'nutritionist', category: 'article',      status: 'published', publishedISO: '2026-04-22T08:00:00Z', views: 2104, likes: 412, comments: 88, pinned: false, hue: 'rgb(6 182 212 / 0.18)' },
  { id: 'p3', title: 'Ramadan kit drop — limited',                authorName: 'Dr. Rawan Othman', authorInitials: 'RO', authorRole: 'nutritionist', category: 'announcement', status: 'scheduled', publishedISO: '2026-05-12T07:00:00Z', views: 0,    likes: 0,   comments: 0,  pinned: false, hue: 'rgb(232 145 42 / 0.18)' },
  { id: 'p4', title: 'Salmon bowl variation',                     authorName: 'Dr. Rawan Othman', authorInitials: 'RO', authorRole: 'nutritionist', category: 'recipe',       status: 'draft',     publishedISO: '',                       views: 0,    likes: 0,   comments: 0,  pinned: false, hue: 'rgb(132 204 22 / 0.18)' },
  { id: 'p5', title: 'Welcome to Greenofig 2.0',                  authorName: 'Ahmad Salim',      authorInitials: 'AS', authorRole: 'admin',        category: 'announcement', status: 'published', publishedISO: '2026-04-01T08:00:00Z', views: 3210, likes: 521, comments: 102, pinned: true, hue: 'rgb(168 85 247 / 0.18)' },
  { id: 'p6', title: 'How to read a Greek yogurt label',          authorName: 'Dr. Rawan Othman', authorInitials: 'RO', authorRole: 'nutritionist', category: 'tip',          status: 'published', publishedISO: '2026-04-08T08:00:00Z', views: 1408, likes: 198, comments: 21, pinned: false, hue: 'rgb(101 163 13 / 0.18)' },
  { id: 'p7', title: 'Laila lost 8 kg without giving up dessert', authorName: 'Dr. Rawan Othman', authorInitials: 'RO', authorRole: 'nutritionist', category: 'story',        status: 'draft',     publishedISO: '',                       views: 0,    likes: 0,   comments: 0,  pinned: false, hue: 'rgb(168 85 247 / 0.16)' },
  { id: 'p8', title: '20-min weeknight dinners',                  authorName: 'Dr. Rawan Othman', authorInitials: 'RO', authorRole: 'nutritionist', category: 'tip',          status: 'published', publishedISO: '2026-03-22T08:00:00Z', views: 1124, likes: 175, comments: 18, pinned: false, hue: 'rgb(232 145 42 / 0.16)' },
]

const FILTERS: ('all' | Status)[] = ['all', 'draft', 'scheduled', 'published']

const CATEGORY_HUE: Record<Category, string> = {
  tip:          'rgb(163 230 53 / 0.18)',
  article:      'rgb(6 182 212 / 0.18)',
  announcement: 'rgb(232 145 42 / 0.18)',
  recipe:       'rgb(132 204 22 / 0.18)',
  story:        'rgb(168 85 247 / 0.18)',
}

const ALLOWED_CATEGORIES: Category[] = ['tip', 'article', 'announcement', 'recipe', 'story']

export default function AdminContentPage() {
  const t = useTranslations('admin')
  const tC = useTranslations('admin.contentPage')
  const [posts, setPosts] = useState<AdminPost[]>(SEED)
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [author, setAuthor] = useState<'all' | string>('all')
  const [query, setQuery] = useState('')

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      type PostRow = {
        id: string
        author_id: string
        title: string
        category: string
        status: Status
        publish_at: string | null
        views: number
        likes: number
        comments: number
        pinned: boolean
        created_at: string
      }
      const { data: rows } = await supabase
        .from('posts')
        .select(
          'id, author_id, title, category, status, publish_at, views, likes, comments, pinned, created_at',
        )
        .order('pinned', { ascending: false })
        .order('publish_at', { ascending: false, nullsFirst: false })
        .limit(80)
      const list = (rows as PostRow[] | null) ?? []
      if (cancelled || list.length === 0) return

      const authorIds = Array.from(new Set(list.map((r) => r.author_id).filter(Boolean)))
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('id', authorIds)
      type ProfileRow = { id: string; full_name: string | null; role: string | null }
      const profileMap = new Map(
        ((profiles as ProfileRow[] | null) ?? []).map((p) => [p.id, p]),
      )

      const initials = (name: string) =>
        name.split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '·'

      const mapped: AdminPost[] = list.map((r) => {
        const prof = profileMap.get(r.author_id)
        const name = prof?.full_name ?? 'Author'
        const cat = (ALLOWED_CATEGORIES as string[]).includes(r.category)
          ? (r.category as Category)
          : 'article'
        const role: 'nutritionist' | 'admin' = prof?.role === 'admin' ? 'admin' : 'nutritionist'
        return {
          id: r.id,
          title: r.title,
          authorName: name,
          authorInitials: initials(name),
          authorRole: role,
          category: cat,
          status: r.status,
          publishedISO: r.publish_at ?? r.created_at ?? '',
          views: r.views ?? 0,
          likes: r.likes ?? 0,
          comments: r.comments ?? 0,
          pinned: !!r.pinned,
          hue: CATEGORY_HUE[cat],
        }
      })
      if (!cancelled) setPosts(mapped)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const authors = useMemo(() => {
    const seen = new Map<string, AdminPost>()
    posts.forEach((p) => {
      if (!seen.has(p.authorName)) seen.set(p.authorName, p)
    })
    return Array.from(seen.values())
  }, [posts])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return posts
      .filter((p) => {
        if (filter !== 'all' && p.status !== filter) return false
        if (author !== 'all' && p.authorName !== author) return false
        if (q && !p.title.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        if (a.status === 'draft' && b.status !== 'draft') return 1
        if (b.status === 'draft' && a.status !== 'draft') return -1
        return (b.publishedISO || '').localeCompare(a.publishedISO || '')
      })
  }, [posts, filter, author, query])

  const isUuid = (id: string) => /^[0-9a-f-]{32,}$/i.test(id)

  const togglePin = (id: string) => {
    let nextPinned = false
    setPosts((curr) =>
      curr.map((p) => {
        if (p.id !== id) return p
        nextPinned = !p.pinned
        return { ...p, pinned: nextPinned }
      }),
    )
    const supabase = getBrowserSupabase()
    if (supabase && isUuid(id)) {
      void supabase.from('posts').update({ pinned: nextPinned } as never).eq('id', id)
    }
  }

  const remove = (id: string) => {
    setPosts((curr) => curr.filter((p) => p.id !== id))
    const supabase = getBrowserSupabase()
    if (supabase && isUuid(id)) {
      void supabase.from('posts').delete().eq('id', id)
    }
  }

  const unpublish = (id: string) => {
    setPosts((curr) => curr.map((p) => (p.id === id ? { ...p, status: 'draft' } : p)))
    const supabase = getBrowserSupabase()
    if (supabase && isUuid(id)) {
      void supabase.from('posts').update({ status: 'draft' } as never).eq('id', id)
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {t('content')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{tC('subtitle')}</p>
          <p className="mt-2 text-xs text-fg-3 inline-flex items-center gap-1.5">
            <PenLine className="w-3 h-3" strokeWidth={2} />
            {tC('totalPosts', { count: posts.length })}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
          {tC('newPost')}
        </button>
      </header>

      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search
            className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3"
            strokeWidth={1.75}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tC('search')}
            className="w-full h-11 rounded-pill bg-surface border border-border ps-11 pe-4 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
          />
        </div>
        <select
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
          className="h-10 rounded-md bg-surface border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary appearance-none"
        >
          <option value="all" className="bg-surface">
            {tC('authorAll')}
          </option>
          {authors.map((a) => (
            <option key={a.authorName} value={a.authorName} className="bg-surface">
              {a.authorName}
            </option>
          ))}
        </select>
        <div className="inline-flex items-center gap-0.5 rounded-pill bg-bg-deeper border border-border p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 h-8 rounded-pill text-[11px] font-semibold transition-colors ${
                filter === f
                  ? 'bg-primary/20 text-lime-400'
                  : 'text-fg-3 hover:text-fg-1'
              }`}
            >
              {f === 'all'
                ? tC('filterAll')
                : f === 'draft'
                  ? tC('filterDraft')
                  : f === 'scheduled'
                    ? tC('filterScheduled')
                    : tC('filterPublished')}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <PenLine className="w-9 h-9 mx-auto mb-3 text-fg-3" strokeWidth={1.5} />
          <p className="text-base font-semibold text-fg-1">{tC('noResults')}</p>
          <p className="mt-1 text-sm text-fg-2">{tC('noResultsBody')}</p>
        </div>
      ) : (
        <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
          {visible.map((p) => (
            <Row
              key={p.id}
              tC={tC}
              post={p}
              onPin={() => togglePin(p.id)}
              onUnpublish={() => unpublish(p.id)}
              onRemove={() => remove(p.id)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function Row({
  tC,
  post,
  onPin,
  onUnpublish,
  onRemove,
}: {
  tC: ReturnType<typeof useTranslations>
  post: AdminPost
  onPin: () => void
  onUnpublish: () => void
  onRemove: () => void
}) {
  const meta = STATUS_META[post.status]
  return (
    <li className="grid grid-cols-1 md:grid-cols-[2fr_1.5fr_auto_1fr_auto] gap-3 items-center px-5 py-3 hover:bg-surface-raised transition-colors">
      {/* Title */}
      <div className="flex items-start gap-3 min-w-0">
        <span
          className="shrink-0 w-12 h-12 rounded-md"
          style={{ background: post.hue }}
          aria-hidden
        />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            {post.pinned && (
              <span
                className="inline-flex items-center gap-1 rounded-pill bg-amber-500/15 px-2 h-5 text-[10px] font-semibold uppercase tracking-eyebrow"
                style={{ color: '#e8912a' }}
              >
                <Pin className="w-2.5 h-2.5" strokeWidth={2} />
                {tC('pinned')}
              </span>
            )}
            <p className="text-sm font-semibold text-fg-1 truncate">
              {post.title || '— Untitled —'}
            </p>
          </div>
          <span
            className="mt-1 rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
            style={{
              background: `${CATEGORY_TINT[post.category]}1a`,
              color: CATEGORY_TINT[post.category],
            }}
          >
            {post.category}
          </span>
        </div>
      </div>

      {/* Author */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="shrink-0 w-7 h-7 rounded-full inline-flex items-center justify-center font-display text-[10px] font-bold"
          style={
            post.authorRole === 'nutritionist'
              ? { background: 'linear-gradient(135deg,#a3e635,#65a30d)', color: '#0d1a12' }
              : { background: 'linear-gradient(135deg,#a855f7,#7c3aed)', color: '#f0ede6' }
          }
        >
          {post.authorInitials}
        </span>
        <p className="text-xs text-fg-1 truncate">{post.authorName}</p>
      </div>

      {/* Status */}
      <span
        className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
        style={{ background: meta.bg, color: meta.tint }}
      >
        {post.status === 'draft'
          ? tC('draftBadge')
          : post.status === 'scheduled'
            ? tC('scheduledBadge')
            : tC('publishedBadge')}
      </span>

      {/* Engagement */}
      <div className="flex items-center gap-3 text-[11px] text-fg-3 font-mono" dir="ltr">
        {post.status === 'published' ? (
          <>
            <Stat Icon={Eye}            value={post.views} />
            <Stat Icon={Heart}          value={post.likes} />
            <Stat Icon={MessageCircle}  value={post.comments} />
          </>
        ) : (
          <span className="text-fg-3">—</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 md:justify-self-end">
        {post.status === 'published' && (
          <button
            type="button"
            onClick={onPin}
            aria-label={post.pinned ? tC('unpin') : tC('pin')}
            className={`w-8 h-8 rounded-md inline-flex items-center justify-center transition-colors ${
              post.pinned
                ? 'bg-amber-500/15 hover:bg-amber-500/25'
                : 'text-fg-3 hover:text-fg-1 hover:bg-surface-raised'
            }`}
            style={post.pinned ? { color: '#e8912a' } : undefined}
          >
            <Pin
              className="w-3.5 h-3.5"
              strokeWidth={1.75}
              fill={post.pinned ? 'currentColor' : 'none'}
            />
          </button>
        )}
        <button
          type="button"
          aria-label={tC('edit')}
          className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1 hover:bg-surface-raised"
        >
          <Edit3 className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
        {post.status === 'published' && (
          <button
            type="button"
            onClick={onUnpublish}
            aria-label={tC('unpublish')}
            className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-amber-400 hover:bg-surface-raised"
          >
            <EyeOff className="w-3.5 h-3.5" strokeWidth={1.75} />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label={tC('delete')}
          className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-rose-400 hover:bg-surface-raised"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>
    </li>
  )
}

function Stat({ Icon, value }: { Icon: LucideIcon; value: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="w-3 h-3" strokeWidth={1.75} />
      {value.toLocaleString()}
    </span>
  )
}
