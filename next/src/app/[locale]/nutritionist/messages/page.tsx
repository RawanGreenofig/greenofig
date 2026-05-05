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
} from 'lucide-react'
import type { Tier } from '@/lib/constants'
import { useUser } from '@/lib/hooks/useUser'
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
}

interface ThreadRow {
  id: string
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

const SEED: ThreadRow[] = [
  {
    id: 't1',
    clientName: 'Layla Hijazi',
    clientInitials: 'LH',
    tier: 'vip',
    unread: 2,
    flagged: false,
    preview: 'Logged 6h sleep last night, feels related to dinner timing…',
    lastAgoMin: 60 * 3,
    messages: [
      { id: 'm1', fromMe: false, body: 'Down 0.4 kg this week — feels real, not just water.', ago: 60 * 26, read: true },
      { id: 'm2', fromMe: true,  body: 'Beautiful. Energy in the afternoons?', ago: 60 * 25, read: true },
      { id: 'm3', fromMe: false, body: 'Steady from 2-5pm. The lentil swap is doing it.', ago: 60 * 24, read: true },
      { id: 'm4', fromMe: false, body: 'Logged 6h sleep last night, feels related to dinner timing — thoughts?', ago: 60 * 3,  read: false },
      { id: 'm5', fromMe: false, body: 'Should I push dinner earlier?', ago: 60 * 3 - 5, read: false },
    ],
  },
  {
    id: 't2',
    clientName: 'Maya Khalil',
    clientInitials: 'MK',
    tier: 'premium',
    unread: 0,
    flagged: false,
    preview: 'Goal weight hit 🎉 What now?',
    lastAgoMin: 60 * 14,
    messages: [
      { id: 'm1', fromMe: false, body: 'Goal weight hit 🎉 What now?', ago: 60 * 14, read: true },
      { id: 'm2', fromMe: true, body: 'Incredible. Let\'s shift to maintenance — same plan, +200 kcal. We\'ll meet Tuesday.', ago: 60 * 13, read: true },
    ],
  },
  {
    id: 't3',
    clientName: 'Omar Saadeh',
    clientInitials: 'OS',
    tier: 'premium',
    unread: 0,
    flagged: true,
    preview: 'Skipped logging this week — was traveling.',
    lastAgoMin: 60 * 96,
    messages: [
      { id: 'm1', fromMe: false, body: 'Skipped logging this week — was traveling.', ago: 60 * 96, read: true },
      { id: 'm2', fromMe: true, body: 'Welcome back. Just one full day of logging this week and we\'re good. Travel notes for next time too.', ago: 60 * 95, read: true },
    ],
  },
  {
    id: 't4',
    clientName: 'Karim Jubran',
    clientInitials: 'KJ',
    tier: 'vip',
    unread: 1,
    flagged: false,
    preview: 'Lab results came back, sharing now…',
    lastAgoMin: 60 * 8,
    messages: [
      { id: 'm1', fromMe: false, body: 'Lab results came back, sharing now (vitamin D very low).', ago: 60 * 8, read: false },
    ],
  },
  {
    id: 't5',
    clientName: 'Diana Costa',
    clientInitials: 'DC',
    tier: 'premium',
    unread: 0,
    flagged: false,
    preview: 'Loved this week\'s meals, especially the salmon bowl.',
    lastAgoMin: 60 * 28,
    messages: [
      { id: 'm1', fromMe: false, body: 'Loved this week\'s meals, especially the salmon bowl.', ago: 60 * 28, read: true },
      { id: 'm2', fromMe: true, body: 'Glad it landed. I\'ll add a second variation next week.', ago: 60 * 27, read: true },
    ],
  },
]

const TEMPLATE_KEYS = ['wellDone', 'logReminder', 'planUpdate', 'weighIn'] as const

export default function NutritionistMessagesPage() {
  const t = useTranslations('nutritionist')
  const tT = useTranslations('nutritionist.threads')
  const tTiers = useTranslations('tiers')
  const { profile } = useUser()
  const userId = profile?.id ?? null

  const [threads, setThreads] = useState<ThreadRow[]>(SEED)
  const [activeId, setActiveId] = useState<string | null>(SEED[0]!.id)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Hydrate threads from conversations + messages.
  useEffect(() => {
    if (!userId) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false

    void (async () => {
      type ConvRow = {
        id: string
        client_id: string
        last_message_at: string
        unread_count: number
        flagged: boolean
      }
      const { data: convs } = await supabase
        .from('conversations')
        .select('id, client_id, last_message_at, unread_count, flagged')
        .eq('nutritionist_id', userId)
        .order('last_message_at', { ascending: false })
        .limit(40)
      const convRows = (convs as ConvRow[] | null) ?? []
      if (convRows.length === 0 || cancelled) return

      const clientIds = convRows.map((c) => c.client_id)
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
        body: string
        read: boolean
        created_at: string
        id: string
      }
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, read, created_at')
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
        const client = clientOf.get(c.client_id)
        const name = client?.full_name?.trim() || 'Client'
        const list = byConv.get(c.id) ?? []
        const lastMs = c.last_message_at ? new Date(c.last_message_at).getTime() : now
        const lastBody = list[list.length - 1]?.body ?? ''
        return {
          id: c.id,
          clientName: name,
          clientInitials: initialsOf(name),
          tier: client?.tier ?? 'basic',
          unread: c.unread_count,
          flagged: c.flagged,
          preview: lastBody.slice(0, 100),
          lastAgoMin: Math.max(0, Math.floor((now - lastMs) / 60_000)),
          messages: list.map((m) => ({
            id: m.id,
            fromMe: m.sender_id === userId,
            body: m.body,
            ago: Math.max(0, Math.floor((now - new Date(m.created_at).getTime()) / 60_000)),
            read: m.read,
          })),
        }
      })

      if (cancelled) return
      setThreads(next)
      if (next[0]) setActiveId(next[0].id)
    })()

    return () => { cancelled = true }
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
        .update({ read: true } as never)
        .eq('conversation_id', active.id)
        .neq('sender_id', userId)
      void supabase
        .from('conversations')
        .update({ unread_count: 0 } as never)
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
      if (supabase && /^[0-9a-f-]{32,}$/i.test(active.id)) {
        const { data } = await supabase
          .from('messages')
          .insert({
            conversation_id: active.id,
            sender_id: userId,
            body,
            read: false,
          } as never)
          .select('id')
          .maybeSingle()
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
        // Bump conversation timestamp
        void supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() } as never)
          .eq('id', active.id)
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
    <div className="flex h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] max-w-screen-2xl mx-auto">
      {/* Thread list */}
      <aside className="hidden md:flex flex-col w-80 shrink-0 border-e border-border bg-surface/50">
        <header className="px-4 py-4 border-b border-border space-y-3">
          <div>
            <h1 className="font-display text-lg font-bold text-fg-1 tracking-tight">
              {t('messages')}
            </h1>
            <p className="text-xs text-fg-3 mt-0.5">{tT('subtitle')}</p>
          </div>
          <div className="relative">
            <Search
              className="absolute start-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-3"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tT('search')}
              className="w-full h-9 rounded-pill bg-bg-deeper border border-border ps-9 pe-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
            />
          </div>
          <div className="inline-flex items-center gap-0.5 rounded-pill bg-bg-deeper border border-border p-0.5 w-full">
            {(['all', 'unread', 'flagged'] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`flex-1 h-7 rounded-pill text-[11px] font-semibold transition-colors ${
                  filter === f
                    ? 'bg-primary/20 text-lime-400'
                    : 'text-fg-3 hover:text-fg-1'
                }`}
              >
                {tT(`filter${f.charAt(0).toUpperCase()}${f.slice(1)}` as 'filterAll')}
              </button>
            ))}
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
                    className="rounded-pill h-5 px-2 inline-flex items-center text-[10px] uppercase tracking-eyebrow font-bold"
                    style={{
                      background: `${TIER_TINT[active.tier]}1a`,
                      color: TIER_TINT[active.tier],
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
  return (
    <span
      className={`shrink-0 rounded-full inline-flex items-center justify-center font-display font-bold ${
        small ? 'w-9 h-9 text-xs' : 'w-11 h-11 text-sm'
      }`}
      style={{
        background: 'linear-gradient(135deg,#5c7262,#2c3e35)',
        color: '#f0ede6',
      }}
    >
      {initials}
    </span>
  )
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
          msg.fromMe
            ? 'bg-gradient-to-b from-lime-400 to-lime-600 text-bg rounded-br-md'
            : 'bg-surface-raised text-fg-1 border border-border rounded-bl-md'
        }`}
      >
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
