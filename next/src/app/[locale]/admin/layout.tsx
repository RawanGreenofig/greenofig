import { setRequestLocale } from 'next-intl/server'
import { DashboardShell } from '@/components/DashboardShell'
import { requireRole } from '@/lib/auth/guard'

interface LayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

/**
 * Layout for every /admin/* route. Middleware gates upstream, but we ALSO
 * require admin role at the server-render boundary. If middleware ever
 * misses (matcher misconfig, cached page, build-time prerender), this
 * `requireRole` call refuses to render the surface to an unauthenticated
 * or wrongly-roled visitor.
 */
export default async function AdminLayout({ children, params }: LayoutProps) {
  setRequestLocale(params.locale)
  await requireRole(['admin'], params.locale)
  return <DashboardShell role="admin">{children}</DashboardShell>
}
