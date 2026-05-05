# Greenofig × OpenClaw Integration Guide

## What is OpenClaw?
OpenClaw is an open-source 24/7 AI assistant that
Dr. Rawan can use from WhatsApp or Telegram to manage
the Greenofig platform with natural language.

Instead of building visual workflows, Dr. Rawan simply
messages OpenClaw like a team member:
  "Who are my at-risk clients this week?"
  "Send a motivational reminder to all Basic members"
  "Toggle the store offline for maintenance"
  "Give me today's bookings"
  "Export all client data as Excel"

OpenClaw queries Greenofig's API, gets the data,
and replies with a clear human-readable answer.

## Step 1 — Install OpenClaw
  GitHub: github.com/steipete/openclaw

  Option A — Local (Dr. Rawan's computer):
    git clone https://github.com/steipete/openclaw
    cd openclaw
    npm install
    npm run setup

  Option B — VPS/Server:
    Same as above but on a $5/month VPS
    This keeps it running 24/7 even when
    Dr. Rawan's computer is off

## Step 2 — Connect to WhatsApp or Telegram
  Follow OpenClaw's setup wizard:
  npm run setup

  Choose WhatsApp or Telegram as your channel
  Scan QR code (WhatsApp) or create bot (Telegram)
  OpenClaw will now receive your messages

## Step 3 — Add Google Gemini API Key to OpenClaw
  In OpenClaw config, add your Google Gemini API key.
  This is separate from the one used by Greenofig.

  Where to get the key:
  1. Go to aistudio.google.com
  2. Sign in with a Google account
  3. Click "Get API Key" → "Create API Key"
  4. Copy the key (starts with "AIza...")
  5. Free tier: 15 req/min, 1500/day — fine for early use
  6. Paid tier: $0.075 per million tokens (much cheaper than Anthropic)

## Step 4 — Add the Greenofig Skill to OpenClaw
  Create a file in OpenClaw's skills folder:
  skills/greenofig.js

  Content:

  const GREENOFIG_URL = process.env.GREENOFIG_URL
  const GREENOFIG_SECRET = process.env.GREENOFIG_SECRET

  async function callGreenofig(action, params = {}) {
    const response = await fetch(
      `${GREENOFIG_URL}/api/openclaw/webhook`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-openclaw-secret': GREENOFIG_SECRET
        },
        body: JSON.stringify({ action, params })
      }
    )
    return response.text()
  }

  module.exports = {
    name: 'greenofig',
    description: 'Manage the Greenofig nutrition platform',

    skills: {
      'check at-risk clients': () =>
        callGreenofig('get_at_risk_clients'),

      'platform stats': () =>
        callGreenofig('get_platform_stats'),

      'todays bookings': () =>
        callGreenofig('get_todays_bookings'),

      'revenue summary': (period) =>
        callGreenofig('get_revenue_summary', {period}),

      'toggle store on': () =>
        callGreenofig('toggle_store', {enabled: true}),

      'toggle store off': () =>
        callGreenofig('toggle_store', {enabled: false}),

      'send reminder': (message) =>
        callGreenofig('send_reminder', {message}),

      'broadcast message': (message) =>
        callGreenofig('send_broadcast', {message}),

      'export clients': () =>
        callGreenofig('export_client_data', {format:'xlsx'})
    }
  }

## Step 5 — Add Environment Variables to OpenClaw
  In OpenClaw's .env file:
  GREENOFIG_URL=https://yourdomain.com
  GREENOFIG_SECRET=your_openclaw_webhook_secret

  The secret must match OPENCLAW_WEBHOOK_SECRET
  in your Greenofig Hostinger environment variables

## Step 6 — Set Up Automated Reminders
  OpenClaw supports cron jobs via natural language.
  Tell it (in WhatsApp/Telegram):

  "Every Monday at 8am, check my at-risk clients
  and send me a summary"

  "Every day at 6pm, tell me today's platform stats"

  "Every Sunday at 9am, send an encouraging message
  to all Premium members"

  OpenClaw will remember these and run them
  automatically even when you're not chatting.

## Example Conversations with OpenClaw

Dr. Rawan: "How are my clients doing this week?"
OpenClaw: "You have 124 active clients. 3 are at risk:
  - Mike K. — no login in 7 days
  - Sara L. — below calorie target 4 days in a row
  - Ahmed M. — missed last appointment
  Shall I send them a gentle reminder?"

Dr. Rawan: "Yes, send them a motivational message"
OpenClaw: "Sent! 3 clients notified with an
  encouraging check-in message."

Dr. Rawan: "Give me this month's revenue"
OpenClaw: "November revenue: SAR 18,430
  vs October: SAR 15,200 (+21%)
  Top products: Omega-3 (32 orders), Protein (28 orders)
  Subscriptions: 12 new this month"

Dr. Rawan: "Export all client data"
OpenClaw: "Generated! Download your client
  Excel file here: [link]"

## Security Notes
  - The webhook secret is the only protection
    Keep it long and random (32+ characters)
    Never share it publicly
  - OpenClaw never stores your Greenofig data
    Every query is fresh from the database
  - All actions are logged in Greenofig's audit log
    You can see everything OpenClaw did in
    Admin → Audit Log

## Automations Included Out of the Box
  Once set up, tell OpenClaw to run these automatically:

  Daily (9am):
    "Tell me today's bookings and platform stats"

  Weekly (Monday 8am):
    "Send me a list of at-risk clients"
    "Give me last week's revenue summary"

  Monthly (1st of month):
    "Export all client data and revenue report"
    "Send me a full platform analytics summary"

  Real-time (when Dr. Rawan messages):
    Any question about clients, bookings, revenue,
    or platform status — answered instantly
