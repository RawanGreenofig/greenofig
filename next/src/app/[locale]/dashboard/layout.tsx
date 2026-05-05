import { setRequestLocale } from 'next-intl/server'
import { DashboardShell } from '@/components/DashboardShell'

interface LayoutProps {
  children: React.ReactNode
  params: { locale: string }
}

/**
 * Layout for every /dashboard/* route. Auth gating happens upstream in
 * `src/middleware.ts` — by the time we render here, the user is signed in
 * and has a profile (or the route was the unprotected /onboarding alias).
 */
export default function DashboardLayout({ children, params }: LayoutProps) {
  setRequestLocale(params.locale)
  return <DashboardShell>{children}</DashboardShell>
}
