'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useUser } from '@/lib/hooks/useUser'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  Plus,
  Search,
  Eye,
  Heart,
  MessageCircle,
  Clock,
  Calendar as CalIcon,
  ArrowLeft,
  Save,
  Send,
  Trash2,
  Camera,
  Edit3,
  X,
  type LucideIcon,
} from '@/icons'
import { UploadButton } from '@/components/UploadButton'

type Status = 'draft' | 'scheduled' | 'published'
type Category = 'tip' | 'article' | 'announcement' | 'recipe' | 'story'
type Audience = 'all' | 'basic' | 'premium' | 'vip'

interface Post {
  id: string
  title: string
  excerpt: string
  body: string
  category: Category
  status: Status
  audience: Audience
  /** ISO timestamp when published or scheduled */
  publishAt: string
  views: number
  likes: number
  comments: number
  hue: string
  imageUrl?: string
}

const CATEGORIES: Category[] = ['tip', 'article', 'announcement', 'recipe', 'story']
const AUDIENCES: Audience[] = ['all', 'basic', 'premium', 'vip']

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

export default function ContentPage() {
  const t = useTranslations('nutritionist.contentPage')
  const tNut = useTranslations('nutritionist')
  const { profile } = useUser()

  // Posts start empty; hydrated below from the real `posts` table.
  // Was seeded with 5 fixture posts ("Why protein at breakfast", etc.)
  // that masqueraded as the nutritionist's own work.
  const [posts, setPosts] = useState<Post[]>([])
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<Post | null>(null)

  // Hydrate posts authored by this nutritionist. The DB schema doesn't
  // carry every UI field — excerpt/audience/comments/hue are local-only,
  // and status is derived from is_published + scheduled_at.
  useEffect(() => {
    if (!profile?.id) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    void (async () => {
      type Row = {
        id: string
        title: string
        content: string | null
        excerpt: string | null
        audience: string | null
        hue: string | null
        type: Category
        is_published: boolean
        scheduled_at: string | null
        published_at: string | null
        views: number | null
        reactions: { likes?: number; comments?: number } | null
        image_url: string | null
      }
      const { data } = await supabase
        .from('posts')
        .select(
          'id, title, content, excerpt, audience, hue, type, is_published, scheduled_at, published_at, views, reactions, image_url',
        )
        .eq('author_id', profile.id)
        .order('updated_at', { ascending: false })
        .limit(60)
      if (cancelled) return
      const rows = (data as Row[] | null) ?? []
      if (rows.length === 0) return
      setPosts(
        rows.map((r) => {
          const status: Status = r.is_published
            ? 'published'
            : r.scheduled_at && new Date(r.scheduled_at).getTime() > Date.now()
              ? 'scheduled'
              : 'draft'
          const publishAt = r.published_at ?? r.scheduled_at ?? ''
          const reactions = r.reactions ?? {}
          return {
            id: r.id,
            title: r.title,
            excerpt: r.excerpt ?? '',
            body: r.content ?? '',
            category: r.type,
            status,
            audience: ((r.audience as Audience) ?? 'all'),
            publishAt,
            views: r.views ?? 0,
            likes: reactions.likes ?? 0,
            comments: reactions.comments ?? 0,
            hue: r.hue ?? 'rgb(163 230 53 / 0.18)',
            imageUrl: r.image_url ?? undefined,
          }
        }),
      )
    })()
    return () => { cancelled = true }
  }, [profile?.id])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return posts
      .filter((p) => {
        if (filter !== 'all' && p.status !== filter) return false
        if (q && !p.title.toLowerCase().includes(q)) return false
        return true
      })
      .sort((a, b) => {
        // Drafts last, then by publishAt desc
        if (a.status === 'draft' && b.status !== 'draft') return 1
        if (b.status === 'draft' && a.status !== 'draft') return -1
        return (b.publishAt || '').localeCompare(a.publishAt || '')
      })
  }, [posts, filter, query])

  const startNew = () =>
    setEditing({
      id: `new-${Date.now()}`,
      title: '',
      excerpt: '',
      body: '',
      category: 'tip',
      status: 'draft',
      audience: 'all',
      publishAt: '',
      views: 0,
      likes: 0,
      comments: 0,
      hue: 'rgb(163 230 53 / 0.18)',
    })

  const savePost = (p: Post, status: Status) => {
    const final = { ...p, status }
    setPosts((curr) => {
      const idx = curr.findIndex((x) => x.id === final.id)
      if (idx >= 0) {
        const next = [...curr]
        next[idx] = final
        return next
      }
      return [final, ...curr]
    })
    setEditing(null)

    if (!profile?.id) return
    const isExisting = /^[0-9a-f-]{32,}$/i.test(final.id)
    const isScheduled = status === 'scheduled' && final.publishAt
    const payload = {
      id: isExisting ? final.id : undefined,
      title: final.title,
      content: final.body || null,
      excerpt: final.excerpt || null,
      audience: final.audience,
      hue: final.hue,
      type: final.category,
      is_published: status === 'published',
      scheduled_at: isScheduled ? final.publishAt : null,
      published_at:
        status === 'published' ? final.publishAt || new Date().toISOString() : null,
      image_url: final.imageUrl ?? null,
    }
    // Persist via /api/nutritionist/content. Was a fire-and-forget
    // `void supabase.from('posts').update(...)` straight from the
    // browser, so a failed publish silently did nothing.
    void (async () => {
      const res = await fetch('/api/nutritionist/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        console.error('[content] save failed:', res.status)
        return
      }
      if (!isExisting) {
        const body = (await res.json()) as { id?: string }
        if (body.id) {
          setPosts((curr) =>
            curr.map((x) => (x.id === final.id ? { ...x, id: body.id! } : x)),
          )
        }
      }
    })()
  }

  const removePost = (id: string) => {
    setPosts((curr) => curr.filter((p) => p.id !== id))
    if (editing?.id === id) setEditing(null)
    if (!/^[0-9a-f-]{32,}$/i.test(id)) return
    void fetch('/api/nutritionist/content', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    }).then((res) => {
      if (!res.ok) console.error('[content] delete failed:', res.status)
    }).catch((err) => {
      console.error('[content] delete threw:', err)
    })
  }

  if (editing) {
    return (
      <PostForm
        t={t}
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={savePost}
        onDelete={() => removePost(editing.id)}
      />
    )
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {tNut('content')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
          {t('newPost')}
        </button>
      </header>

      {/* Search + filter — same dashboard chrome as the rest of the
       * dashboard (Recipe Builder, Store Curation, Leads, etc.). */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-0 basis-full sm:basis-auto sm:min-w-[200px]">
          <Search
            className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            strokeWidth={1.75}
            color="var(--gf-fg-3)"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            className="w-full h-10 ps-10 pe-3 text-sm text-fg-1 placeholder-fg-3"
          />
        </div>
        <div
          className="inline-flex items-center flex-wrap"
          style={{
            minHeight: 40,
            background: 'var(--gf-input-bg)',
            border: '1px solid var(--gf-border)',
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}
        >
          {(['all', 'draft', 'scheduled', 'published'] as ('all' | Status)[]).map(
            (f) => {
              const active = filter === f
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className="inline-flex items-center justify-center px-3 transition-colors"
                  style={{
                    height: 32,
                    borderRadius: 6,
                    background: active ? 'rgba(132,217,61,0.12)' : 'transparent',
                    color: active ? '#a3e635' : 'var(--gf-fg-2)',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background =
                        'var(--gf-card-hover)'
                      e.currentTarget.style.color = 'var(--gf-fg-1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'var(--gf-fg-2)'
                    }
                  }}
                >
                  {f === 'all'
                    ? t('filterAll')
                    : f === 'draft'
                      ? t('filterDraft')
                      : f === 'scheduled'
                        ? t('filterScheduled')
                        : t('filterPublished')}
                </button>
              )
            },
          )}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <Edit3 className="w-9 h-9 mx-auto mb-3 text-fg-3" strokeWidth={1.5} />
          <p className="text-base font-semibold text-fg-1">{t('noPosts')}</p>
          <p className="mt-1 text-sm text-fg-2 max-w-sm mx-auto">
            {t('noPostsBody')}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map((p) => (
            <PostCard
              key={p.id}
              t={t}
              post={p}
              onEdit={() => setEditing(p)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Card ───────────────────────────────────────────────────────── */

function PostCard({
  t,
  post,
  onEdit,
}: {
  t: ReturnType<typeof useTranslations>
  post: Post
  onEdit: () => void
}) {
  const status = post.status
  const isDraft = status === 'draft'

  return (
    <li>
      <button
        type="button"
        onClick={onEdit}
        className="w-full text-start rounded-xl border border-border bg-surface overflow-hidden hover:border-primary/40 transition-colors"
      >
        <div
          className="aspect-[16/7] w-full"
          style={{ background: post.hue }}
          aria-hidden
        />
        <div className="p-5">
          <div className="flex items-center gap-1.5 flex-wrap mb-3">
            <span
              className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
              style={{ background: STATUS_META[status].bg, color: STATUS_META[status].tint }}
            >
              {status === 'draft'
                ? t('draftBadge')
                : status === 'scheduled'
                  ? t('scheduledBadge')
                  : t('publishedBadge')}
            </span>
            <span
              className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
              style={{
                background: `${CATEGORY_TINT[post.category]}1a`,
                color: CATEGORY_TINT[post.category],
              }}
            >
              {t(`categories.${post.category}` as 'categories.tip')}
            </span>
            {!isDraft && post.publishAt && (
              <span className="text-[10px] text-fg-3 font-mono inline-flex items-center gap-1 ms-auto" dir="ltr">
                {status === 'scheduled' ? (
                  <CalIcon className="w-3 h-3" strokeWidth={1.75} />
                ) : (
                  <Clock className="w-3 h-3" strokeWidth={1.75} />
                )}
                {new Date(post.publishAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-fg-1 leading-tight line-clamp-2 min-h-[2.5em]">
            {post.title || '— Untitled —'}
          </h3>
          <p className="mt-2 text-sm text-fg-2 leading-relaxed line-clamp-2">
            {post.excerpt}
          </p>
          {post.status === 'published' && (
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs text-fg-3 font-mono" dir="ltr">
              <Stat Icon={Eye}          value={t('stats.views',     { count: post.views })} />
              <Stat Icon={Heart}        value={t('stats.likes',     { count: post.likes })} />
              <Stat Icon={MessageCircle} value={t('stats.comments', { count: post.comments })} />
            </div>
          )}
        </div>
      </button>
    </li>
  )
}

function Stat({ Icon, value }: { Icon: LucideIcon; value: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <Icon className="w-3 h-3" strokeWidth={1.75} />
      {value}
    </span>
  )
}

/* ── Form ───────────────────────────────────────────────────────── */

function PostForm({
  t,
  initial,
  onCancel,
  onSave,
  onDelete,
}: {
  t: ReturnType<typeof useTranslations>
  initial: Post
  onCancel: () => void
  onSave: (p: Post, status: Status) => void
  onDelete: () => void
}) {
  const [p, setP] = useState<Post>(initial)
  const update = <K extends keyof Post>(k: K, v: Post[K]) =>
    setP((curr) => ({ ...curr, [k]: v }))

  const willSchedule = !!p.publishAt && new Date(p.publishAt).getTime() > Date.now()

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm text-fg-3 hover:text-fg-1"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" strokeWidth={1.75} />
          {t('form.back')}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-xs font-semibold text-fg-2 hover:text-rose-400"
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t('form.delete')}
          </button>
          <button
            type="button"
            onClick={() => onSave(p, 'draft')}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
          >
            <Save className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t('form.saveDraft')}
          </button>
          <button
            type="button"
            onClick={() => onSave(p, willSchedule ? 'scheduled' : 'published')}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={2} />
            {willSchedule ? t('form.schedule') : t('form.publish')}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <article className="rounded-xl border border-border bg-surface p-5 space-y-5">
            <div>
              <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
                {t('form.title')}
              </label>
              <input
                type="text"
                value={p.title}
                onChange={(e) => update('title', e.target.value)}
                placeholder={t('form.titlePh')}
                className="w-full h-12 rounded-md bg-bg-deeper border border-border px-3 text-lg font-display font-semibold text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
                {t('form.excerpt')}
              </label>
              <textarea
                value={p.excerpt}
                onChange={(e) => update('excerpt', e.target.value)}
                placeholder={t('form.excerptPh')}
                rows={2}
                maxLength={280}
                className="w-full resize-none rounded-md bg-bg-deeper border border-border px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
                {t('form.body')}
              </label>
              <textarea
                value={p.body}
                onChange={(e) => update('body', e.target.value)}
                placeholder={t('form.bodyPh')}
                rows={14}
                className="w-full resize-y rounded-md bg-bg-deeper border border-border px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary leading-relaxed font-mono"
              />
            </div>
          </article>

          <article className="rounded-xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
              {t('form.heroImage')}
            </p>
            {p.imageUrl ? (
              <div className="rounded-lg overflow-hidden bg-bg-deeper/40 aspect-[16/7] relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <UploadButton
                    bucket="posts"
                    pathPrefix="hero"
                    accept="image/png,image/jpeg,image/webp"
                    onUploaded={(url) => update('imageUrl', url)}
                    className="inline-flex items-center gap-1.5 rounded-pill bg-bg/85 text-fg-1 border border-border h-9 px-4 text-xs font-semibold hover:border-primary/40"
                  >
                    Replace
                  </UploadButton>
                  <button
                    type="button"
                    onClick={() => update('imageUrl', undefined)}
                    className="inline-flex items-center gap-1.5 rounded-pill bg-rose-500/15 text-rose-400 h-9 px-4 text-xs font-semibold hover:bg-rose-500/25"
                  >
                    <X className="w-3.5 h-3.5" strokeWidth={2} />
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-border bg-bg-deeper/40 aspect-[16/7] flex flex-col items-center justify-center gap-3 text-center px-4">
                <Camera className="w-8 h-8 text-fg-3" strokeWidth={1.25} />
                <UploadButton
                  bucket="posts"
                  pathPrefix="hero"
                  accept="image/png,image/jpeg,image/webp"
                  onUploaded={(url) => update('imageUrl', url)}
                  className="inline-flex items-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-9 px-4 text-xs font-semibold hover:bg-primary/25"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                  {t('form.uploadHero')}
                </UploadButton>
                <p className="text-[11px] text-fg-3">PNG, JPG or WebP, up to 8MB.</p>
              </div>
            )}
          </article>
        </div>

        <aside className="space-y-6">
          <article className="rounded-xl border border-border bg-surface p-5 space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
                {t('form.category')}
              </label>
              <select
                value={p.category}
                onChange={(e) => update('category', e.target.value as Category)}
                className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary appearance-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-surface">
                    {t(`categories.${c}` as 'categories.tip')}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
                {t('form.audience')}
              </label>
              <select
                value={p.audience}
                onChange={(e) => update('audience', e.target.value as Audience)}
                className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary appearance-none"
              >
                {AUDIENCES.map((a) => (
                  <option key={a} value={a} className="bg-surface">
                    {a === 'all'
                      ? t('form.audienceAll')
                      : t('form.audienceTier', { tier: a.toUpperCase() })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
                {t('form.publishAt')}
              </label>
              <input
                type="datetime-local"
                value={p.publishAt ? p.publishAt.slice(0, 16) : ''}
                onChange={(e) =>
                  update(
                    'publishAt',
                    e.target.value ? new Date(e.target.value).toISOString() : '',
                  )
                }
                className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary"
                dir="ltr"
              />
              <p className="mt-1 text-[11px] text-fg-3">
                {willSchedule ? t('form.scheduleFor') : t('form.publishNow')}
              </p>
            </div>
          </article>
        </aside>
      </div>
    </div>
  )
}
