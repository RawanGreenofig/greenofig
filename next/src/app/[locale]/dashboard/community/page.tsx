'use client'

import { useEffect, useMemo, useState } from 'react'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { useTranslations } from 'next-intl'
import {
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  Award,
  Pin,
  Lock,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { tierAtLeast } from '@/lib/tier'
import { NUTRITIONIST } from '@/lib/tokens'

type MilestoneType =
  | 'weight_loss'
  | 'weight_gain'
  | 'energy'
  | 'goal_reached'
  | 'streak'
  | 'custom'

interface Author {
  name: string
  initials: string
  isStaff: boolean
}

interface Post {
  id: string
  author: Author
  body: string
  type: 'milestone' | 'announcement'
  milestoneType?: MilestoneType
  hoursAgo: number
  supports: number
  comments: number
  pinned?: boolean
  /** Sticky from current user (so own milestones show prefilled state) */
  ownPost?: boolean
}

const MILESTONE_TYPES: MilestoneType[] = [
  'weight_loss',
  'energy',
  'goal_reached',
  'streak',
  'custom',
]

const MILESTONE_TINT: Record<MilestoneType, string> = {
  weight_loss:  '#a3e635',
  weight_gain:  '#06b6d4',
  energy:       '#e8912a',
  goal_reached: '#84cc16',
  streak:       '#a855f7',
  custom:       '#9baf9f',
}

/** Demo feed — replaced by `posts` table in Cluster H */
function buildSeed(drName: string): Post[] {
  return [
    {
      id: 'p1',
      author: { name: drName, initials: 'RO', isStaff: true },
      body:
        "Reminder for the week: aim for 30 g of protein at breakfast. It steadies blood sugar and the rest of your day reads differently. Tag me if you'd like a 5-min recipe shortlist.",
      type: 'announcement',
      hoursAgo: 4,
      supports: 38,
      comments: 12,
      pinned: true,
    },
    {
      id: 'p2',
      author: { name: 'Layla H.', initials: 'LH', isStaff: false },
      body:
        'Down 3 kg since I started in March — first time I have actually enjoyed eating breakfast. Tabbouleh + boiled eggs is my new normal.',
      type: 'milestone',
      milestoneType: 'weight_loss',
      hoursAgo: 14,
      supports: 21,
      comments: 5,
    },
    {
      id: 'p3',
      author: { name: 'Omar S.', initials: 'OS', isStaff: false },
      body:
        '14-day streak of logging every meal. Started seeing patterns I never noticed — I overeat carbs after a bad sleep night.',
      type: 'milestone',
      milestoneType: 'streak',
      hoursAgo: 28,
      supports: 17,
      comments: 4,
    },
    {
      id: 'p4',
      author: { name: 'Maya K.', initials: 'MK', isStaff: false },
      body:
        'Hit my goal weight today. The Mediterranean reset Dr. Rawan put me on changed how I eat, not just what I eat. Grateful.',
      type: 'milestone',
      milestoneType: 'goal_reached',
      hoursAgo: 38,
      supports: 64,
      comments: 19,
    },
    {
      id: 'p5',
      author: { name: 'Yousef A.', initials: 'YA', isStaff: false },
      body:
        'Energy levels through the roof since cutting refined sugar. First week was rough, second week is unrecognizable.',
      type: 'milestone',
      milestoneType: 'energy',
      hoursAgo: 52,
      supports: 12,
      comments: 3,
    },
  ]
}

export default function CommunityPage() {
  const t = useTranslations('community')
  const { tier, profile } = useUser()
  const canPost = tierAtLeast(tier, 'basic')

  const [feed, setFeed] = useState<Post[]>(() => buildSeed(NUTRITIONIST.name))
  const [supported, setSupported] = useState<Set<string>>(new Set())
  const [type, setType] = useState<MilestoneType>('weight_loss')
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  // Hydrate the feed from the posts table.
  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false

    void (async () => {
      type Row = {
        id: string
        author_id: string
        title: string
        body: string
        category: string
        publish_at: string | null
        likes: number | null
        comments: number | null
        pinned: boolean | null
      }
      const { data } = await supabase
        .from('posts')
        .select('id, author_id, title, body, category, publish_at, likes, comments, pinned')
        .eq('status', 'published')
        .order('pinned', { ascending: false })
        .order('publish_at', { ascending: false })
        .limit(40)

      const rows = (data as Row[] | null) ?? []
      if (rows.length === 0 || cancelled) return

      // Hydrate author names (only the rows we have)
      const ids = Array.from(new Set(rows.map((r) => r.author_id)))
      const { data: authors } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .in('id', ids)
      type AuthorRow = { id: string; full_name: string | null; role: string }
      const authorOf = new Map(
        ((authors as AuthorRow[] | null) ?? []).map((a) => [a.id, a]),
      )

      const now = Date.now()
      const next: Post[] = rows.map((r) => {
        const a = authorOf.get(r.author_id)
        const name = a?.full_name?.trim() || 'Anonymous'
        const isStaff = a?.role === 'nutritionist' || a?.role === 'admin'
        const ts = r.publish_at ? new Date(r.publish_at).getTime() : now
        const milestoneFromCategory = ([
          'weight_loss', 'weight_gain', 'energy', 'goal_reached',
          'streak', 'custom',
        ] as MilestoneType[]).includes(r.category as MilestoneType)
          ? (r.category as MilestoneType)
          : undefined

        return {
          id: r.id,
          author: { name, initials: initialsOf(name), isStaff },
          body: r.body,
          type: r.category === 'announcement' ? 'announcement' : 'milestone',
          milestoneType: milestoneFromCategory,
          hoursAgo: Math.max(0, Math.floor((now - ts) / 3_600_000)),
          supports: r.likes ?? 0,
          comments: r.comments ?? 0,
          pinned: !!r.pinned,
        }
      })
      if (!cancelled) setFeed(next)
    })()

    return () => { cancelled = true }
  }, [])

  const toggleSupport = (id: string) => {
    setSupported((prev) => {
      const next = new Set(prev)
      const isOn = next.has(id)
      if (isOn) next.delete(id)
      else next.add(id)
      setFeed((curr) =>
        curr.map((p) =>
          p.id === id
            ? { ...p, supports: Math.max(0, p.supports + (isOn ? -1 : 1)) }
            : p,
        ),
      )
      return next
    })
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canPost || !draft.trim() || !profile?.id) return
    setPosting(true)

    const localId = `me-${Date.now()}`
    const text = draft.trim()
    const newPost: Post = {
      id: localId,
      author: {
        name: profile.full_name ?? 'You',
        initials: initialsOf(profile.full_name ?? 'You'),
        isStaff: false,
      },
      body: text,
      type: 'milestone',
      milestoneType: type,
      hoursAgo: 0,
      supports: 0,
      comments: 0,
      ownPost: true,
    }

    // Optimistic insert into the feed
    setFeed((curr) => [
      ...curr.filter((p) => p.pinned),
      newPost,
      ...curr.filter((p) => !p.pinned),
    ])

    void (async () => {
      const supabase = getBrowserSupabase()
      if (supabase) {
        const { data } = await supabase
          .from('posts')
          .insert({
            author_id: profile.id,
            title: text.slice(0, 80),
            body: text,
            category: type,
            status: 'published',
            audience: 'all',
            publish_at: new Date().toISOString(),
          } as never)
          .select('id')
          .maybeSingle()
        const realId = (data as { id?: string } | null)?.id
        if (realId) {
          setFeed((curr) =>
            curr.map((p) => (p.id === localId ? { ...p, id: realId } : p)),
          )
        }
      }
      setDraft('')
      setPosting(false)
    })()
  }

  const sorted = useMemo(
    () =>
      [...feed].sort((a, b) => {
        if (a.pinned && !b.pinned) return -1
        if (!a.pinned && b.pinned) return 1
        return a.hoursAgo - b.hoursAgo
      }),
    [feed],
  )

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-md mx-auto space-y-6">
      {/* Header */}
      <header>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          {t('title')}
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
      </header>

      {/* Composer or gate */}
      {canPost ? (
        <Composer
          t={t}
          authorName={profile?.full_name ?? 'You'}
          type={type}
          setType={setType}
          draft={draft}
          setDraft={setDraft}
          posting={posting}
          onSubmit={submit}
        />
      ) : (
        <FreeGateCard t={t} />
      )}

      {/* Feed */}
      <section aria-label={t('feed')} className="space-y-4">
        {sorted.map((post) => (
          <PostCard
            key={post.id}
            t={t}
            post={post}
            supported={supported.has(post.id)}
            onToggleSupport={() => toggleSupport(post.id)}
          />
        ))}
      </section>
    </div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

function Composer({
  t,
  authorName,
  type,
  setType,
  draft,
  setDraft,
  posting,
  onSubmit,
}: {
  t: ReturnType<typeof useTranslations>
  authorName: string
  type: MilestoneType
  setType: (t: MilestoneType) => void
  draft: string
  setDraft: (s: string) => void
  posting: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-xl border border-border bg-surface p-5"
    >
      <div className="flex items-start gap-3">
        <Avatar name={authorName} />
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
            {t('composeTitle')}
          </p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('composePlaceholder')}
            rows={3}
            maxLength={500}
            className="mt-2 w-full bg-transparent border-none resize-none text-sm text-fg-1 placeholder-fg-3 focus:outline-none leading-relaxed"
          />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold me-1">
            {t('selectType')}
          </span>
          {MILESTONE_TYPES.map((mt) => (
            <button
              key={mt}
              type="button"
              onClick={() => setType(mt)}
              className={`rounded-pill h-7 px-3 text-[11px] font-medium transition-colors ${
                type === mt
                  ? 'bg-primary/20 text-lime-400 border border-primary/40'
                  : 'bg-surface-raised border border-border text-fg-2 hover:border-primary/40'
              }`}
            >
              {t(`milestoneTypes.${mt}` as 'milestoneTypes.weight_loss')}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={!draft.trim() || posting}
          className="inline-flex items-center gap-2 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-5 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-40 disabled:hover:translate-y-0"
        >
          {posting ? '…' : t('post')}
        </button>
      </div>
    </form>
  )
}

function FreeGateCard({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <article className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-5 md:p-6">
      <div className="flex items-start gap-4">
        <span
          className="shrink-0 w-11 h-11 rounded-lg flex items-center justify-center"
          style={{ background: 'rgb(232 145 42 / 0.18)', color: '#e8912a' }}
        >
          <Lock className="w-5 h-5" strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-fg-1">
            {t('lockedFreeTitle')}
          </h2>
          <p className="mt-1.5 text-sm text-fg-2 leading-relaxed">
            {t('lockedFreeBody')}
          </p>
          <Link
            href="/pricing"
            className="mt-4 inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
          >
            {t('lockedFreeCta')}
            <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" strokeWidth={2} />
          </Link>
        </div>
      </div>
    </article>
  )
}

function PostCard({
  t,
  post,
  supported,
  onToggleSupport,
}: {
  t: ReturnType<typeof useTranslations>
  post: Post
  supported: boolean
  onToggleSupport: () => void
}) {
  const isAnnouncement = post.type === 'announcement'
  const tint = post.milestoneType
    ? MILESTONE_TINT[post.milestoneType]
    : undefined

  return (
    <article
      className={`rounded-xl border bg-surface p-5 transition-colors ${
        post.pinned
          ? 'border-primary/30 bg-primary/5'
          : 'border-border hover:border-primary/30'
      }`}
    >
      <header className="flex items-start gap-3">
        <Avatar name={post.author.name} staff={post.author.isStaff} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="text-sm font-semibold text-fg-1">
              {post.author.name}
            </p>
            {post.author.isStaff && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-primary/15 text-lime-400 px-2 h-5 text-[10px] font-semibold">
                <Sparkles className="w-2.5 h-2.5" strokeWidth={2} />
                {t('verifiedNutritionist')}
              </span>
            )}
            <span className="text-xs text-fg-3">·</span>
            <span className="text-xs text-fg-3" dir="ltr">
              {timeAgo(post.hoursAgo, t)}
            </span>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {post.pinned && (
              <span className="inline-flex items-center gap-1 rounded-pill bg-amber-500/10 px-2 h-5 text-[10px] font-semibold text-amber-300" style={{ color: '#e8912a' }}>
                <Pin className="w-2.5 h-2.5" strokeWidth={2} />
                {t('pinned')}
              </span>
            )}
            {post.milestoneType && tint && (
              <span
                className="inline-flex items-center gap-1 rounded-pill px-2 h-5 text-[10px] font-semibold"
                style={{ background: `${tint}1a`, color: tint }}
              >
                <Award className="w-2.5 h-2.5" strokeWidth={2} />
                {t(`milestoneTypes.${post.milestoneType}` as 'milestoneTypes.weight_loss')}
              </span>
            )}
          </div>
        </div>
      </header>

      <p
        className={`mt-3 text-sm leading-relaxed ${
          isAnnouncement ? 'text-fg-1' : 'text-fg-1'
        }`}
      >
        {post.body}
      </p>

      <footer className="mt-4 pt-3 border-t border-border flex items-center gap-1">
        <FooterAction
          Icon={Heart}
          label={t('support')}
          count={post.supports}
          active={supported}
          onClick={onToggleSupport}
        />
        <FooterAction
          Icon={MessageCircle}
          label={t('comment')}
          count={post.comments}
        />
        <FooterAction Icon={Share2} label={t('share')} />
      </footer>
    </article>
  )
}

function FooterAction({
  Icon,
  label,
  count,
  active,
  onClick,
}: {
  Icon: LucideIcon
  label: string
  count?: number
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md h-8 px-3 text-xs font-medium transition-colors ${
        active
          ? 'text-lime-400 bg-primary/15'
          : 'text-fg-2 hover:text-fg-1 hover:bg-surface-raised'
      }`}
    >
      <Icon
        className="w-3.5 h-3.5"
        strokeWidth={1.75}
        fill={active ? 'currentColor' : 'none'}
      />
      <span>{label}</span>
      {typeof count === 'number' && count > 0 && (
        <span className="font-mono text-[11px] text-fg-3" dir="ltr">
          · {count}
        </span>
      )}
    </button>
  )
}

function Avatar({ name, staff }: { name: string; staff?: boolean }) {
  const initials = initialsOf(name)
  return (
    <span
      className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-display text-sm font-bold"
      style={
        staff
          ? {
              background: 'linear-gradient(135deg,#a3e635,#65a30d)',
              color: '#0d1a12',
            }
          : { background: 'var(--gf-bg-deeper)', color: 'var(--gf-fg-2)' }
      }
    >
      {initials}
    </span>
  )
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function timeAgo(hours: number, t: ReturnType<typeof useTranslations>): string {
  if (hours < 1) return t('timeAgo.now')
  if (hours < 24) return t('timeAgo.hour', { n: Math.round(hours) })
  if (hours < 24 * 7) return t('timeAgo.day', { n: Math.round(hours / 24) })
  return t('timeAgo.week', { n: Math.round(hours / (24 * 7)) })
}
