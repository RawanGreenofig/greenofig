'use client'


import { motion } from 'framer-motion'
import Image from 'next/image'
import { Suspense, useEffect, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import {
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation'
import {
  Plus,
  ArrowUp,
  Sparkles,
  Send,
  Paperclip,
  CheckCheck,
  Check,
} from '@/icons'
import toast from 'react-hot-toast'
import { useUser } from '@/lib/hooks/useUser'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { tierAtLeast } from '@/lib/tier'
import { resolveFirstName } from '@/lib/displayName'
import { NUTRITIONIST } from '@/lib/tokens'

/**
 * /dashboard/messages
 *
 * Two states:
 *   - Free / basic tier  → premium-pitch upgrade card with mock chat input
 *   - Premium / VIP      → real chat thread with Dr. Rawan
 *
 * The upgrade flow POSTs to /api/stripe/checkout and routes the user back
 * to this page with `?success=1`, where we surface a toast and clean the
 * query string up.
 */
const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function MessagesPage() {
  return (
    <Suspense fallback={null}>
      <MessagesInner />
    </Suspense>
  )
}

function MessagesInner() {
  const { user, profile, tier } = useUser()
  const allowed = tierAtLeast(tier, 'premium')

  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()

  // Welcome toast after returning from a successful Stripe checkout.
  useEffect(() => {
    if (searchParams.get('success') === '1') {
      toast.success('🎉 Premium unlocked! You can now message Dr. Rawan.')
      router.replace(pathname)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const firstName = resolveFirstName(profile, user, 'there')

  if (!allowed) return <UpgradeCard firstName={firstName} />
  return <Thread />
}

/* ── State A: Upgrade UI ─────────────────────────────────────────── */

function UpgradeCard({ firstName }: { firstName: string }) {
  const locale = useLocale()
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    if (loading) return
    setLoading(true)
    try {
      const origin = window.location.origin
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'subscription',
          tier: 'premium',
          cycle: 'monthly',
          successUrl: `${origin}/${locale}/dashboard/messages?success=1`,
          cancelUrl: `${origin}/${locale}/dashboard/messages`,
        }),
      })
      const data = (await res.json().catch(() => null)) as
        | { url?: string; error?: { message?: string } }
        | null
      if (data?.url) {
        window.location.href = data.url
        return
      }
      toast.error(
        data?.error?.message ??
          "Couldn't start checkout. Please try again.",
      )
    } catch (e) {
      console.error(e)
      toast.error('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    {
      icon: '🧬',
      title: 'Analyze your meals instantly',
      sub: 'Nutrition Analysis',
    },
    {
      icon: '📋',
      title: 'Get a personalized meal plan from Dr. Rawan',
      sub: 'Meal Planning',
    },
    {
      icon: '💬',
      title: 'Chat directly with your nutritionist anytime',
      sub: 'Direct Messaging',
    },
  ]

  const pills = [
    '🔬 Analyze meal',
    '📅 Meal plan',
    '💊 Supplements',
    '❓ Ask a question',
  ]

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div
        style={{
          background: 'var(--gf-surface-raised)',
          border: '1px solid var(--gf-border)',
          borderRadius: '24px',
          padding: '32px',
          width: '100%',
          maxWidth: '720px',
        }}
      >
        {/* Top bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '40px',
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--gf-fg-2)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles className="w-4 h-4" strokeWidth={2} />
            Greenofig AI
          </span>
          <span style={{ fontSize: '14px', color: 'var(--gf-fg-3)' }}>
            Nutrition Chat
          </span>
          <button
            type="button"
            onClick={handleUpgrade}
            disabled={loading}
            style={{
              background: 'var(--gf-fg-1)',
              color: 'var(--gf-bg)',
              border: 'none',
              borderRadius: '999px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer',
              opacity: loading ? 0.7 : 1,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
            {loading ? 'Redirecting…' : 'Upgrade'}
          </button>
        </div>

        {/* Greeting */}
        <div style={{ marginBottom: '32px' }}>
          <h2
            style={{
              fontSize: 'clamp(24px, 3vw, 32px)',
              fontWeight: 700,
              color: 'var(--gf-fg-1)',
              lineHeight: 1.3,
              maxWidth: '440px',
              letterSpacing: '-0.02em',
            }}
          >
            Hi {firstName}, Ready to
            <br />
            Nourish Better?
          </h2>
        </div>

        {/* 3 feature cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          {features.map((card) => (
            <div
              key={card.title}
              onClick={handleUpgrade}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleUpgrade()
              }}
              style={{
                background: 'var(--gf-bg)',
                border: '1px solid var(--gf-border)',
                borderRadius: '16px',
                padding: '20px',
                cursor: 'pointer',
                transition: 'border-color 200ms',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.borderColor = 'var(--gf-primary)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.borderColor = 'var(--gf-border)')
              }
            >
              <span style={{ fontSize: '32px', lineHeight: 1 }}>
                {card.icon}
              </span>
              <p
                style={{
                  fontSize: '15px',
                  fontWeight: 600,
                  color: 'var(--gf-fg-1)',
                  marginTop: '16px',
                  lineHeight: 1.4,
                }}
              >
                {card.title}
              </p>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--gf-fg-3)',
                  marginTop: '8px',
                }}
              >
                {card.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Bottom section */}
        <div
          style={{
            borderTop: '1px solid var(--gf-border)',
            paddingTop: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: '12px',
              marginBottom: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                fontSize: '12px',
                color: 'var(--gf-fg-3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
              Unlock messaging with Premium
            </span>
            <span
              style={{
                fontSize: '12px',
                color: 'var(--gf-fg-3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2} />
              Powered by Greenofig AI
            </span>
          </div>

          {/* Fake input bar — every interaction triggers checkout */}
          <div
            onClick={handleUpgrade}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleUpgrade()
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              background: 'var(--gf-bg)',
              border: '1px solid var(--gf-border)',
              borderRadius: '14px',
              padding: '12px 16px',
              cursor: 'pointer',
            }}
          >
            <Plus
              className="w-5 h-5 shrink-0"
              strokeWidth={1.75}
              style={{ color: 'var(--gf-fg-3)' }}
            />
            <span
              style={{
                flex: 1,
                fontSize: '14px',
                color: 'var(--gf-fg-3)',
              }}
            >
              Ask about nutrition, meal plans, supplements...
            </span>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--gf-fg-1)',
                color: 'var(--gf-bg)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ArrowUp className="w-4 h-4" strokeWidth={2.25} />
            </span>
          </div>

          {/* Quick action pills */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '12px',
              flexWrap: 'wrap',
            }}
          >
            {pills.map((p) => (
              <button
                key={p}
                type="button"
                onClick={handleUpgrade}
                style={{
                  background: 'var(--gf-fg-1)',
                  color: 'var(--gf-bg)',
                  border: 'none',
                  borderRadius: '999px',
                  padding: '8px 14px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'opacity 200ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── State B: Premium thread (existing logic, lightly restyled) ──── */

interface Msg {
  id: string
  fromMe: boolean
  body: string
  ago: number
  read?: boolean
}

const SEED: Msg[] = [
  {
    id: 'm1',
    fromMe: false,
    body:
      'Welcome to your VIP line. Anything you want to focus on this week?',
    ago: 60 * 24 * 2,
    read: true,
  },
  {
    id: 'm2',
    fromMe: true,
    body:
      'I keep stalling around 3pm — energy crashes and I reach for sweets.',
    ago: 60 * 24 * 2 - 30,
    read: true,
  },
  {
    id: 'm3',
    fromMe: false,
    body:
      'Classic post-lunch dip. Let us swap your lunch base for quinoa or lentils tomorrow and add a 15-min walk after eating. Track how 3pm feels for three days.',
    ago: 60 * 24 * 2 - 35,
    read: true,
  },
]

function Thread() {
  const t = useTranslations('msgs')
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
        id: string
        sender_id: string
        body: string
        read: boolean
        created_at: string
      }
      const now = Date.now()
      const next = ((data as Row[] | null) ?? []).map((r) => ({
        id: r.id,
        fromMe: r.sender_id === userId,
        body: r.body,
        ago: Math.max(
          0,
          Math.floor((now - new Date(r.created_at).getTime()) / 60_000),
        ),
        read: r.read,
      }))
      if (next.length > 0) setMessages(next)

      void supabase
        .from('messages')
        .update({ read: true } as never)
        .eq('conversation_id', id)
        .neq('sender_id', userId)
    })()

    return () => {
      cancelled = true
    }
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
      if (!supabase) {
        setSending(false)
        return
      }

      // If no conversation exists yet, create one with Dr. Rawan as
      // the nutritionist. Look up Rawan by the email used in
      // setup-accounts so the conversation has a real recipient.
      let convId = conversationId
      if (!convId) {
        const nutriRes = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'nutritionist')
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        const nutriId = (nutriRes.data as { id?: string } | null)?.id
        if (nutriId) {
          const { data: newConv } = await supabase
            .from('conversations')
            .insert({
              client_id: userId,
              nutritionist_id: nutriId,
            } as never)
            .select('id')
            .maybeSingle()
          convId = (newConv as { id?: string } | null)?.id ?? null
          if (convId) setConversationId(convId)
        }
      }

      if (convId) {
        const { data } = await supabase
          .from('messages')
          .insert({
            conversation_id: convId,
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
        } else {
          toast.error('Could not deliver message — please retry')
        }
      } else {
        toast.error('No nutritionist available — please retry shortly')
      }
      setSending(false)
    })()
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex flex-col h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)] max-w-screen-lg mx-auto"
    >
      {/* Header */}
      <header className="glass-effect border-b border-border px-6 py-4 flex items-center gap-3 flex-shrink-0">
        <DrAvatar drName={NUTRITIONIST.name} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--gf-fg-1)' }}>
            {NUTRITIONIST.name}
          </p>
          <p className="text-xs inline-flex items-center gap-1.5" style={{ color: 'var(--gf-primary)' }}>
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: 'var(--gf-primary)' }}
            />
            {t('drStaff')}
          </p>
        </div>
      </header>

      {/* Thread */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-4"
        style={{ background: 'var(--gf-bg)' }}
      >
        {messages.length === 0 ? (
          <p className="text-sm text-center mt-12" style={{ color: 'var(--gf-fg-3)' }}>
            {t('noMessages')}
          </p>
        ) : (
          messages.map((msg) => <Bubble key={msg.id} msg={msg} />)
        )}
      </div>

      {/* Composer */}
      <form
        onSubmit={send}
        className="glass-effect border-t border-border px-4 py-3 flex items-center gap-3 flex-shrink-0"
      >
        <button
          type="button"
          aria-label={t('fileAttach')}
          className="text-fg-3 hover:text-primary transition-colors p-1"
        >
          <Paperclip className="w-5 h-5" strokeWidth={1.75} />
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
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-fg-3 resize-none min-h-[24px] max-h-32 leading-snug"
          style={{ color: 'var(--gf-fg-1)' }}
        />
        <button
          type="submit"
          aria-label={t('send')}
          disabled={!draft.trim() || sending}
          className="flex-shrink-0 p-2 transition-transform disabled:opacity-40 hover:-translate-y-px disabled:hover:translate-y-0"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
        >
          <Send
            className="w-5 h-5 text-primary rtl:-scale-x-100"
            strokeWidth={2}
          />
        </button>
      </form>
    </motion.div>
  )
}

function Bubble({ msg }: { msg: Msg }) {
  const time = formatAgo(msg.ago)
  return (
    <div
      className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} mb-4`}
    >
      {!msg.fromMe && <DrAvatar drName={NUTRITIONIST.name} small />}
      <div
        className="max-w-[70%] rounded-lg p-3"
        style={
          msg.fromMe
            ? {
                background: 'hsl(var(--primary))',
                color: 'hsl(var(--primary-foreground))',
              }
            : {
                background: 'hsl(var(--muted))',
                color: 'hsl(var(--foreground))',
              }
        }
      >
        <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
        <div
          className="flex items-center justify-end gap-1 mt-1 text-xs"
          style={{
            color: msg.fromMe
              ? 'hsl(var(--primary-foreground) / 0.7)'
              : 'hsl(var(--muted-foreground))',
          }}
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
}

function DrAvatar({ drName, small }: { drName: string; small?: boolean }) {
  void drName
  const size = small ? 28 : 40
  return (
    <span
      className="shrink-0 inline-flex rounded-full overflow-hidden"
      style={{ width: size, height: size }}
    >
      <Image
        src="/images/dr-rawan-othman.jpg"
        alt={drName}
        width={size}
        height={size}
        className="w-full h-full object-cover object-top"
      />
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
