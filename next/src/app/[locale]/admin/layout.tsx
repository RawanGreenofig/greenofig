import { setRequestLocale } from 'next-intl/server'
import { DashboardShell } from '@/components/DashboardShell'

interface LayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

/**
 * Layout for every /admin/* route. Middleware gates this to admin role only.
 */
export default function AdminLayout({ children, params }: LayoutProps) {
  setRequestLocale(params.locale)
  return <DashboardShell role="admin">{children}</DashboardShell>
}
