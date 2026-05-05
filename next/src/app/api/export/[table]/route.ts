import type { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'
import { withAdmin, type AuthedContext } from '@/lib/api/auth'
import {
  badRequest,
  internalError,
  serviceUnavailable,
} from '@/lib/api/response'
import { ipFromRequest, logAudit } from '@/lib/api/audit'
import { getServiceSupabase } from '@/lib/supabase/service'

/**
 * POST /api/export/[table]
 *
 * Body: {
 *   columns?: string[]
 *   filters?: Record<string, string | number | boolean>   // equality filters
 *   dateFrom?: string  // ISO; filters created_at >=
 *   dateTo?:   string  // ISO; filters created_at <=
 *   format: 'csv' | 'xlsx'
 * }
 *
 * Returns: file download. Auth: admin only.
 */

const ALLOWED_TABLES = [
  'profiles',
  'orders',
  'bookings',
  'nutrition_logs',
  'progress_entries',
  'milestones',
  'posts',
  'ai_conversations',
  'subscriptions',
] as const
type AllowedTable = (typeof ALLOWED_TABLES)[number]
const isAllowed = (t: string): t is AllowedTable =>
  (ALLOWED_TABLES as readonly string[]).includes(t)

interface Body {
  columns?: string[]
  filters?: Record<string, string | number | boolean>
  dateFrom?: string
  dateTo?: string
  format?: 'csv' | 'xlsx'
}

export const POST = withAdmin<{ table: string }>(
  async (req: NextRequest, ctx: AuthedContext, { params }) => {
    const table = params.table
    if (!isAllowed(table)) {
      return badRequest(`Table "${table}" is not exportable.`)
    }

    let body: Body = {}
    try {
      body = (await req.json()) as Body
    } catch {
      // Empty body is fine — defaults to all columns / no filters / xlsx.
    }

    const format: 'csv' | 'xlsx' = body.format === 'csv' ? 'csv' : 'xlsx'
    const columns = body.columns?.length ? body.columns.join(',') : '*'

    const service = getServiceSupabase()
    if (!service) return serviceUnavailable('Supabase service role')

    let query = service.from(table).select(columns)
    if (body.filters) {
      for (const [k, v] of Object.entries(body.filters)) {
        query = query.eq(k, v as never)
      }
    }
    if (body.dateFrom) query = query.gte('created_at', body.dateFrom)
    if (body.dateTo)   query = query.lte('created_at', body.dateTo)

    const { data, error } = await query
    if (error) return internalError()
    const rows = (data as Record<string, unknown>[] | null) ?? []

    // Build the file
    let buffer: Buffer
    let mime: string
    let filename: string

    try {
      const sheet = XLSX.utils.json_to_sheet(rows)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, sheet, table)

      if (format === 'csv') {
        const csv = XLSX.utils.sheet_to_csv(sheet)
        buffer = Buffer.from(csv, 'utf-8')
        mime = 'text/csv; charset=utf-8'
      } else {
        buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
        mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }

      filename = `${table}-${new Date().toISOString().slice(0, 10)}.${format}`
    } catch {
      return internalError()
    }

    await logAudit({
      action: 'data.export',
      actorId: ctx.userId,
      actorRole: 'admin',
      resourceType: table,
      newValue: { format, rowCount: rows.length, columns: body.columns ?? null },
      ip: ipFromRequest(req),
    })

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  },
)
