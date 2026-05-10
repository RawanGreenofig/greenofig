import { setRequestLocale } from 'next-intl/server'
import { requireHeadCoach } from '@/lib/auth/guard'

/**
 * /nutritionist/team-messages — head coach monitors every coach ↔
 * client conversation for service-quality oversight. Read-only;
 * the head coach can't reply on a coach's behalf (the messages
 * INSERT policy still requires sender_id=auth.uid()).
 */
export default async function TeamMessagesLayout({
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
