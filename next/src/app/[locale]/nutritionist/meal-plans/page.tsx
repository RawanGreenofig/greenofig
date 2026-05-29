'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  useDraggable,
  useDroppable,
  DragOverlay,
} from '@dnd-kit/core'
import {
  Search,
  Plus,
  Trash2,
  Copy,
  Sparkles,
  ChefHat,
  Check,
  Save,
  GripVertical,
  X,
  Users,
  Coffee,
  Utensils,
  Apple,
  Moon,
  Droplets,
  ChevronDown,
} from '@/icons'
import type { LucideIcon } from 'lucide-react'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
const MEALS = [
  'breakfast',
  'morningSnack',
  'lunch',
  'afternoonSnack',
  'dinner',
] as const

type Day = (typeof DAYS)[number]
type Meal = (typeof MEALS)[number]

interface RecipeRef {
  id: string
  name: string
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'
  calories: number
  protein: number
  carbs: number
  fat: number
  hue: string
}

// Per-meal-category icon + brand colour. Replaces the rainbow tile
// chrome (random `recipe.hue` purple/lime/orange + always-ChefHat
// regardless of category) with a meaningful per-meal cue: coffee for
// breakfast, utensils for lunch, chef-hat for dinner, apple for
// snack, droplets for drink.
const RECIPE_ICON: Record<RecipeRef['category'], LucideIcon> = {
  breakfast: Coffee,
  lunch:     Utensils,
  dinner:    ChefHat,
  snack:     Apple,
  drink:     Droplets,
}
const RECIPE_TINT: Record<RecipeRef['category'], string> = {
  breakfast: '#fb923c', // orange
  lunch:     '#a3e635', // lime
  dinner:    '#a78bfa', // purple
  snack:     '#fb923c', // orange
  drink:     '#60a5fa', // blue
}
void Moon

interface PlacedRecipe {
  /** Unique id per cell occurrence so multiple of the same recipe can coexist. */
  uid: string
  recipe: RecipeRef
}

const LIBRARY: RecipeRef[] = [
  { id: 'r1',  name: 'Greek yogurt berry bowl',     category: 'breakfast', calories: 320, protein: 22, carbs: 28, fat: 14, hue: 'rgb(163 230 53 / 0.18)' },
  { id: 'r2',  name: 'Avocado toast with egg',      category: 'breakfast', calories: 380, protein: 18, carbs: 35, fat: 19, hue: 'rgb(132 204 22 / 0.16)' },
  { id: 'r3',  name: 'Chia overnight oats',         category: 'breakfast', calories: 300, protein: 12, carbs: 42, fat: 8,  hue: 'rgb(168 85 247 / 0.18)' },
  { id: 'r4',  name: 'Lemon chicken quinoa bowl',   category: 'lunch',     calories: 520, protein: 42, carbs: 48, fat: 16, hue: 'rgb(101 163 13 / 0.18)' },
  { id: 'r5',  name: 'Mediterranean tuna wrap',     category: 'lunch',     calories: 440, protein: 32, carbs: 38, fat: 16, hue: 'rgb(6 182 212 / 0.16)' },
  { id: 'r6',  name: 'Chickpea stew with greens',   category: 'lunch',     calories: 410, protein: 18, carbs: 52, fat: 12, hue: 'rgb(61 122 74 / 0.22)' },
  { id: 'r7',  name: 'Baked salmon & sweet potato', category: 'dinner',    calories: 580, protein: 38, carbs: 42, fat: 24, hue: 'rgb(232 145 42 / 0.18)' },
  { id: 'r8',  name: 'Stuffed bell peppers',        category: 'dinner',    calories: 460, protein: 28, carbs: 38, fat: 18, hue: 'rgb(168 85 247 / 0.16)' },
  { id: 'r9',  name: 'Herb-roasted chicken plate',  category: 'dinner',    calories: 520, protein: 44, carbs: 30, fat: 22, hue: 'rgb(217 119 6 / 0.18)' },
  { id: 'r10', name: 'Hummus & cucumber plate',     category: 'snack',     calories: 160, protein: 6,  carbs: 18, fat: 8,  hue: 'rgb(132 204 22 / 0.18)' },
  { id: 'r11', name: 'Apple almond butter slices',  category: 'snack',     calories: 200, protein: 5,  carbs: 25, fat: 11, hue: 'rgb(163 230 53 / 0.16)' },
  { id: 'r12', name: 'Greek yogurt with walnuts',   category: 'snack',     calories: 180, protein: 14, carbs: 8,  fat: 11, hue: 'rgb(34 197 94 / 0.18)' },
]

const CATEGORY_FILTERS: ('all' | RecipeRef['category'])[] = [
  'all',
  'breakfast',
  'lunch',
  'dinner',
  'snack',
]

type Assignments = Record<number, Record<Day, Record<Meal, PlacedRecipe[]>>>

function emptyWeek(): Record<Day, Record<Meal, PlacedRecipe[]>> {
  const w = {} as Record<Day, Record<Meal, PlacedRecipe[]>>
  for (const d of DAYS) {
    w[d] = {} as Record<Meal, PlacedRecipe[]>
    for (const m of MEALS) w[d][m] = []
  }
  return w
}

const SEED_ASSIGNMENTS: Assignments = (() => {
  const a: Assignments = { 0: emptyWeek() }
  // Seed Monday with a sample day so the canvas isn't empty
  a[0]!.mon.breakfast = [{ uid: 'u1', recipe: LIBRARY[0]! }]
  a[0]!.mon.lunch     = [{ uid: 'u2', recipe: LIBRARY[3]! }]
  a[0]!.mon.dinner    = [{ uid: 'u3', recipe: LIBRARY[6]! }]
  a[0]!.tue.breakfast = [{ uid: 'u4', recipe: LIBRARY[2]! }]
  return a
})()

export default function MealPlanBuilderPage() {
  const tNut = useTranslations('nutritionist')
  const t = useTranslations('nutritionist.planBuilder')
  const { profile } = useUser()

  const [planName, setPlanName] = useState('Mediterranean reset')
  const [activeWeek, setActiveWeek] = useState(0)
  const [weekCount, setWeekCount] = useState(1)
  const [assignments, setAssignments] = useState<Assignments>(SEED_ASSIGNMENTS)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | RecipeRef['category']>('all')
  const [activeDrag, setActiveDrag] = useState<RecipeRef | null>(null)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [assignedClient, setAssignedClient] = useState<{ id: string; name: string } | null>(null)
  const [assignOpen, setAssignOpen] = useState(false)

  // Pull the published recipe library from Supabase. Falls back to the
  // 12-card seed when env unset.
  const liveLibrary = useSupabaseQuery<RecipeRef[]>(async (supabase) => {
    const { data } = await supabase
      .from('recipes')
      .select('id, name, category, calories, protein, carbs, fat, hue')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(80)
    type Row = {
      id: string; name: string; category: string
      calories: number | null; protein: number | null
      carbs: number | null;    fat: number | null
      hue: string | null
    }
    return ((data as Row[] | null) ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      category: (
        ['breakfast','lunch','dinner','snack','drink'].includes(r.category)
          ? r.category : 'lunch'
      ) as RecipeRef['category'],
      calories: r.calories ?? 0,
      protein: r.protein ?? 0,
      carbs: r.carbs ?? 0,
      fat: r.fat ?? 0,
      hue: r.hue ?? 'rgb(132 204 22 / 0.16)',
    }))
  }, [])

  const sourceLibrary = (liveLibrary.data && liveLibrary.data.length > 0)
    ? liveLibrary.data
    : LIBRARY

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  )

  const filteredLibrary = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sourceLibrary.filter((r) => {
      if (filter !== 'all' && r.category !== filter) return false
      if (q && !r.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [sourceLibrary, query, filter])

  const onDragStart = (e: { active: { id: string | number } }) => {
    const id = String(e.active.id)
    if (id.startsWith('lib-')) {
      const recipeId = id.slice('lib-'.length)
      setActiveDrag(sourceLibrary.find((r) => r.id === recipeId) ?? null)
    }
  }

  const onDragEnd = (e: DragEndEvent) => {
    setActiveDrag(null)
    const overId = e.over?.id
    if (!overId) return
    const dropTarget = String(overId)
    if (!dropTarget.startsWith('cell-')) return
    const [, dayStr, mealStr] = dropTarget.split('-')
    const day = dayStr as Day
    const meal = mealStr as Meal

    const dragId = String(e.active.id)
    if (!dragId.startsWith('lib-')) return
    const recipeId = dragId.slice('lib-'.length)
    const recipe = sourceLibrary.find((r) => r.id === recipeId)
    if (!recipe) return

    setAssignments((curr) => {
      const week = curr[activeWeek] ?? emptyWeek()
      return {
        ...curr,
        [activeWeek]: {
          ...week,
          [day]: {
            ...week[day],
            [meal]: [
              ...week[day][meal],
              { uid: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, recipe },
            ],
          },
        },
      }
    })
  }

  const removeFromCell = (day: Day, meal: Meal, uid: string) => {
    setAssignments((curr) => {
      const week = curr[activeWeek] ?? emptyWeek()
      return {
        ...curr,
        [activeWeek]: {
          ...week,
          [day]: {
            ...week[day],
            [meal]: week[day][meal].filter((p) => p.uid !== uid),
          },
        },
      }
    })
  }

  const addWeek = () => {
    setAssignments((curr) => ({ ...curr, [weekCount]: emptyWeek() }))
    setWeekCount((c) => c + 1)
    setActiveWeek(weekCount)
  }

  const duplicateWeek = () => {
    const src = assignments[activeWeek] ?? emptyWeek()
    const cloned = {} as Record<Day, Record<Meal, PlacedRecipe[]>>
    for (const d of DAYS) {
      cloned[d] = {} as Record<Meal, PlacedRecipe[]>
      for (const m of MEALS) {
        cloned[d][m] = src[d][m].map((p) => ({
          uid: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          recipe: p.recipe,
        }))
      }
    }
    setAssignments((curr) => ({ ...curr, [weekCount]: cloned }))
    setWeekCount((c) => c + 1)
    setActiveWeek(weekCount)
  }

  const removeWeek = () => {
    if (weekCount <= 1) return
    setAssignments((curr) => {
      const next = { ...curr }
      delete next[activeWeek]
      // Re-index keys to be contiguous 0..n-1
      const remaining = Object.values(next)
      const reindexed: Assignments = {}
      remaining.forEach((w, i) => {
        reindexed[i] = w
      })
      return reindexed
    })
    setWeekCount((c) => c - 1)
    setActiveWeek((w) => Math.max(0, Math.min(w, weekCount - 2)))
  }

  const save = () => {
    setSaveState('saving')

    void (async () => {
      // Build items list from the assignments map.
      const items: {
        week_idx: number
        day_idx: number
        meal_type: string
        recipe_id: string | null
        custom_name: string | null
        notes: null
      }[] = []
      Object.entries(assignments).forEach(([weekKey, week]) => {
        const weekIdx = Number(weekKey)
        DAYS.forEach((day, dayIdx) => {
          MEALS.forEach((meal) => {
            for (const placed of week[day][meal]) {
              const isUuid = /^[0-9a-f-]{32,}$/i.test(placed.recipe.id)
              items.push({
                week_idx: weekIdx,
                day_idx: dayIdx,
                meal_type: meal,
                recipe_id: isUuid ? placed.recipe.id : null,
                custom_name: isUuid ? null : placed.recipe.name,
                notes: null,
              })
            }
          })
        })
      })

      // Single round-trip to /api/nutritionist/meal-plans. The server
      // does the deactivate-prior + insert-plan + insert-items
      // sequence with rollback semantics — the previous code did the
      // same steps from the browser with no error checking, so a
      // network blip between deactivate and insert would silently
      // erase the client's prior meal plan.
      try {
        const res = await fetch('/api/nutritionist/meal-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: assignedClient?.id ?? null,
            title: planName.trim() || 'Untitled plan',
            weeks: weekCount,
            items,
          }),
        })
        if (!res.ok) {
          console.error('[meal-plans] save failed:', res.status)
          setSaveState('idle')
          return
        }
      } catch (err) {
        console.error('[meal-plans] save threw:', err)
        setSaveState('idle')
        return
      }

      setSaveState('saved')
      window.setTimeout(() => setSaveState('idle'), 1500)
    })()
  }

  const week = assignments[activeWeek] ?? emptyWeek()

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="px-4 md:px-6 py-6 md:py-8 max-w-screen-2xl mx-auto space-y-5">
        {/* Header */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1
              className="font-display font-bold text-fg-1 tracking-tight"
              style={{ fontSize: 'clamp(24px, 3vw, 32px)', lineHeight: 1.1 }}
            >
              {tNut('mealPlanBuilder')}
            </h1>
            <p className="mt-2 text-sm text-fg-2">{t('subtitle')}</p>
            <div className="mt-3 max-w-md">
              <label className="block text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5">
                {t('planName')}
              </label>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder={t('planNamePh')}
                className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-semibold text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAssignOpen(true)}
              className={`inline-flex items-center gap-1.5 rounded-pill h-10 px-4 text-xs font-semibold transition-colors ${
                assignedClient
                  ? 'bg-primary/15 text-lime-400 border border-primary/40'
                  : 'bg-surface-raised border border-border text-fg-1 hover:border-primary/40'
              }`}
            >
              <Users className="w-3.5 h-3.5" strokeWidth={1.75} />
              {assignedClient ? assignedClient.name : t('assignTo')}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saveState === 'saving'}
              className={`inline-flex items-center gap-1.5 rounded-pill h-10 px-4 text-xs font-semibold transition-all ${
                saveState === 'saved'
                  ? 'bg-primary/20 text-lime-400'
                  : 'bg-gradient-to-b from-lime-400 to-lime-600 text-bg shadow-lime-glow border border-lime-600/60 hover:-translate-y-px'
              }`}
            >
              {saveState === 'saved' ? (
                <>
                  <Check className="w-3.5 h-3.5" strokeWidth={2.25} />
                  {t('saved')}
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" strokeWidth={2} />
                  {saveState === 'saving' ? t('saving') : t('savePlan')}
                </>
              )}
            </button>
          </div>
        </header>

        {/* Week tabs row — dashboard chrome (8px radius, --gf-input-bg
         * surface, lime tint when active) matching the segmented
         * controls on /admin/store and the Store Curation filter row. */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="inline-flex items-center"
            style={{
              minHeight: 40,
              background: 'var(--gf-input-bg)',
              border: '1px solid var(--gf-border)',
              borderRadius: 8,
              padding: 3,
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            {Array.from({ length: weekCount }).map((_, i) => {
              const active = activeWeek === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveWeek(i)}
                  className="inline-flex items-center justify-center px-3 text-xs font-semibold transition-colors"
                  style={{
                    height: 32,
                    borderRadius: 6,
                    background: active
                      ? 'rgba(132,217,61,0.12)'
                      : 'transparent',
                    color: active ? '#a3e635' : 'var(--gf-fg-2)',
                  }}
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background =
                        'var(--gf-card-hover)'
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
                  {t('weekTitle', { n: i + 1 })}
                </button>
              )
            })}
            <button
              type="button"
              onClick={addWeek}
              className="inline-flex items-center justify-center transition-colors"
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: 'transparent',
                color: 'var(--gf-fg-2)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--gf-card-hover)'
                e.currentTarget.style.color = '#a3e635'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--gf-fg-2)'
              }}
              aria-label={t('addWeek')}
            >
              <Plus className="w-3.5 h-3.5" strokeWidth={2} color="currentColor" />
            </button>
          </div>

          {/* Action pills sit beside the segmented control. */}
          <button
            type="button"
            onClick={duplicateWeek}
            className="inline-flex items-center gap-1.5 transition-colors"
            style={{
              height: 40,
              padding: '0 12px',
              borderRadius: 8,
              background: 'var(--gf-input-bg)',
              border: '1px solid var(--gf-border)',
              color: 'var(--gf-fg-2)',
              fontSize: 11,
              fontWeight: 600,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--gf-card-hover)'
              e.currentTarget.style.color = 'var(--gf-fg-1)'
              e.currentTarget.style.borderColor = 'rgba(132,217,61,0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--gf-input-bg)'
              e.currentTarget.style.color = 'var(--gf-fg-2)'
              e.currentTarget.style.borderColor = 'var(--gf-border)'
            }}
          >
            <Copy className="w-3 h-3" strokeWidth={2} color="currentColor" />
            {t('duplicateWeek')}
          </button>
          {weekCount > 1 && (
            <button
              type="button"
              onClick={removeWeek}
              className="inline-flex items-center gap-1.5 transition-colors"
              style={{
                height: 40,
                padding: '0 12px',
                borderRadius: 8,
                background: 'var(--gf-input-bg)',
                border: '1px solid var(--gf-border)',
                color: 'var(--gf-fg-2)',
                fontSize: 11,
                fontWeight: 600,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(244,63,94,0.08)'
                e.currentTarget.style.color = '#f43f5e'
                e.currentTarget.style.borderColor = 'rgba(244,63,94,0.32)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--gf-input-bg)'
                e.currentTarget.style.color = 'var(--gf-fg-2)'
                e.currentTarget.style.borderColor = 'var(--gf-border)'
              }}
            >
              <Trash2 className="w-3 h-3" strokeWidth={2} color="currentColor" />
              {t('removeWeek')}
            </button>
          )}
          <span className="ms-auto text-xs text-fg-3 font-mono" dir="ltr">
            {t('weeksLabel', { count: weekCount })}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
          {/* Recipe library */}
          <Library
            t={t}
            recipes={filteredLibrary}
            query={query}
            setQuery={setQuery}
            filter={filter}
            setFilter={setFilter}
          />

          {/* Grid */}
          <div className="overflow-x-auto">
            <Grid t={t} week={week} onRemove={removeFromCell} />
          </div>
        </div>
      </div>

      <DragOverlay>
        {activeDrag && (
          <RecipeCard recipe={activeDrag} dragging />
        )}
      </DragOverlay>

      {assignOpen && (
        <AssignClientModal
          nutritionistId={profile?.id ?? null}
          currentId={assignedClient?.id ?? null}
          onClose={() => setAssignOpen(false)}
          onPick={(client) => {
            setAssignedClient(client)
            setAssignOpen(false)
          }}
          onUnassign={() => {
            setAssignedClient(null)
            setAssignOpen(false)
          }}
        />
      )}
    </DndContext>
  )
}

/* ── Assign-to-client modal ─────────────────────────────────────── */

function AssignClientModal({
  nutritionistId,
  currentId,
  onClose,
  onPick,
  onUnassign,
}: {
  nutritionistId: string | null
  currentId: string | null
  onClose: () => void
  onPick: (client: { id: string; name: string }) => void
  onUnassign: () => void
}) {
  const [query, setQuery] = useState('')
  type ClientLite = { id: string; name: string; tier: string }
  const clients = useSupabaseQuery<ClientLite[]>(async (supabase) => {
    type Row = { id: string; full_name: string | null; tier: string }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, tier')
      .eq('role', 'user')
      .order('full_name', { ascending: true })
      .limit(200)
    return ((data as Row[] | null) ?? []).map((r) => ({
      id: r.id,
      name: r.full_name?.trim() || 'Unnamed client',
      tier: r.tier,
    }))
  }, [nutritionistId])

  const list = clients.data ?? []
  const filtered = query.trim()
    ? list.filter((c) =>
        c.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : list

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface flex flex-col" style={{ maxHeight: '80vh' }}>
        <header className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-fg-1">Assign meal plan</h2>
            <p className="mt-1 text-xs text-fg-3">
              Pick a client. The plan will be saved as their active plan.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-fg-3 hover:text-fg-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </header>

        <div className="px-6 py-3 border-b border-border">
          <div className="relative">
            <Search
              className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search clients…"
              autoFocus
              className="w-full h-10 rounded-md bg-bg-deeper border border-border ps-10 pe-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {clients.loading ? (
            <p className="text-sm text-fg-3 px-4 py-3">Loading clients…</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-fg-3 px-4 py-3">No clients match that search.</p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((c) => {
                const isCurrent = c.id === currentId
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onPick({ id: c.id, name: c.name })}
                      className={`w-full flex items-center justify-between gap-3 rounded-md px-4 py-2.5 text-start transition-colors ${
                        isCurrent
                          ? 'bg-primary/15 text-lime-400'
                          : 'text-fg-1 hover:bg-surface-raised'
                      }`}
                    >
                      <span className="text-sm font-medium truncate">
                        {c.name}
                      </span>
                      <span className="text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
                        {c.tier}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {currentId && (
          <footer className="px-6 py-3 border-t border-border">
            <button
              type="button"
              onClick={onUnassign}
              className="text-xs text-rose-400 hover:text-rose-300"
            >
              Unassign — keep as draft
            </button>
          </footer>
        )}
      </div>
    </div>
  )
}

/* ── Library ────────────────────────────────────────────────────── */

function Library({
  t,
  recipes,
  query,
  setQuery,
  filter,
  setFilter,
}: {
  t: ReturnType<typeof useTranslations>
  recipes: RecipeRef[]
  query: string
  setQuery: (s: string) => void
  filter: 'all' | RecipeRef['category']
  setFilter: (f: 'all' | RecipeRef['category']) => void
}) {
  return (
    <aside className="rounded-xl border border-border bg-surface p-4 lg:max-h-[760px] lg:sticky lg:top-4 lg:overflow-y-auto">
      <div className="flex items-center gap-2 mb-3">
        <ChefHat className="w-4 h-4 text-lime-400" strokeWidth={1.75} />
        <h2 className="text-sm font-semibold text-fg-1">{t('library')}</h2>
      </div>
      <div className="relative mb-3">
        <Search
          className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
          strokeWidth={1.75}
          color="var(--gf-fg-3)"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('librarySearch')}
          className="w-full h-10 ps-10 pe-3 text-sm text-fg-1 placeholder-fg-3"
        />
      </div>
      {/* Category filter — dropdown matching the dashboard filter
       * chrome on /admin/users and the Clients page (replaces the old
       * segmented pill row). */}
      <div className="mb-3">
        <FilterDropdown
          label={t('filterCategory')}
          options={CATEGORY_FILTERS.map((c) => [
            c,
            c === 'all'
              ? t('filterAll')
              : t(`categories.${c}` as 'categories.breakfast'),
          ])}
          value={filter}
          onChange={(v) => setFilter(v as 'all' | RecipeRef['category'])}
          fullWidth
        />
      </div>
      <ul className="space-y-2">
        {recipes.length === 0 ? (
          <li className="text-xs text-fg-3 text-center py-6">
            {t('noRecipes')}
          </li>
        ) : (
          recipes.map((r) => (
            <li key={r.id}>
              <DraggableRecipe recipe={r} />
            </li>
          ))
        )}
      </ul>
    </aside>
  )
}

/**
 * Dropdown category filter — same chrome as /admin/users and the
 * Clients page (replaces the old segmented pill row). `fullWidth`
 * makes it fill the Library sidebar column instead of hugging its
 * label.
 */
function FilterDropdown({
  label,
  options,
  value,
  onChange,
  fullWidth,
}: {
  label: string
  options: [string, string][]
  value: string
  onChange: (v: string) => void
  fullWidth?: boolean
}) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const selected =
    options.find(([v]) => v === value)?.[1] ?? options[0]?.[1] ?? ''

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div
      className={`relative ${fullWidth ? 'flex w-full' : 'inline-flex'}`}
      ref={wrapRef}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 h-10 px-3 rounded-md text-sm transition-colors"
        style={{
          background: 'var(--gf-input-bg)',
          border: '1px solid var(--gf-border)',
          color: 'var(--gf-fg-1)',
          ...(fullWidth ? { width: '100%' } : { minWidth: 160 }),
        }}
      >
        <span
          className="text-[11px] uppercase font-semibold"
          style={{ letterSpacing: '0.08em', color: 'var(--gf-fg-3)' }}
        >
          {label}
        </span>
        <span className="font-medium truncate flex-1 text-start">
          {selected}
        </span>
        <ChevronDown
          className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`}
          strokeWidth={1.75}
          color="var(--gf-fg-3)"
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full mt-1 z-30 rounded-md py-1 overflow-hidden"
          style={{
            insetInlineStart: 0,
            minWidth: '100%',
            background: 'var(--gf-card)',
            border: '1px solid var(--gf-border)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
          }}
        >
          {options.map(([v, lbl]) => {
            const active = v === value
            return (
              <button
                key={v}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(v)
                  setOpen(false)
                }}
                className="w-full flex items-center gap-2 px-3 h-9 text-sm text-start transition-colors"
                style={{
                  background: active ? 'rgba(132,217,61,0.12)' : 'transparent',
                  color: active ? '#a3e635' : 'var(--gf-fg-1)',
                  fontWeight: active ? 600 : 500,
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    e.currentTarget.style.background = 'var(--gf-card-hover)'
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = 'transparent'
                }}
              >
                <span className="flex-1 truncate">{lbl}</span>
                {active && (
                  <Check
                    className="w-4 h-4 shrink-0"
                    strokeWidth={2}
                    color="#a3e635"
                  />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function DraggableRecipe({ recipe }: { recipe: RecipeRef }) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `lib-${recipe.id}`,
  })
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing select-none ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <RecipeCard recipe={recipe} />
    </div>
  )
}

function RecipeCard({
  recipe,
  dragging,
}: {
  recipe: RecipeRef
  dragging?: boolean
}) {
  // Per-meal-category bare icon (no tile chrome) — same sidebar-style
  // pattern used on Store Curation product rows. Colour carries the
  // category cue.
  const Icon = RECIPE_ICON[recipe.category]
  const tint = RECIPE_TINT[recipe.category]
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border bg-surface-raised p-2.5 transition-shadow ${
        dragging
          ? 'border-primary/60 shadow-lime-glow'
          : 'border-border hover:border-primary/40'
      }`}
    >
      <Icon
        className="w-5 h-5 shrink-0"
        strokeWidth={1.75}
        color={tint}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-fg-1 leading-tight truncate">
          {recipe.name}
        </p>
        <p className="mt-0.5 text-[10px] text-fg-3 font-mono" dir="ltr">
          {recipe.calories} kcal · P{recipe.protein}
        </p>
      </div>
      <GripVertical
        className="w-3.5 h-3.5 text-fg-3 shrink-0"
        strokeWidth={1.75}
        color="currentColor"
      />
    </div>
  )
}

/* ── Grid ───────────────────────────────────────────────────────── */

function Grid({
  t,
  week,
  onRemove,
}: {
  t: ReturnType<typeof useTranslations>
  week: Record<Day, Record<Meal, PlacedRecipe[]>>
  onRemove: (day: Day, meal: Meal, uid: string) => void
}) {
  // Daily totals
  const dailyTotals: Record<Day, { kcal: number; p: number; c: number; f: number }> = {} as never
  for (const d of DAYS) {
    let kcal = 0, p = 0, c = 0, f = 0
    for (const m of MEALS) {
      for (const placed of week[d][m]) {
        kcal += placed.recipe.calories
        p += placed.recipe.protein
        c += placed.recipe.carbs
        f += placed.recipe.fat
      }
    }
    dailyTotals[d] = { kcal, p, c, f }
  }

  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden min-w-[860px]">
      {/* Day headers */}
      <div className="grid grid-cols-[120px_repeat(7,1fr)] bg-bg-deeper/40 border-b border-border">
        <div />
        {DAYS.map((d) => (
          <div
            key={d}
            className="px-3 py-3 text-center border-s border-border"
          >
            <p className="text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
              {t(`days.${d}` as 'days.mon')}
            </p>
          </div>
        ))}
      </div>

      {/* Meal rows */}
      {MEALS.map((m, idx) => (
        <div
          key={m}
          className={`grid grid-cols-[120px_repeat(7,1fr)] ${
            idx < MEALS.length - 1 ? 'border-b border-border' : ''
          }`}
        >
          <div className="px-3 py-3 bg-bg-deeper/30 border-e border-border flex items-center">
            <span className="text-xs uppercase tracking-eyebrow text-fg-2 font-semibold">
              {t(`meals.${m}` as 'meals.breakfast')}
            </span>
          </div>
          {DAYS.map((d) => (
            <Cell
              key={`${d}-${m}`}
              day={d}
              meal={m}
              placed={week[d][m]}
              onRemove={onRemove}
            />
          ))}
        </div>
      ))}

      {/* Totals row */}
      <div className="grid grid-cols-[120px_repeat(7,1fr)] bg-bg-deeper/40 border-t border-border">
        <div className="px-3 py-2 text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-lime-400" strokeWidth={2} />
          totals
        </div>
        {DAYS.map((d) => {
          const tot = dailyTotals[d]
          const empty = tot.kcal === 0
          return (
            <div
              key={d}
              className="px-2 py-2 border-s border-border text-center"
            >
              <p
                className={`font-mono text-xs ${
                  empty ? 'text-fg-3' : 'text-fg-1 font-semibold'
                }`}
                dir="ltr"
              >
                {tot.kcal}
              </p>
              {!empty && (
                <p className="text-[10px] text-fg-3 font-mono" dir="ltr">
                  P{tot.p} · C{tot.c} · F{tot.f}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Cell({
  day,
  meal,
  placed,
  onRemove,
}: {
  day: Day
  meal: Meal
  placed: PlacedRecipe[]
  onRemove: (day: Day, meal: Meal, uid: string) => void
}) {
  const t = useTranslations('nutritionist.planBuilder')
  const { setNodeRef, isOver } = useDroppable({
    id: `cell-${day}-${meal}`,
  })
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[90px] p-1.5 border-s border-border transition-colors ${
        isOver ? 'bg-primary/10' : ''
      } ${placed.length === 0 ? 'bg-bg-deeper/20' : ''}`}
    >
      {placed.length === 0 ? (
        <div className={`h-full min-h-[80px] rounded-md border border-dashed flex items-center justify-center text-[10px] uppercase tracking-eyebrow font-semibold ${
          isOver
            ? 'border-primary/60 text-lime-400'
            : 'border-border text-fg-3'
        }`}>
          {isOver ? t('drop') : '＋'}
        </div>
      ) : (
        <ul className="space-y-1.5">
          {placed.map((p) => (
            <li
              key={p.uid}
              className="group relative rounded-md border border-border bg-surface-raised px-2 py-1.5"
              style={{
                borderInlineStart: `3px solid ${RECIPE_TINT[p.recipe.category]}`,
              }}
            >
              <p className="text-[11px] font-medium text-fg-1 leading-tight pe-5">
                {p.recipe.name}
              </p>
              <p className="mt-0.5 text-[10px] text-fg-3 font-mono" dir="ltr">
                {p.recipe.calories}
              </p>
              <button
                type="button"
                onClick={() => onRemove(day, meal, p.uid)}
                aria-label="Remove"
                className="absolute end-1 top-1 w-5 h-5 rounded-full inline-flex items-center justify-center text-fg-3 hover:text-rose-400 hover:bg-bg-deeper opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
              >
                <X className="w-3 h-3" strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
