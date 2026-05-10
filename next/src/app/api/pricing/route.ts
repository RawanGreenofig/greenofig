import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * GET /api/pricing
 *
 * Public — returns the current sticker dollar amounts for the three
 * paid tiers. The /pricing marketing page reads this on mount so admin
 * pricing updates flow through without a redeploy.
 *
 * Response: { basic: { monthly, annual }, premium: {...}, vip: {...} }
 *
 * Falls back to the post-bump 2026-05 values when platform_settings
 * is unreachable so the page never renders blank.
 */

const FALLBACK = {
  basic:   { monthly: 34.99, annual: 29.99 },
  premium: { monthly: 49.99, annual: 39.99 },
  vip:     { monthly: 79.99, annual: 59.99 },
}

export async function GET() {
  const service = getServiceSupabase()
  if (!service) {
    return NextResponse.json(FALLBACK)
  }

  const keys = [
    'pricing_basic_monthly',
    'pricing_basic_annual',
    'pricing_premium_monthly',
    'pricing_premium_annual',
    'pricing_vip_monthly',
    'pricing_vip_annual',
  ]
  const { data } = await service
    .from('platform_settings')
    .select('key, value')
    .in('key', keys)

  type Row = { key: string; value: unknown }
  const rows = (data as Row[] | null) ?? []
  const get = (k: string, fallback: number): number => {
    const raw = rows.find((r) => r.key === k)?.value
    return typeof raw === 'number' ? raw : fallback
  }

  return NextResponse.json({
    basic: {
      monthly: get('pricing_basic_monthly', FALLBACK.basic.monthly),
      annual:  get('pricing_basic_annual',  FALLBACK.basic.annual),
    },
    premium: {
      monthly: get('pricing_premium_monthly', FALLBACK.premium.monthly),
      annual:  get('pricing_premium_annual',  FALLBACK.premium.annual),
    },
    vip: {
      monthly: get('pricing_vip_monthly', FALLBACK.vip.monthly),
      annual:  get('pricing_vip_annual',  FALLBACK.vip.annual),
    },
  })
}
