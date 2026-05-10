'use client'

import { useEffect, useState } from 'react'
import { Camera, Bot, Microscope } from 'lucide-react'
import { useLocale } from 'next-intl'
import { getBrowserSupabase } from '@/lib/supabase/client'

const FEATURES = [
  {
    key: 'scanner' as const,
    Icon: Camera,
    tint: '#a3e635',
    label: 'Food Scanner',
    labelAr: 'الماسح الغذائي',
  },
  {
    key: 'ai_chat' as const,
    Icon: Bot,
    tint: '#06b6d4',
    label: 'AI Chat',
    labelAr: 'محادثة الذكاء الاصطناعي',
  },
  {
    key: 'research' as const,
    Icon: Microscope,
    tint: '#a855f7',
    label: 'Research Desk',
    labelAr: 'مكتب البحث',
  },
] as const

interface Counts {
  scanner: number
  ai_chat: number
  research: number
  total: number
}

/**
 * Today's AI request counts per feature, summed from ai_usage. Mounted
 * at the bottom of /admin/analytics. Hidden silently if the table
 * doesn't exist yet (migration 005 not run).
 */
export function AIUsageTodaySection() {
  const locale = useLocale() as 'en' | 'ar'
  const isAr = locale === 'ar'
  const [counts, setCounts] = useState<Counts | null>(null)

  useEffect(() => {
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data, error } = await supabase
        .from('ai_usage')
        .select('feature, request_count')
        .eq('date', today)
      if (cancelled || error) return
      type Row = { feature: string; request_count: number | null }
      const list = (data as Row[] | null) ?? []
      const sum: Counts = { scanner: 0, ai_chat: 0, research: 0, total: 0 }
      for (const row of list) {
        const v = row.request_count ?? 0
        if (row.feature === 'scanner') sum.scanner += v
        else if (row.feature === 'ai_chat') sum.ai_chat += v
        else if (row.feature === 'research') sum.research += v
        sum.total += v
      }
      setCounts(sum)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section>
      <header className="mb-4">
        <h2 className="text-base font-semibold text-fg-1">
          {isAr ? 'استخدام الذكاء الاصطناعي اليوم' : 'AI Usage Today'}
        </h2>
        <p className="text-xs text-fg-3 mt-0.5">
          {isAr
            ? 'مجموع طلبات الذكاء الاصطناعي عبر جميع المستخدمين منذ منتصف الليل'
            : 'Total AI requests across all users since midnight'}
        </p>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {FEATURES.map((f) => {
          const value = counts ? counts[f.key] : 0
          return (
            <li
              key={f.key}
              className="rounded-xl border border-border bg-surface p-4"
              style={{ boxShadow: `inset 4px 0 0 ${f.tint}` }}
            >
              <div className="flex items-center gap-2">
                <f.Icon
                  className="w-4 h-4 flex-shrink-0"
                  strokeWidth={1.75}
                  color={f.tint}
                />
                <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
                  {isAr ? f.labelAr : f.label}
                </p>
              </div>
              <p
                className="mt-2 font-display text-2xl font-bold"
                style={{ color: f.tint }}
                dir="ltr"
              >
                {value.toLocaleString()}
              </p>
              <p className="text-[11px] text-fg-3 mt-1">
                {isAr ? 'طلب اليوم' : 'requests today'}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
