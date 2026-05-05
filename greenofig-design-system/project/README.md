# GreenoFig Design System

> **Eat better.** A personalized nutrition practice and AI-powered wellness platform — one nutritionist, one-on-one consultations, custom meal plans, and ongoing guidance for clients who want real, sustainable results.

## Brand at a glance

GreenoFig (the name fuses "green" + "fig" — also the literal logo: a stylized **GF** monogram with leaves on top and roots/figs below) is a personalized nutrition practice that lives across two surfaces:

1. **Marketing website** — a cinematic, scroll-driven, Apple-product-page-style site that sells the practice. Deep-green hero, exploding ingredient photography, oversized Fraunces headlines split across two lines ("Eat" / "Better."). The visual showpiece.
2. **Web app** — a multi-role product (client, nutritionist, admin) covering an AI Coach chat, dashboards, meal plans, fitness logging, progress, appointments, and a nutritionist↔client messaging system. Built with React 19 + Vite + Tailwind + shadcn-style Radix primitives + Supabase.

The brand sits at the intersection of **wellness editorial** (Fraunces serif, organic ingredient photography, warm-green palette) and **modern SaaS** (Inter sans, lime-green CTAs, clean cards, dashboards). The marketing site is editorial; the app is utilitarian — and the design system covers both.

## Sources & access

- **Codebase (mounted, read-only):** `GreenofigV2/` — Vite + React 19 + Tailwind 3 app. Key files we read:
  - `src/index.css` — HSL variable tokens, light + dark themes
  - `tailwind.config.js` — color, radius, font, keyframes, shadow extensions
  - `src/components/ui/*` — Radix-based primitives (button, card, badge, input, dialog, dropdown, tabs, accordion, etc.)
  - `src/components/layout/{Navbar,Footer,AppLayout}.jsx` — site chrome + app shell
  - `src/pages/{Home,Features,Pricing,Blog,About}.jsx` — marketing
  - `src/pages/app/{Dashboard,AICoach,MealPlans,Nutrition,Fitness,Progress,Appointments}.jsx` — client app
  - `src/pages/app/nutritionist/*` — nutritionist console
  - `src/i18n/locales/en.json` — copywriting source of truth (also `ar.json` for RTL)
  - `logo/`, `public/` — brand mark and favicons
- **Reference imagery (in `uploads/`):**
  - `website hero refrence.png` — cinematic green hero with floating ingredients ("Eat / Better.")
  - `website hero refrence .png` — alternate clean wellness hero (Fraunces serif, white bg, fruit cutouts)
  - `website animation look a like.mp4` — motion reference for the marketing site
  - `user dahboard refrence.png` — dark-mode user dashboard ("healthy")
  - `nutrionist dashboard.png` — nutritionist console layout
  - `chat desing .png` — AI assistant chat layout reference
  - `app communitiy refrence.png` — community feed reference (3-column app)

## Index

```
.
├── README.md                  ← you are here (brief, content + visual foundations, iconography, index)
├── SKILL.md                   ← Agent-Skill manifest (cross-compatible with Claude Code skills)
├── colors_and_type.css        ← ALL design tokens — colors (HSL + hex), type, spacing, motion
├── assets/
│   ├── logo.png               ← primary GreenoFig wordmark/monogram
│   ├── logo-512.png           ← 512px raster (android chrome)
│   ├── favicon-32x32.png      ← 32px favicon
│   └── apple-touch-icon.png   ← 180px apple touch icon
├── preview/                   ← design-system cards (rendered in the Design System tab)
│   ├── colors-primary.html
│   ├── colors-neutral.html
│   ├── colors-semantic.html
│   ├── colors-warm.html
│   ├── type-display.html
│   ├── type-scale.html
│   ├── type-eyebrow.html
│   ├── radii.html
│   ├── shadows.html
│   ├── spacing.html
│   ├── buttons.html
│   ├── badges.html
│   ├── inputs.html
│   ├── cards.html
│   ├── logo.html
│   ├── iconography.html
│   └── gradient-text.html
└── ui_kits/
    ├── marketing/
    │   ├── README.md          ← the cinematic marketing site recreation
    │   ├── index.html         ← scroll-driven landing page
    │   └── *.jsx              ← Hero, Nav, IngredientShowcase, Stats, NutritionistStory, Footer
    └── app/
        ├── README.md          ← the multi-role web app recreation
        ├── index.html         ← interactive prototype (dashboard ↔ AI coach ↔ meal plans)
        └── *.jsx              ← AppShell, Sidebar, Dashboard, AICoach, MealPlans, Messages
```

---

## Content fundamentals

The brand voice is **warm, expert, and aspirational** — it sells transformation without being preachy. Copy is *short*, *scannable*, and **outcome-led**, mixing punchy display lines with a calm, supportive body voice. There are two distinct registers:

1. **Marketing register — bold, editorial, second-person.**
   - Display copy is two-word imperatives split across the hero: **"Eat / Better."**, **"Transform Your Health / Through Mindful Nutrition"**, **"Your Personal / Health Companion"**.
   - Subheads are calm and explanatory: *"Transform your health journey with AI-powered nutrition plans, personalized workouts, and 24/7 coaching support."*
   - CTAs use plain action verbs: **Get Started**, **Start Free Trial**, **Watch Demo**, **Book Free Consultation**, **Contact Us**, **View Pricing**.
   - Eyebrows use ALL-CAPS with wide tracking: **AI-POWERED ORGANIC LIVING**, **FEATURES**, **PRICING**, **TESTIMONIALS**.
   - Stats are confident and round: **50K+ active users**, **1M+ meals tracked**, **4.9 app rating**, **2,400+ clients** (cinematic spec mentions **47 ingredients**, **0g artificial sugar**, **98% client satisfaction**).

2. **Product register — friendly, functional, first-person plural ("we").**
   - Time-aware greetings: *"Good morning, Sarah!"*, *"Here's your summary for today."*
   - In-product microcopy is plainspoken and helpful: *"5 messages remaining today"*, *"Upgrade to Premium"*, *"Unlimited conversations available"*, *"You don't have an active meal plan yet. Contact your nutritionist to get a personalized plan created for you."*
   - Empty states explain + offer one action, never two: *"No upcoming events"*, *"You have no recent activity yet"*.
   - Toasts are plain past-tense: *"Chat cleared"*, *"Failed to fetch conversations"*.

### Tone & casing rules
- **Headlines: Title Case** when they're decorative ("Transform Your Health Through Mindful Nutrition"). Sometimes **Sentence case** for editorial split-headlines ("Eat" / "Better.").
- **Buttons: Title Case** for primary CTAs (*Get Started*, *Book Free Consultation*); **lower-friendly** Title Case for secondary (*Watch Demo*).
- **Labels & nav: Title Case, single word where possible** — *Home, Features, Pricing, Reviews, Blog, Contact, Dashboard*.
- **Body: sentence case**, periods always, contractions OK ("you'll", "we've", "here's").
- **Voice: "you" addressing the reader.** "We" appears for the practice ("our certified nutritionists", "our AI coach"). The single nutritionist sometimes speaks in first-person on the About page.
- **No exclamation points in headlines** — they appear sparingly in toasts/celebrations ("I lost 2kg this week!", "Thanks for the meal plan!").

### Vibe
Calm authority. The brand believes in **real, sustainable results** (not gimmicks) and writes that way — never hyped, never pushy. It's the difference between a wellness clinic and a fad-diet ad.

### Emoji policy
**No emoji in marketing or product chrome.** They appear naturally in **user-generated content** (community posts, chat messages from clients) and very rarely as a celebratory accent in toasts. The brand itself never uses them in nav, headlines, buttons, or empty states — iconography (lucide) handles that role.

### Specific copy examples (from the codebase)
- Hero badge: **"AI-Powered Wellness Platform"**
- Hero: **"Your Personal Health Companion"**
- Sub: *"Transform your health journey with AI-powered nutrition plans, personalized workouts, and 24/7 coaching support."*
- Free-trial trust line: *"No credit card required. Start your 14-day free trial today."*
- AI Coach disclaimer (small, centered): *"Always consult a healthcare professional for medical advice."*
- Empty plan: *"No Active Meal Plan — You don't have an active meal plan yet. Contact your nutritionist to get a personalized plan created for you."*
- Upgrade banner: *"Upgrade to Premium — Unlock AI coaching, nutritionist access, and more!"*

---

## Visual foundations

### Colors
The palette has two halves:
- **A cool, structured base** — paper white background, slate-blue neutrals (HSL `222 47% 11%` ink, `215 16% 47%` muted, `214 32% 91%` line). This is the SaaS-app surface.
- **A signature lime-green primary** — `hsl(84 81% 44%)` ≈ `#84cc16`, with the gradient companion `lime-400` (`#a3e635`) used in `.gradient-text` and the `pulse-glow` shadow. This is the "GreenoFig" green.
- **Editorial deep greens** for marketing hero — `#0d1a12` (deep-forest hero bg) → `#060d09` (footer wordmark bg). These are **only for marketing**; the app stays light/white.
- **Warm accents** — fig-orange (`#c2410c`), amber (`#f59e0b`), root-ochre (`#b45309`). Used in ingredient illustrations and stat hue-shifts.
- **Semantic state** — success `#16a34a`, warning `#f59e0b`, info `#0ea5e9`, danger `#ef4444`.
- **Dark mode** is fully supported (`.dark` class) with a near-black bg `hsl(220 15% 10%)`.

### Type
- **Display / editorial: Fraunces** (serif, optical sized). Used on the marketing hero only — the cinematic spec calls for it explicitly. Big, tight tracking, two-word splits.
- **UI / body: Inter** (300/400/500/600/700/800). The workhorse for everything in-product and most marketing body text.
- **Mono: JetBrains Mono** for the rare code/data moment.
- **Arabic: Noto Sans Arabic** (full RTL support — `dir="rtl"` swaps font + spacing reverses with `rtl:space-x-reverse`).
- Scale is tailwind-native (`text-3xl`, `text-4xl`, `text-7xl` on hero); see `colors_and_type.css` for semantic roles.
- **Gradient text** is a brand staple: `bg-gradient-to-r from-primary to-lime-400 bg-clip-text` — used to highlight the second word of every two-part headline.

### Spacing
Tailwind's 4-px grid — `gap-2/4/6/8`, `p-4/6`, `py-24` for section padding, `max-w-7xl mx-auto` for the standard content cap. Marketing sections use `py-24`; app pages use `p-6 space-y-6`.

### Backgrounds
- **Marketing hero:** full-bleed photography (Unsplash sources in code; the cinematic spec wants curated ingredient photo composites). Hero overlay is dark gradient at 0.7 opacity over color.
- **Marketing sections:** alternating `bg-card/50` and the soft CTA gradient `bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10`.
- **App:** plain `bg-background` (white). Cards float on it; a slate sidebar holds nav.
- **No repeating patterns or hand-drawn illustrations.** The texture comes from photography and the lime glow.
- **Film grain** (8% opacity SVG noise) is a marketing-site overlay per the spec — not used in-app.

### Animation
- **Library:** `framer-motion` in-product (entrance fade+slide, `transition={{ delay: index * 0.1 }}` staggered lists). For the marketing site, the cinematic spec calls for **GSAP + ScrollTrigger** with `scrub: 1`, **Lenis** smooth scroll, and **React Three Fiber** for the 3D centerpiece.
- **In-app:** opacity 0→1, y 20→0 over 300–600ms, eased. Stagger 80–120ms between siblings.
- **Cinematic motion (marketing):** scrub-tied scroll, parallax, character-split headlines, scale+rotate on exit, color cross-fades over 800ms+.
- **Idle motion:** `pulse-glow` (lime shadow breathing 2s loop on featured CTAs), `float` (3s vertical wobble for floating cards/imagery), `shimmer` (loading skeletons).
- **Reduced motion:** disable all scrub animations, snap to final state, keep opacity fades at 200ms only.

### Hover & press states
- **Hover (buttons):** background opacity drops to 90% (`hover:bg-primary/90`); outline buttons swap to `bg-accent`. Cards lift via `card-hover` → `transition-all 300ms`, `-translate-y-1`, `shadow-glow`.
- **Hover (links):** `hover:text-primary` color swap, `transition-colors`.
- **Press:** Radix primitives use `active:scale-[0.98]` rarely; mostly the color shift carries it.
- **Focus:** `ring-2 ring-ring ring-offset-2` always — accessibility-first. Ring color is the lime primary.

### Borders & lines
- Hairline `1px solid hsl(var(--border))` everywhere. `border/50` (50% alpha) for softer dividers inside cards.
- Inputs share the border color with the surface line — they're flush, not bumped.

### Shadows
A small, explicit system:
- `shadow-sm` — base resting state for cards.
- `shadow-md` / `shadow-lg` — popovers, dropdowns.
- `shadow-glow` (`0 4px 20px rgb(163 230 53 / 0.3)`) — featured/hover state on primary CTAs.
- `shadow-glow-lg` — hero CTA in cinematic moments.
- `shadow-glass` — the floating glass nav after scroll.
- **No inner shadows.** **No "neumorphism."** Shadows are always blurry, never harsh.

### Glassmorphism (used sparingly)
The `.glass-effect` class — `bg-card/60 backdrop-blur-xl border border-border/50` — appears on:
- The scrolled-state navbar
- Hero stat tiles overlaid on photography (`bg-white/10 backdrop-blur-sm rounded-lg p-4`)
- The pricing-toggle pill

It's a **layering tool over photography**, not a base surface. Cards on plain backgrounds are solid.

### Capsules & protection
- **Pill chips & badges** are the dominant capsule (`rounded-full px-2.5 py-0.5 text-xs font-semibold`). Tier indicators use them; nav segmented controls use them.
- **No protection gradients** under text on photography — the system uses a solid dark overlay (`overlayOpacity={0.7}`) instead.

### Corner radii
Driven by `--radius: 0.75rem` (12px):
- `rounded-md` (10px) — buttons, inputs, small chips
- `rounded-lg` (12px) — cards, containers, dialogs
- `rounded-xl` (16px) — feature cards, dashboards
- `rounded-2xl` (24px) — hero/marketing frame (cinematic spec calls for the rounded-rect viewport border)
- `rounded-full` — avatars, badges, the lime "Watch Video" pill

### Cards
- Surface: `bg-card`, `border border-border` (1px), `rounded-lg`, `shadow-sm`.
- Hover: `card-hover` adds `-translate-y-1` and the lime `shadow-glow`.
- Inside: `CardHeader p-6 pb-3` → title `text-2xl font-semibold` → `CardContent p-6 pt-0`.
- Variant cards lean on `bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20` for emphasis (streak card, upgrade banner). The AI Coach quick-access uses a violet/purple gradient — the **only** non-green gradient in the system.

### Imagery
- **Photographic, not illustrated.** Real food, real fruit, real workouts.
- **Color vibe:** *warm-green*. Lots of leafy green, splashes of warm orange (figs, tomatoes), saturated and lit, slight grain on marketing only.
- **Floating cutouts** are a marketing motif — ingredients with shadows, no backgrounds, arranged around the headline.
- **No black & white. No cool-blue tinting.** Everything reads "fresh, vital, organic."

### Layout rules
- **Fixed top nav** (`fixed top-0 left-0 right-0 z-50`) — transparent at rest, glass-effect after 20px scroll.
- **Max content width: 1280px** (`max-w-7xl`) center-aligned with 4/6/8 lg horizontal padding.
- **App shell:** 256px collapsible sidebar (collapses to 64px) + main content. Mobile drops to off-canvas drawer.
- **Cinematic-spec rounded frame:** the marketing site is wrapped in a rounded-2xl viewport with margin around it (visible in the hero ref).

### Transparency & blur — when to use
- **Yes:** photography overlays, scrolled nav, hero stat tiles, pricing toggle.
- **No:** cards on white, dropdown menus, dialogs, the app shell itself.

---

## Iconography

GreenoFig uses **lucide-react** as its single icon system — a clean, modular, monoline set with consistent **2px stroke weight** and no fills. Every icon in the codebase is imported from `lucide-react`; there are no custom-drawn SVGs in the UI layer.

### Catalog of icons in active use
- **Marketing:** `ArrowRight`, `Play`, `Star`, `Bot`, `Utensils`, `Dumbbell`, `TrendingUp`, `Check`, `X`, `Sparkles`, `CreditCard`, `Watch`, `Camera`, `Trophy`, `Globe`, `Shield`, `Zap`, `MessageSquare`, `Calendar`.
- **App:** `LayoutDashboard`, `Bot`, `Utensils`, `FileText`, `Dumbbell`, `TrendingUp`, `Calendar`, `MessageSquare`, `Settings`, `CreditCard`, `HelpCircle`, `LogOut`, `Menu`, `X`, `ChevronLeft`, `Users`, `Target`, `BarChart3`, `PenSquare`.
- **Dashboard:** `Flame`, `Droplets`, `Moon`, `Target`, `Trophy`, `Crown`, `Lock`, `Plus`, `ArrowRight`, `Scale`, `Bot`.
- **Meal plans:** `Coffee`, `Salad`, `Beef`, `Apple`, `Cookie`, `ChefHat`, `Download`, `Eye`, `CheckCircle`.
- **Auth/account:** `User`, `Mail`, `Phone`, `MapPin`, `Sun`, `Moon`, `Globe`.
- **Social (footer only):** `Facebook`, `Twitter`, `Instagram`, `Linkedin`.

### Sizes
- `h-4 w-4` (16px) — inline with text, badges, list bullets
- `h-5 w-5` (20px) — sidebar nav, card icons
- `h-6 w-6` (24px) — primary actions, headers
- `h-8 w-8` / `h-10 w-10` (32 / 40px) — feature cards (in colored bg circles)

### Color rules
- Default: inherits text color (`currentColor`).
- In feature cards: primary lime in a `bg-primary/10 rounded-lg` 48×48 tile.
- Stat icons in dashboard get a per-domain hue: `text-orange-500` (Flame/Calories), `text-blue-500` (Protein/Target), `text-cyan-500` (Droplets/Water), `text-purple-500` (Moon/Sleep). These domain colors are **only for stat icons** — they don't extend to the rest of the UI.

### Logo
The GreenoFig logo (`assets/logo.png`) is the stylized **GF** monogram with a leaf flourish on top and roots/figs at the base. It's used at:
- Navbar: `h-10 w-auto` (40px tall)
- App sidebar: `h-8 w-auto` (32px tall)
- Footer: `h-10 w-auto`
- Favicon set: 16×16, 32×32, 180×180 (apple), 192×192 + 512×512 (android)

### Emoji & unicode
**Not used as iconography** anywhere in the system. Lucide handles every UI symbol.

---

## Caveats / known substitutions

- **Fonts:** **Fraunces** is locked, self-hosted from `fonts/Fraunces-VariableFont_SOFT_WONK_opsz_wght.ttf` (regular + italic, full variable axes: `opsz`, `wght`, `SOFT`, `WONK`). **Inter**, **Noto Sans Arabic**, **JetBrains Mono** are loaded from Google Fonts — if you have brand-locked TTF/OTF for these, drop them in `fonts/` and swap the `@import` in `colors_and_type.css`.
- **Hero photography** in the codebase points to public Unsplash URLs. The cinematic spec calls for **curated ingredient cutouts** (avocado halves, tomatoes, leaves with shadows on solid backgrounds). These are **not** in the project — the UI kit uses placeholders that the team should replace with real shoots.
- The **3D supplement bottle / bowl** for the Section-2 ingredient explosion has no source asset — the kit uses a CSS placeholder where the React-Three-Fiber model should mount.
