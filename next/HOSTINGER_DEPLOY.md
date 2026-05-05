# Greenofig — Hostinger deployment

Greenofig ships as a static-friendly Next.js 14 app with API routes.
On Hostinger Premium / Business, deploy via the Node.js project type
(Hostinger → hPanel → Websites → New website → Node.js).

## Build & start

```
npm install
NODE_OPTIONS="--preserve-symlinks --preserve-symlinks-main" npm run build
NODE_OPTIONS="--preserve-symlinks --preserve-symlinks-main" npm run start
```

Set the start command to `npx next start -p $PORT` in Hostinger's app
config so the platform-assigned port is used.

## Environment variables

Set these in **hPanel → Advanced → Node.js → Environment variables**.

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` — `https://YOUR_PROJECT.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` — bypasses RLS for webhooks + audit writes

### Stripe
- `STRIPE_SECRET_KEY` — `sk_live_…`
- `STRIPE_WEBHOOK_SECRET` — `whsec_…` (set after registering the webhook URL)
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — `pk_live_…`
- `STRIPE_PRICE_BASIC_MONTHLY`, `STRIPE_PRICE_BASIC_YEARLY`,
  `STRIPE_PRICE_PREMIUM_MONTHLY`, `STRIPE_PRICE_PREMIUM_YEARLY`,
  `STRIPE_PRICE_VIP_MONTHLY`, `STRIPE_PRICE_VIP_YEARLY`

### Google Gemini
- `GOOGLE_GEMINI_API_KEY` — used by the scanner / AI chat / research desk
- Optional: `GEMINI_MODEL` (defaults to `gemini-1.5-flash`),
  `GEMINI_RESEARCH_MODEL` (defaults to `gemini-1.5-pro`)

**Where to get the key:**
1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with a Google account
3. Click **Get API Key** → **Create API Key**
4. Copy the key (starts with `AIza…`)
5. **Free tier**: 15 requests/min, 1500/day — enough for early users at no cost
6. **Paid tier**: $0.075 per million tokens (much cheaper than Anthropic)

### OpenClaw
- `OPENCLAW_WEBHOOK_SECRET` — generate a 32-character random string at
  [randomstring.net](https://randomstring.net). This secret protects the
  `/api/openclaw/webhook` endpoint that Dr. Rawan's AI assistant calls
  from WhatsApp/Telegram. The same value goes into OpenClaw's `.env`
  as `GREENOFIG_SECRET`. See [docs/OPENCLAW_SETUP.md](./docs/OPENCLAW_SETUP.md).

### Site
- `NEXT_PUBLIC_SITE_URL` — `https://greenofig.com`

## Stripe webhook URL

After deploying, register the webhook in the Stripe dashboard:
`https://greenofig.com/api/stripe/webhook`

Subscribed events:
- `checkout.session.completed`
- `customer.subscription.{created,updated,deleted}`
- `invoice.{paid,payment_failed}`
- `payment_intent.succeeded`

Copy the resulting signing secret into `STRIPE_WEBHOOK_SECRET`.

## OpenClaw webhook URL

After deploying, point your OpenClaw skill at:
`https://greenofig.com/api/openclaw/webhook`

with the `x-openclaw-secret` header set to your `OPENCLAW_WEBHOOK_SECRET`.
The admin panel at `/admin/openclaw` includes a one-click "Test connection"
button that round-trips a request to verify the secret matches.

## Build cache & OneDrive

If the project lives inside OneDrive on a Windows dev box, `.next/`
should be redirected outside OneDrive (a junction to `%LOCALAPPDATA%`)
and Node started with `NODE_OPTIONS=--preserve-symlinks
--preserve-symlinks-main`. None of this applies on Hostinger's Linux
VMs — those just run `npm run build && npm start` cleanly.
