import 'server-only'
import { BetaAnalyticsDataClient } from '@google-analytics/data'

/**
 * GA4 Data API client. Reads credentials from two env vars:
 *
 *   GA_PROPERTY_ID            numeric GA4 property id (e.g. 412345678)
 *   GA_SERVICE_ACCOUNT_JSON   full service-account JSON key, stringified
 *
 * The service account must have at least "Viewer" on the property
 * (GA Admin → Property Access Management → add SA email as Viewer).
 *
 * Returns `null` when env vars aren't set so callers can render a
 * setup-instructions UI instead of crashing.
 */
let cached: { client: BetaAnalyticsDataClient; propertyId: string } | null | undefined

export function getAnalyticsClient():
  | { client: BetaAnalyticsDataClient; propertyId: string }
  | null {
  if (cached !== undefined) return cached
  const propertyId = process.env.GA_PROPERTY_ID?.trim()
  const rawJson = process.env.GA_SERVICE_ACCOUNT_JSON?.trim()
  if (!propertyId || !rawJson) {
    cached = null
    return null
  }
  try {
    const credentials = JSON.parse(rawJson) as {
      client_email?: string
      private_key?: string
    }
    if (!credentials.client_email || !credentials.private_key) {
      console.error('[ga] GA_SERVICE_ACCOUNT_JSON missing client_email/private_key')
      cached = null
      return null
    }
    const client = new BetaAnalyticsDataClient({ credentials })
    cached = { client, propertyId }
    return cached
  } catch (err) {
    console.error('[ga] Failed to parse GA_SERVICE_ACCOUNT_JSON:', err)
    cached = null
    return null
  }
}

export interface GaSummary {
  activeUsersNow: number
  usersByCountry: { country: string; users: number }[]
  usersByDevice: { device: string; users: number }[]
  topPages: { path: string; views: number }[]
  daily: { date: string; users: number; views: number }[]
  totals: { users30d: number; views30d: number; sessions30d: number }
}

export async function fetchAnalyticsSummary(): Promise<GaSummary | null> {
  const ctx = getAnalyticsClient()
  if (!ctx) return null
  const { client, propertyId } = ctx
  const property = `properties/${propertyId}`

  const [realtime, country, device, pages, daily, totals] = await Promise.all([
    client.runRealtimeReport({
      property,
      metrics: [{ name: 'activeUsers' }],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 8,
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 8,
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
    client.runReport({
      property,
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'sessions' },
      ],
    }),
  ])

  const rt = realtime[0]
  const activeUsersNow = Number(rt.rows?.[0]?.metricValues?.[0]?.value ?? 0)

  const usersByCountry = (country[0].rows ?? []).map((r) => ({
    country: r.dimensionValues?.[0]?.value ?? '—',
    users: Number(r.metricValues?.[0]?.value ?? 0),
  }))

  const usersByDevice = (device[0].rows ?? []).map((r) => ({
    device: r.dimensionValues?.[0]?.value ?? '—',
    users: Number(r.metricValues?.[0]?.value ?? 0),
  }))

  const topPages = (pages[0].rows ?? []).map((r) => ({
    path: r.dimensionValues?.[0]?.value ?? '—',
    views: Number(r.metricValues?.[0]?.value ?? 0),
  }))

  const dailyRows = (daily[0].rows ?? []).map((r) => ({
    date: (r.dimensionValues?.[0]?.value ?? '').replace(
      /^(\d{4})(\d{2})(\d{2})$/,
      '$1-$2-$3',
    ),
    users: Number(r.metricValues?.[0]?.value ?? 0),
    views: Number(r.metricValues?.[1]?.value ?? 0),
  }))

  const tRow = totals[0].rows?.[0]
  const t = {
    users30d: Number(tRow?.metricValues?.[0]?.value ?? 0),
    views30d: Number(tRow?.metricValues?.[1]?.value ?? 0),
    sessions30d: Number(tRow?.metricValues?.[2]?.value ?? 0),
  }

  return {
    activeUsersNow,
    usersByCountry,
    usersByDevice,
    topPages,
    daily: dailyRows,
    totals: t,
  }
}
