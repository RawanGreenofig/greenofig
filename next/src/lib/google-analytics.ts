import 'server-only'
import { GoogleAuth } from 'google-auth-library'

/**
 * GA4 Data API client — uses the REST endpoint directly (not the
 * gRPC-based @google-analytics/data SDK) so HTTP-level errors aren't
 * swallowed into "undefined undefined: undefined". Reads credentials
 * from two env vars:
 *
 *   GA_PROPERTY_ID            numeric GA4 property id (e.g. 412345678)
 *   GA_SERVICE_ACCOUNT_JSON   full service-account JSON key, stringified
 *
 * The service account must have at least "Viewer" on the property
 * (GA Admin → Property Access Management → add SA email as Viewer).
 * The "Google Analytics Data API" must also be enabled in the Google
 * Cloud project that owns the service account.
 *
 * Returns `null` when env vars aren't set so callers can render a
 * setup-instructions UI instead of crashing.
 */

const REST_BASE = 'https://analyticsdata.googleapis.com/v1beta'

let cached: { auth: GoogleAuth; propertyId: string } | null | undefined
let cachedReason: string | null = null
let cachedDiagnostic: AnalyticsDiagnostic | null = null

export interface AnalyticsDiagnostic {
  propertyIdSet: boolean
  jsonSet: boolean
  jsonParsedOk: boolean
  hasClientEmail: boolean
  clientEmailDomain: string | null
  serviceAccountProjectId: string | null
  hasPrivateKey: boolean
  privateKeyLooksLikePem: boolean
  privateKeyLength: number
  privateKeyHasRealNewlines: boolean
  privateKeyNewlineCount: number
  privateKeyHeader: string
  parseError: string | null
}

export function getAnalyticsDiagnostic(): AnalyticsDiagnostic {
  if (cachedDiagnostic) return cachedDiagnostic
  getAnalyticsClient()
  return cachedDiagnostic ?? blankDiagnostic('Initialization did not run.')
}

export function getAnalyticsConfigError(): string | null {
  return cachedReason
}

function blankDiagnostic(parseError: string | null): AnalyticsDiagnostic {
  return {
    propertyIdSet: false,
    jsonSet: false,
    jsonParsedOk: false,
    hasClientEmail: false,
    clientEmailDomain: null,
    serviceAccountProjectId: null,
    hasPrivateKey: false,
    privateKeyLooksLikePem: false,
    privateKeyLength: 0,
    privateKeyHasRealNewlines: false,
    privateKeyNewlineCount: 0,
    privateKeyHeader: '',
    parseError,
  }
}

function parseServiceAccount(raw: string): unknown {
  try { return JSON.parse(raw) } catch { /* try next */ }
  try { return JSON.parse(raw.replace(/\n/g, '\\n').replace(/\r/g, '')) } catch { /* try next */ }
  try { return JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) } catch { /* fall through */ }
  throw new Error('GA_SERVICE_ACCOUNT_JSON is not valid JSON (raw, escaped, or base64).')
}

export function getAnalyticsClient(): { auth: GoogleAuth; propertyId: string } | null {
  if (cached !== undefined) return cached
  const propertyId = process.env.GA_PROPERTY_ID?.trim()
  const rawJson = process.env.GA_SERVICE_ACCOUNT_JSON?.trim()
  const diag = blankDiagnostic(null)
  diag.propertyIdSet = !!propertyId
  diag.jsonSet = !!rawJson

  if (!propertyId) {
    cachedReason = 'GA_PROPERTY_ID is not set.'
    cachedDiagnostic = diag
    cached = null
    return null
  }
  if (!rawJson) {
    cachedReason = 'GA_SERVICE_ACCOUNT_JSON is not set.'
    cachedDiagnostic = diag
    cached = null
    return null
  }
  try {
    const parsed = parseServiceAccount(rawJson) as {
      type?: string
      project_id?: string
      client_email?: string
      private_key?: string
    }
    diag.jsonParsedOk = true
    diag.hasClientEmail = !!parsed.client_email
    diag.clientEmailDomain = parsed.client_email?.split('@')[1] ?? null
    diag.serviceAccountProjectId = parsed.project_id ?? null
    diag.hasPrivateKey = !!parsed.private_key

    if (!parsed.client_email || !parsed.private_key) {
      cachedReason = 'GA_SERVICE_ACCOUNT_JSON missing client_email or private_key.'
      cachedDiagnostic = diag
      cached = null
      return null
    }
    let privateKey = parsed.private_key
    if (!privateKey.includes('\n') && privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n')
    }
    diag.privateKeyLength = privateKey.length
    diag.privateKeyHasRealNewlines = privateKey.includes('\n')
    diag.privateKeyNewlineCount = (privateKey.match(/\n/g) ?? []).length
    diag.privateKeyLooksLikePem =
      privateKey.includes('BEGIN PRIVATE KEY') && privateKey.includes('END PRIVATE KEY')
    diag.privateKeyHeader = privateKey.slice(0, 32)
    cachedDiagnostic = diag

    const auth = new GoogleAuth({
      credentials: {
        client_email: parsed.client_email,
        private_key: privateKey,
      },
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    })
    cachedReason = null
    cached = { auth, propertyId }
    return cached
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    diag.parseError = message
    cachedDiagnostic = diag
    cachedReason = `Failed to parse GA_SERVICE_ACCOUNT_JSON: ${message}`
    console.error('[ga]', cachedReason)
    cached = null
    return null
  }
}

interface RestRow {
  dimensionValues?: { value?: string }[]
  metricValues?: { value?: string }[]
}
interface RestResponse {
  rows?: RestRow[]
  error?: { code?: number; message?: string; status?: string }
}

async function callRest(
  auth: GoogleAuth,
  url: string,
  body: unknown,
): Promise<RestResponse> {
  const accessToken = await auth.getAccessToken()
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let parsed: RestResponse
  try {
    parsed = JSON.parse(text) as RestResponse
  } catch {
    throw new Error(`GA REST returned non-JSON (status ${res.status}): ${text.slice(0, 400)}`)
  }
  if (!res.ok || parsed.error) {
    const e = parsed.error
    const status = e?.status ? `${e.status} ` : ''
    const msg = e?.message ?? `HTTP ${res.status}`
    throw new Error(`${status}${msg}`)
  }
  return parsed
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
  const { auth, propertyId } = ctx
  const property = `properties/${propertyId}`

  const realtimeUrl = `${REST_BASE}/${property}:runRealtimeReport`
  const reportUrl = `${REST_BASE}/${property}:runReport`

  const dateRange = { startDate: '30daysAgo', endDate: 'today' }

  const [realtime, country, device, pages, daily, totals] = await Promise.all([
    callRest(auth, realtimeUrl, { metrics: [{ name: 'activeUsers' }] }),
    callRest(auth, reportUrl, {
      dateRanges: [dateRange],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 8,
    }),
    callRest(auth, reportUrl, {
      dateRanges: [dateRange],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'activeUsers' }],
    }),
    callRest(auth, reportUrl, {
      dateRanges: [dateRange],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 8,
    }),
    callRest(auth, reportUrl, {
      dateRanges: [dateRange],
      dimensions: [{ name: 'date' }],
      metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
      orderBys: [{ dimension: { dimensionName: 'date' } }],
    }),
    callRest(auth, reportUrl, {
      dateRanges: [dateRange],
      metrics: [
        { name: 'activeUsers' },
        { name: 'screenPageViews' },
        { name: 'sessions' },
      ],
    }),
  ])

  const activeUsersNow = Number(realtime.rows?.[0]?.metricValues?.[0]?.value ?? 0)

  const usersByCountry = (country.rows ?? []).map((r) => ({
    country: r.dimensionValues?.[0]?.value ?? '—',
    users: Number(r.metricValues?.[0]?.value ?? 0),
  }))
  const usersByDevice = (device.rows ?? []).map((r) => ({
    device: r.dimensionValues?.[0]?.value ?? '—',
    users: Number(r.metricValues?.[0]?.value ?? 0),
  }))
  const topPages = (pages.rows ?? []).map((r) => ({
    path: r.dimensionValues?.[0]?.value ?? '—',
    views: Number(r.metricValues?.[0]?.value ?? 0),
  }))
  const dailyRows = (daily.rows ?? []).map((r) => ({
    date: (r.dimensionValues?.[0]?.value ?? '').replace(
      /^(\d{4})(\d{2})(\d{2})$/,
      '$1-$2-$3',
    ),
    users: Number(r.metricValues?.[0]?.value ?? 0),
    views: Number(r.metricValues?.[1]?.value ?? 0),
  }))

  const tRow = totals.rows?.[0]
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
