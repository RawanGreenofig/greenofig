'use client'

import { useEffect, useMemo, useState } from 'react'
import { MessageSquare, Search } from '@/icons'
import { getBrowserSupabase } from '@/lib/supabase/client'

interface ConvRow {
  id: string
  user_id: string
  nutritionist_id: string
  last_message_at: string
  user_unread: number
  nutritionist_unread: number
}
interface ProfileLite {
  id: string
  full_name: string | null
}
interface MsgRow {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  read_at: string | null
  created_at: string
  is_ai?: boolean | null
}

/**
 * /nutritionist/team-messages — head coach reads every coach ↔
 * client thread (via the head-coach RLS policy added in migration
 * 021). Useful for monitoring service quality and catching threads
 * that have been sitting unread.
 */
export default function TeamMessagesPage() {
  const [convs, setConvs] = useState<ConvRow[]>([])
  const [profiles, setProfiles] = useState<Map<string, ProfileLite>>(new Map())
  const [activeId, setActiveId] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<MsgRow[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    void (async () => {
      const supabase = getBrowserSupabase()
      if (!supabase) return
      const { data: convsRaw } = await supabase
        .from('conversations')
        .select('id, user_id, nutritionist_id, last_message_at, user_unread, nutritionist_unread')
        .order('last_message_at', { ascending: false })
        .limit(200)
      const list = (convsRaw as ConvRow[] | null) ?? []
      setConvs(list)
      if (list.length === 0) return
      const ids = Array.from(new Set(list.flatMap((c) => [c.user_id, c.nutritionist_id])))
      const { data: pRows } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', ids)
      const map = new Map<string, ProfileLite>()
      for (const p of (pRows as ProfileLite[] | null) ?? []) map.set(p.id, p)
      setProfiles(map)
      if (list[0]) setActiveId(list[0].id)
    })()
  }, [])

  useEffect(() => {
    if (!activeId) return
    void (async () => {
      const supabase = getBrowserSupabase()
      if (!supabase) return
      const { data } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, content, read_at, created_at, is_ai')
        .eq('conversation_id', activeId)
        .order('created_at', { ascending: true })
        .limit(500)
      setMsgs((data as MsgRow[] | null) ?? [])
    })()
  }, [activeId])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return convs
    return convs.filter((c) => {
      const u = profiles.get(c.user_id)?.full_name ?? ''
      const n = profiles.get(c.nutritionist_id)?.full_name ?? ''
      return u.toLowerCase().includes(q) || n.toLowerCase().includes(q)
    })
  }, [convs, profiles, query])

  const active = convs.find((c) => c.id === activeId) ?? null

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-5">
      <header>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          Team messages
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">
          Read-only view of every coach ↔ client conversation. Use this to
          spot unanswered threads and check service quality.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 rounded-xl border border-border bg-surface overflow-hidden">
        {/* Conversation list */}
        <aside className="border-b md:border-b-0 md:border-e border-border max-h-[70vh] flex flex-col">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search
                className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                style={{ insetInlineStart: 10 }}
                strokeWidth={1.75}
                color="var(--gf-fg-3)"
              />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name…"
                className="w-full h-9 rounded-md text-sm text-fg-1 placeholder-fg-3 focus:outline-none"
                style={{
                  background: 'var(--gf-input-bg)',
                  border: '1px solid var(--gf-border)',
                  paddingInlineStart: 30,
                  paddingInlineEnd: 10,
                }}
              />
            </div>
          </div>
          {visible.length === 0 ? (
            <div className="p-4 text-sm text-fg-3 text-center">No conversations.</div>
          ) : (
            <ul className="divide-y divide-border overflow-y-auto">
              {visible.map((c) => {
                const client = profiles.get(c.user_id)?.full_name ?? 'Client'
                const coach = profiles.get(c.nutritionist_id)?.full_name ?? 'Coach'
                const ago = Math.max(
                  0,
                  Math.floor((Date.now() - new Date(c.last_message_at).getTime()) / 60_000),
                )
                const isActive = c.id === activeId
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className="w-full text-left px-3 py-3 transition-colors"
                      style={{ background: isActive ? 'var(--gf-input-bg)' : 'transparent' }}
                    >
                      <p className="text-sm font-semibold text-fg-1 truncate">{client}</p>
                      <p className="mt-0.5 text-xs text-fg-3 truncate">
                        with {coach} · {ago < 60 ? `${ago}m` : ago < 1440 ? `${Math.floor(ago/60)}h` : `${Math.floor(ago/1440)}d`}
                      </p>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </aside>

        {/* Thread reader */}
        <div className="max-h-[70vh] flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-sm text-fg-3 py-10">
              <div className="text-center">
                <MessageSquare className="w-8 h-8 mx-auto" strokeWidth={1.5} color="var(--gf-fg-3)" />
                <p className="mt-3">Pick a conversation to read.</p>
              </div>
            </div>
          ) : (
            <>
              <header className="px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold text-fg-1">
                  {profiles.get(active.user_id)?.full_name ?? 'Client'}
                </p>
                <p className="text-xs text-fg-3">
                  coach: {profiles.get(active.nutritionist_id)?.full_name ?? 'Coach'}
                </p>
              </header>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: 'var(--gf-bg)' }}>
                {msgs.length === 0 ? (
                  <p className="text-sm text-fg-3 text-center mt-6">No messages yet.</p>
                ) : msgs.map((m) => {
                  const fromClient = m.sender_id === active.user_id
                  const isAi = !!m.is_ai
                  const senderName = isAi
                    ? 'Greenofig Assistant (AI)'
                    : profiles.get(m.sender_id)?.full_name ?? 'Unknown'
                  return (
                    <div key={m.id} className={fromClient ? 'flex justify-start' : 'flex justify-end'}>
                      <div
                        className="max-w-[80%] rounded-2xl px-3 py-2"
                        style={{
                          background: fromClient ? 'var(--gf-surface-raised)' : 'rgba(132,217,61,0.16)',
                          border: '1px solid var(--gf-border)',
                        }}
                      >
                        <p className="text-[10px] uppercase tracking-eyebrow font-semibold mb-1" style={{ color: fromClient ? 'var(--gf-fg-3)' : '#a3e635' }}>
                          {senderName} · {new Date(m.created_at).toLocaleString()}
                        </p>
                        <p className="text-sm text-fg-1 whitespace-pre-wrap leading-snug">
                          {m.content}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
