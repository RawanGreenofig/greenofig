'use client'


import { motion } from 'framer-motion'
import { FeatureGate } from '@/components/FeatureGate'
import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'
import {
  Heart,
  MessageCircle,
  Share2,
  Lock,
  BadgeCheck,
  Pin,
  Send,
  Check,
} from '@/icons'
import { useUser } from '@/lib/hooks/useUser'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { resolveDisplayName } from '@/lib/displayName'

/**
 * /dashboard/community
 *
 * Three-column social layout (LEFT: people · CENTER: feed · RIGHT: profile + notifications)
 * Mobile collapses to the center column only.
 */

interface PersonRow {
  id: string
  full_name: string | null
  email: string | null
  role: 'user' | 'nutritionist' | 'admin'
}

interface Person {
  id: string
  name: string
  initials: string
  isNutritionist: boolean
}

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function CommunityPage() {
  return (
    <FeatureGate settingKey="community_enabled" label="Community">
      <CommunityPageInner />
    </FeatureGate>
  )
}

function CommunityPageInner() {
  const router = useRouter()
  const locale = useLocale()
  const { user, profile, tier } = useUser()
  // Gate the upgrade banner behind a mount flag. Server has no session
  // (tier === null → isFree=true) so the banner renders between the
  // two articles. The client hydrates a VIP user (isFree=false) and
  // skips the banner — but React's reconciler still expects a <div>
  // at that DOM slot and finds an <article>, throwing "Expected
  // server HTML to contain a matching <article> in <main>". Render
  // false-by-default until mounted so the SSR tree matches.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const isFree = mounted ? (tier ?? 'free') === 'free' : false

  const [people, setPeople] = useState<Person[]>([])
  const [search, setSearch] = useState('')
  const [feedSearch, setFeedSearch] = useState('')

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase || !user?.id) return
    let cancelled = false

    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .neq('id', user.id)
        .limit(10)
      if (cancelled) return
      const rows = (data as PersonRow[] | null) ?? []
      setPeople(
        rows.map((r) => {
          const fallback = (r.full_name ?? r.email ?? '?').toString()
          const initials = fallback
            .split(/\s+|@|\./)
            .map((p) => p[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase()
          return {
            id: r.id,
            name: r.full_name ?? r.email?.split('@')[0] ?? 'User',
            initials: initials || '?',
            isNutritionist: r.role === 'nutritionist',
          }
        }),
      )
    })()

    return () => {
      cancelled = true
    }
  }, [user?.id])

  const goToMessages = () => router.push(`/${locale}/dashboard/messages`)

  const filteredPeople = search.trim()
    ? people.filter((p) =>
        p.name.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : people

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid gap-5 p-5 overflow-hidden"
      style={{
        height: '100%',
        gridTemplateColumns: 'minmax(0, 1fr)',
        background: 'var(--gf-bg)',
      }}
    >
      {/* Desktop layout uses 3 columns; we drop into a single column on
       * narrow widths via the inline media query below. CSS-in-JS would
       * be cleaner but we want these styles co-located with the JSX. */}
      <style>{`
        @media (min-width: 1024px) {
          .gf-community-grid {
            grid-template-columns: 260px minmax(0,1fr) 280px !important;
          }
          .gf-community-rail { display: flex !important; }
        }
      `}</style>
      <div
        className="gf-community-grid grid gap-5 overflow-hidden"
        style={{
          gridTemplateColumns: '1fr',
          height: '100%',
        }}
      >
        {/* ── LEFT — People ─────────────────────────────────── */}
        <aside
          className="gf-community-rail flex-col hidden"
          style={{
            background: 'var(--gf-surface)',
            border: '1px solid var(--gf-border)',
            borderRadius: 16,
            padding: 16,
            overflowY: 'auto',
            display: 'none',
          }}
        >
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search people..."
            className="outline-none"
            style={{
              width: '100%',
              background: 'var(--gf-surface-raised)',
              border: '1px solid var(--gf-border)',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 13,
              color: 'var(--gf-fg-1)',
              marginBottom: 16,
            }}
          />

          <p
            style={{
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--gf-fg-3)',
              fontWeight: 600,
              marginBottom: 8,
            }}
          >
            Community
          </p>

          <ul className="space-y-0.5">
            {filteredPeople.length === 0 && (
              <li
                style={{
                  fontSize: 13,
                  color: 'var(--gf-fg-3)',
                  padding: '24px 8px',
                  textAlign: 'center',
                }}
              >
                {search ? 'No matches' : 'No one to show yet.'}
              </li>
            )}
            {filteredPeople.map((p) => (
              <PersonRow key={p.id} person={p} />
            ))}
          </ul>
        </aside>

        {/* ── CENTER — Feed ─────────────────────────────────── */}
        <main
          className="flex flex-col gap-4 min-w-0"
          style={{ overflowY: 'auto' }}
        >
          <input
            value={feedSearch}
            onChange={(e) => setFeedSearch(e.target.value)}
            placeholder="Search feed..."
            className="outline-none"
            style={{
              width: '100%',
              background: 'var(--gf-surface-raised)',
              border: '1px solid var(--gf-border)',
              borderRadius: 10,
              padding: '10px 14px',
              fontSize: 14,
              color: 'var(--gf-fg-1)',
            }}
          />

          {/* Pinned post — Nutritionist Coach Rawan */}
          <article
            style={{
              background: 'var(--gf-surface-raised)',
              border: '1px solid var(--gf-border)',
              borderRadius: 16,
              padding: 20,
            }}
          >
            <header className="flex items-center gap-3">
              {/* Plain <img> + DR fallback. next/image was sometimes
               * rendering blank for this avatar in production; the
               * underlying file (/images/dr-rawan-othman.jpg) is a
               * 2.4MB jpg that the optimizer occasionally fails to
               * serve. The fallback below picks up if onError fires. */}
              <div
                style={{
                  position: 'relative',
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/dr-rawan-othman.jpg"
                  alt="Nutritionist Coach Rawan Othman"
                  width={40}
                  height={40}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    border: '2px solid #4ade80',
                    display: 'block',
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                    const fallback = e.currentTarget
                      .nextElementSibling as HTMLElement | null
                    if (fallback) fallback.style.display = 'flex'
                  }}
                />
                <span
                  aria-hidden
                  style={{
                    display: 'none',
                    position: 'absolute',
                    inset: 0,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #4ade80, #60a5fa)',
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #4ade80',
                  }}
                >
                  DR
                </span>
              </div>
              <div className="min-w-0">
                <p
                  className="inline-flex items-center truncate"
                  style={{ fontSize: 14, fontWeight: 700, color: 'var(--gf-fg-1)', gap: 10 }}
                >
                  Nutritionist Coach Rawan Othman
                  <BadgeCheck
                    className="w-4 h-4 shrink-0"
                    strokeWidth={1.75}
                    style={{ color: '#60a5fa' }}
                  />
                </p>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-flex items-center gap-1"
                    style={{ fontSize: 11, color: 'var(--gf-fg-3)' }}
                  >
                    <Pin className="w-3 h-3" strokeWidth={2} />
                    Pinned
                  </span>
                </div>
              </div>
              <span
                className="ms-auto"
                style={{ fontSize: 12, color: 'var(--gf-fg-3)' }}
              >
                4h
              </span>
            </header>

            <p
              style={{
                fontSize: 14,
                color: 'var(--gf-fg-2)',
                lineHeight: 1.6,
                marginTop: 12,
              }}
            >
              Reminder for the week: aim for 30g of protein at breakfast.
              It steadies blood sugar and the rest of your day reads
              differently. Drop a 🙋 if you&apos;d like a quick 5-min recipe
              shortlist!
            </p>

            <PostActions
              postId="dr-rawan-protein-breakfast"
              initialLikes={38}
              initialComments={12}
            />
          </article>

          {/* Upgrade banner — only when free */}
          {isFree && (
            <div
              className="flex items-center gap-3"
              style={{
                background: 'var(--gf-surface-raised)',
                border: '1px solid var(--gf-border)',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <Lock
                className="w-5 h-5 shrink-0"
                strokeWidth={1.75}
                style={{ color: 'var(--gf-fg-3)' }}
              />
              <div className="flex-1 min-w-0">
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: 'var(--gf-fg-1)',
                  }}
                >
                  Posting unlocks at Basic plan
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: 'var(--gf-fg-2)',
                    marginTop: 4,
                  }}
                >
                  You can still read and react to every post.
                </p>
              </div>
              <button
                type="button"
                onClick={goToMessages}
                className="btn-primary shrink-0"
                style={{ height: 36, padding: '0 18px', fontSize: 13 }}
              >
                Upgrade
              </button>
            </div>
          )}

          {/* Tip of the week */}
          <article
            style={{
              background: 'var(--gf-surface-raised)',
              border: '1px solid var(--gf-border)',
              borderRadius: 16,
              padding: 20,
            }}
          >
            <header className="flex items-center gap-3">
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'rgba(74,222,128,0.10)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}
              >
                💡
              </span>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--gf-fg-1)' }}>
                  Tip of the week
                </p>
                <p style={{ fontSize: 12, color: 'var(--gf-fg-3)', marginTop: 2 }}>
                  Greenofig community
                </p>
              </div>
              <span className="ms-auto" style={{ fontSize: 12, color: 'var(--gf-fg-3)' }}>
                2d
              </span>
            </header>
            <p
              style={{
                fontSize: 14,
                color: 'var(--gf-fg-2)',
                lineHeight: 1.6,
                marginTop: 12,
              }}
            >
              Eat the rainbow — pick three different colored vegetables this
              week. Variety in pigment usually means variety in
              micronutrients, and your gut bacteria notice within 48 hours.
            </p>
            <PostActions
              postId="tip-of-the-week-eat-the-rainbow"
              initialLikes={14}
              initialComments={3}
            />
          </article>
        </main>

        {/* ── RIGHT — Profile + Notifications ───────────────── */}
        <aside
          className="gf-community-rail flex-col gap-4 hidden"
          style={{
            overflowY: 'auto',
            display: 'none',
          }}
        >
          {/* Nutritionist Coach Rawan profile card */}
          <div
            style={{
              background: 'var(--gf-surface)',
              border: '1px solid var(--gf-border)',
              borderRadius: 16,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'relative',
                width: '100%',
                height: 112,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/dr-rawan-othman.jpg"
                alt="Nutritionist Coach Rawan Othman"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center top',
                  display: 'block',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  const fallback = e.currentTarget
                    .nextElementSibling as HTMLElement | null
                  if (fallback) fallback.style.display = 'flex'
                }}
              />
              <span
                aria-hidden
                style={{
                  display: 'none',
                  position: 'absolute',
                  inset: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  background:
                    'linear-gradient(135deg, #1a2e1f 0%, #0d1a12 100%)',
                  fontSize: 48,
                }}
              >
                🥗
              </span>
            </div>
            <div style={{ padding: 16 }}>
              <p
                style={{ fontSize: 15, fontWeight: 700, color: 'var(--gf-fg-1)' }}
              >
                Nutritionist Coach Rawan Othman
              </p>
              <p
                style={{ fontSize: 12, color: 'var(--gf-fg-3)', marginTop: 2 }}
              >
                Certified Clinical Nutritionist
              </p>
              <div
                className="grid grid-cols-3 gap-2 text-center"
                style={{ marginTop: 12 }}
              >
                <ProfileStat value="24" label="Posts" />
                <ProfileStat value="1.2k" label="Followers" />
                <ProfileStat value="15" label="Articles" />
              </div>
              <button
                type="button"
                onClick={goToMessages}
                className="btn-primary"
                style={{
                  width: '100%',
                  marginTop: 12,
                  height: 40,
                  borderRadius: 10,
                }}
              >
                Send Message
              </button>
            </div>
          </div>

          {/* Notifications card */}
          <div
            style={{
              background: 'var(--gf-surface)',
              border: '1px solid var(--gf-border)',
              borderRadius: 16,
              padding: 16,
            }}
          >
            <header
              className="flex items-center justify-between"
              style={{ marginBottom: 12 }}
            >
              <p
                style={{ fontSize: 14, fontWeight: 600, color: 'var(--gf-fg-1)' }}
              >
                Notifications
              </p>
              <button
                type="button"
                style={{
                  fontSize: 13,
                  color: '#60a5fa',
                  cursor: 'pointer',
                  border: 'none',
                  background: 'none',
                }}
              >
                See all
              </button>
            </header>
            <NotifRow icon="🍎" title="New meal plan added" body="Nutritionist Coach Rawan added your weekly plan" time="1h" />
            <NotifRow icon="💧" title="Hydration reminder" body="You need 750ml more to hit your goal" time="2h" />
            <NotifRow icon="⭐" title="Streak milestone" body="You've logged meals 3 days in a row!" time="1d" last />
          </div>

          {/* Current user identity (small, footer-like) */}
          {user && (
            <p
              style={{
                fontSize: 11,
                color: 'var(--gf-fg-3)',
                textAlign: 'center',
                marginTop: 'auto',
              }}
            >
              Signed in as {resolveDisplayName(profile, user, 'guest')}
            </p>
          )}
        </aside>
      </div>
    </motion.div>
  )
}

/* ── Sub-components ─────────────────────────────────────────────── */

function PersonRow({ person }: { person: Person }) {
  return (
    <li
      className="flex items-center gap-2.5 cursor-pointer transition-colors"
      style={{
        padding: '10px 8px',
        borderRadius: 10,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'var(--gf-surface-raised)')
      }
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Avatar text={person.initials} size={36} />
      <span
        className="flex-1 truncate"
        style={{ fontSize: 14, fontWeight: 500, color: 'var(--gf-fg-1)' }}
      >
        {person.name}
      </span>
      {person.isNutritionist && (
        <BadgeCheck
          className="w-4 h-4 shrink-0"
          strokeWidth={2}
          style={{ color: '#60a5fa' }}
        />
      )}
      <button
        type="button"
        aria-label="Like"
        className="shrink-0 inline-flex items-center justify-center transition-colors"
        style={{
          background: 'none',
          border: 'none',
          padding: 4,
          cursor: 'pointer',
          color: 'var(--gf-fg-3)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#f87171')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--gf-fg-3)')}
      >
        <Heart className="w-4 h-4" strokeWidth={1.75} />
      </button>
    </li>
  )
}

/**
 * Functional Like / Comment / Share row for a feed post.
 *
 * Why client-side only: there's no posts table yet. The home feed
 * currently renders two seeded posts (Nutritionist Coach Rawan + Tip of the week)
 * — once a `community_posts` schema lands, swap the local state for
 * a Supabase-backed mutation and the call sites stay the same.
 *
 * Behaviour:
 * - Like: optimistic toggle, count +/- 1, heart fills red while liked.
 * - Comment: expands an inline composer + the visitor's own comments,
 *   count auto-increments per submission.
 * - Share: copies the post's deep-link to clipboard (or invokes the
 *   native Web Share sheet if available); button flashes a "Copied"
 *   tick for 1.6s.
 */
function PostActions({
  postId,
  initialLikes,
  initialComments,
}: {
  postId: string
  initialLikes: number
  initialComments: number
}) {
  const [liked, setLiked] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [shared, setShared] = useState(false)

  // Derive displayed count from a single source of truth — `liked` —
  // instead of keeping a parallel `likes` count and mutating both.
  // The previous nested-setter (`setLiked(p => { setLikes(...); return !p })`)
  // double-fired under React StrictMode and incremented the count by 2.
  const likes = initialLikes + (liked ? 1 : 0)
  const commentTotal = initialComments + comments.length

  const toggleLike = () => setLiked((p) => !p)

  const submitComment = (e: React.FormEvent) => {
    e.preventDefault()
    const v = draft.trim()
    if (!v) return
    setComments((cs) => [...cs, v])
    setDraft('')
  }

  const share = async () => {
    if (typeof window === 'undefined') return
    const url = `${window.location.origin}${window.location.pathname}#${postId}`
    const data = { title: 'Greenofig community', url }
    try {
      if (navigator.share) {
        await navigator.share(data)
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        setShared(true)
        setTimeout(() => setShared(false), 1600)
      }
    } catch {
      // user cancelled the share sheet — no-op
    }
  }

  return (
    <div
      style={{
        borderTop: '1px solid var(--gf-border)',
        paddingTop: 12,
        marginTop: 12,
      }}
    >
      <div className="flex gap-2 flex-wrap items-center">
        <ActionPill
          onClick={toggleLike}
          active={liked}
          activeColor="#f87171"
          label={liked ? 'Unlike' : 'Support'}
          count={likes}
        >
          <Heart
            className="w-4 h-4"
            strokeWidth={1.75}
            fill={liked ? '#f87171' : 'transparent'}
          />
        </ActionPill>

        <ActionPill
          onClick={() => setShowComments((s) => !s)}
          active={showComments}
          activeColor="#a3e635"
          label="Comment"
          count={commentTotal}
        >
          <MessageCircle className="w-4 h-4" strokeWidth={1.75} />
        </ActionPill>

        <ActionPill
          onClick={share}
          active={shared}
          activeColor="#a3e635"
          label={shared ? 'Copied' : 'Share'}
        >
          {shared ? (
            <Check className="w-4 h-4" strokeWidth={2} />
          ) : (
            <Share2 className="w-4 h-4" strokeWidth={1.75} />
          )}
          {shared && (
            <span style={{ fontSize: 12, fontWeight: 600 }}>Copied</span>
          )}
        </ActionPill>
      </div>

      {showComments && (
        <div className="mt-3 space-y-2">
          {comments.map((c, i) => (
            <div
              key={i}
              style={{
                background: 'var(--gf-bg-deeper)',
                border: '1px solid var(--gf-border)',
                borderRadius: 12,
                padding: '10px 12px',
                fontSize: 13,
                color: 'var(--gf-fg-1)',
                lineHeight: 1.55,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {c}
            </div>
          ))}

          <form onSubmit={submitComment} className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a comment…"
              className="flex-1 h-9 rounded-pill px-3 text-sm bg-bg-deeper border border-border text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send comment"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors disabled:opacity-40"
              style={{
                background: draft.trim()
                  ? 'rgba(163,230,53,0.15)'
                  : 'var(--gf-surface-raised)',
                border: '1px solid var(--gf-border)',
                color: '#a3e635',
                cursor: draft.trim() ? 'pointer' : 'not-allowed',
              }}
            >
              <Send className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

/**
 * Internal — single action pill (icon + optional count). Tinted lime
 * or red when active, neutral otherwise.
 */
function ActionPill({
  onClick,
  active,
  activeColor,
  label,
  count,
  children,
}: {
  onClick: () => void | Promise<void>
  active: boolean
  activeColor: string
  label: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 transition-colors"
      style={{
        fontSize: 13,
        color: active ? activeColor : 'var(--gf-fg-2)',
        padding: '8px 12px',
        borderRadius: 8,
        minHeight: 36,
        background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontWeight: active ? 600 : 500,
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = 'var(--gf-surface)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = active
          ? 'rgba(255,255,255,0.04)'
          : 'transparent')
      }
      aria-pressed={active}
    >
      <span className="flex items-center gap-1.5">
        {children}
        {typeof count === 'number' && <span>{count}</span>}
      </span>
      <span className="sr-only">{label}</span>
    </button>
  )
}

function Avatar({ text, size }: { text: string; size: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #4ade80, #60a5fa)',
        color: '#fff',
        fontSize: size <= 36 ? 13 : 14,
        fontWeight: 700,
        lineHeight: `${size}px`,
        textAlign: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        userSelect: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {text.slice(0, 2)}
    </span>
  )
}

function ProfileStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--gf-fg-1)' }}>
        {value}
      </p>
      <p style={{ fontSize: 11, color: 'var(--gf-fg-3)', marginTop: 2 }}>
        {label}
      </p>
    </div>
  )
}

function NotifRow({
  icon,
  title,
  body,
  time,
  last,
}: {
  icon: string
  title: string
  body: string
  time: string
  last?: boolean
}) {
  return (
    <div
      className="flex gap-2.5"
      style={{
        padding: '10px 0',
        borderBottom: last ? 'none' : '1px solid var(--gf-border)',
      }}
    >
      <span
        style={{
          fontSize: 18,
          width: 28,
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className="truncate"
          style={{ fontSize: 13, fontWeight: 600, color: 'var(--gf-fg-1)' }}
        >
          {title}
        </p>
        <p
          style={{
            fontSize: 12,
            color: 'var(--gf-fg-2)',
            lineHeight: 1.5,
            marginTop: 2,
          }}
        >
          {body}
        </p>
      </div>
      <span
        className="shrink-0"
        style={{ fontSize: 11, color: 'var(--gf-fg-3)' }}
      >
        {time}
      </span>
    </div>
  )
}
