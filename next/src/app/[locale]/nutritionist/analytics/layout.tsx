import { setRequestLocale } from 'next-intl/server'
import { requireHeadCoach } from '@/lib/auth/guard'

/**
 * Analytics is the business-wide health view (total clients, growth,
 * tier breakdown, MRR). Employee coaches see their own activity via
 * their dashboard pages; the business analytics belongs to the head
 * coach only.
 */
export default async function NutritionistAnalyticsLayout({
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
