import { NextResponse } from 'next/server'

/** Successful JSON response. */
export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

/** Error response with a stable shape: `{ error: { code, message } }`. */
export function jsonError(
  code: string,
  message: string,
  status = 400,
): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status })
}

/** 401 — caller is unauthenticated or session expired. */
export const unauthorized = () =>
  jsonError('unauthorized', 'You must be signed in.', 401)

/** 403 — authenticated but role/tier doesn't allow this action. */
export const forbidden = (message = 'You do not have access to this action.') =>
  jsonError('forbidden', message, 403)

/** 404 — resource not found. */
export const notFound = (message = 'Not found.') =>
  jsonError('not_found', message, 404)

/** 422 — validation error. */
export const badRequest = (message: string) =>
  jsonError('validation', message, 422)

/** 503 — required service env missing (Supabase, Stripe, Gemini, etc.). */
export const serviceUnavailable = (service: string) =>
  jsonError(
    'service_unavailable',
    `${service} is not configured on this environment.`,
    503,
  )

/** 500 — unexpected error. Don't leak internals to the client. */
export const internalError = () =>
  jsonError('internal_error', 'Something went wrong.', 500)
