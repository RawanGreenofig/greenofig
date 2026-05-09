'use client'


import { motion } from 'framer-motion'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Lightbulb,
  Check,
  Clock,
  Users,
  Flame,
  ChefHat,
  Sparkles,
  Calendar,
  ArrowRight,
  ShoppingBag,
  BadgeCheck,
  type LucideIcon,
} from '@/icons'
import { Link } from '@/i18n/navigation'
import UpgradeButton from '@/components/UpgradeButton'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import { tierAtLeast } from '@/lib/tier'
import { NUTRITIONIST } from '@/lib/tokens'

type MealKey =
  | 'breakfast'
  | 'morningSnack'
  | 'lunch'
  | 'afternoonSnack'
  | 'dinner'

interface PlanMeal {
  key: MealKey
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  prepMin: number
  cookMin: number
  servings: number
  ingredients: string[]
  steps: string[]
  drNote?: string
}

interface PlanDay {
  dayIdx: number
  isToday: boolean
  meals: PlanMeal[]
}

interface ActivePlan {
  title: string
  weekIdx: number
  totalWeeks: number
  startDate: string
  days: PlanDay[]
}

const MEAL_ICON: Record<MealKey, LucideIcon> = {
  breakfast: Lightbulb,
  morningSnack: Sparkles,
  lunch: Flame,
  afternoonSnack: ChefHat,
  dinner: ChefHat,
}

/** Demo plan — replaced with `meal_plans` + `meal_plan_items` query in Cluster H */
const DEMO_PLAN: ActivePlan = {
  title: 'Mediterranean reset · Week 2',
  weekIdx: 2,
  totalWeeks: 6,
  startDate: '2026-04-20',
  days: Array.from({ length: 7 }).map((_, i) => ({
    dayIdx: i,
    isToday: i === new Date().getDay() - 1 + (new Date().getDay() === 0 ? 7 : 0) - 1,
    meals: buildDayMeals(i),
  })),
}

function buildDayMeals(dayIdx: number): PlanMeal[] {
  const sets: PlanMeal[][] = [
    [
      {
        key: 'breakfast',
        name: 'Greek yogurt with berries & walnuts',
        calories: 320,
        protein: 22,
        carbs: 28,
        fat: 14,
        prepMin: 5,
        cookMin: 0,
        servings: 1,
        ingredients: [
          '170 g Greek yogurt (full-fat)',
          '½ cup mixed berries',
          '15 g walnuts, chopped',
          '1 tsp raw honey',
          'Pinch of cinnamon',
        ],
        steps: [
          'Spoon yogurt into a bowl.',
          'Top with berries and walnuts.',
          'Drizzle honey, dust with cinnamon.',
        ],
        drNote: 'Walnuts give you the omega-3s your body actually absorbs.',
      },
      {
        key: 'morningSnack',
        name: 'Apple with almond butter',
        calories: 200,
        protein: 5,
        carbs: 25,
        fat: 11,
        prepMin: 2,
        cookMin: 0,
        servings: 1,
        ingredients: ['1 medium apple', '1 tbsp natural almond butter'],
        steps: ['Slice apple, dip in almond butter.'],
      },
      {
        key: 'lunch',
        name: 'Lemon chicken with quinoa & greens',
        calories: 520,
        protein: 42,
        carbs: 48,
        fat: 16,
        prepMin: 10,
        cookMin: 20,
        servings: 1,
        ingredients: [
          '120 g chicken breast',
          '½ cup cooked quinoa',
          '2 cups arugula',
          '1 tbsp olive oil',
          '½ lemon, juiced',
          'Salt, pepper, oregano',
        ],
        steps: [
          'Season chicken; pan-sear 6 min per side.',
          'Plate quinoa, top with arugula.',
          'Slice chicken over greens; finish with lemon and olive oil.',
        ],
      },
      {
        key: 'afternoonSnack',
        name: 'Hummus & cucumber',
        calories: 160,
        protein: 6,
        carbs: 18,
        fat: 8,
        prepMin: 3,
        cookMin: 0,
        servings: 1,
        ingredients: ['¼ cup hummus', '1 cucumber, sliced'],
        steps: ['Slice cucumber, scoop hummus.'],
      },
      {
        key: 'dinner',
        name: 'Baked salmon with sweet potato',
        calories: 580,
        protein: 38,
        carbs: 42,
        fat: 24,
        prepMin: 8,
        cookMin: 22,
        servings: 1,
        ingredients: [
          '140 g salmon fillet',
          '1 medium sweet potato',
          '2 cups steamed broccoli',
          '1 tbsp olive oil',
          'Garlic, dill, salt',
        ],
        steps: [
          'Preheat oven to 200°C.',
          'Roast sweet potato 25 min.',
          'Bake salmon 12 min with garlic and dill.',
          'Steam broccoli; plate together.',
        ],
        drNote: 'Eat the sweet potato skin — that is where the fiber lives.',
      },
    ],
  ]
  return sets[0]!.map((m) => ({ ...m, name: dayIdx === 0 ? m.name : m.name }))
}

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function MealPlanPage() {
  const t = useTranslations('mealPlan')
  const { tier } = useUser()
  const allowed = tierAtLeast(tier, 'premium')

  if (!allowed) {
    return <UpgradeGate t={t} />
  }

  return <PlanView t={t} />
}

/* ── Views ──────────────────────────────────────────────────────── */

function UpgradeGate({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-4 md:px-8 py-12 max-w-screen-md mx-auto">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent p-8 md:p-12 text-center">
        <Sparkles
          className="w-8 h-8 text-yellow-500 mx-auto mb-5"
          strokeWidth={1.75}
        />
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 36px)', lineHeight: 1.15 }}
        >
          <span className="gradient-text">{t('gateTitle')}</span>
        </h1>
        <p className="mt-3 text-sm md:text-base text-fg-2 max-w-md mx-auto leading-relaxed">
          {t('gateBody')}
        </p>
        <div className="mt-6">
          <UpgradeButton tier="premium" label={t('gateCta')} />
        </div>
      </div>
    </motion.div>
  )
}

function PlanView({ t }: { t: ReturnType<typeof useTranslations> }) {
  const tCommon = useTranslations('common')
  const { profile } = useUser()
  const userId = profile?.id ?? null

  // Pull the active plan + its items + recipes for this client.
  const live = useSupabaseQuery<ActivePlan | null>(async (supabase) => {
    if (!userId) return null
    const { data: planRow } = await supabase
      .from('meal_plans')
      .select('id, title, weeks, start_date, is_active')
      .eq('client_id', userId)
      .eq('is_active', true)
      .order('start_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    type PlanRow = { id: string; title: string; weeks: number; start_date: string; is_active: boolean }
    const planMeta = planRow as PlanRow | null
    if (!planMeta) return null

    const { data: itemRows } = await supabase
      .from('meal_plan_items')
      .select('day_idx, week_idx, meal_type, recipe_id, custom_name, notes')
      .eq('plan_id', planMeta.id)
      .order('week_idx', { ascending: true })
      .order('day_idx', { ascending: true })

    type ItemRow = {
      day_idx: number
      week_idx: number
      meal_type: string
      recipe_id: string | null
      custom_name: string | null
      notes: string | null
    }
    const items = (itemRows as ItemRow[] | null) ?? []
    const recipeIds = Array.from(
      new Set(items.map((i) => i.recipe_id).filter((x): x is string => !!x)),
    )

    // DB column names differ from the UI's camelCase: title↔name,
    // instructions↔steps, prep_time_minutes↔prep_min, cook_time_minutes
    // ↔cook_min, description↔dr_note. Map at the boundary.
    type RecipeRow = {
      id: string
      title: string
      ingredients: unknown
      instructions: unknown
      prep_time_minutes: number
      cook_time_minutes: number
      servings: number
      description: string | null
    }
    const { data: recipeRows } = recipeIds.length
      ? await supabase
          .from('recipes')
          .select('id, title, ingredients, instructions, prep_time_minutes, cook_time_minutes, servings, description')
          .in('id', recipeIds)
      : { data: [] }
    const recipes = (recipeRows as RecipeRow[] | null) ?? []
    const recipeOf = new Map(recipes.map((r) => [r.id, r]))

    // Group items by day inside the first week (UI shows one week at a
    // time; multi-week navigation lives in the nutritionist builder).
    const todayDow = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1
    const days: PlanDay[] = Array.from({ length: 7 }).map((_, dayIdx) => {
      const dayItems = items.filter((it) => it.day_idx === dayIdx && it.week_idx === 0)
      const meals: PlanMeal[] = dayItems.flatMap((it) => {
        const r = it.recipe_id ? recipeOf.get(it.recipe_id) : null
        const name = it.custom_name ?? r?.title ?? 'Untitled meal'
        const ings = (r?.ingredients as unknown[] | null) ?? []
        const steps = (r?.instructions as unknown[] | null) ?? []
        const ingArr: string[] = ings
          .map((x) => (typeof x === 'string' ? x : (x as { name?: string })?.name ?? ''))
          .filter(Boolean)
        const stepArr: string[] = steps
          .map((x) => (typeof x === 'string' ? x : (x as { body?: string })?.body ?? ''))
          .filter(Boolean)

        const mealKey =
          it.meal_type === 'breakfast'      ? 'breakfast' :
          it.meal_type === 'morningSnack'   ? 'morningSnack' :
          it.meal_type === 'afternoonSnack' ? 'afternoonSnack' :
          it.meal_type === 'dinner'         ? 'dinner' :
                                              'lunch'

        return [{
          key: mealKey as PlanMeal['key'],
          name,
          calories: 0, protein: 0, carbs: 0, fat: 0,
          prepMin: r?.prep_time_minutes ?? 0,
          cookMin: r?.cook_time_minutes ?? 0,
          servings: r?.servings ?? 1,
          ingredients: ingArr,
          steps: stepArr,
          drNote: it.notes ?? r?.description ?? undefined,
        }]
      })
      return { dayIdx, isToday: dayIdx === todayDow, meals }
    })

    return {
      title: planMeta.title,
      weekIdx: 1,
      totalWeeks: planMeta.weeks,
      startDate: planMeta.start_date,
      days,
    }
  }, [userId])

  // Use live plan if it has any meals; otherwise fall back to demo so
  // dev / unconfigured envs still show the rich preview.
  const plan: ActivePlan | null = (() => {
    if (live.data && live.data.days.some((d) => d.meals.length > 0)) {
      return live.data
    }
    if (live.data === null && userId) {
      // Configured + signed in but no plan exists — show NoPlan card.
      return null
    }
    return DEMO_PLAN
  })()

  const [selectedDay, setSelectedDay] = useState(() =>
    plan ? Math.max(0, plan.days.findIndex((d) => d.isToday)) : 0,
  )
  const [completed, setCompleted] = useState<Record<string, boolean>>({})

  if (!plan) return <NoPlan t={t} />

  const day = plan.days[selectedDay]!
  const dayKcal = day.meals.reduce((acc, m) => acc + m.calories, 0)
  const dayProtein = day.meals.reduce((acc, m) => acc + m.protein, 0)
  const totalMeals = plan.days.reduce((acc, d) => acc + d.meals.length, 0)
  const doneMeals = Object.values(completed).filter(Boolean).length

  const toggleDone = (id: string) =>
    setCompleted((prev) => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-eyebrow text-lime-400 font-semibold">
            {t('weekLabel', { n: plan.weekIdx })} / {plan.totalWeeks}
          </p>
          <h1
            className="mt-1.5 font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            <span className="gradient-text">{plan.title}</span>
          </h1>
        </div>
        <Link
          href="/dashboard/track"
          className="inline-flex items-center gap-2 rounded-pill bg-surface-raised border border-border h-10 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
        >
          <ShoppingBag className="w-3.5 h-3.5" strokeWidth={1.75} />
          {t('shoppingList')}
        </Link>
      </header>

      {/* Adherence + day pager */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <article className="glass-effect rounded-xl p-4 md:p-5 md:col-span-1">
          <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-2">
            {t('weekProgress')}
          </p>
          <p className="font-mono text-2xl font-bold text-fg-1" dir="ltr">
            {doneMeals}
            <span className="ms-1 text-sm font-normal text-fg-3">
              / {totalMeals}
            </span>
          </p>
          <p className="mt-1 text-xs text-fg-2">
            {t('mealsCompleted', { done: doneMeals, total: totalMeals })}
          </p>
          <div className="mt-3 h-1.5 rounded-pill bg-bg-deeper overflow-hidden">
            <div
              className="h-full rounded-pill bg-gradient-to-r from-lime-400 to-lime-600 transition-all duration-300"
              style={{
                width: `${totalMeals > 0 ? (doneMeals / totalMeals) * 100 : 0}%`,
              }}
            />
          </div>
        </article>

        <article className="glass-effect rounded-xl p-4 md:p-5 md:col-span-2">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
              {t('thisWeek')}
            </p>
            <p className="font-mono text-xs text-fg-3" dir="ltr">
              {dayKcal} {t('kcal')} · P{Math.round(dayProtein)}g
            </p>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {plan.days.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDay(i)}
                className={`shrink-0 px-2 py-2 flex flex-col items-center justify-center text-xs font-medium transition-colors ${
                  selectedDay === i
                    ? 'text-primary'
                    : d.isToday
                      ? 'text-fg-1'
                      : 'text-fg-3 hover:text-fg-1'
                }`}
              >
                <span className="text-[10px] uppercase tracking-eyebrow text-fg-3">
                  {weekdayLetter(i)}
                </span>
                <span className="font-mono text-sm" dir="ltr">
                  {i + 1}
                </span>
              </button>
            ))}
          </div>
        </article>
      </section>

      {/* Meals */}
      <section className="space-y-4">
        {day.meals.map((meal, idx) => {
          const id = `${selectedDay}-${idx}`
          const Icon = MEAL_ICON[meal.key]
          return (
            <MealCard
              key={id}
              t={t}
              tCommon={tCommon}
              meal={meal}
              Icon={Icon}
              done={!!completed[id]}
              onToggle={() => toggleDone(id)}
            />
          )
        })}
      </section>

      {/* From Dr. Rawan */}
      <DrFootnote drName={NUTRITIONIST.name} t={t} />
    </div>
  )
}

function NoPlan({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="px-4 md:px-8 py-12 max-w-screen-md mx-auto">
      <div className="glass-effect rounded-2xl p-8 md:p-12 text-center">
        <Calendar
          className="w-8 h-8 text-primary mx-auto mb-5"
          strokeWidth={1.75}
        />
        <h1 className="font-display font-bold text-fg-1 tracking-tight text-2xl md:text-3xl">
          {t('noPlanTitle')}
        </h1>
        <p className="mt-3 text-sm md:text-base text-fg-2 max-w-md mx-auto leading-relaxed">
          {t('noPlanBody')}
        </p>
        <Link
          href="/dashboard/bookings"
          className="mt-6 inline-flex items-center gap-2 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-11 px-6 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
        >
          {t('noPlanCta')}
          <ArrowRight className="w-4 h-4 rtl:rotate-180" strokeWidth={2.25} />
        </Link>
      </div>
    </div>
  )
}

/* ── Components ──────────────────────────────────────────────────── */

function MealCard({
  t,
  tCommon,
  meal,
  Icon,
  done,
  onToggle,
}: {
  t: ReturnType<typeof useTranslations>
  tCommon: ReturnType<typeof useTranslations>
  meal: PlanMeal
  Icon: LucideIcon
  done: boolean
  onToggle: () => void
}) {
  void tCommon
  const total = meal.prepMin + meal.cookMin
  return (
    <article
      className={`rounded-xl border bg-surface overflow-hidden transition-colors ${
        done ? 'border-primary/40 bg-primary/5' : 'border-border'
      }`}
    >
      <header className="flex items-start justify-between gap-4 p-5">
        <div className="flex items-start gap-3 min-w-0">
          <Icon className="w-6 h-6 text-lime-400" strokeWidth={1.75} />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
              {t(`meals.${meal.key}` as 'meals.breakfast')}
            </p>
            <h3 className="mt-0.5 text-base md:text-lg font-semibold text-fg-1 leading-tight">
              {meal.name}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-2 font-mono" dir="ltr">
              <span className="inline-flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-fg-3" strokeWidth={1.75} />
                {meal.calories} {t('kcal')}
              </span>
              <span>P{meal.protein}g · C{meal.carbs}g · F{meal.fat}g</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-fg-3" strokeWidth={1.75} />
                {t('minutes', { count: total })}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-fg-3" strokeWidth={1.75} />
                {meal.servings}
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-pill h-9 px-4 text-xs font-semibold transition-colors ${
            done
              ? 'bg-primary/20 text-lime-400'
              : 'bg-surface-raised border border-border text-fg-2 hover:border-primary/40 hover:text-fg-1'
          }`}
        >
          <Check className="w-3.5 h-3.5" strokeWidth={2.25} />
          {done ? t('completed') : t('markComplete')}
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 border-t border-border">
        <div className="p-5 md:border-e md:border-border">
          <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
            {t('ingredients')}
          </p>
          <ul className="space-y-1.5 text-sm text-fg-1">
            {meal.ingredients.map((ing) => (
              <li key={ing} className="flex items-start gap-2">
                <span
                  className="mt-2 w-1 h-1 rounded-full bg-fg-3 shrink-0"
                  aria-hidden
                />
                <span>{ing}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="p-5 border-t md:border-t-0 border-border">
          <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
            {t('instructions')}
          </p>
          <ol className="space-y-2 text-sm text-fg-1">
            {meal.steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="shrink-0 text-primary text-sm font-bold inline-flex items-center"
                  dir="ltr"
                >
                  {i + 1}.
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {meal.drNote && (
        <div className="border-t border-border bg-bg-deeper/40 px-5 py-3 flex items-start gap-3">
          <Lightbulb
            className="shrink-0 w-4 h-4 text-lime-400 mt-0.5"
            strokeWidth={1.75}
          />
          <p className="text-sm text-fg-2 leading-relaxed">
            <span className="font-semibold text-fg-1">{t('noteFromDr')}: </span>
            {meal.drNote}
          </p>
        </div>
      )}
    </article>
  )
}

function DrFootnote({
  drName,
  t,
}: {
  drName: string
  t: ReturnType<typeof useTranslations>
}) {
  void t
  return (
    <article className="glass-effect rounded-xl p-5 flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/dr-rawan-othman.jpg"
        alt={drName}
        width={44}
        height={44}
        className="rounded-full object-cover object-top shrink-0"
        style={{ width: 44, height: 44 }}
      />
      <div className="min-w-0">
        <p className="inline-flex items-center text-sm font-semibold text-fg-1" style={{ gap: 10 }}>
          {drName}
          <BadgeCheck
            className="w-4 h-4 shrink-0"
            strokeWidth={1.75}
            style={{ color: '#60a5fa' }}
          />
        </p>
      </div>
    </article>
  )
}

function weekdayLetter(i: number) {
  return ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]
}
