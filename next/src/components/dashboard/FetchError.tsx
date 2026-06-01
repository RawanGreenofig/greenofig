'use client'

import { useTranslations } from 'next-intl'
import { RefreshCw } from '@/icons'

/**
 * Shared "couldn't load" state for client dashboard pages. Distinct from
 * the empty state so a failed fetch never reads as "your coach did
 * nothing." Offers a retry.
 */
export function FetchError({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations('clinic')
  return (
    <div className="rounded-xl border border-border bg-surface p-10 text-center">
      <p className="text-sm text-fg-1 font-semibold">{t('couldntLoad')}</p>
      <p className="mt-1 text-sm text-fg-2">{t('checkConnection')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
      >
        <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
        {t('tryAgain')}
      </button>
    </div>
  )
}
