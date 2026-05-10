'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Bell,
  Send,
  Sparkles,
  Mail,
  Smartphone,
  Inbox,
  Calendar as CalIcon,
  Check,
  Users,
  type LucideIcon,
} from '@/icons'

type Audience = 'all' | 'free' | 'basic' | 'premium' | 'vip' | 'nutritionist' | 'admin'
type Channel = 'inApp' | 'email' | 'push'

interface BroadcastHistory {
  id: string
  title: string
  audience: Audience
  channels: Channel[]
  sentISO: string
  recipients: number
}

const TEMPLATE_KEYS = ['newFeature', 'maintenance', 'promo', 'weeklyDigest'] as const

const AUDIENCE_TINT: Record<Audience, string> = {
  all:           '#9baf9f',
  free:          '#9baf9f',
  basic:         '#06b6d4',
  premium:       '#a3e635',
  vip:           '#a855f7',
  nutritionist:  '#a3e635',
  admin:         '#a855f7',
}

const HISTORY: BroadcastHistory[] = [
  { id: 'b1', title: 'Ramadan kit drop is live',                         audience: 'all',     channels: ['inApp', 'email', 'push'], sentISO: '2026-04-29T08:00:00Z', recipients: 412 },
  { id: 'b2', title: 'Weekly digest — May 3rd',                          audience: 'premium', channels: ['email'],                  sentISO: '2026-04-28T07:00:00Z', recipients: 56 },
  { id: 'b3', title: 'New feature: AI scanner is faster',                audience: 'all',     channels: ['inApp', 'push'],          sentISO: '2026-04-22T08:00:00Z', recipients: 412 },
  { id: 'b4', title: 'Scheduled maintenance Sunday 02:00 GMT+3',         audience: 'all',     channels: ['inApp', 'email'],         sentISO: '2026-04-15T16:00:00Z', recipients: 412 },
]

export default function AdminNotificationsPage() {
  const t = useTranslations('admin')
  const tN = useTranslations('admin.notificationsPage')

  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState<Audience>('all')
  const [channels, setChannels] = useState<Set<Channel>>(
    () => new Set<Channel>(['inApp', 'email']),
  )
  const [scheduleAt, setScheduleAt] = useState<string>('')
  const [history, setHistory] = useState<BroadcastHistory[]>(HISTORY)
  const [sentBanner, setSentBanner] = useState<{ recipients: number; scheduled: boolean } | null>(null)

  const willSchedule = !!scheduleAt && new Date(scheduleAt).getTime() > Date.now()

  const toggleChannel = (c: Channel) => {
    setChannels((curr) => {
      const next = new Set(curr)
      if (next.has(c)) next.delete(c)
      else next.add(c)
      return next
    })
  }

  const recipientsForAudience = (a: Audience): number => {
    const map: Record<Audience, number> = {
      all: 412,
      free: 240,
      basic: 92,
      premium: 56,
      vip: 24,
      nutritionist: 1,
      admin: 1,
    }
    return map[a]
  }
  const targetCount = recipientsForAudience(audience)

  const insertTemplate = (k: (typeof TEMPLATE_KEYS)[number]) => {
    const map = {
      newFeature:   { t: 'New in Greenofig: faster food scanner',     b: "We've shipped a faster, more accurate scanner. Try it on your next meal." },
      maintenance:  { t: 'Quick maintenance window',                  b: 'Greenofig will be unavailable for 15 minutes this Sunday at 02:00 GMT+3.' },
      promo:        { t: 'Two-week store sale — 15% off',             b: 'Use code SPRING15 at checkout. Ends Sunday.' },
      weeklyDigest: { t: 'Your week with Greenofig',                  b: 'Logs, milestones, and what changed in your community this week.' },
    }
    const entry = map[k]
    setTitle(entry.t)
    setBody(entry.b)
  }

  const send = async () => {
    if (!title.trim() || !body.trim() || channels.size === 0) return
    const titleVal = title.trim()
    const bodyVal = body.trim()
    const newEntry: BroadcastHistory = {
      id: `b-${Date.now()}`,
      title: titleVal,
      audience,
      channels: Array.from(channels),
      sentISO: new Date(scheduleAt || Date.now()).toISOString(),
      recipients: targetCount,
    }
    setHistory((curr) => [newEntry, ...curr])
    setSentBanner({ recipients: targetCount, scheduled: willSchedule })
    setTitle('')
    setBody('')
    setScheduleAt('')
    window.setTimeout(() => setSentBanner(null), 3500)

    if (!willSchedule) {
      const payload: {
        title: string
        body: string
        type: string
        tiers?: string[]
      } = {
        title: titleVal,
        body: bodyVal,
        type: 'admin',
      }
      if (audience !== 'all' && audience !== 'nutritionist' && audience !== 'admin') {
        payload.tiers = [audience]
      }
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch {
        /* network errors are silently absorbed — local banner already shown */
      }
    }
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          {t('notifications')}
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">{tN('subtitle')}</p>
      </header>

      {sentBanner && (
        <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 flex items-center gap-3">
          <Check className="w-4 h-4 text-lime-400" strokeWidth={2.5} />
          <p className="text-sm text-fg-1">
            {sentBanner.scheduled
              ? tN('scheduled', {
                  date: new Date(scheduleAt).toLocaleString(),
                })
              : tN('sent', { count: sentBanner.recipients })}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Composer */}
        <div className="lg:col-span-2 space-y-6">
          <article className="rounded-xl border border-border bg-surface p-5 md:p-6">
            <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-4">
              {tN('composeTitle')}
            </h2>

            <div className="space-y-4">
              <Field label={tN('title')}>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={tN('titlePh')}
                  className="w-full h-11 rounded-lg px-3 text-base font-display font-semibold text-fg-1 placeholder-fg-3 focus:outline-none"
                  style={{
                    background: 'var(--gf-input-bg)',
                    border: '1px solid var(--gf-border)',
                  }}
                />
              </Field>

              <Field label={tN('body')}>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={4}
                  maxLength={280}
                  placeholder={tN('bodyPh')}
                  className="w-full resize-none rounded-lg px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none leading-relaxed"
                  style={{
                    background: 'var(--gf-input-bg)',
                    border: '1px solid var(--gf-border)',
                  }}
                />
              </Field>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={tN('audience')}>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value as Audience)}
                    className="w-full h-10 rounded-lg px-3 text-sm text-fg-1 focus:outline-none appearance-none"
                    style={{
                      background: 'var(--gf-input-bg)',
                      border: '1px solid var(--gf-border)',
                    }}
                  >
                    <option value="all"           className="bg-surface">{tN('audienceAll')}</option>
                    <option value="basic"         className="bg-surface">{tN('audienceTier', { tier: 'Basic' })}</option>
                    <option value="premium"       className="bg-surface">{tN('audienceTier', { tier: 'Premium' })}</option>
                    <option value="vip"           className="bg-surface">{tN('audienceTier', { tier: 'VIP' })}</option>
                    <option value="nutritionist"  className="bg-surface">{tN('audienceRole', { role: 'Nutritionist' })}</option>
                  </select>
                </Field>
                <Field label={tN('schedule')}>
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    className="w-full h-10 rounded-lg px-3 text-sm font-mono text-fg-1 focus:outline-none"
                    style={{
                      background: 'var(--gf-input-bg)',
                      border: '1px solid var(--gf-border)',
                    }}
                    dir="ltr"
                  />
                  <p className="mt-1 text-[11px] text-fg-3">
                    {willSchedule ? tN('scheduleFor') : tN('sendNow')}
                  </p>
                </Field>
              </div>

              <Field label={tN('channels')}>
                <div className="flex items-center gap-2 flex-wrap">
                  <ChannelChip
                    Icon={Inbox}
                    label={tN('channelInApp')}
                    on={channels.has('inApp')}
                    onClick={() => toggleChannel('inApp')}
                  />
                  <ChannelChip
                    Icon={Mail}
                    label={tN('channelEmail')}
                    on={channels.has('email')}
                    onClick={() => toggleChannel('email')}
                  />
                  <ChannelChip
                    Icon={Smartphone}
                    label={tN('channelPush')}
                    on={channels.has('push')}
                    onClick={() => toggleChannel('push')}
                  />
                </div>
              </Field>
            </div>

            <footer className="mt-5 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-fg-3 inline-flex items-center gap-1.5">
                <Users className="w-3 h-3" strokeWidth={2} />
                {targetCount.toLocaleString()} recipients
              </p>
              <button
                type="button"
                onClick={send}
                disabled={!title.trim() || !body.trim() || channels.size === 0}
                className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 px-6 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform disabled:opacity-40 disabled:hover:translate-y-0"
              >
                {willSchedule ? <CalIcon className="w-4 h-4" strokeWidth={2} /> : <Send className="w-4 h-4 rtl:-scale-x-100" strokeWidth={2} />}
                {willSchedule ? tN('scheduleSend') : tN('send')}
              </button>
            </footer>
          </article>

          {/* Preview */}
          {(title || body) && (
            <article className="rounded-xl border border-border bg-surface p-5">
              <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
                {tN('previewLabel')}
              </p>
              <div
                className="p-4 flex items-start gap-3"
                style={{
                  background: 'var(--gf-input-bg)',
                  border: '1px solid var(--gf-border)',
                  borderRadius: 8,
                }}
              >
                <Bell
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                  strokeWidth={1.75}
                  color="#a3e635"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-fg-1">
                    {title || '— title —'}
                  </p>
                  <p className="mt-1 text-xs text-fg-2 leading-relaxed">
                    {body || '— body —'}
                  </p>
                </div>
              </div>
            </article>
          )}
        </div>

        {/* Templates + History */}
        <aside className="space-y-4">
          <article className="rounded-xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3 inline-flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-lime-400" strokeWidth={2} />
              {tN('templates')}
            </p>
            <ul className="space-y-1.5">
              {TEMPLATE_KEYS.map((k) => (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => insertTemplate(k)}
                    className="w-full text-start px-3 py-2 text-xs text-fg-1 transition-colors"
                    style={{
                      background: 'var(--gf-input-bg)',
                      border: '1px solid var(--gf-border)',
                      borderRadius: 8,
                    }}
                  >
                    {tN(`templateOptions.${k}` as 'templateOptions.newFeature')}
                  </button>
                </li>
              ))}
            </ul>
          </article>

          <article className="rounded-xl border border-border bg-surface p-5">
            <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
              {tN('history')}
            </p>
            {history.length === 0 ? (
              <p className="text-xs text-fg-3">{tN('historyEmpty')}</p>
            ) : (
              <ul className="space-y-3">
                {history.slice(0, 5).map((h) => (
                  <li
                    key={h.id}
                    className="px-3 py-2.5"
                    style={{
                      background: 'var(--gf-input-bg)',
                      border: '1px solid var(--gf-border)',
                      borderRadius: 8,
                    }}
                  >
                    <p className="text-xs font-semibold text-fg-1 line-clamp-2">
                      {h.title}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-fg-3 font-mono" dir="ltr">
                      <span
                        className="inline-flex items-center"
                        style={{
                          height: 18,
                          padding: '0 8px',
                          borderRadius: 999,
                          fontSize: 9.5,
                          fontWeight: 800,
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          lineHeight: 1,
                          background: `${AUDIENCE_TINT[h.audience]}1f`,
                          color: AUDIENCE_TINT[h.audience],
                        }}
                      >
                        {h.audience}
                      </span>
                      <span>·</span>
                      <span>{h.recipients}</span>
                      <span>·</span>
                      <span>{h.channels.join('+')}</span>
                    </div>
                    <p className="mt-1 text-[10px] text-fg-3 font-mono" dir="ltr">
                      {new Date(h.sentISO).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </aside>
      </div>
    </div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function ChannelChip({
  Icon,
  label,
  on,
  onClick,
}: {
  Icon: LucideIcon
  label: string
  on: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold transition-colors"
      style={{
        background: on ? 'rgba(132,217,61,0.12)' : 'var(--gf-input-bg)',
        border: `1px solid ${on ? 'rgba(132,217,61,0.4)' : 'var(--gf-border)'}`,
        borderRadius: 8,
        color: on ? '#a3e635' : 'var(--gf-fg-2)',
      }}
    >
      {on && (
        <Check
          className="w-3 h-3"
          strokeWidth={2.5}
          color="currentColor"
        />
      )}
      <Icon
        className="w-3.5 h-3.5"
        strokeWidth={1.75}
        color="currentColor"
      />
      {label}
    </button>
  )
}
