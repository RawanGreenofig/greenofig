import { getServiceSupabase } from '@/lib/supabase/service'
import type { UserRole } from '@/lib/supabase/types'

export interface AuditEntry {
  /** Stable verb — see admin.auditPage.actions.* for the i18n labels. */
  action: string
  /** Authenticated actor — null for system / OpenClaw events. */
  actorId?: string | null
  actorRole?: UserRole | null
  resourceType?: string
  resourceId?: string
  oldValue?: unknown
  newValue?: unknown
  ip?: string | null
  userAgent?: string | null
}

/**
 * Best-effort write into audit_log. Never throws — audit writes should
 * not break the user-facing operation. Silently degrades when the
 * service-role key isn't configured (development).
 */
export async function logAudit(entry: AuditEntry): Promise<void> {
  const supabase = getServiceSupabase()
  if (!supabase) return

  try {
    await supabase.from('audit_log').insert({
      actor_id:      entry.actorId ?? null,
      actor_role:    entry.actorRole ?? null,
      action:        entry.action,
      resource_type: entry.resourceType ?? null,
      resource_id:   entry.resourceId ?? null,
      old_value:     entry.oldValue ?? null,
      new_value:     entry.newValue ?? null,
      ip_address:    entry.ip ?? null,
      user_agent:    entry.userAgent ?? null,
    } as never)
  } catch {
    /* eat — audit must never break a request */
  }
}

/** Pull caller IP off Next's `x-forwarded-for` header. */
export function ipFromRequest(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for')
  if (!xff) return null
  return xff.split(',')[0]!.trim() || null
}
