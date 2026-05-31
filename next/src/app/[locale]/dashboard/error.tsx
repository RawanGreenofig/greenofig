'use client'

import { useEffect } from 'react'
import { RefreshCw } from '@/icons'

/**
 * Error boundary for every /dashboard/* route. Without this, any client
 * render error white-screens the whole app with Next's generic
 * "Application error" overlay. Here we keep the user inside the app, show
 * the actual message (so it's diagnosable), and offer a one-tap retry.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surface it in the console for support / debugging.
    console.error('[dashboard] render error:', error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-7 text-center">
        <h1 className="text-lg font-semibold text-fg-1">Something went wrong</h1>
        <p className="mt-2 text-sm text-fg-2">
          This part of your dashboard hit an error. It&rsquo;s been logged. Try again — if it keeps happening,
          let your coach know.
        </p>
        {error?.message && (
          <p className="mt-3 rounded-lg border border-border bg-bg-deeper px-3 py-2 text-xs text-fg-3 font-mono break-words">
            {error.message}
          </p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 px-6 text-sm border border-lime-600/60"
        >
          <RefreshCw className="w-4 h-4" strokeWidth={2} />
          Try again
        </button>
      </div>
    </div>
  )
}
