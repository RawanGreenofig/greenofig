'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useUser } from '@/lib/hooks/useUser'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { UploadButton } from '@/components/UploadButton'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  Search,
  ChefHat,
  GripVertical,
  Trash2,
  ArrowLeft,
  Save,
  Send,
  Copy,
  Camera,
  Sparkles,
  Coffee,
  Utensils,
  Apple,
  Flame,
  Droplets,
  Pill,
  Heart,
  Star,
  Sun,
  BookOpen,
} from '@/icons'
import type { LucideIcon } from 'lucide-react'

/**
 * Per-recipe icon picker — the nutritionist chooses an icon that
 * actually fits the dish. Default falls back to a category icon
 * when nothing has been picked. The icon's brand colour comes from
 * the catalog so the rendered card stays visually consistent with
 * the rest of the dashboard.
 */
type RecipeIconKey =
  | 'coffee'
  | 'utensils'
  | 'chefHat'
  | 'apple'
  | 'flame'
  | 'droplets'
  | 'pill'
  | 'heart'
  | 'star'
  | 'sun'
  | 'bookOpen'
  | 'sparkles'

const RECIPE_ICON_CATALOG: Record<
  RecipeIconKey,
  { Icon: LucideIcon; tint: string; label: string }
> = {
  coffee:    { Icon: Coffee,    tint: '#fb923c', label: 'Coffee'  },
  utensils:  { Icon: Utensils,  tint: '#a3e635', label: 'Plate'   },
  chefHat:   { Icon: ChefHat,   tint: '#a78bfa', label: 'Chef'    },
  apple:     { Icon: Apple,     tint: '#fb923c', label: 'Fruit'   },
  flame:     { Icon: Flame,     tint: '#a3e635', label: 'Greens'  },
  droplets:  { Icon: Droplets,  tint: '#60a5fa', label: 'Drink'   },
  pill:      { Icon: Pill,      tint: '#a78bfa', label: 'Supp'    },
  heart:     { Icon: Heart,     tint: '#f87171', label: 'Heart'   },
  star:      { Icon: Star,      tint: '#fbbf24', label: 'Star'    },
  sun:       { Icon: Sun,       tint: '#fbbf24', label: 'Sun'     },
  bookOpen:  { Icon: BookOpen,  tint: '#60a5fa', label: 'Book'    },
  sparkles:  { Icon: Sparkles,  tint: '#fbbf24', label: 'Spark'   },
}

const DEFAULT_RECIPE_ICON: Record<Category, RecipeIconKey> = {
  breakfast: 'coffee',
  lunch:     'utensils',
  dinner:    'chefHat',
  snack:     'apple',
  drink:     'droplets',
}

type Status = 'draft' | 'published'
type Category = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'
type DietaryTag =
  | 'vegan'
  | 'vegetarian'
  | 'glutenFree'
  | 'dairyFree'
  | 'keto'
  | 'halal'
  | 'highProtein'
  | 'quick'

interface Ingredient {
  id: string
  name: string
  grams: number
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface Step {
  id: string
  body: string
}

interface Recipe {
  id: string
  name: string
  category: Category
  servings: number
  prepMin: number
  cookMin: number
  tags: DietaryTag[]
  ingredients: Ingredient[]
  steps: Step[]
  drNote: string
  status: Status
  hue: string
  imageUrl?: string
  /** Optional per-recipe icon override. When unset, falls back to
   * DEFAULT_RECIPE_ICON[category]. */
  icon?: RecipeIconKey
}

const CATEGORIES: Category[] = ['breakfast', 'lunch', 'dinner', 'snack', 'drink']
const DIETARY_TAGS: DietaryTag[] = ['vegan','vegetarian','glutenFree','dairyFree','keto','halal','highProtein','quick']

const SEED: Recipe[] = [
  {
    id: 'r1',
    name: 'Lemon chicken quinoa bowl',
    category: 'lunch',
    servings: 1,
    prepMin: 10,
    cookMin: 20,
    tags: ['glutenFree', 'dairyFree', 'halal', 'highProtein'],
    ingredients: [
      { id: 'i1', name: 'Chicken breast',    grams: 120, calories: 198, protein: 37, carbs: 0,  fat: 4 },
      { id: 'i2', name: 'Quinoa, cooked',    grams: 100, calories: 120, protein: 4,  carbs: 21, fat: 2 },
      { id: 'i3', name: 'Arugula',           grams: 60,  calories: 16,  protein: 2,  carbs: 2,  fat: 0 },
      { id: 'i4', name: 'Olive oil',         grams: 14,  calories: 119, protein: 0,  carbs: 0,  fat: 14 },
      { id: 'i5', name: 'Lemon juice',       grams: 30,  calories: 7,   protein: 0,  carbs: 2,  fat: 0 },
    ],
    steps: [
      { id: 's1', body: 'Season chicken with salt, pepper, and oregano.' },
      { id: 's2', body: 'Pan-sear 6 min per side until 74°C internal.' },
      { id: 's3', body: 'Plate quinoa, top with arugula, slice chicken on top.' },
      { id: 's4', body: 'Finish with lemon juice and olive oil.' },
    ],
    drNote: 'Walnuts in the side salad would add omega-3 if you want it.',
    status: 'published',
    hue: 'rgb(101 163 13 / 0.18)',
  },
  {
    id: 'r2',
    name: 'Greek yogurt berry bowl',
    category: 'breakfast',
    servings: 1,
    prepMin: 5,
    cookMin: 0,
    tags: ['vegetarian', 'glutenFree', 'highProtein', 'quick'],
    ingredients: [
      { id: 'i1', name: 'Greek yogurt (full-fat)', grams: 170, calories: 130, protein: 17, carbs: 6, fat: 4 },
      { id: 'i2', name: 'Mixed berries',           grams: 80,  calories: 45,  protein: 1,  carbs: 11, fat: 0 },
      { id: 'i3', name: 'Walnuts, chopped',        grams: 15,  calories: 98,  protein: 2,  carbs: 2, fat: 10 },
      { id: 'i4', name: 'Raw honey',               grams: 7,   calories: 21,  protein: 0,  carbs: 6, fat: 0 },
    ],
    steps: [
      { id: 's1', body: 'Spoon yogurt into a bowl.' },
      { id: 's2', body: 'Top with berries and walnuts.' },
      { id: 's3', body: 'Drizzle honey.' },
    ],
    drNote: '',
    status: 'published',
    hue: 'rgb(163 230 53 / 0.18)',
  },
  {
    id: 'r3',
    name: 'Stuffed bell peppers',
    category: 'dinner',
    servings: 2,
    prepMin: 15,
    cookMin: 30,
    tags: ['glutenFree', 'halal', 'highProtein'],
    ingredients: [
      { id: 'i1', name: 'Bell peppers',     grams: 300, calories: 60,  protein: 2,  carbs: 14, fat: 0 },
      { id: 'i2', name: 'Lean beef mince',  grams: 250, calories: 425, protein: 50, carbs: 0,  fat: 24 },
      { id: 'i3', name: 'Brown rice',       grams: 100, calories: 110, protein: 3,  carbs: 23, fat: 1 },
    ],
    steps: [
      { id: 's1', body: 'Preheat oven to 200°C.' },
      { id: 's2', body: 'Halve peppers, scoop seeds.' },
    ],
    drNote: '',
    status: 'draft',
    hue: 'rgb(168 85 247 / 0.16)',
  },
]

export default function RecipeBuilderPage() {
  const t = useTranslations('nutritionist.recipeBuilderPage')
  const tNut = useTranslations('nutritionist')
  const dupSuffix = t('duplicateSuffix')
  const { profile } = useUser()
  const [recipes, setRecipes] = useState<Recipe[]>(SEED)
  const [editing, setEditing] = useState<Recipe | null>(null)
  const [filter, setFilter] = useState<'all' | Status>('all')
  const [query, setQuery] = useState('')

  // Hydrate the recipe library for this nutritionist (and admin team).
  useEffect(() => {
    if (!profile?.id) return
    const supabase = getBrowserSupabase()
    if (!supabase) return
    let cancelled = false
    void (async () => {
      // DB columns differ from UI names: title↔name, prep_time_minutes
      // ↔prep_min, cook_time_minutes↔cook_min, instructions↔steps,
      // is_published↔status, dietary_tags↔tags, created_by↔author_id.
      // category, dr_note, hue have no DB column — keep as UI-local.
      type Row = {
        id: string
        title: string
        servings: number
        prep_time_minutes: number
        cook_time_minutes: number
        dietary_tags: string[] | null
        ingredients: unknown
        instructions: unknown
        is_published: boolean
        image_url: string | null
        description: string | null
        category: string | null
        hue: string | null
      }
      const { data } = await supabase
        .from('recipes')
        .select(
          'id, title, servings, prep_time_minutes, cook_time_minutes, dietary_tags, ingredients, instructions, is_published, image_url, description, category, hue',
        )
        .or(`created_by.eq.${profile.id},is_published.eq.true`)
        .order('created_at', { ascending: false })
        .limit(60)
      if (cancelled) return
      const rows = (data as Row[] | null) ?? []
      if (rows.length === 0) return
      const next: Recipe[] = rows.map((r) => ({
        id: r.id,
        name: r.title,
        category: (
          ['breakfast','lunch','dinner','snack','drink'].includes(r.category ?? '')
            ? (r.category as Category)
            : 'lunch'
        ),
        servings: r.servings,
        prepMin: r.prep_time_minutes,
        cookMin: r.cook_time_minutes,
        tags: ((r.dietary_tags ?? []).filter((t): t is DietaryTag =>
          ['vegan','vegetarian','glutenFree','dairyFree','keto','halal','highProtein','quick'].includes(t)
        )),
        ingredients: Array.isArray(r.ingredients)
          ? (r.ingredients as Ingredient[])
          : [],
        steps: Array.isArray(r.instructions) ? (r.instructions as Step[]) : [],
        drNote: r.description ?? '',
        status: r.is_published ? 'published' : 'draft',
        hue: r.hue ?? 'rgb(132 204 22 / 0.18)',
        imageUrl: r.image_url ?? undefined,
      }))
      setRecipes(next)
    })()
    return () => { cancelled = true }
  }, [profile?.id])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return recipes.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false
      if (q && !r.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [recipes, filter, query])

  const startNew = () => {
    setEditing({
      id: `new-${Date.now()}`,
      name: '',
      category: 'lunch',
      servings: 1,
      prepMin: 10,
      cookMin: 0,
      tags: [],
      ingredients: [],
      steps: [],
      drNote: '',
      status: 'draft',
      hue: 'rgb(132 204 22 / 0.18)',
    })
  }

  const saveRecipe = (recipe: Recipe, status: Status) => {
    const final = { ...recipe, status }
    setRecipes((curr) => {
      const idx = curr.findIndex((r) => r.id === final.id)
      if (idx >= 0) {
        const next = [...curr]
        next[idx] = final
        return next
      }
      return [final, ...curr]
    })
    setEditing(null)

    // Persist
    const supabase = getBrowserSupabase()
    if (!supabase || !profile?.id) return
    const isExisting = /^[0-9a-f-]{32,}$/i.test(final.id)
    // Compute per-serving macros from the ingredient list so the
    // customer-side recipe library shows real numbers. Sum across
    // ingredients, divide by servings (guard /0).
    const totals = final.ingredients.reduce(
      (acc, ing) => ({
        cal: acc.cal + (ing.calories ?? 0),
        prot: acc.prot + (ing.protein ?? 0),
        carbs: acc.carbs + (ing.carbs ?? 0),
        fat: acc.fat + (ing.fat ?? 0),
      }),
      { cal: 0, prot: 0, carbs: 0, fat: 0 },
    )
    const servingsDiv = Math.max(1, final.servings)
    // Translate UI fields → DB columns. status maps to is_published,
    // drNote into description.
    const row = {
      created_by: profile.id,
      title: final.name,
      category: final.category,
      hue: final.hue,
      servings: final.servings,
      prep_time_minutes: final.prepMin,
      cook_time_minutes: final.cookMin,
      dietary_tags: final.tags,
      ingredients: final.ingredients,
      instructions: final.steps,
      description: final.drNote || null,
      is_published: status === 'published',
      image_url: final.imageUrl ?? null,
      calories_per_serving: Math.round(totals.cal / servingsDiv),
      protein_g: +(totals.prot / servingsDiv).toFixed(1),
      carbs_g: +(totals.carbs / servingsDiv).toFixed(1),
      fat_g: +(totals.fat / servingsDiv).toFixed(1),
    }
    if (isExisting) {
      void supabase.from('recipes').update(row as never).eq('id', final.id)
    } else {
      void (async () => {
        const { data } = await supabase
          .from('recipes')
          .insert(row as never)
          .select('id')
          .maybeSingle()
        const realId = (data as { id?: string } | null)?.id
        if (realId) {
          setRecipes((curr) =>
            curr.map((r) => (r.id === final.id ? { ...r, id: realId } : r)),
          )
        }
      })()
    }
  }

  const removeRecipe = (id: string) => {
    setRecipes((curr) => curr.filter((r) => r.id !== id))
    const supabase = getBrowserSupabase()
    if (supabase && /^[0-9a-f-]{32,}$/i.test(id)) {
      void supabase.from('recipes').delete().eq('id', id)
    }
  }

  const duplicateRecipe = (r: Recipe) =>
    setRecipes((curr) => [
      {
        ...r,
        id: `r-${Date.now()}`,
        name: `${r.name} ${dupSuffix}`,
        status: 'draft',
        ingredients: r.ingredients.map((i) => ({ ...i, id: `i-${Math.random()}` })),
        steps: r.steps.map((s) => ({ ...s, id: `s-${Math.random()}` })),
      },
      ...curr,
    ])

  if (editing) {
    return (
      <RecipeForm
        t={t}
        initial={editing}
        onCancel={() => setEditing(null)}
        onSave={(r, status) => saveRecipe(r, status)}
      />
    )
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {tNut('recipeBuilder')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={startNew}
          className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2.25} />
          {t('newRecipe')}
        </button>
      </header>

      {/* Search + filter — dashboard chrome (40px tall, --gf-input-bg
       * surface, lime-tinted active state) matching the rest of the
       * dashboard. */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-0 basis-full sm:basis-auto sm:min-w-[200px]">
          <Search
            className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            strokeWidth={1.75}
            color="var(--gf-fg-3)"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('search')}
            className="w-full h-10 ps-10 pe-3 text-sm text-fg-1 placeholder-fg-3"
          />
        </div>
        <div
          className="inline-flex items-center flex-wrap"
          style={{
            minHeight: 40,
            background: 'var(--gf-input-bg)',
            border: '1px solid var(--gf-border)',
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}
        >
          {(['all', 'draft', 'published'] as ('all' | Status)[]).map((f) => {
            const active = filter === f
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="inline-flex items-center justify-center px-3 transition-colors"
                style={{
                  height: 32,
                  borderRadius: 6,
                  background: active ? 'rgba(132,217,61,0.12)' : 'transparent',
                  color: active ? '#a3e635' : 'var(--gf-fg-2)',
                  fontSize: 12,
                  fontWeight: 600,
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'var(--gf-card-hover)'
                    e.currentTarget.style.color = 'var(--gf-fg-1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--gf-fg-2)'
                  }
                }}
              >
                {f === 'all'
                  ? t('filterAll')
                  : f === 'draft'
                    ? t('filterDraft')
                    : t('filterPublished')}
              </button>
            )
          })}
        </div>
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <ChefHat className="w-9 h-9 mx-auto mb-3 text-fg-3" strokeWidth={1.5} />
          <p className="text-base font-semibold text-fg-1">{t('noRecipes')}</p>
          <p className="mt-1 text-sm text-fg-2 max-w-sm mx-auto">
            {t('noRecipesBody')}
          </p>
        </div>
      ) : (
        <ul className="rounded-xl border border-border bg-surface divide-y divide-border">
          {visible.map((r) => (
            <RecipeRow
              key={r.id}
              t={t}
              recipe={r}
              onEdit={() => setEditing(r)}
              onDelete={() => removeRecipe(r.id)}
              onDuplicate={() => duplicateRecipe(r)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

/* ── Row ────────────────────────────────────────────────────────── */

function RecipeRow({
  t,
  recipe,
  onEdit,
  onDelete,
  onDuplicate,
}: {
  t: ReturnType<typeof useTranslations>
  recipe: Recipe
  onEdit: () => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  const totals = useMemo(() => sumIngredients(recipe.ingredients), [recipe.ingredients])
  const perServing = recipe.servings > 0 ? totals.calories / recipe.servings : totals.calories
  // Picked icon wins; otherwise fall back to the category default.
  const iconKey = recipe.icon ?? DEFAULT_RECIPE_ICON[recipe.category]
  const { Icon: RecipeRowIcon, tint: iconTint } = RECIPE_ICON_CATALOG[iconKey]
  return (
    <li className="flex items-center gap-4 px-5 py-3">
      <RecipeRowIcon
        className="w-6 h-6 shrink-0"
        strokeWidth={1.75}
        color={iconTint}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <p className="text-sm font-semibold text-fg-1 truncate">
            {recipe.name || '— Untitled —'}
          </p>
          <span
            className="inline-flex items-center justify-center"
            style={{
              height: 18,
              padding: '0 8px',
              borderRadius: 999,
              background:
                recipe.status === 'published'
                  ? 'rgba(163,230,53,0.14)'
                  : 'rgba(155,175,159,0.14)',
              color: recipe.status === 'published' ? '#a3e635' : '#9baf9f',
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              lineHeight: 1,
            }}
          >
            {recipe.status === 'published' ? t('publishedBadge') : t('draftBadge')}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-fg-3 font-mono" dir="ltr">
          {recipe.category} · {recipe.servings} servings · {Math.round(perServing)} kcal
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-1">
        <button
          type="button"
          onClick={onDuplicate}
          aria-label={t('rowDuplicate')}
          className="w-9 h-9 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-fg-1 hover:bg-surface-raised"
        >
          <Copy className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={t('rowDelete')}
          className="w-9 h-9 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-rose-400 hover:bg-surface-raised"
        >
          <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
        </button>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
      >
        {t('rowEdit')}
      </button>
    </li>
  )
}

/* ── Form ───────────────────────────────────────────────────────── */

function RecipeForm({
  t,
  initial,
  onCancel,
  onSave,
}: {
  t: ReturnType<typeof useTranslations>
  initial: Recipe
  onCancel: () => void
  onSave: (r: Recipe, status: Status) => void
}) {
  const [r, setR] = useState<Recipe>(initial)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const totals = useMemo(() => sumIngredients(r.ingredients), [r.ingredients])
  const perServing = r.servings > 0
    ? {
        calories: totals.calories / r.servings,
        protein:  totals.protein  / r.servings,
        carbs:    totals.carbs    / r.servings,
        fat:      totals.fat      / r.servings,
      }
    : totals

  const update = <K extends keyof Recipe>(k: K, v: Recipe[K]) =>
    setR((curr) => ({ ...curr, [k]: v }))

  const toggleTag = (tag: DietaryTag) =>
    setR((curr) => ({
      ...curr,
      tags: curr.tags.includes(tag)
        ? curr.tags.filter((x) => x !== tag)
        : [...curr.tags, tag],
    }))

  const addIngredient = () =>
    setR((curr) => ({
      ...curr,
      ingredients: [
        ...curr.ingredients,
        {
          id: `i-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: '',
          grams: 0,
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        },
      ],
    }))

  const updateIngredient = (id: string, patch: Partial<Ingredient>) =>
    setR((curr) => ({
      ...curr,
      ingredients: curr.ingredients.map((i) =>
        i.id === id ? { ...i, ...patch } : i,
      ),
    }))

  const removeIngredient = (id: string) =>
    setR((curr) => ({
      ...curr,
      ingredients: curr.ingredients.filter((i) => i.id !== id),
    }))

  const addStep = () =>
    setR((curr) => ({
      ...curr,
      steps: [
        ...curr.steps,
        {
          id: `s-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          body: '',
        },
      ],
    }))

  const updateStep = (id: string, body: string) =>
    setR((curr) => ({
      ...curr,
      steps: curr.steps.map((s) => (s.id === id ? { ...s, body } : s)),
    }))

  const removeStep = (id: string) =>
    setR((curr) => ({
      ...curr,
      steps: curr.steps.filter((s) => s.id !== id),
    }))

  const onIngredientReorder = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const ids = r.ingredients.map((i) => i.id)
    const oldIdx = ids.indexOf(String(e.active.id))
    const newIdx = ids.indexOf(String(e.over.id))
    setR((curr) => ({
      ...curr,
      ingredients: arrayMove(curr.ingredients, oldIdx, newIdx),
    }))
  }
  const onStepReorder = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return
    const ids = r.steps.map((s) => s.id)
    const oldIdx = ids.indexOf(String(e.active.id))
    const newIdx = ids.indexOf(String(e.over.id))
    setR((curr) => ({ ...curr, steps: arrayMove(curr.steps, oldIdx, newIdx) }))
  }

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      {/* Top bar */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm text-fg-3 hover:text-fg-1"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" strokeWidth={1.75} />
          {t('editRecipe')}
        </button>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSave(r, 'draft')}
            className="inline-flex items-center gap-1.5 rounded-pill bg-surface-raised border border-border h-10 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40"
          >
            <Save className="w-3.5 h-3.5" strokeWidth={1.75} />
            {t('saveDraft')}
          </button>
          <button
            type="button"
            onClick={() => onSave(r, 'published')}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-4 text-xs shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
          >
            <Send className="w-3.5 h-3.5" strokeWidth={2} />
            {t('publish')}
          </button>
        </div>
      </header>

      {/* Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: basic info + image + dr note */}
        <div className="space-y-6">
          <Section title={t('form.sectionBasic')}>
            <div className="space-y-4">
              <FormField label={t('form.name')}>
                <input
                  type="text"
                  value={r.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder={t('form.namePh')}
                  className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-medium text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
                />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label={t('form.category')}>
                  <select
                    value={r.category}
                    onChange={(e) => update('category', e.target.value as Category)}
                    className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary appearance-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c} className="bg-surface">
                        {c}
                      </option>
                    ))}
                  </select>
                </FormField>
                <FormField label={t('form.servings')}>
                  <NumInput
                    value={r.servings}
                    min={1}
                    onChange={(n) => update('servings', n)}
                  />
                </FormField>
              </div>

              {/* Icon picker — choose what shows up next to the recipe
               * across the meal-plan builder, store, etc. Defaults to
               * the category icon when nothing is picked. */}
              <FormField label="Icon">
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(RECIPE_ICON_CATALOG) as RecipeIconKey[]).map(
                    (key) => {
                      const { Icon: PickIcon, tint, label } =
                        RECIPE_ICON_CATALOG[key]
                      const active =
                        (r.icon ?? DEFAULT_RECIPE_ICON[r.category]) === key
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => update('icon', key)}
                          aria-pressed={active}
                          aria-label={label}
                          title={label}
                          className="inline-flex items-center justify-center transition-colors"
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 8,
                            background: active
                              ? `${tint}1f`
                              : 'var(--gf-input-bg)',
                            border: `1px solid ${
                              active ? tint : 'var(--gf-border)'
                            }`,
                            color: tint,
                          }}
                          onMouseEnter={(e) => {
                            if (!active) {
                              e.currentTarget.style.background =
                                'var(--gf-card-hover)'
                              e.currentTarget.style.borderColor =
                                'var(--gf-border-hover)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!active) {
                              e.currentTarget.style.background =
                                'var(--gf-input-bg)'
                              e.currentTarget.style.borderColor =
                                'var(--gf-border)'
                            }
                          }}
                        >
                          <PickIcon
                            className="w-4 h-4"
                            strokeWidth={1.75}
                            color="currentColor"
                          />
                        </button>
                      )
                    },
                  )}
                </div>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label={t('form.prepTime')}>
                  <NumInput
                    value={r.prepMin}
                    min={0}
                    onChange={(n) => update('prepMin', n)}
                    suffix="min"
                  />
                </FormField>
                <FormField label={t('form.cookTime')}>
                  <NumInput
                    value={r.cookMin}
                    min={0}
                    onChange={(n) => update('cookMin', n)}
                    suffix="min"
                  />
                </FormField>
              </div>
              <FormField label={t('form.tags')}>
                <div className="flex flex-wrap gap-1.5">
                  {DIETARY_TAGS.map((tag) => {
                    const on = r.tags.includes(tag)
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`rounded-pill h-7 px-3 text-[11px] font-medium transition-colors ${
                          on
                            ? 'bg-primary/20 text-lime-400 border border-primary/40'
                            : 'bg-surface-raised border border-border text-fg-2 hover:border-primary/40'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </FormField>
            </div>
          </Section>

          <Section title={t('form.sectionImage')}>
            {r.imageUrl ? (
              <div className="rounded-lg overflow-hidden bg-bg-deeper/40 aspect-[4/3] relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={r.imageUrl}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <UploadButton
                    bucket="recipes"
                    pathPrefix="image"
                    accept="image/png,image/jpeg,image/webp"
                    onUploaded={(url) => update('imageUrl', url)}
                    className="inline-flex items-center gap-1.5 rounded-pill bg-bg/85 text-fg-1 border border-border h-9 px-4 text-xs font-semibold hover:border-primary/40"
                  >
                    Replace
                  </UploadButton>
                  <button
                    type="button"
                    onClick={() => update('imageUrl', undefined)}
                    className="inline-flex items-center gap-1.5 rounded-pill bg-rose-500/15 text-rose-400 h-9 px-4 text-xs font-semibold hover:bg-rose-500/25"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-dashed border-border bg-bg-deeper/40 aspect-[4/3] flex flex-col items-center justify-center gap-2 text-center px-4">
                <Camera className="w-8 h-8 text-fg-3" strokeWidth={1.25} />
                <UploadButton
                  bucket="recipes"
                  pathPrefix="image"
                  accept="image/png,image/jpeg,image/webp"
                  onUploaded={(url) => update('imageUrl', url)}
                  className="inline-flex items-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-9 px-4 text-xs font-semibold hover:bg-primary/25"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                  {t('form.uploadImage')}
                </UploadButton>
                <p className="text-[11px] text-fg-3">{t('form.imageHint')}</p>
              </div>
            )}
          </Section>

          <Section title={t('form.sectionDrNote')}>
            <textarea
              value={r.drNote}
              onChange={(e) => update('drNote', e.target.value)}
              placeholder={t('form.drNotePh')}
              rows={4}
              maxLength={600}
              className="w-full resize-none rounded-md bg-bg-deeper border border-border px-3 py-2.5 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary leading-relaxed"
            />
          </Section>
        </div>

        {/* Center: ingredients + steps */}
        <div className="lg:col-span-2 space-y-6">
          <Section
            title={t('form.sectionIngredients')}
            action={
              <button
                type="button"
                onClick={addIngredient}
                className="inline-flex items-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-9 px-4 text-xs font-semibold hover:bg-primary/25"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                {t('form.addIngredient')}
              </button>
            }
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onIngredientReorder}
            >
              <SortableContext
                items={r.ingredients.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {r.ingredients.length === 0 ? (
                  <p className="text-sm text-fg-3 text-center py-6 border border-dashed border-border rounded-lg">
                    {t('form.addIngredient')}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {r.ingredients.map((ing) => (
                      <SortableIngredient
                        key={ing.id}
                        t={t}
                        ing={ing}
                        onChange={(patch) => updateIngredient(ing.id, patch)}
                        onRemove={() => removeIngredient(ing.id)}
                      />
                    ))}
                  </ul>
                )}
              </SortableContext>
            </DndContext>
          </Section>

          <Section
            title={t('form.sectionSteps')}
            action={
              <button
                type="button"
                onClick={addStep}
                className="inline-flex items-center gap-1.5 rounded-pill bg-primary/15 text-lime-400 h-9 px-4 text-xs font-semibold hover:bg-primary/25"
              >
                <Plus className="w-3.5 h-3.5" strokeWidth={2} />
                {t('form.addStep')}
              </button>
            }
          >
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={onStepReorder}
            >
              <SortableContext
                items={r.steps.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                {r.steps.length === 0 ? (
                  <p className="text-sm text-fg-3 text-center py-6 border border-dashed border-border rounded-lg">
                    {t('form.addStep')}
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {r.steps.map((step, i) => (
                      <SortableStep
                        key={step.id}
                        t={t}
                        index={i}
                        step={step}
                        onChange={(body) => updateStep(step.id, body)}
                        onRemove={() => removeStep(step.id)}
                      />
                    ))}
                  </ol>
                )}
              </SortableContext>
            </DndContext>
          </Section>

          <Section title={t('form.sectionMacros')}>
            <p className="text-xs text-fg-3 mb-3 leading-relaxed">
              {t('form.macrosNote')}
            </p>
            <div className="grid grid-cols-4 gap-3">
              <MacroStat tint="#84cc16" label="kcal"    value={Math.round(perServing.calories)} />
              <MacroStat tint="#3b82f6" label="protein" value={`${perServing.protein.toFixed(1)} g`} />
              <MacroStat tint="#f97316" label="carbs"   value={`${perServing.carbs.toFixed(1)} g`} />
              <MacroStat tint="#a855f7" label="fat"     value={`${perServing.fat.toFixed(1)} g`} />
            </div>
            <p className="mt-3 text-[11px] text-fg-3 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-lime-400" strokeWidth={2} />
              {t('form.perServing')}
            </p>
          </Section>
        </div>
      </div>
    </div>
  )
}

/* ── Form helpers ───────────────────────────────────────────────── */

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <header className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
          {title}
        </h2>
        {action}
      </header>
      <div className="rounded-xl border border-border bg-surface p-5">
        {children}
      </div>
    </section>
  )
}

function FormField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}

function NumInput({
  value,
  min = 0,
  onChange,
  suffix,
}: {
  value: number
  min?: number
  onChange: (n: number) => void
  suffix?: string
}) {
  return (
    <div className="relative">
      <input
        type="number"
        min={min}
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) =>
          onChange(e.target.value === '' ? 0 : Number(e.target.value))
        }
        className={`w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary ${
          suffix ? 'pe-10' : ''
        }`}
        dir="ltr"
      />
      {suffix && (
        <span
          className="absolute end-3 top-1/2 -translate-y-1/2 text-xs text-fg-3 font-mono"
          aria-hidden
        >
          {suffix}
        </span>
      )}
    </div>
  )
}

function SortableIngredient({
  t,
  ing,
  onChange,
  onRemove,
}: {
  t: ReturnType<typeof useTranslations>
  ing: Ingredient
  onChange: (patch: Partial<Ingredient>) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ing.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-[24px_2fr_72px_72px_72px_72px_72px_36px] items-center gap-2 rounded-md bg-bg-deeper/50 border border-border p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag"
        className="text-fg-3 cursor-grab active:cursor-grabbing inline-flex items-center justify-center"
      >
        <GripVertical className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>
      <input
        type="text"
        value={ing.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder={t('form.ingredientPh')}
        className="h-9 rounded bg-bg border border-transparent px-2 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary min-w-0"
      />
      <NumInputCompact
        value={ing.grams}
        onChange={(n) => onChange({ grams: n })}
        suffix={t('form.ingredientGramsPh')}
      />
      <NumInputCompact
        value={ing.calories}
        onChange={(n) => onChange({ calories: n })}
        suffix={t('form.ingredientKcalPh')}
      />
      <NumInputCompact
        value={ing.protein}
        onChange={(n) => onChange({ protein: n })}
        suffix="P"
      />
      <NumInputCompact
        value={ing.carbs}
        onChange={(n) => onChange({ carbs: n })}
        suffix="C"
      />
      <NumInputCompact
        value={ing.fat}
        onChange={(n) => onChange({ fat: n })}
        suffix="F"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-rose-400"
      >
        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>
    </li>
  )
}

function NumInputCompact({
  value,
  onChange,
  suffix,
}: {
  value: number
  onChange: (n: number) => void
  suffix: string
}) {
  return (
    <div className="relative">
      <input
        type="number"
        value={Number.isNaN(value) ? '' : value}
        onChange={(e) =>
          onChange(e.target.value === '' ? 0 : Number(e.target.value))
        }
        className="w-full h-9 rounded bg-bg border border-transparent px-2 pe-7 text-xs font-mono text-fg-1 focus:outline-none focus:border-primary"
        dir="ltr"
      />
      <span
        className="absolute end-1.5 top-1/2 -translate-y-1/2 text-[10px] text-fg-3 font-mono"
        aria-hidden
      >
        {suffix}
      </span>
    </div>
  )
}

function SortableStep({
  t,
  index,
  step,
  onChange,
  onRemove,
}: {
  t: ReturnType<typeof useTranslations>
  index: number
  step: Step
  onChange: (body: string) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 rounded-md bg-bg-deeper/50 border border-border p-2"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag"
        className="shrink-0 text-fg-3 cursor-grab active:cursor-grabbing pt-2"
      >
        <GripVertical className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>
      <span
        className="shrink-0 w-6 h-6 rounded-full bg-primary/15 text-lime-400 text-[11px] font-bold inline-flex items-center justify-center mt-1.5"
        dir="ltr"
      >
        {index + 1}
      </span>
      <textarea
        value={step.body}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('form.stepPh')}
        rows={2}
        className="flex-1 resize-none bg-transparent border-none px-2 text-sm text-fg-1 placeholder-fg-3 focus:outline-none leading-relaxed"
      />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove"
        className="shrink-0 w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-rose-400 mt-1"
      >
        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
      </button>
    </li>
  )
}

function MacroStat({
  tint,
  label,
  value,
}: {
  tint: string
  label: string
  value: string | number
}) {
  return (
    <div className="rounded-lg bg-bg-deeper/50 border border-border px-3 py-3 text-center">
      <p className="font-mono text-base font-bold text-fg-1" dir="ltr" style={{ color: tint }}>
        {value}
      </p>
      <p className="mt-0.5 text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
        {label}
      </p>
    </div>
  )
}

function sumIngredients(ings: Ingredient[]) {
  return ings.reduce(
    (acc, i) => ({
      calories: acc.calories + i.calories,
      protein:  acc.protein  + i.protein,
      carbs:    acc.carbs    + i.carbs,
      fat:      acc.fat      + i.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )
}
