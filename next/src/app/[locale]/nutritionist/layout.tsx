import { setRequestLocale } from 'next-intl/server'
import { DashboardShell } from '@/components/DashboardShell'
import { requireRole } from '@/lib/auth/guard'

interface LayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

/**
 * Layout for every /nutritionist/* route. Middleware gates upstream, but
 * we also require nutritionist or admin at the server-render boundary as
 * defense-in-depth.
 */
export default async function NutritionistLayout({ children, params }: LayoutProps) {
  setRequestLocale(params.locale)
  await requireRole(['nutritionist', 'admin'], params.locale)
  return <DashboardShell role="nutritionist">{children}</DashboardShell>
}
