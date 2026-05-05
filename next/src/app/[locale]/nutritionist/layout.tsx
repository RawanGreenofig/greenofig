import { setRequestLocale } from 'next-intl/server'
import { DashboardShell } from '@/components/DashboardShell'

interface LayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

/**
 * Layout for every /nutritionist/* route. Middleware gates this to users with
 * role `nutritionist` or `admin`.
 */
export default function NutritionistLayout({ children, params }: LayoutProps) {
  setRequestLocale(params.locale)
  return <DashboardShell role="nutritionist">{children}</DashboardShell>
}
