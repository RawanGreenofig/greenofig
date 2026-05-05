'use client'

import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'

interface UsagePayload {
  used: number
  limit: number
  remaining: number
  tier: 'free' | 'basic' | 'premium' | 'vip'
  isUnlimited: boolean
}

/**
 * Slim banner above the scanner card showing today's remaining quota.
 * Hidden for paid tiers (effectively unlimited) — only appears for the
 * free tier, where the limit matters.
 */
export function ScannerUsageBanner() {
  const locale = useLocale()
  const isAr = locale === 'ar'
  const [usage, setUsage] = useState<UsagePayload | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch('/api/scanner/usage')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setUsage(data as UsagePayload)
      })
      .catch(() => {
        /* network noise — banner is purely informational */
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!usage || usage.isUnlimited || usage.tier !== 'free') return null

  const pct =
    usage.limit > 0 ? Math.min(100, (usage.used / usage.limit) * 100) : 0
  const empty = usage.remaining === 0

  return (
    <div
      style={{
        background: '#132218',
        border: '0.5px solid #243d2a',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}
    >
      <span
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '13px',
          color: '#9baf9f',
        }}
      >
        {isAr
          ? `${usage.remaining} مسح متبقٍ اليوم`
          : `${usage.remaining} of ${usage.limit} scans remaining today`}
      </span>
      <div
        aria-hidden
        style={{
          width: '80px',
          height: '4px',
          background: '#243d2a',
          borderRadius: '2px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: empty ? '#c0392b' : '#84cc16',
            borderRadius: '2px',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}
