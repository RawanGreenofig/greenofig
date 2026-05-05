---
name: GreenoFig Design System
description: Brand and product design system for GreenoFig — a personalized nutrition practice with a cinematic editorial marketing site (Fraunces serif, deep green hero, exploding ingredient photography) and a warm-utility wellness app (Inter, lime CTAs, dashboards, AI Coach chat). Use this skill whenever creating GreenoFig screens, marketing pages, social content, decks, or product mockups.
---

# Using the GreenoFig design system

Read this whole file before designing anything for GreenoFig. The brand is two registers in one — don't mix them.

## Always do these first
1. Read `README.md` end-to-end — it's the source of truth for brand voice, copy patterns, and visual rules.
2. Read `colors_and_type.css` — every token (HSL + hex), the type ramp, spacing, radii, shadows, motion. Reference these by name; do not invent new ones.
3. For visual reference of any individual token, open the corresponding card in `preview/` (e.g. `preview/colors-primary.html`).
4. For larger work, copy and adapt from `ui_kits/marketing/` (cinematic site) or `ui_kits/app/` (dashboards, chat, meal plans).

## The two registers — pick the right one

**Marketing register** — editorial, bold, cinematic.
- Background: warm off-white `#fafaf7` OR deep `#0f3a2e` hero.
- Type: **Fraunces** (or `Cormorant Garamond` as system fallback) for huge display headlines, two-word imperatives split across lines ("Eat / Better.").
- Body: **Inter**, comfortable line-height.
- Imagery: high-contrast ingredient photography, often "exploding" or floating; never illustrated icons in hero.
- CTAs: lime `#84cc16` primary on light, ink `#0f172a` on dark.
- Eyebrows: ALL-CAPS, wide tracking (`0.14em+`), lime-700.

**Product register** — warm-utility, dashboard.
- Background: white cards on `#fafaf7`.
- Type: **Inter** everywhere. Numbers can use `JetBrains Mono` for stats.
- Components: shadcn-style — 14px radius cards, 8px radius inputs, lucide icons at 1.75 stroke.
- Color: lime is the *active* state and primary CTA; `#0f172a` ink for dark surfaces and primary buttons; domain tints (orange/cyan/violet/amber) for stat categories.
- No giant serif headlines — use Inter 700 at 22–28px instead.

## Copy rules (apply both registers)
- "You" addressing the reader. "We" for the practice.
- Headlines: Title Case (decorative) or Sentence case (split-line editorial).
- Buttons: Title Case, plain verbs (Get Started, Book Free Consultation, Save Meal).
- Body: sentence case with periods. Contractions OK.
- **No emoji in chrome.** Lucide icons do that job.
- **No exclamation points in headlines.** Sparingly in toasts.
- Stats are confident and round (50K+, 1M+, 4.9). Never decimal-precise unless real.

## Iconography
- Library: **lucide** at 1.75 stroke, currentColor.
- Sizes: 14 (inline), 16 (chips), 20 (buttons), 24 (stats), 32 (hero).
- Domain tints: lime/ai-coach (use `Leaf`, not `Bot`), amber/meals, orange/calories, cyan/hydration, violet/sleep, rose/saved, blue/progress.
- Pair a 14% alpha tint background with the same-hue 600/700 icon stroke. Never solid bg.
- Don't mix filled + stroked in one row. Don't go below 14px.

## Color token quick reference
- `--lime: #84cc16` — primary action, "active" state
- `--lime-700: #4d7c0f` — text on lime tint, eyebrows
- `--amber: #f59e0b` — accent / streaks
- `--ink: #0f172a` — primary text, dark surfaces, primary CTA
- `--bg: #fafaf7` — warm off-white app background
- `--muted: #64748b` — supporting text
- `--border: #e2e8f0` — neutral hairlines

For full HSL light/dark variants, semantic colors, and warm accent shades, see `colors_and_type.css`.

## Common starting points

**Marketing landing page** → copy `ui_kits/marketing/index.html` and tweak Hero copy/imagery. Keep the deep-green hero + ingredient floating animation; vary stats and copy.

**App dashboard** → copy `ui_kits/app/Dashboard.jsx`. Stat cards, today's plan with meal images, streak card, upgrade card.

**AI Coach / chat** → copy `ui_kits/app/AICoach.jsx`. Lime accents, message bubbles with action chips, ink-colored user bubbles.

**Meal plan view** → copy `ui_kits/app/MealPlans.jsx`. Day-strip header, 2-column meal cards with photo + tags.

**Messages thread** → copy `ui_kits/app/Messages.jsx`. Two-column conversations + thread.

## Don't
- Don't introduce new fonts. Inter + Fraunces is the whole system.
- Don't use Bot/robot icons for the AI Coach — it's a wellness coach. Use Leaf or Sparkles.
- Don't put gradients behind body text.
- Don't recreate components from scratch — extend the kit.
- Don't add stock illustration. Use photography or lucide icons only.

## Imagery direction
Real food, real people, natural light. Sources used in mockups should be Unsplash food photography (yogurt bowls, salads, grilled fish, fruit). Never AI-illustrated food. Never cartoon/3D-render.
