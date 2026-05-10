'use client'

import { useState, useRef, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Bell, Menu, Search, ChevronDown, User, Settings, LogOut, Home } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/cn'
import { resolveDisplayName } from '@/lib/displayName'
import { getBrowserSupabase } from '@/lib/supabase/client'

// Use CSS vars so the topbar follows the dashboard theme toggle.
const TOPBAR_BG = 'var(--gf-surface)'
const TOPBAR_BORDER = 'var(--gf-border)'

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const t = useTranslations('dashboard')
  const tNav = useTranslations('nav')
  const { user, profile, signOut, tier, role } = useAuth()
  const userTier = (tier ?? 'free') as 'free' | 'basic' | 'premium' | 'vip'
  // Admin and nutritionist chrome shows their role (in role-tinted
  // pill) instead of their tier — the user's tier is irrelevant for
  // staff accounts. While role is still loading we render an empty
  // pill rather than falling back to the cached tier — otherwise an
  // admin signing in right after a VIP user briefly sees 'vip plan'.
  const pillLabel =
    role === 'admin'
      ? 'admin'
      : role === 'nutritionist'
        ? 'nutritionist'
        : role === 'user'
          ? `${userTier} plan`
          : ''
  const displayName = resolveDisplayName(profile, user, 'Guest')
  const initials =
    displayName
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

  const [open, setOpen] = useState(false)
  // The Topbar is a client component, but the dashboard layout is
  // still server-rendered. On the server `useAuth()` has no session
  // (tier === null → "free"), then the client-side hydration flips
  // it to the real tier ("vip"). React flagged that as a hydration
  // text mismatch. Gate the tier badge behind a mount flag so the
  // server render is empty and the real value lands after mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])
  const wrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  return (
    <header
      className="flex items-center gap-2 md:gap-3 px-3 md:px-6 shrink-0"
      style={{
        background: TOPBAR_BG,
        borderBottom: `1px solid ${TOPBAR_BORDER}`,
        paddingTop: 'env(safe-area-inset-top)',
        height: 'calc(56px + env(safe-area-inset-top))',
      }}
    >
      <button
        type="button"
        onClick={onOpenMenu}
        aria-label={t('openSidebar')}
        className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-md transition-colors"
        style={{ color: '#888' }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#1f1f1f')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <Menu className="w-5 h-5" strokeWidth={1.75} />
      </button>

      {/* Search */}
      <div className="relative hidden sm:block flex-1 max-w-md">
        <Search
          className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
          style={{ color: 'hsl(var(--muted-foreground))' }}
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          type="search"
          placeholder={t('searchPlaceholder')}
          aria-label={t('search')}
          className="h-12 w-full rounded-2xl ps-10 pe-4 text-base transition-all duration-200"
          style={{
            background: 'hsl(var(--background) / 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            border: '1px solid hsl(var(--input))',
            color: 'hsl(var(--foreground))',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'hsl(var(--primary))'
            e.currentTarget.style.boxShadow = '0 0 0 2px hsl(var(--ring))'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'hsl(var(--input))'
            e.currentTarget.style.boxShadow = 'none'
          }}
          onMouseEnter={(e) => {
            if (document.activeElement !== e.currentTarget) {
              e.currentTarget.style.borderColor = 'hsl(var(--primary) / 0.5)'
            }
          }}
          onMouseLeave={(e) => {
            if (document.activeElement !== e.currentTarget) {
              e.currentTarget.style.borderColor = 'hsl(var(--input))'
            }
          }}
        />
      </div>

      {/* Tier pill — subtle reminder of the user's plan, only on desktop.
       * Hidden until client mount to avoid an SSR/CSR text mismatch
       * (server has no session → "free"; client hydrates → "vip"). */}
      <span
        className="tier-pill hidden md:inline-flex"
        style={{
          opacity: mounted ? 1 : 0,
          minWidth: 64,
        }}
        suppressHydrationWarning
      >
        {mounted ? pillLabel : ''}
      </span>

      <div className="sm:hidden flex-1" />

      {/* Back to site — hidden on phones to free up topbar real
       * estate (the hamburger drawer already exposes this link).
       * Reappears at sm: where there's room beside the language
       * switcher + bell + avatar without the avatar getting cropped. */}
      <Link
        href="/"
        aria-label={tNav('backToHome')}
        title={tNav('backToHome')}
        className="hidden sm:inline-flex items-center justify-center p-2 transition-colors hover:opacity-80"
      >
        <Home className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
      </Link>

      <LanguageSwitcher />

      <NotificationBell label={t('notifications')} />


      {/* Avatar dropdown — bare circle on phones (no surrounding pill
       * chrome since the chevron is hidden anyway), full pill on
       * md+ where there's room for the chevron + border. */}
      <div className="relative shrink-0" ref={wrapRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="topbar-avatar-btn inline-flex items-center transition-colors"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'hsl(var(--primary) / 0.15)',
              color: 'hsl(var(--primary))',
              fontSize: 12,
              fontWeight: 700,
              lineHeight: 1,
              flexShrink: 0,
              userSelect: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            suppressHydrationWarning
          >
            {mounted ? initials.slice(0, 2).toUpperCase() : ''}
          </span>
          <ChevronDown
            className={cn(
              'hidden md:block w-4 h-4 transition-transform',
              open && 'rotate-180',
            )}
            strokeWidth={1.75}
            style={{ color: '#888' }}
          />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute end-0 mt-2 rounded-2xl shadow-2xl overflow-hidden z-30"
            style={{
              background: TOPBAR_BG,
              border: `1px solid ${TOPBAR_BORDER}`,
              minWidth: 220,
            }}
          >
            {/* user header — flips to a tinted card in light mode */}
            <div
              className="m-2"
              style={{
                background: 'var(--gf-card-hover)',
                padding: '12px 16px',
                borderRadius: 10,
              }}
            >
              <p
                className="text-sm font-semibold truncate"
                style={{ color: 'var(--gf-fg-1)' }}
              >
                {displayName}
              </p>
              {user?.email && (
                <p
                  className="mt-0.5 text-xs truncate"
                  style={{ color: 'var(--gf-fg-3)' }}
                  dir="ltr"
                >
                  {user.email}
                </p>
              )}
            </div>
            <DropItem
              href="/dashboard/settings?tab=profile"
              Icon={User}
              label={t('profile')}
              onClick={() => setOpen(false)}
            />
            <DropItem
              href="/dashboard/settings"
              Icon={Settings}
              label={tNav('settings')}
              onClick={() => setOpen(false)}
            />
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                setOpen(false)
                void signOut()
              }}
              className="w-full flex items-center gap-2.5 px-4 py-3 text-sm transition-colors"
              style={{
                color: '#dc2626',
                borderTop: `1px solid ${TOPBAR_BORDER}`,
                minHeight: 44,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = 'rgba(220,38,38,0.08)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = 'transparent')
              }
            >
              <LogOut className="w-4 h-4" strokeWidth={1.75} />
              <span>{tNav('signOut')}</span>
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

/* ── Notification bell + dropdown ──────────────────────────────────
 * Reads the user's notifications row from Supabase and subscribes to
 * realtime INSERT events on `public.notifications` so a new row from
 * /api/notifications/send shows up in the bell + fires a toast,
 * without polling. */
interface NotifRow {
  id: string
  type: string | null
  title: string
  body: string | null
  data: Record<string, unknown> | null
  is_read: boolean
  created_at: string
}

const TYPE_ICON: Record<string, string> = {
  message: '💬',
  meal_plan: '🥗',
  appointment: '📅',
  community: '👥',
  billing: '💳',
  system: '🔔',
}

function NotificationBell({ label }: { label: string }) {
  const [open, setOpen] = useState(false)
  const [notifs, setNotifs] = useState<NotifRow[]>([])
  const wrapRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()
  const userId = user?.id ?? null

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  // Initial load + realtime subscription on the user's notifications.
  useEffect(() => {
    if (!userId) return
    const supabase = getBrowserSupabase()
    if (!supabase) return

    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, body, data, is_read, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
      if (cancelled) return
      setNotifs(((data as NotifRow[] | null) ?? []))
    })()

    const channel = supabase
      .channel(`notif-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotifRow
          setNotifs((prev) => [row, ...prev].slice(0, 20))
          // Optional toast nudge for inserts that arrive while the
          // tab is open. The system push (/sw.js) handles inserts
          // when the tab is closed.
          import('react-hot-toast').then(({ default: toast }) => {
            toast.success(row.title, {
              duration: 4000,
            })
          })
        },
      )
      .subscribe()

    return () => {
      cancelled = true
      void supabase.removeChannel(channel)
    }
  }, [userId])

  const unreadCount = notifs.filter((n) => !n.is_read).length

  const markAllRead = async () => {
    if (!userId) return
    setNotifs((curr) => curr.map((n) => ({ ...n, is_read: true })))
    const supabase = getBrowserSupabase()
    if (!supabase) return
    void supabase
      .from('notifications')
      .update({ is_read: true } as never)
      .eq('user_id', userId)
      .eq('is_read', false)
  }

  const formatAgo = (iso: string) => {
    const min = (Date.now() - new Date(iso).getTime()) / 60_000
    if (min < 1) return 'now'
    if (min < 60) return `${Math.round(min)}m`
    if (min < 60 * 24) return `${Math.round(min / 60)}h`
    return `${Math.round(min / (60 * 24))}d`
  }

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center justify-center transition-colors"
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          padding: 8,
          background: 'transparent',
          border: 'none',
          color: 'var(--gf-fg-2)',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = 'var(--gf-fg-1)')
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = 'var(--gf-fg-2)')
        }
      >
        <Bell className="w-5 h-5 text-muted-foreground" strokeWidth={1.75} />
        {unreadCount > 0 && (
          <span
            aria-label={`${unreadCount} unread`}
            style={{
              position: 'absolute',
              top: 6,
              insetInlineEnd: 6,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ef4444',
              border: '2px solid var(--gf-surface)',
            }}
          />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute end-0 mt-2 rounded-2xl shadow-2xl overflow-hidden z-30"
          style={{
            background: 'var(--gf-surface)',
            border: '1px solid var(--gf-border)',
            minWidth: 320,
            maxHeight: 420,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <header
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--gf-border)' }}
          >
            <p
              className="font-semibold"
              style={{ fontSize: 14, color: 'var(--gf-fg-1)' }}
            >
              Notifications
            </p>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-xs hover:underline"
                style={{ color: '#60a5fa', cursor: 'pointer' }}
              >
                Mark all read
              </button>
            )}
          </header>

          <ul className="overflow-y-auto" style={{ maxHeight: 340 }}>
            {notifs.length === 0 ? (
              <li
                className="text-center py-12 text-sm"
                style={{ color: 'var(--gf-fg-3)' }}
              >
                No notifications yet
              </li>
            ) : (
              notifs.map((n, i) => {
                const icon =
                  (n.type && TYPE_ICON[n.type]) || TYPE_ICON.system
                const url =
                  (n.data &&
                    typeof n.data['url'] === 'string' &&
                    (n.data['url'] as string)) ||
                  '/dashboard'
                return (
                  <li
                    key={n.id}
                    onClick={() => {
                      setOpen(false)
                      window.location.href = url
                    }}
                    className="flex gap-3 px-4 py-3 cursor-pointer transition-colors"
                    style={{
                      borderBottom:
                        i === notifs.length - 1
                          ? 'none'
                          : '1px solid var(--gf-border)',
                      background: n.is_read
                        ? 'transparent'
                        : 'var(--gf-card-hover)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: 20,
                        width: 28,
                        flexShrink: 0,
                        textAlign: 'center',
                      }}
                    >
                      {icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="truncate"
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--gf-fg-1)',
                        }}
                      >
                        {n.title}
                      </p>
                      {n.body && (
                        <p
                          style={{
                            fontSize: 12,
                            color: 'var(--gf-fg-2)',
                            marginTop: 2,
                            lineHeight: 1.5,
                          }}
                        >
                          {n.body}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        style={{ fontSize: 11, color: 'var(--gf-fg-3)' }}
                      >
                        {formatAgo(n.created_at)}
                      </span>
                      {!n.is_read && (
                        <span
                          aria-label="Unread"
                          className="w-2 h-2 rounded-full"
                          style={{ background: '#60a5fa' }}
                        />
                      )}
                    </div>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

function DropItem({
  href,
  Icon,
  label,
  onClick,
}: {
  href: string
  Icon: typeof User
  label: string
  onClick?: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      role="menuitem"
      className="flex items-center gap-2.5 px-4 py-3 text-sm transition-colors"
      style={{ color: 'var(--gf-fg-2)', minHeight: 44 }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--gf-fg-1)'
        e.currentTarget.style.background = 'var(--gf-card-hover)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--gf-fg-2)'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <Icon className="w-4 h-4" strokeWidth={1.75} />
      <span>{label}</span>
    </Link>
  )
}
