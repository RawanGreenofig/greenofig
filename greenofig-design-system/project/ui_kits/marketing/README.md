# Marketing Website UI Kit

A pixel-faithful recreation of the GreenoFig marketing site — the cinematic, scroll-driven landing experience.

## What's in here
- `index.html` — the assembled landing page (Nav → Hero → Features → Ingredient Showcase → Stats → Nutritionist → Footer)
- `Nav.jsx` — top nav with glass-effect on scroll
- `Hero.jsx` — deep-green, two-word Fraunces split headline ("Eat / Better.") with floating ingredient cutouts
- `Features.jsx` — 4-up feature grid (Bot / Utensils / Dumbbell / TrendingUp)
- `IngredientShowcase.jsx` — Section 2 cinematic centerpiece (cosmetic; the spec calls for GSAP+R3F at runtime — here we render the final-state composition with hover affordances)
- `Stats.jsx` — 4 big numbers with hue-shifting bg
- `NutritionistStory.jsx` — portrait left + clip-path-revealed copy right
- `Footer.jsx` — giant GREENOFIG wordmark + columns

## Notes on fidelity
- Real cinematic motion (GSAP ScrollTrigger, Lenis, R3F, scrub:1) is **not wired** — UI kits cut corners on functionality. The visuals, layout, type, color, and component coverage are pixel-faithful to the codebase + reference imagery.
- Imagery uses Unsplash food photography URLs (the codebase does the same). The cinematic spec calls for curated ingredient cutouts on transparent backgrounds; we use round-cropped photos as a stand-in.
- The 3D supplement bottle in Section 2 is mocked as a CSS-styled glass jar.
