'use client'

import { useState } from 'react'
import { CheckCircle2, Loader2, Mail, AlertTriangle } from 'lucide-react'

type Topic = 'general' | 'support' | 'health' | 'partnership' | 'feedback'

interface Props {
  isAr: boolean
}

const TOPICS_EN: { v: Topic; l: string }[] = [
  { v: 'general',     l: 'General question' },
  { v: 'health',      l: 'Health / nutrition' },
  { v: 'support',     l: 'Billing or account' },
  { v: 'partnership', l: 'Partnership / press' },
  { v: 'feedback',    l: 'Feedback' },
]
const TOPICS_AR: { v: Topic; l: string }[] = [
  { v: 'general',     l: 'سؤال عام' },
  { v: 'health',      l: 'صحة / تغذية' },
  { v: 'support',     l: 'فوترة أو حساب' },
  { v: 'partnership', l: 'شراكة / إعلام' },
  { v: 'feedback',    l: 'ملاحظات' },
]

/**
 * Live contact form on /contact. POSTs to /api/contact which inserts
 * into contact_messages. Includes a honeypot "website" field — bots
 * fill it, humans never see it.
 */
export function ContactForm({ isAr }: Props) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [topic, setTopic] = useState<Topic>('general')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [marketingOptIn, setMarketingOptIn] = useState(false)
  const [website, setWebsite] = useState('') // honeypot
  const [status, setStatus] = useState<'idle' | 'busy' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const topics = isAr ? TOPICS_AR : TOPICS_EN

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (status === 'busy') return
    setStatus('busy')
    setError(null)
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          topic,
          subject: subject || null,
          message,
          marketingOptIn,
          website, // honeypot — empty for humans
        }),
      })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        ok?: boolean
      }
      if (!res.ok || !data.ok) {
        setStatus('error')
        setError(data.error ?? (isAr ? 'تعذر إرسال الرسالة.' : 'Could not send. Please try again.'))
        return
      }
      setStatus('success')
      // Wipe sensitive fields so a refresh shows the empty form
      setName('')
      setEmail('')
      setSubject('')
      setMessage('')
      setMarketingOptIn(false)
    } catch {
      setStatus('error')
      setError(isAr ? 'خطأ في الشبكة.' : 'Network error. Please try again.')
    }
  }

  if (status === 'success') {
    return (
      <div
        className="rounded-2xl border p-8 md:p-10 text-center"
        style={{
          background:
            'radial-gradient(circle at 50% 0%, rgba(132,217,61,0.08) 0%, var(--gf-surface) 60%)',
          borderColor: 'rgba(132,217,61,0.4)',
        }}
      >
        <CheckCircle2 className="w-10 h-10 mx-auto text-lime-400" strokeWidth={1.75} />
        <h3 className="mt-4 font-display text-xl font-bold text-fg-1">
          {isAr ? 'وصلت رسالتك' : 'Message received'}
        </h3>
        <p className="mt-2 text-sm text-fg-2 max-w-md mx-auto">
          {isAr
            ? 'سنرد عليك عادةً خلال يوم عمل واحد.'
            : 'We typically reply within one business day.'}
        </p>
        <button
          type="button"
          onClick={() => setStatus('idle')}
          className="mt-5 inline-flex items-center h-10 px-5 text-sm font-semibold text-fg-1 rounded-pill border border-border hover:border-lime-400/50 hover:text-lime-400 transition-colors"
          style={{ background: 'var(--gf-input-bg)' }}
        >
          {isAr ? 'أرسل رسالة أخرى' : 'Send another'}
        </button>
      </div>
    )
  }

  const busy = status === 'busy'

  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-border p-5 md:p-7 space-y-5"
      style={{
        background:
          'linear-gradient(135deg, rgba(132,217,61,0.04) 0%, var(--gf-surface) 60%)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 14px 36px rgba(0,0,0,0.25)',
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={isAr ? 'الاسم' : 'Your name'} required>
          <Input
            value={name}
            onChange={setName}
            placeholder={isAr ? 'الاسم الكامل' : 'Full name'}
            required
            maxLength={120}
          />
        </Field>
        <Field label={isAr ? 'البريد الإلكتروني' : 'Email'} required>
          <Input
            value={email}
            onChange={setEmail}
            placeholder="you@example.com"
            type="email"
            required
            maxLength={254}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={isAr ? 'الموضوع' : 'Topic'}>
          <Select
            value={topic}
            onChange={(v) => setTopic(v as Topic)}
            options={topics}
          />
        </Field>
        <Field label={isAr ? 'العنوان' : 'Subject'}>
          <Input
            value={subject}
            onChange={setSubject}
            placeholder={isAr ? 'اختياري' : 'Optional'}
            maxLength={200}
          />
        </Field>
      </div>

      <Field label={isAr ? 'الرسالة' : 'Message'} required hint={isAr ? '٥ إلى ٤٠٠٠ حرف' : '5–4000 characters'}>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            isAr
              ? 'كيف يمكننا مساعدتك؟'
              : 'How can we help?'
          }
          rows={6}
          required
          minLength={5}
          maxLength={4000}
          className="w-full rounded-lg px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 transition-colors focus:outline-none focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/15"
          style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)' }}
        />
      </Field>

      {/* Honeypot — hidden from humans, bots fill it */}
      <input
        type="text"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

      <label className="flex items-start gap-2 text-xs text-fg-2 cursor-pointer">
        <input
          type="checkbox"
          checked={marketingOptIn}
          onChange={(e) => setMarketingOptIn(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-lime-500"
        />
        <span>
          {isAr
            ? 'أرغب في تلقي نصائح التغذية والعروض من Greenofig.'
            : 'Send me nutrition tips and offers from Greenofig.'}
        </span>
      </label>

      {error && (
        <p className="inline-flex items-center gap-1.5 text-xs text-rose-400">
          <AlertTriangle className="w-3.5 h-3.5" strokeWidth={1.75} />
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <p className="text-[11px] text-fg-3">
          {isAr
            ? 'نرد عادةً خلال يوم عمل واحد.'
            : 'We typically reply within one business day.'}
        </p>
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 px-6 text-sm border border-lime-600/60 transition-all hover:brightness-110 disabled:opacity-50"
          style={{ boxShadow: '0 6px 22px rgba(132,217,61,0.28)' }}
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.25} />
              {isAr ? 'يُرسل…' : 'Sending…'}
            </>
          ) : (
            <>
              <Mail className="w-4 h-4" strokeWidth={2} />
              {isAr ? 'أرسل الرسالة' : 'Send message'}
            </>
          )}
        </button>
      </div>
    </form>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-fg-2 mb-1.5">
        {label}
        {required && <span className="text-lime-400">*</span>}
      </span>
      {children}
      {hint && <span className="block mt-1 text-[11px] text-fg-3">{hint}</span>}
    </label>
  )
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  required,
  maxLength,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
  required?: boolean
  maxLength?: number
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      className="w-full h-10 rounded-lg px-3 text-sm text-fg-1 placeholder-fg-3 transition-colors focus:outline-none focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/15"
      style={{ background: 'var(--gf-input-bg)', border: '1px solid var(--gf-border)' }}
    />
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { v: string; l: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 rounded-lg px-3 text-sm text-fg-1 appearance-none transition-colors focus:outline-none focus:border-lime-400/60 focus:ring-2 focus:ring-lime-400/15"
      style={{
        background:
          'var(--gf-input-bg) url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%239baf9f\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><polyline points=\'6 9 12 15 18 9\'/></svg>") no-repeat right 10px center',
        border: '1px solid var(--gf-border)',
        paddingInlineEnd: 32,
      }}
    >
      {options.map((o) => (
        <option key={o.v} value={o.v}>
          {o.l}
        </option>
      ))}
    </select>
  )
}
