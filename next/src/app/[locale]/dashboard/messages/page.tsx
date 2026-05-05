'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Send,
  Paperclip,
  Sparkles,
  Lock,
  ArrowRight,
  CheckCheck,
  Check,
} from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useUser } from '@/lib/hooks/useUser'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { tierAtLeast } from '@/lib/tier'
import { NUTRITIONIST } from '@/lib/tokens'

interface Msg {
  id: string
  fromMe: boolean
  body: string
  /** Minutes ago */
  ago: number
  read?: boolean
}

const SEED: Msg[] = [
  {
    id: 'm1',
    fromMe: false,
    body: 'Welcome to your VIP line. Anything you want to focus on this week?',
    ago: 60 * 24 * 2,
    read: true,
  },
  {
    id: 'm2',
    fromMe: true,
    body: 'I keep stalling around 3pm — energy crashes and I reach for sweets.',
    ago: 60 * 24 * 2 - 30,
    read: true,
  },
  {
    id: 'm3',
    fromMe: false,
    body:
      'Classic post-lunch dip — usually a sign of too many fast carbs at noon. Let us swap your lunch base for quinoa or lentils tomorrow and add a 15-min walk after eating. Track how 3pm feels for three days.',
    ago: 60 * 24 * 2 - 35,
    read: true,
  },
  {
    id: 'm4',
    fromMe: true,
    body: 'Will do. Thank you 🙏',
    ago: 60 * 24 * 2 - 50,
    read: true,
  },
  {
    id: 'm5',
    fromMe: false,
    body:
      'Three days in — how is the afternoon feeling? Be honest, even small shifts matter.',
    ago: 60 * 6,
    read: true,
  },
]

export default function MessagesPage() {
  const t = useTranslations('msgs')
  const { tier } = useUser()
  const allowed = tierAtLeast(tier, 'vip')

  if (!allowed) return <UpgradeGate t={t} />

  return <Thread t={t} />
}

/* ── Views ──────────────────────────────────────────────────────── */

function UpgradeGate({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="px-4 md:px-8 py-12 max-w-screen-md mx-auto">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent p-8 md:p-12 text-center">
        <span
          className="inline-flex w-14 h-14 rounded-full items-center justify-center mb-5"
          style={{ background: 'rgb(61 122 74 / 0.18)', color: 'var(--gf-lime-400)' }}
        >
          <Lock className="w-6 h-6" strokeWidth={1.75} />
        </span>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 36px)', lineHeight: 1.15 }}
        >
          {t('lockedTitle')}
        </h1>
        <p className="mt-3 text-sm md:text-base text-fg-2 max-w-md mx-auto leading-relaxed">
          {t('lockedBody')}
        </p>
        <Link
          href="/pricing"
          className="mt-6 inline-flex items-center gap-2 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 px-6 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
        >
          {t('lockedCta')}
          <ArrowRight className="w-4 h-4 rtl:rotate-180" strokeWidth={2.25} />
        </Link>
      </div>
    </div>
  )
}

function Thread({ t }: { t: ReturnType<typeof useTranslations> }) {
  const { profile } = useUser()
  const userId = profile?.id ?? null
  const [messages, setMessages] = useState<Msg[]>(SEED)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages])

  // Load the user's existing conversation with Dr. Rawan + its messages.
  useEffect(() => {
    if (!userId) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false

    void (async () => {
      const { data: convRow } = await supabase
        .from('conversations')
        .select('id')
        .eq('client_id', userId)
        .order('last_message_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      const id = (convRow as { id?: string } | null)?.id ?? null
      if (cancelled) return
      setConversationId(id)
      if (!id) return

      const { data } = await supabase
        .from('messages')
        .select('id, sender_id, body, read, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })
        .limit(200)

      if (cancelled) return
      type Row = {
        id: string; sender_id: string; body: string; read: boolean; created_at: string
      }
      const now = Date.now()
      const next = ((data as Row[] | null) ?? []).map((r) => ({
        id: r.id,
        fromMe: r.sender_id === userId,
        body: r.body,
        ago: Math.max(0, Math.floor((now - new Date(r.created_at).getTime()) / 60_000)),
        read: r.read,
      }))
      if (next.length > 0) setMessages(next)

      // Mark all incoming messages as read on open
      void supabase
        .from('messages')
        .update({ read: true } as never)
        .eq('conversation_id', id)
        .neq('sender_id', userId)
    })()

    return () => { cancelled = true }
  }, [userId])

  const send = (e: React.FormEvent) => {
    e.preventDefault()
    if (!draft.trim() || sending || !userId) return
    setSending(true)

    const text = draft.trim()
    const localId = `me-${Date.now()}`
    setMessages((curr) => [
      ...curr,
      { id: localId, fromMe: true, body: text, ago: 0, read: false },
    ])
    setDraft('')

    void (async () => {
      const supabase = getBrowserSupabase()
      if (supabase && conversationId) {
        const { data } = await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            sender_id: userId,
            body: text,
            read: false,
          } as never)
          .select('id')
          .maybeSingle()
        const realId = (data as { id?: string } | null)?.id
        if (realId) {
          setMessages((curr) =>
            curr.map((m) => (m.id === localId ? { ...m, id: realId } : m)),
          )
        }
      }
      setSending(false)
    })()
  }

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] max-w-screen-lg mx-auto">
      {/* Header */}
      <header className="shrink-0 px-4 md:px-8 py-4 border-b border-border bg-surface/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <DrAvatar drName={NUTRITIONIST.name} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-fg-1 truncate">
              {NUTRITIONIST.name}
            </p>
            <p className="text-xs text-lime-400 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" strokeWidth={2} />
              {t('drStaff')}
            </p>
          </div>
        </div>
      </header>

      {/* Thread */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4"
      >
        <DateDivider label={t('today')} />
        {messages.length === 0 ? (
          <p className="text-sm text-fg-3 text-center mt-12">
            {t('noMessages')}
          </p>
        ) : (
          messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} t={t} />
          ))
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={send}
        className="shrink-0 border-t border-border bg-surface px-3 md:px-6 py-3 flex items-end gap-2"
      >
        <button
          type="button"
          aria-label={t('fileAttach')}
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
          placeholder={t('compose')}
          maxLength={2000}
          className="flex-1 min-h-[40px] max-h-32 resize-none rounded-2xl bg-bg-deeper border border-border px-4 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary leading-snug"
        />
        <button
          type="submit"
          aria-label={t('send')}
          disabled={!draft.trim() || sending}
          className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-b from-lime-400 to-lime-600 text-bg shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-40 disabled:hover:translate-y-0"
        >
          <Send className="w-4 h-4 rtl:-scale-x-100" strokeWidth={2.25} />
        </button>
      </form>
    </div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

function Bubble({
  msg,
  t,
}: {
  msg: Msg
  t: ReturnType<typeof useTranslations>
}) {
  const time = formatAgo(msg.ago)
  return (
    <div
      className={`flex items-end gap-2 ${
        msg.fromMe ? 'justify-end' : 'justify-start'
      }`}
    >
      {!msg.fromMe && (
        <DrAvatar drName={NUTRITIONIST.name} small />
      )}
      <div
        className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
          msg.fromMe
            ? 'bg-gradient-to-b from-lime-400 to-lime-600 text-bg rounded-br-md'
            : 'bg-surface-raised text-fg-1 border border-border rounded-bl-md'
        }`}
      >
        <p>{msg.body}</p>
        <div
          className={`mt-1 flex items-center gap-1 text-[11px] font-mono ${
            msg.fromMe ? 'text-bg/70 justify-end' : 'text-fg-3'
          }`}
          dir="ltr"
        >
          <span>{time}</span>
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
  void t
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

function DrAvatar({ drName, small }: { drName: string; small?: boolean }) {
  const initials = drName
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return (
    <span
      className={`shrink-0 rounded-full flex items-center justify-center font-display font-bold ${
        small ? 'w-7 h-7 text-[11px]' : 'w-11 h-11 text-base'
      }`}
      style={{
        background: 'linear-gradient(135deg,#a3e635,#65a30d)',
        color: '#0d1a12',
      }}
    >
      {initials}
    </span>
  )
}

function formatAgo(min: number): string {
  if (min < 1) return 'now'
  if (min < 60) return `${Math.round(min)}m`
  const h = min / 60
  if (h < 24) return `${Math.round(h)}h`
  return `${Math.round(h / 24)}d`
}
