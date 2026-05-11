import { setRequestLocale } from 'next-intl/server'
import { requireHeadCoach } from '@/lib/auth/guard'

/**
 * Careers / applications review is head-coach-only. Nutritionist Coach Rawan is
 * the only person who interviews and hires; employee coaches don't
 * need access to candidate data.
 */
export default async function NutritionistCareersLayout({
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
