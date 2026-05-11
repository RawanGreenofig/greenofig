import { setRequestLocale } from 'next-intl/server'
import { requireHeadCoach } from '@/lib/auth/guard'

/**
 * /nutritionist/earnings is the business view — only the head coach
 * (Nutrition Coach Rawan) sees revenue, MRR, and payouts. Employee coaches get
 * redirected back to their /nutritionist home.
 */
export default async function EarningsLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  setRequestLocale(params.locale)
  await requireHeadCoach(params.locale)
  return <>{children}</>
}
