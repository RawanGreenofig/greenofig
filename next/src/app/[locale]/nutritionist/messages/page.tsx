'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Search,
  Send,
  Sparkles,
  Paperclip,
  CheckCheck,
  Check,
  Inbox,
  Flag,
  Plus,
  X,
} from '@/icons'
import type { Tier } from '@/lib/constants'
import { useUser } from '@/lib/hooks/useUser'
import { Avatar } from '@/components/Avatar'
import { getBrowserSupabase } from '@/lib/supabase/client'

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

type Filter = 'all' | 'unread' | 'flagged'

interface Msg {
  id: string
  fromMe: boolean
  body: string
  /** Minutes ago */
  ago: number
  read?: boolean
  /** True when the Greenofig Assistant auto-replied on the coach's
   *  behalf — coach should review and follow up. */
  isAi?: boolean
}

interface ThreadRow {
  id: string
  /** Profile id of the client — needed as recipient_id when the
   *  nutritionist sends a message into this conversation. */
  clientId?: string
  clientName: string
  clientInitials: string
  tier: Tier
  unread: number
  flagged: boolean
  preview: string
  lastAgoMin: number
  messages: Msg[]
}

const TIER_TINT: Record<Tier, string> = {
  free: '#9baf9f',
  basic: '#06b6d4',
  premium: '#a3e635',
  vip: '#a855f7',
}

const TEMPLATE_KEYS = ['wellDone', 'logReminder', 'planUpdate', 'weighIn'] as const

export default function NutritionistMessagesPage() {
  const t = useTranslations('nutritionist')
  const tT = useTranslations('nutritionist.threads')
  const tTiers = useTranslations('tiers')
  const { profile } = useUser()
  const userId = profile?.id ?? null

  // Threads start empty — the page hydrates them from messages/profiles
  // queries in a useEffect below. Was seeded with 5 fake threads
  // (Layla Hijazi etc.) that made every nutritionist account look
  // identical on first load.
  const [threads, setThreads] = useState<ThreadRow[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Compose-new-message picker. Opens a modal listing every client
  // (role='user' profiles) with search. Picking a client either jumps
  // to an existing thread or creates a fresh draft thread.
  const [composeOpen, setComposeOpen] = useState(false)
  const [allClients, setAllClients] = useState<
    { id: string; name: string; initials: string; tier: Tier }[]
  >([])

  // Lazy-load the full client roster the first time the compose modal
  // opens so we don't hammer Supabase on every page load.
  useEffect(() => {
    if (!composeOpen || !userId || allClients.length > 0) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    void (async () => {
      type ProfileRow = {
        id: string
        full_name: string | null
        tier: Tier
      }
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, tier')
        .eq('role', 'user')
        .order('full_name', { ascending: true })
        .limit(200)
      if (cancelled) return
      const rows = (data as ProfileRow[] | null) ?? []
      setAllClients(
        rows.map((r) => ({
          id: r.id,
          name: r.full_name ?? 'Unnamed user',
          initials: initialsOf(r.full_name ?? '??'),
          tier: r.tier,
        })),
      )
    })()
    return () => {
      cancelled = true
    }
  }, [composeOpen, userId, allClients.length])

  // Pick a recipient: jump to their existing thread if present,
  // otherwise create a new empty thread and select it.
  const pickRecipient = (
    c: { id: string; name: string; initials: string; tier: Tier },
  ) => {
    setComposeOpen(false)
    const existing = threads.find((th) => th.clientId === c.id)
    if (existing) {
      setActiveId(existing.id)
      return
    }
    const newId = `t-${Date.now()}`
    setThreads((curr) => [
      {
        id: newId,
        clientId: c.id,
        clientName: c.name,
        clientInitials: c.initials,
        tier: c.tier,
        unread: 0,
        flagged: false,
        preview: '',
        lastAgoMin: 0,
        messages: [],
      },
      ...curr,
    ])
    setActiveId(newId)
  }

  // Hydrate threads from conversations + messages.
  useEffect(() => {
    if (!userId) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false

    void (async () => {
      type ConvRow = {
        id: string
        user_id: string
        last_message_at: string
        nutritionist_unread: number
      }
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, user_id, last_message_at, nutritionist_unread')
        .eq('nutritionist_id', userId)
        .order('last_message_at', { ascending: false })
        .limit(40)
      const convRows = (convs as ConvRow[] | null) ?? []
      if (convRows.length === 0 || cancelled) return

      const clientIds = convRows.map((c) => c.user_id)
      const { data: clients } = await supabase
        .from('profiles')
        .select('id, full_name, tier')
        .in('id', clientIds)
      type ClientRow = { id: string; full_name: string | null; tier: ThreadRow['tier'] }
      const clientOf = new Map(
        ((clients as ClientRow[] | null) ?? []).map((c) => [c.id, c]),
      )

      type MsgRow = {
        conversation_id: string
        sender_id: string
        content: string
        read_at: string | null
        created_at: string
        id: string
        is_ai: boolean | null
      }
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, read_at, created_at, is_ai')
        .in('conversation_id', convRows.map((c) => c.id))
        .order('created_at', { ascending: true })
      const msgRows = (msgs as MsgRow[] | null) ?? []
      const byConv = new Map<string, MsgRow[]>()
      for (const m of msgRows) {
        const arr = byConv.get(m.conversation_id) ?? []
        arr.push(m)
        byConv.set(m.conversation_id, arr)
      }

      const now = Date.now()
      const next: ThreadRow[] = convRows.map((c) => {
        const client = clientOf.get(c.user_id)
        const name = client?.full_name?.trim() || 'Client'
        const list = byConv.get(c.id) ?? []
        const lastMs = c.last_message_at ? new Date(c.last_message_at).getTime() : now
        const lastBody = list[list.length - 1]?.content ?? ''
        return {
          id: c.id,
          clientId: c.user_id,
          clientName: name,
          clientInitials: initialsOf(name),
          tier: client?.tier ?? 'basic',
          unread: c.nutritionist_unread,
          flagged: false,
          preview: lastBody.slice(0, 100),
          lastAgoMin: Math.max(0, Math.floor((now - lastMs) / 60_000)),
          messages: list.map((m) => ({
            id: m.id,
            fromMe: m.sender_id === userId,
            body: m.content,
            ago: Math.max(0, Math.floor((now - new Date(m.created_at).getTime()) / 60_000)),
            read: !!m.read_at,
            isAi: !!m.is_ai,
          })),
        }
      })

      if (cancelled) return
      setThreads(next)
      if (next[0]) setActiveId(next[0].id)
    })()

    return () => { cancelled = true }
  }, [userId])

  // Realtime: subscribe to every message insert on conversations the
  // nutritionist owns and append to the matching thread. Without this,
  // an incoming client message wouldn't appear until the page reloads.
  useEffect(() => {
    if (!userId) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    const channel = supabase
      .channel(`nutri-messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const r = payload.new as {
            id: string
            conversation_id: string
            sender_id: string
            content: string
            read_at: string | null
            created_at: string
            is_ai: boolean | null
          }
          // Ignore the coach's own messages (already added optimistically).
          // Don't ignore AI replies even though they share sender_id with
          // the coach — those need to surface in the thread.
          if (r.sender_id === userId && !r.is_ai) return
          const now = Date.now()
          setThreads((curr) => {
            const idx = curr.findIndex((t) => t.id === r.conversation_id)
            if (idx < 0) return curr
            const existing = curr[idx]!
            if (existing.messages.some((m) => m.id === r.id)) return curr
            const updated: ThreadRow = {
              ...existing,
              preview: r.content.slice(0, 100),
              lastAgoMin: 0,
              // AI replies don't count as unread for the coach — they
              // initiated nothing, just informational.
              unread: r.is_ai ? existing.unread : existing.unread + 1,
              messages: [
                ...existing.messages,
                {
                  id: r.id,
                  // From the coach's perspective the AI message looks
                  // like it came from "them" because it was posted with
                  // their sender_id. Keeping fromMe=true keeps the
                  // bubble alignment intuitive; the isAi flag carries
                  // the badge.
                  fromMe: r.sender_id === userId,
                  body: r.content,
                  ago: Math.max(
                    0,
                    Math.floor((now - new Date(r.created_at).getTime()) / 60_000),
                  ),
                  read: !!r.read_at,
                  isAi: !!r.is_ai,
                },
              ],
            }
            const next = [...curr]
            next[idx] = updated
            return next
          })
        },
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [userId])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return threads
      .filter((th) => {
        if (filter === 'unread' && th.unread === 0) return false
        if (filter === 'flagged' && !th.flagged) return false
        if (q && !th.clientName.toLowerCase().includes(q) && !th.preview.toLowerCase().includes(q))
          return false
        return true
      })
      .sort((a, b) => a.lastAgoMin - b.lastAgoMin)
  }, [threads, filter, query])

  const active = threads.find((th) => th.id === activeId) ?? null

  // Auto-scroll thread to bottom
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [activeId, active?.messages.length])

  // Mark unread on open
  useEffect(() => {
    if (!active || active.unread === 0) return
    setThreads((curr) =>
      curr.map((t) =>
        t.id === active.id
          ? {
              ...t,
              unread: 0,
              messages: t.messages.map((m) =>
                m.fromMe ? m : { ...m, read: true },
              ),
            }
          : t,
      ),
    )
    // Mirror to DB (best-effort)
    const supabase = getBrowserSupabase()
    if (supabase && userId && /^[0-9a-f-]{32,}$/i.test(active.id)) {
      void supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() } as never)
        .eq('conversation_id', active.id)
        .neq('sender_id', userId)
        .is('read_at', null)
      void supabase
        .from('conversations')
        .update({ nutritionist_unread: 0 } as never)
        .eq('id', active.id)
    }
  }, [active, userId])

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || !active || sending || !userId) return
    setSending(true)
    const body = draft.trim()

    const localId = `me-${Date.now()}`
    setThreads((curr) =>
      curr.map((th) =>
        th.id === active.id
          ? {
              ...th,
              preview: body,
              lastAgoMin: 0,
              messages: [
                ...th.messages,
                { id: localId, fromMe: true, body, ago: 0, read: false },
              ],
            }
          : th,
      ),
    )
    setDraft('')

    void (async () => {
      const supabase = getBrowserSupabase()
      if (supabase && /^[0-9a-f-]{32,}$/i.test(active.id) && active.clientId) {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: active.id,
            sender_id: userId,
            recipient_id: active.clientId,
            content: body,
          } as never)
          .select('id')
          .maybeSingle()
        if (error) console.error('[nutritionist/messages/insert]', error)
        const realId = (data as { id?: string } | null)?.id
        if (realId) {
          setThreads((curr) =>
            curr.map((th) =>
              th.id === active.id
                ? {
                    ...th,
                    messages: th.messages.map((m) =>
                      m.id === localId ? { ...m, id: realId } : m,
                    ),
                  }
                : th,
            ),
          )
        }
        // last_message_at + unread counters are now bumped by the
        // trg_bump_conversation_on_message trigger on insert; no
        // manual update needed.
      }
      setSending(false)
    })()
  }

  const insertTemplate = (key: (typeof TEMPLATE_KEYS)[number]) => {
    setDraft((curr) =>
      curr ? `${curr}\n${tT(`templateOptions.${key}` as 'templateOptions.wellDone')}` : tT(`templateOptions.${key}` as 'templateOptions.wellDone'),
    )
  }

  return (
    <div className="flex h-full max-w-screen-2xl mx-auto">
      {/* Thread list */}
      <aside className="hidden md:flex flex-col w-80 shrink-0 border-e border-border bg-surface/50">
        <header className="px-4 py-4 border-b border-border space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="font-display text-lg font-bold text-fg-1 tracking-tight">
                {t('messages')}
              </h1>
              <p className="text-xs text-fg-3 mt-0.5">{tT('subtitle')}</p>
            </div>
            {/* New message — primary lime CTA opens the recipient picker. */}
            <button
              type="button"
              onClick={() => setComposeOpen(true)}
              className="shrink-0 inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-3 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
              aria-label="New message"
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2.25} color="#0d1a12" />
              New
            </button>
          </div>
          {/* Search input — dashboard input chrome (40px tall, the
           * global input rule paints var(--gf-input-bg) + 8px radius). */}
          <div className="relative">
            <Search
              className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              strokeWidth={1.75}
              color="var(--gf-fg-3)"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tT('search')}
              className="w-full h-10 ps-10 pe-3 text-sm text-fg-1 placeholder-fg-3"
            />
          </div>
          {/* Filter — segmented control matching the rest of the
           * dashboard (8px outer, 6px inner radius, lime active). */}
          <div
            className="flex items-center w-full"
            style={{
              minHeight: 40,
              background: 'var(--gf-input-bg)',
              border: '1px solid var(--gf-border)',
              borderRadius: 8,
              padding: 3,
              gap: 2,
            }}
          >
            {(['all', 'unread', 'flagged'] as Filter[]).map((f) => {
              const active = filter === f
              return (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className="flex-1 inline-flex items-center justify-center transition-colors"
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
                      e.currentTarget.style.background = 'var(--gf-card-hover)'
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
                  {tT(
                    `filter${f.charAt(0).toUpperCase()}${f.slice(1)}` as 'filterAll',
                  )}
                </button>
              )
            })}
          </div>
        </header>
        <ul className="flex-1 overflow-y-auto">
          {visible.length === 0 ? (
            <li className="p-6 text-center">
              <Inbox className="w-7 h-7 mx-auto mb-2 text-fg-3" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-fg-1">{tT('noThreads')}</p>
              <p className="mt-1 text-xs text-fg-3">{tT('noThreadsBody')}</p>
            </li>
          ) : (
            visible.map((th) => (
              <ThreadListItem
                key={th.id}
                row={th}
                active={th.id === activeId}
                onClick={() => setActiveId(th.id)}
                tierLabel={tTiers(`${th.tier}.name`)}
              />
            ))
          )}
        </ul>
      </aside>

      {/* Active thread */}
      <div className="flex-1 flex flex-col min-w-0">
        {!active ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div>
              <Inbox
                className="w-9 h-9 mx-auto mb-3 text-fg-3"
                strokeWidth={1.5}
              />
              <p className="text-base font-semibold text-fg-1">
                {tT('selectThread')}
              </p>
              <p className="mt-1 text-sm text-fg-2">{tT('selectThreadBody')}</p>
            </div>
          </div>
        ) : (
          <>
            <header className="shrink-0 px-4 md:px-6 py-4 border-b border-border bg-surface/60 backdrop-blur flex items-center gap-3">
              <ClientAvatar initials={active.clientInitials} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-fg-1 truncate">
                  {active.clientName}
                </p>
                <div className="mt-0.5 inline-flex items-center gap-1.5">
                  <span
                    className="inline-flex items-center justify-center"
                    style={{
                      height: 18,
                      padding: '0 8px',
                      borderRadius: 999,
                      background: `${TIER_TINT[active.tier]}1f`,
                      color: TIER_TINT[active.tier],
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                    }}
                  >
                    {tTiers(`${active.tier}.name`)}
                  </span>
                  {active.flagged && (
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-semibold"
                      style={{ color: '#e8912a' }}
                    >
                      <Flag className="w-2.5 h-2.5" strokeWidth={2} />
                    </span>
                  )}
                </div>
              </div>
            </header>

            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4"
            >
              <DateDivider label={tT('today')} />
              {active.messages.map((msg) => (
                <Bubble key={msg.id} msg={msg} clientInitials={active.clientInitials} />
              ))}
            </div>

            {/* Templates */}
            <div className="shrink-0 px-3 md:px-6 pt-3 pb-1 flex flex-wrap items-center gap-1.5 border-t border-border bg-surface/40">
              <span className="text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold inline-flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-lime-400" strokeWidth={2} />
                {tT('templates')}
              </span>
              {TEMPLATE_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => insertTemplate(k)}
                  className="rounded-pill h-7 px-3 text-[11px] font-medium bg-bg-deeper border border-border text-fg-2 hover:border-primary/40 hover:text-fg-1"
                >
                  {tT(`templateOptions.${k}` as 'templateOptions.wellDone')}
                </button>
              ))}
            </div>

            {/* Composer */}
            <form
              onSubmit={send}
              className="shrink-0 border-t border-border bg-surface px-3 md:px-6 py-3 flex items-end gap-2"
            >
              <button
                type="button"
                aria-label="Attach"
                className="shrink-0 w-10 h-10 rounded-full bg-surface-raised border border-border text-fg-2 hover:text-fg-1 hover:border-primary/40 inline-flex items-center justify-center"
              >
                <Paperclip className="w-4 h-4" strokeWidth={1.75} />
              </button>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    send(e as unknown as React.FormEvent)
                  }
                }}
                rows={1}
                placeholder={tT('compose')}
                maxLength={2000}
                className="flex-1 min-h-[40px] max-h-32 resize-none rounded-2xl bg-bg-deeper border border-border px-4 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary leading-snug"
              />
              <button
                type="submit"
                disabled={!draft.trim() || sending}
                aria-label={tT('send')}
                className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-b from-lime-400 to-lime-600 text-bg shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-40 disabled:hover:translate-y-0"
              >
                <Send className="w-4 h-4 rtl:-scale-x-100" strokeWidth={2.25} />
              </button>
            </form>
          </>
        )}
      </div>

      {composeOpen && (
        <ComposeRecipientPicker
          clients={allClients}
          onPick={pickRecipient}
          onClose={() => setComposeOpen(false)}
          tierTint={TIER_TINT}
          tTiers={tTiers}
        />
      )}
    </div>
  )
}

/**
 * Modal shown when the nutritionist clicks "New" — lists every
 * client (role='user' profiles) with a search filter. Picking one
 * either jumps to the existing thread or opens a new draft.
 */
function ComposeRecipientPicker({
  clients,
  onPick,
  onClose,
  tierTint,
  tTiers,
}: {
  clients: { id: string; name: string; initials: string; tier: Tier }[]
  onPick: (c: {
    id: string
    name: string
    initials: string
    tier: Tier
  }) => void
  onClose: () => void
  tierTint: Record<Tier, string>
  tTiers: ReturnType<typeof useTranslations>
}) {
  const [q, setQ] = useState('')
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return clients
    return clients.filter((c) => c.name.toLowerCase().includes(s))
  }, [clients, q])

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md flex flex-col"
        style={{
          maxHeight: 'calc(100vh - 100px)',
          background: 'var(--gf-card)',
          border: '1px solid var(--gf-border)',
          borderRadius: 16,
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
          overflow: 'hidden',
        }}
      >
        <header
          className="px-5 py-4 flex items-center justify-between gap-3"
          style={{ borderBottom: '1px solid var(--gf-border)' }}
        >
          <div>
            <h2 className="text-base font-semibold text-fg-1">New message</h2>
            <p className="text-xs text-fg-3 mt-0.5">
              Pick a client to start a conversation.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center transition-colors"
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: 'transparent',
              color: 'var(--gf-fg-3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--gf-card-hover)'
              e.currentTarget.style.color = 'var(--gf-fg-1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--gf-fg-3)'
            }}
          >
            <X className="w-4 h-4" strokeWidth={1.75} color="currentColor" />
          </button>
        </header>

        <div className="px-5 py-3" style={{ borderBottom: '1px solid var(--gf-border)' }}>
          <div className="relative">
            <Search
              className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              strokeWidth={1.75}
              color="var(--gf-fg-3)"
            />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
              placeholder="Search clients…"
              className="w-full h-10 ps-10 pe-3 text-sm text-fg-1 placeholder-fg-3"
            />
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-5 py-6 text-center text-sm text-fg-3">
              {clients.length === 0 ? 'Loading clients…' : 'No clients match.'}
            </li>
          ) : (
            filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => onPick(c)}
                  className="w-full flex items-center gap-3 px-5 py-2.5 text-start transition-colors"
                  style={{ background: 'transparent' }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--gf-card-hover)')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'transparent')
                  }
                >
                  <Avatar text={c.initials} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-fg-1 truncate">
                      {c.name}
                    </p>
                  </div>
                  <span
                    className="inline-flex items-center justify-center"
                    style={{
                      height: 18,
                      padding: '0 8px',
                      borderRadius: 999,
                      background: `${tierTint[c.tier]}1f`,
                      color: tierTint[c.tier],
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      lineHeight: 1,
                    }}
                  >
                    {tTiers(`${c.tier}.name`)}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  )
}

function ThreadListItem({
  row,
  active,
  onClick,
  tierLabel,
}: {
  row: ThreadRow
  active: boolean
  onClick: () => void
  tierLabel: string
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`w-full text-start flex items-start gap-3 px-4 py-3 border-b border-border transition-colors ${
          active ? 'bg-primary/10' : 'hover:bg-surface-raised'
        }`}
      >
        <ClientAvatar initials={row.clientInitials} small />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <p
              className={`text-sm truncate ${
                active || row.unread > 0 ? 'font-semibold text-fg-1' : 'text-fg-2'
              }`}
            >
              {row.clientName}
            </p>
            <p className="text-[10px] text-fg-3 font-mono shrink-0" dir="ltr">
              {formatAgo(row.lastAgoMin)}
            </p>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className="rounded-pill h-4 px-1.5 inline-flex items-center text-[9px] uppercase tracking-eyebrow font-bold"
              style={{
                background: `${TIER_TINT[row.tier]}1a`,
                color: TIER_TINT[row.tier],
              }}
            >
              {tierLabel}
            </span>
            {row.flagged && (
              <Flag
                className="w-2.5 h-2.5"
                strokeWidth={2}
                style={{ color: '#e8912a' }}
              />
            )}
          </div>
          <p
            className={`mt-1 text-xs truncate ${
              row.unread > 0 ? 'text-fg-1 font-medium' : 'text-fg-3'
            }`}
          >
            {row.preview}
          </p>
        </div>
        {row.unread > 0 && (
          <span
            className="shrink-0 rounded-full bg-lime-400 text-bg font-mono font-bold text-[10px] min-w-5 h-5 inline-flex items-center justify-center px-1.5"
            dir="ltr"
          >
            {row.unread}
          </span>
        )}
      </button>
    </li>
  )
}

function ClientAvatar({
  initials,
  small,
}: {
  initials: string
  small?: boolean
}) {
  return <Avatar text={initials} size={small ? 36 : 44} />
}

function Bubble({
  msg,
  clientInitials,
}: {
  msg: Msg
  clientInitials: string
}) {
  return (
    <div
      className={`flex items-end gap-2 ${
        msg.fromMe ? 'justify-end' : 'justify-start'
      }`}
    >
      {!msg.fromMe && <ClientAvatar initials={clientInitials} small />}
      <div
        className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          msg.isAi
            ? 'bg-lime-400/10 text-fg-1 border border-lime-400/40'
            : msg.fromMe
            ? 'bg-gradient-to-b from-lime-400 to-lime-600 text-bg rounded-br-md'
            : 'bg-surface-raised text-fg-1 border border-border rounded-bl-md'
        }`}
      >
        {msg.isAi && (
          <p
            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-eyebrow font-bold mb-1.5 rounded-pill px-1.5 py-0.5"
            style={{ color: '#a3e635', background: 'rgba(132,217,61,0.16)' }}
            dir="ltr"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-lime-400" aria-hidden />
            AI replied — review and follow up
          </p>
        )}
        <p className="whitespace-pre-wrap">{msg.body}</p>
        <div
          className={`mt-1 flex items-center gap-1 text-[11px] font-mono ${
            msg.fromMe ? 'text-bg/70 justify-end' : 'text-fg-3'
          }`}
          dir="ltr"
        >
          <span>{formatAgo(msg.ago)}</span>
          {msg.fromMe &&
            (msg.read ? (
              <CheckCheck className="w-3 h-3" strokeWidth={2.25} />
            ) : (
              <Check className="w-3 h-3" strokeWidth={2.25} />
            ))}
        </div>
      </div>
    </div>
  )
}

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        {label}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  )
}

function formatAgo(min: number): string {
  if (min < 1) return 'now'
  if (min < 60) return `${Math.round(min)}m`
  const h = min / 60
  if (h < 24) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
}
