/**
 * Stripe webhook — public-facing URL.
 *
 * The conventional webhook path is `/api/webhooks/stripe`, while this
 * codebase originally exposed `/api/stripe/webhook`. Stripe might be
 * configured for either, so we re-export the canonical handler from
 * /api/stripe/webhook here. Adding new logic here would mean keeping
 * two implementations in sync — don't.
 */
export { POST } from '../../stripe/webhook/route'
