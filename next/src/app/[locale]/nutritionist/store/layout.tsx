import { setRequestLocale } from 'next-intl/server'
import { requireHeadCoach } from '@/lib/auth/guard'

/**
 * Store curation is a business-management surface — only the head
 * coach can add/remove products. Employee coaches can't reach this
 * page; the sidebar already hides it for them.
 */
export default async function NutritionistStoreLayout({
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
