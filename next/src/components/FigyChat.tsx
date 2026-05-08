'use client'

/**
 * Figy — Greenofig's floating AI nutrition assistant.
 *
 * Renders a fixed bottom-right pill that expands into a glass-effect
 * chat panel. Streams replies from /api/ai-chat (Gemini) and persists
 * the thread to ai_conversations via the route.
 *
 * Tier gating mirrors the API:
 *   - free / basic   → button shows but click prompts upgrade
 *   - premium / vip  → full chat
 *   - nutritionist / admin → full chat (the API auto-allows higher
 *     tiers via tierAtLeast('premium'))
 *
 * Mounted globally inside the dashboard shell so every dashboard
 * route shows the same floating Figy. The panel persists its
 * conversationId in localStorage so the thread survives reloads.
 */

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { Send, X, Sparkles, GripHorizontal } from 'lucide-react'
import { useUser } from '@/lib/hooks/useUser'
import { tierAtLeast } from '@/lib/tier'

interface FigyMessage {
  id: string
  role: 'user' | 'assistant'
  body: string
}

const STORAGE_KEY = 'figy.conversationId'

const POS_KEY = 'figy.position'

export function FigyChat() {
  const { user, profile, tier } = useUser()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<FigyMessage[]>([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // Position offset from the default bottom-end corner (px). null = use
  // the CSS default (bottom-right / bottom-left in RTL).
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null)
  const dragRef = useRef<{
    startX: number
    startY: number
    baseX: number
    baseY: number
  } | null>(null)
  // Track whether the pointer actually moved during a press, so a tap
  // without movement on the launcher opens the panel instead of being
  // swallowed as a drag. Declared before any early return to satisfy
  // rules-of-hooks.
  const movedRef = useRef(false)

  // Hydrate position + conversationId from localStorage on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY)
      if (saved) setConversationId(saved)
      const savedPos = window.localStorage.getItem(POS_KEY)
      if (savedPos) {
        const p = JSON.parse(savedPos) as { x: number; y: number }
        if (typeof p.x === 'number' && typeof p.y === 'number') setPos(p)
      }
    } catch {
      /* fine */
    }
  }, [])

  const onDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: pos?.x ?? 0,
      baseY: pos?.y ?? 0,
    }
  }
  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    const next = { x: d.baseX + dx, y: d.baseY + dy }
    setPos(next)
  }
  const onDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
    if (pos) {
      try {
        window.localStorage.setItem(POS_KEY, JSON.stringify(pos))
      } catch {
        /* fine */
      }
    }
  }

  // Auto-scroll on new messages.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, sending])

  const allowed = tierAtLeast(tier, 'premium')
  const displayName = profile?.full_name?.split(/\s+/)[0] ?? 'there'

  // Don't render the button at all for signed-out users.
  if (!user) return null

  const send = async () => {
    const text = draft.trim()
    if (!text || sending || !allowed) return
    setSending(true)
    setDraft('')
    const userMsgId = `u-${Date.now()}`
    setMessages((curr) => [
      ...curr,
      { id: userMsgId, role: 'user', body: text },
    ])
    const assistantMsgId = `a-${Date.now()}`
    setMessages((curr) => [
      ...curr,
      { id: assistantMsgId, role: 'assistant', body: '' },
    ])

    try {
      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId: conversationId ?? undefined,
        }),
      })
      if (!res.ok) {
        const errBody = await res.text().catch(() => '')
        setMessages((curr) =>
          curr.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  body:
                    errBody && errBody.startsWith('{')
                      ? "I can't respond right now — please try again later."
                      : "I can't respond right now — please try again later.",
                }
              : m,
          ),
        )
        return
      }

      const newConvId = res.headers.get('x-conversation-id')
      if (newConvId && newConvId !== conversationId) {
        setConversationId(newConvId)
        try {
          window.localStorage.setItem(STORAGE_KEY, newConvId)
        } catch {
          /* fine */
        }
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) return
      let buffered = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffered += decoder.decode(value, { stream: true })
        setMessages((curr) =>
          curr.map((m) =>
            m.id === assistantMsgId ? { ...m, body: buffered } : m,
          ),
        )
      }
    } catch {
      setMessages((curr) =>
        curr.map((m) =>
          m.id === assistantMsgId
            ? { ...m, body: 'Network error — please try again.' }
            : m,
        ),
      )
    } finally {
      setSending(false)
    }
  }

  const onLauncherDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    movedRef.current = false
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: pos?.x ?? 0,
      baseY: pos?.y ?? 0,
    }
  }
  const onLauncherMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current
    if (!d) return
    const dx = e.clientX - d.startX
    const dy = e.clientY - d.startY
    if (!movedRef.current && Math.hypot(dx, dy) > 4) movedRef.current = true
    if (movedRef.current) setPos({ x: d.baseX + dx, y: d.baseY + dy })
  }
  const onLauncherUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const wasDragging = movedRef.current
    if (dragRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* fine */
      }
      dragRef.current = null
    }
    if (wasDragging && pos) {
      try {
        window.localStorage.setItem(POS_KEY, JSON.stringify(pos))
      } catch {
        /* fine */
      }
    } else {
      // Real tap → open the panel
      setOpen(true)
    }
  }

  return (
    <>
      {/* Click-outside backdrop — closes the panel when tapped. */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40"
          style={{ background: 'transparent' }}
          aria-hidden
        />
      )}

      {/* Floating launcher pill — fixed bottom-right (mirrors in RTL).
       * Acts as a drag handle when the pointer moves > 4px before
       * release, otherwise treated as a tap that opens the panel. */}
      {!open && (
        <button
          type="button"
          aria-label="Open Figy AI assistant"
          className="figy-launcher"
          style={
            pos
              ? { transform: `translate(${pos.x}px, ${pos.y}px)`, touchAction: 'none' }
              : { touchAction: 'none' }
          }
          onPointerDown={onLauncherDown}
          onPointerMove={onLauncherMove}
          onPointerUp={onLauncherUp}
          onPointerCancel={onLauncherUp}
        >
          <Image
            src="/logo/logo.png"
            alt=""
            width={28}
            height={28}
            className="rounded-full"
          />
          <span className="font-semibold text-sm">Ask Figy</span>
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className="figy-panel glass-effect"
          role="dialog"
          aria-label="Figy"
          style={
            pos
              ? {
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                }
              : undefined
          }
        >
          {/* Header — drag handle */}
          <header
            className="figy-header"
            onPointerDown={onDragStart}
            onPointerMove={onDragMove}
            onPointerUp={onDragEnd}
            onPointerCancel={onDragEnd}
            style={{ touchAction: 'none', cursor: dragRef.current ? 'grabbing' : 'grab' }}
          >
            <div className="flex items-center gap-2.5">
              <GripHorizontal
                className="w-4 h-4 text-fg-3 shrink-0"
                aria-hidden
              />
              <Image
                src="/logo/logo.png"
                alt=""
                width={32}
                height={32}
                className="rounded-full"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-fg-1 leading-tight">
                  Figy
                </p>
                <p
                  className="text-[11px] inline-flex items-center gap-1"
                  style={{ color: 'hsl(var(--primary))' }}
                >
                  <span
                    aria-hidden
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: 'hsl(var(--primary))' }}
                  />
                  AI nutrition assistant
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Close"
              className="p-1.5 rounded-full text-fg-3 hover:text-fg-1 transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={1.75} />
            </button>
          </header>

          {/* Body */}
          <div ref={scrollRef} className="figy-body">
            {!allowed ? (
              <UpgradePrompt />
            ) : messages.length === 0 ? (
              <Welcome displayName={displayName} />
            ) : (
              messages.map((m) => <FigyBubble key={m.id} msg={m} />)
            )}
            {sending && messages[messages.length - 1]?.body === '' && (
              <div className="text-xs text-fg-3 px-1 py-1">Figy is thinking…</div>
            )}
          </div>

          {/* Composer */}
          <form
            className="figy-composer"
            onSubmit={(e) => {
              e.preventDefault()
              void send()
            }}
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                allowed
                  ? 'Ask Figy anything about nutrition…'
                  : 'Premium plan required'
              }
              disabled={!allowed || sending}
              className="figy-input"
              style={{
                background: 'transparent',
                border: 'none',
                outline: 'none',
                boxShadow: 'none',
              }}
            />
            <button
              type="submit"
              disabled={!allowed || sending || !draft.trim()}
              className="figy-send"
              aria-label="Send"
            >
              <Send className="w-4 h-4 text-black rtl:-scale-x-100" strokeWidth={2.25} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function FigyBubble({ msg }: { msg: FigyMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div
        className="max-w-[85%] rounded-lg p-3 text-sm whitespace-pre-wrap break-words"
        style={
          isUser
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
        {msg.body}
      </div>
    </div>
  )
}

function Welcome({ displayName }: { displayName: string }) {
  return (
    <div className="text-center py-6 px-4">
      <Sparkles
        className="w-8 h-8 mx-auto mb-3"
        strokeWidth={1.75}
        style={{ color: 'hsl(var(--primary))' }}
      />
      <p className="text-sm font-semibold text-fg-1 mb-1">
        Hi {displayName} — I&apos;m Figy
      </p>
      <p className="text-xs text-fg-3 leading-relaxed">
        Dr. Rawan&apos;s AI nutrition assistant. Ask me about meal ideas,
        macros, supplements, or anything between sessions.
      </p>
    </div>
  )
}

function UpgradePrompt() {
  return (
    <div className="text-center py-6 px-4">
      <Sparkles
        className="w-8 h-8 mx-auto mb-3"
        strokeWidth={1.75}
        style={{ color: 'hsl(var(--primary))' }}
      />
      <p className="text-sm font-semibold text-fg-1 mb-1">
        Figy is a Premium feature
      </p>
      <p className="text-xs text-fg-3 leading-relaxed mb-4">
        Upgrade to Premium to chat with Dr. Rawan&apos;s AI assistant
        between sessions — meal ideas, macros, supplements, and more.
      </p>
      <a
        href="/dashboard/settings?tab=subscription"
        className="btn-primary inline-flex"
        style={{ height: 36, padding: '0 16px', fontSize: 13 }}
      >
        Upgrade to Premium
      </a>
    </div>
  )
}
