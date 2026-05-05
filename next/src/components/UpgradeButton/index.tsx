'use client'

import { useState } from 'react'
import { useLocale } from 'next-intl'

interface Props {
  tier: 'basic' | 'premium' | 'vip'
  /** 'monthly' (default) or 'annual' (mapped to existing API's 'yearly'). */
  billing?: 'monthly' | 'annual'
  /** Override the localized default label. */
  label?: string
  /** Inline style override merged onto the button. */
  style?: React.CSSProperties
}

const DEFAULT_LABELS = {
  en: {
    basic: 'Upgrade to Basic',
    premium: 'Upgrade to Premium',
    vip: 'Go VIP',
  },
  ar: {
    basic: 'الترقية إلى الأساسي',
    premium: 'الترقية إلى المميز',
    vip: 'انضم لـ VIP',
  },
} as const

/**
 * Triggers a Stripe Checkout flow for the given tier by POSTing to the
 * existing /api/stripe/checkout endpoint and redirecting the browser to
 * the returned URL. If the user isn't signed in (401) we route them to
 * /sign-up?plan=<tier> so they can register first.
 */
export default function UpgradeButton({
  tier,
  billing = 'monthly',
  label,
  style,
}: Props) {
  const locale = useLocale() as 'en' | 'ar'
  const [loading, setLoading] = useState(false)

  const buttonLabel = label ?? DEFAULT_LABELS[locale][tier]
  const errorMsg =
    locale === 'ar'
      ? 'حدث خطأ. يرجى المحاولة مرة أخرى.'
      : 'Something went wrong. Please try again.'

  const handleUpgrade = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'subscription',
          tier,
          // The existing API uses 'yearly'; UpgradeButton accepts 'annual' as a friendlier alias.
          cycle: billing === 'annual' ? 'yearly' : 'monthly',
        }),
      })

      if (res.status === 401) {
        // Not signed in — bounce to sign-up with the chosen plan
        window.location.href = `/${locale}/sign-up?plan=${tier}`
        return
      }

      const payload = (await res.json()) as { url?: string; error?: { message?: string } }
      if (!res.ok || !payload.url) {
        alert(payload.error?.message || errorMsg)
        setLoading(false)
        return
      }

      // Redirect to Stripe Checkout
      window.location.href = payload.url
    } catch {
      alert(errorMsg)
      setLoading(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleUpgrade}
      disabled={loading}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        background: loading
          ? 'rgba(61,122,74,0.5)'
          : 'linear-gradient(135deg, #3d7a4a, #4a9259)',
        color: '#f0ede6',
        fontFamily: 'Inter, sans-serif',
        fontWeight: 600,
        fontSize: '15px',
        padding: '14px 28px',
        borderRadius: '9999px',
        border: 'none',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 0 24px rgba(61,122,74,0.3)',
        ...style,
      }}
    >
      {loading ? (
        <>
          <span
            aria-hidden
            style={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          {locale === 'ar' ? 'جارٍ التحميل…' : 'Loading…'}
        </>
      ) : (
        buttonLabel
      )}
    </button>
  )
}
