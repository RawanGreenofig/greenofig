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
let cachedReason: string | null = null
let cachedDiagnostic: AnalyticsDiagnostic | null = null

/**
 * Sanity check of GA env vars without leaking secrets — safe to expose
 * on the admin diagnostic panel. Use this to figure out *which* of
 * many possible failure modes you're hitting.
 */
export interface AnalyticsDiagnostic {
  propertyIdSet: boolean
  jsonSet: boolean
  jsonParsedOk: boolean
  hasClientEmail: boolean
  clientEmailDomain: string | null
  hasPrivateKey: boolean
  privateKeyLooksLikePem: boolean
  privateKeyLength: number
  privateKeyHasRealNewlines: boolean
  /** A typical RSA 2048 PEM has ~28 newlines; <5 means the body is
   *  collapsed onto one line which OpenSSL will reject. */
  privateKeyNewlineCount: number
  /** First 32 chars of the private key with anything that's not part
   *  of the PEM header stripped to make the shape visible without
   *  exposing key bits. */
  privateKeyHeader: string
  parseError: string | null
}

export function getAnalyticsDiagnostic(): AnalyticsDiagnostic {
  if (cachedDiagnostic) return cachedDiagnostic
  // Trigger init so we populate the diagnostic
  getAnalyticsClient()
  return cachedDiagnostic ?? {
    propertyIdSet: false,
    jsonSet: false,
    jsonParsedOk: false,
    hasClientEmail: false,
    clientEmailDomain: null,
    hasPrivateKey: false,
    privateKeyLooksLikePem: false,
    privateKeyLength: 0,
    privateKeyHasRealNewlines: false,
    privateKeyNewlineCount: 0,
    privateKeyHeader: '',
    parseError: 'Initialization did not run.',
  }
}

/**
 * Why the client couldn't be built (when getAnalyticsClient() returns
 * null). Lets the API route distinguish "not configured" from "config
 * is broken" so the dashboard can tell the user the real problem.
 */
export function getAnalyticsConfigError(): string | null {
  return cachedReason
}

/**
 * Best-effort parse of GA_SERVICE_ACCOUNT_JSON. Tolerates the two
 * common ways it gets mangled when copy-pasted into Vercel:
 *   1. Raw JSON pasted as-is — works.
 *   2. Newlines inside "private_key" got converted to real newlines —
 *      JSON.parse rejects it. We re-escape them and retry.
 *   3. Pasted as base64 (some teams do this on purpose to avoid #2).
 *      We attempt base64 → utf8 → JSON.
 */
function parseServiceAccount(raw: string): unknown {
  // 1. As-is
  try {
    return JSON.parse(raw)
  } catch {
    /* fall through */
  }
  // 2. Re-escape literal newlines inside the JSON string
  //    (covers the case where Vercel turned \n into real \n)
  try {
    return JSON.parse(raw.replace(/\n/g, '\\n').replace(/\r/g, ''))
  } catch {
    /* fall through */
  }
  // 3. Base64 decode and try again
  try {
    const decoded = Buffer.from(raw, 'base64').toString('utf8')
    return JSON.parse(decoded)
  } catch {
    /* fall through */
  }
  throw new Error('GA_SERVICE_ACCOUNT_JSON is not valid JSON (raw, escaped, or base64).')
}

export function getAnalyticsClient():
  | { client: BetaAnalyticsDataClient; propertyId: string }
  | null {
  if (cached !== undefined) return cached
  const propertyId = process.env.GA_PROPERTY_ID?.trim()
  const rawJson = process.env.GA_SERVICE_ACCOUNT_JSON?.trim()
  // Start a fresh diagnostic
  const diag: AnalyticsDiagnostic = {
    propertyIdSet: !!propertyId,
    jsonSet: !!rawJson,
    jsonParsedOk: false,
    hasClientEmail: false,
    clientEmailDomain: null,
    hasPrivateKey: false,
    privateKeyLooksLikePem: false,
    privateKeyLength: 0,
    privateKeyHasRealNewlines: false,
    privateKeyNewlineCount: 0,
    privateKeyHeader: '',
    parseError: null,
  }
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
      client_email?: string
      private_key?: string
    }
    diag.jsonParsedOk = true
    diag.hasClientEmail = !!parsed.client_email
    diag.clientEmailDomain = parsed.client_email?.split('@')[1] ?? null
    diag.hasPrivateKey = !!parsed.private_key

    if (!parsed.client_email || !parsed.private_key) {
      cachedReason =
        'GA_SERVICE_ACCOUNT_JSON is parsed but missing client_email or private_key.'
      cachedDiagnostic = diag
      cached = null
      return null
    }
    // Repair private_key: if its \n sequences arrived as the literal
    // two characters "\\n", expand them back to real newlines. The
    // Google auth library wants the PEM with real newlines.
    let privateKey = parsed.private_key
    if (!privateKey.includes('\n') && privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n')
    }
    diag.privateKeyLength = privateKey.length
    diag.privateKeyHasRealNewlines = privateKey.includes('\n')
    diag.privateKeyNewlineCount = (privateKey.match(/\n/g) ?? []).length
    diag.privateKeyLooksLikePem =
      privateKey.includes('BEGIN PRIVATE KEY') &&
      privateKey.includes('END PRIVATE KEY')
    diag.privateKeyHeader = privateKey.slice(0, 32)
    cachedDiagnostic = diag

    const client = new BetaAnalyticsDataClient({
      credentials: {
        client_email: parsed.client_email,
        private_key: privateKey,
      },
    })
    cachedReason = null
    cached = { client, propertyId }
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

  // Preflight: explicitly mint an access token. If the credentials are
  // bad, this throws a *useful* error (e.g. "invalid_grant: Invalid JWT
  // Signature") before we hit gRPC, which otherwise wraps the failure
  // as "undefined undefined: undefined".
  try {
    const auth = (client as unknown as {
      auth?: {
        getClient?: () => Promise<{ getAccessToken?: () => Promise<unknown> }>
      }
    }).auth
    if (auth?.getClient) {
      const authClient = await auth.getClient()
      if (authClient?.getAccessToken) {
        await authClient.getAccessToken()
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`GA auth preflight failed: ${msg}`)
  }

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
