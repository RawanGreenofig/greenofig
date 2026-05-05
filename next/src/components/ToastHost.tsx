'use client'

import { Toaster } from 'react-hot-toast'

/**
 * Single toaster instance for the app. Token-aligned styling.
 */
export function ToastHost() {
  return (
    <Toaster
      position="top-center"
      gutter={8}
      toastOptions={{
        duration: 4000,
        style: {
          background: 'var(--gf-surface)',
          color: 'var(--gf-fg-1)',
          border: '1px solid var(--gf-border)',
          borderRadius: 'var(--radius-md)',
          fontSize: '0.875rem',
        },
        success: {
          iconTheme: {
            primary: 'var(--gf-lime-400)',
            secondary: 'var(--gf-bg)',
          },
        },
        error: {
          iconTheme: {
            primary: 'var(--gf-error)',
            secondary: 'var(--gf-fg-1)',
          },
        },
      }}
    />
  )
}
