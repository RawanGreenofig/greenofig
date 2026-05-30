'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Check, Loader2, MessageCircle } from '@/icons'
import { useAuth } from '@/context/AuthContext'
import { GoogleAuthButton } from '@/components/auth/GoogleAuthButton'

/**
 * Walk-in invite page (/clinic-link/<clinicClientId>). The coach shares
 * this link; the client signs in with Google, and we connect their
 * account to their clinic record so the coach can message them in-app.
 * If they're already signed in, we link immediately on mount.
 */
export default function ClinicLinkPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const locale = useLocale()
  const { user, isLoading } = useAuth()

  const [state, setState] = useState<'idle' | 'linking' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const tried = useRef(false)

  useEffect(() => {
    if (isLoading || !user || tried.current) return
    tried.current = true
    setState('linking')
    void (async () => {
      try {
        const res = await fetch(`/api/clinic-link/${id}`, { method: 'POST' })
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
        if (!res.ok || !data.ok) {
          setError(data.error ?? `Could not connect (${res.status}).`)
          setState('error')
        } else {
          setState('done')
        }
      } catch {
        setError('Network error — please try again.')
        setState('error')
      }
    })()
  }, [id, user, isLoading])

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10" style={{ background: 'var(--gf-bg-deeper)' }}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center">
        <h1 className="font-display font-bold text-fg-1" style={{ fontSize: 'clamp(22px,5vw,30px)', lineHeight: 1.1 }}>
          Connect with your coach
        </h1>

        {isLoading || state === 'linking' ? (
          <div className="mt-6 flex flex-col items-center gap-3 text-sm text-fg-2">
            <Loader2 className="w-6 h-6 animate-spin text-lime-400" strokeWidth={1.75} />
            {state === 'linking' ? 'Connecting your account…' : 'Loading…'}
          </div>
        ) : state === 'done' ? (
          <div className="mt-6 space-y-4">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-lime-400/15">
              <Check className="w-6 h-6 text-lime-400" strokeWidth={2.25} />
            </span>
            <p className="text-sm text-fg-2">
              You&rsquo;re connected! Your coach can now message you in the app.
            </p>
            <Link
              href="/dashboard/messages"
              className="inline-flex items-center justify-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 px-6 text-sm shadow-lime-glow border border-lime-600/60"
            >
              <MessageCircle className="w-4 h-4" strokeWidth={2} />
              Open messages
            </Link>
          </div>
        ) : state === 'error' ? (
          <div className="mt-6 space-y-3">
            <p className="text-sm" style={{ color: '#fca5a5' }}>{error}</p>
            <Link href="/dashboard" className="text-sm text-lime-600 hover:underline">Go to dashboard</Link>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm text-fg-2 mb-2">
              Sign in to connect your account so your coach can chat with you and send
              your plan and payments here.
            </p>
            <GoogleAuthButton withDivider={false} next={`/${locale}/clinic-link/${id}`} />
          </div>
        )}
      </div>
    </main>
  )
}
