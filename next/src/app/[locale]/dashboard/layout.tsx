import { setRequestLocale } from 'next-intl/server'
import { DashboardShell } from '@/components/DashboardShell'
import { requireRole } from '@/lib/auth/guard'

interface LayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

/**
 * Layout for every /dashboard/* route. Middleware gates upstream; this
 * layout-level guard refuses to render if the request isn't an
 * authenticated user/nutritionist/admin.
 */
export default async function DashboardLayout({ children, params }: LayoutProps) {
  setRequestLocale(params.locale)
  await requireRole(['user'], params.locale)
  return <DashboardShell>{children}</DashboardShell>
}
