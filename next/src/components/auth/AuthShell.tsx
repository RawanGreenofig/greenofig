'use client'

import type { ReactNode } from 'react'
import { Link } from '@/i18n/navigation'
import { Wordmark } from '@/components/Wordmark'

/**
 * Shared dark-card shell for sign-in / sign-up / reset / onboarding.
 * Headline + sub at the top, form children below, optional footer link.
 */
export function AuthShell({
  title,
  subtitle,
  footer,
  children,
}: {
  title: string
  subtitle?: string
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    <main className="min-h-screen bg-bg flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Link
          href="/"
          aria-label="Greenofig"
          className="mb-8 flex items-center justify-center"
        >
          <Wordmark size="md" />
        </Link>

        <div className="rounded-2xl border border-border bg-surface px-7 py-8 shadow-glass">
          <header className="mb-6 text-center space-y-2">
            <h1 className="font-display text-3xl font-bold tracking-tight text-fg-1">
              {title}
            </h1>
            {subtitle && <p className="text-sm text-fg-2">{subtitle}</p>}
          </header>
          {children}
        </div>

        {footer && (
          <div className="mt-6 text-center text-sm text-fg-2">{footer}</div>
        )}
      </div>
    </main>
  )
}

export function AuthField({
  id,
  label,
  type = 'text',
  autoComplete,
  required,
  placeholder,
  registerProps,
  error,
}: {
  id: string
  label: string
  type?: string
  autoComplete?: string
  required?: boolean
  placeholder?: string
  registerProps: Record<string, unknown>
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-medium tracking-wide text-fg-2 uppercase"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
        placeholder={placeholder}
        {...registerProps}
        className="w-full rounded-md border border-border bg-bg-deeper px-3 py-2.5 text-sm text-fg-1 placeholder:text-fg-3 focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/30 transition-colors duration-fast ease-out"
      />
      {error && <p className="text-xs text-error">{error}</p>}
    </div>
  )
}

export function AuthSubmit({
  pending,
  children,
}: {
  pending?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-gradient-to-b from-lime-400 to-lime-600 text-bg px-5 py-3 text-sm font-semibold shadow-lime-glow border border-lime-600/60 hover:shadow-lime-glow-lg disabled:opacity-60 disabled:cursor-wait transition-all duration-normal ease-out"
    >
      {children}
    </button>
  )
}
