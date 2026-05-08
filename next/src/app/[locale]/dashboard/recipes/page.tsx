'use client'


import { motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Search,
  Clock,
  Flame,
  Bookmark,
  X,
  Sparkles,
  ChefHat,
  ArrowRight,
  Filter,
} from '@/icons'
import UpgradeButton from '@/components/UpgradeButton'
import { useUser } from '@/lib/hooks/useUser'
import { useSupabaseQuery } from '@/lib/hooks/useSupabaseQuery'
import { tierAtLeast } from '@/lib/tier'

type Category = 'all' | 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'drink'
type DietaryTag =
  | 'vegan'
  | 'vegetarian'
  | 'glutenFree'
  | 'dairyFree'
  | 'keto'
  | 'halal'
  | 'highProtein'
  | 'quick'

interface Recipe {
  id: string
  name: string
  category: Exclude<Category, 'all'>
  calories: number
  protein: number
  minutes: number
  servings: number
  tags: DietaryTag[]
  drPick?: boolean
  /** A solid green tone for the placeholder card */
  hue: string
}

const RECIPES: Recipe[] = [
  { id: '1', name: 'Greek yogurt berry bowl',     category: 'breakfast', calories: 320, protein: 22, minutes: 5,  servings: 1, tags: ['vegetarian','glutenFree','quick','highProtein'], drPick: true,  hue: 'rgb(163 230 53 / 0.18)' },
  { id: '2', name: 'Avocado toast with egg',      category: 'breakfast', calories: 380, protein: 18, minutes: 10, servings: 1, tags: ['vegetarian','quick'], hue: 'rgb(132 204 22 / 0.16)' },
  { id: '3', name: 'Lemon chicken quinoa bowl',   category: 'lunch',     calories: 520, protein: 42, minutes: 30, servings: 1, tags: ['glutenFree','dairyFree','halal','highProtein'], drPick: true, hue: 'rgb(101 163 13 / 0.18)' },
  { id: '4', name: 'Chickpea stew with greens',   category: 'lunch',     calories: 410, protein: 18, minutes: 35, servings: 2, tags: ['vegan','glutenFree','dairyFree','halal'], hue: 'rgb(61 122 74 / 0.22)' },
  { id: '5', name: 'Baked salmon & sweet potato', category: 'dinner',    calories: 580, protein: 38, minutes: 30, servings: 1, tags: ['glutenFree','dairyFree','halal','highProtein'], drPick: true, hue: 'rgb(232 145 42 / 0.18)' },
  { id: '6', name: 'Stuffed bell peppers',        category: 'dinner',    calories: 460, protein: 28, minutes: 45, servings: 2, tags: ['glutenFree','halal','highProtein'], hue: 'rgb(168 85 247 / 0.16)' },
  { id: '7', name: 'Hummus & cucumber plate',     category: 'snack',     calories: 160, protein: 6,  minutes: 5,  servings: 1, tags: ['vegan','vegetarian','quick','halal'], hue: 'rgb(132 204 22 / 0.18)' },
  { id: '8', name: 'Apple almond butter slices',  category: 'snack',     calories: 200, protein: 5,  minutes: 3,  servings: 1, tags: ['vegan','vegetarian','glutenFree','dairyFree','quick'], hue: 'rgb(163 230 53 / 0.16)' },
  { id: '9', name: 'Green ginger smoothie',       category: 'drink',     calories: 180, protein: 6,  minutes: 5,  servings: 1, tags: ['vegan','glutenFree','dairyFree','quick'], hue: 'rgb(34 197 94 / 0.18)' },
  { id: '10', name: 'Date & cardamom latte',      category: 'drink',     calories: 140, protein: 5,  minutes: 6,  servings: 1, tags: ['vegetarian','glutenFree','quick','halal'], hue: 'rgb(217 119 6 / 0.16)' },
  { id: '11', name: 'Mediterranean tuna wrap',    category: 'lunch',     calories: 440, protein: 32, minutes: 12, servings: 1, tags: ['highProtein','quick','dairyFree','halal'], hue: 'rgb(6 182 212 / 0.16)' },
  { id: '12', name: 'Chia overnight oats',        category: 'breakfast', calories: 300, protein: 12, minutes: 5,  servings: 1, tags: ['vegetarian','dairyFree','quick'], hue: 'rgb(168 85 247 / 0.18)' },
]

const CATEGORIES: Category[] = ['all', 'breakfast', 'lunch', 'dinner', 'snack', 'drink']
const DIETARY_TAGS: DietaryTag[] = ['vegan','vegetarian','glutenFree','dairyFree','keto','halal','highProtein','quick']

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function RecipesPage() {
  const t = useTranslations('recipes')
  const { tier } = useUser()
  const allowed = tierAtLeast(tier, 'basic')

  if (!allowed) return <UpgradeGate t={t} />

  return <Library t={t} />
}

/* ── Views ──────────────────────────────────────────────────────── */

function UpgradeGate({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-4 md:px-8 py-12 max-w-screen-md mx-auto">
      <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 to-transparent p-8 md:p-12 text-center">
        <ChefHat
          className="w-8 h-8 text-primary mx-auto mb-5"
          strokeWidth={1.75}
        />
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 36px)', lineHeight: 1.15 }}
        >
          {t('gateTitle')}
        </h1>
        <p className="mt-3 text-sm md:text-base text-fg-2 max-w-md mx-auto leading-relaxed">
          {t('gateBody')}
        </p>
        <div className="mt-6">
          <UpgradeButton tier="basic" label={t('gateCta')} />
        </div>
      </div>
    </motion.div>
  )
}

function Library({ t }: { t: ReturnType<typeof useTranslations> }) {
  const [category, setCategory] = useState<Category>('all')
  const [tags, setTags] = useState<Set<DietaryTag>>(new Set())
  const [query, setQuery] = useState('')
  const [saved, setSaved] = useState<Set<string>>(new Set())
  const [active, setActive] = useState<Recipe | null>(null)

  const live = useSupabaseQuery<Recipe[]>(async (supabase) => {
    const { data } = await supabase
      .from('recipes')
      .select('id, name, category, calories, protein, minutes, servings, tags, dr_pick, hue')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(60)
    type Row = {
      id: string; name: string; category: string
      calories: number | null; protein: number | null
      minutes: number | null; servings: number | null
      tags: string[] | null; dr_pick: boolean | null; hue: string | null
    }
    return ((data as Row[] | null) ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      category: (['breakfast','lunch','dinner','snack','drink'].includes(r.category)
        ? r.category : 'lunch') as Recipe['category'],
      calories: r.calories ?? 0,
      protein: r.protein ?? 0,
      minutes: r.minutes ?? 0,
      servings: r.servings ?? 1,
      tags: ((r.tags ?? []).filter((t): t is DietaryTag =>
        ['vegan','vegetarian','glutenFree','dairyFree','keto','halal','highProtein','quick'].includes(t)
      )),
      drPick: !!r.dr_pick,
      hue: r.hue ?? 'rgb(132 204 22 / 0.16)',
    }))
  }, [])

  const sourceList = (live.data && live.data.length > 0) ? live.data : RECIPES

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sourceList.filter((r) => {
      if (category !== 'all' && r.category !== category) return false
      if (q && !r.name.toLowerCase().includes(q)) return false
      const tagArr = Array.from(tags)
      for (let i = 0; i < tagArr.length; i++) {
        if (!r.tags.includes(tagArr[i]!)) return false
      }
      return true
    })
  }, [sourceList, category, query, tags])

  const toggleTag = (tag: DietaryTag) => {
    setTags((prev) => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const toggleSave = (id: string) =>
    setSaved((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      {/* Header */}
      <header>
        <h1
          className="font-display font-bold text-fg-1 tracking-tight"
          style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
        >
          <span className="gradient-text">{t('title')}</span>
        </h1>
        <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
      </header>

      {/* Search */}
      <div className="relative">
        <Search
          className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
          style={{ color: 'hsl(var(--muted-foreground))' }}
          strokeWidth={1.75}
          aria-hidden
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="h-12 w-full rounded-2xl ps-10 pe-4 text-base transition-all duration-200"
          style={{
            background: 'hsl(var(--background) / 0.5)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            border: '1px solid hsl(var(--input))',
            color: 'hsl(var(--foreground))',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = 'hsl(var(--primary))'
            e.currentTarget.style.boxShadow = '0 0 0 2px hsl(var(--ring))'
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'hsl(var(--input))'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-2 overflow-x-auto -mx-1 px-1 pb-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium cursor-pointer transition-all border ${
              category === c
                ? 'bg-primary/15 border-primary/40 text-primary'
                : 'glass-effect border-border text-fg-3 hover:border-primary/30'
            }`}
          >
            {t(`categories.${c}` as 'categories.all')}
          </button>
        ))}
      </div>

      {/* Dietary tags */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold me-1">
          <Filter className="w-3 h-3" strokeWidth={2} />
          {t('filters')}
        </span>
        {DIETARY_TAGS.map((tag) => {
          const on = tags.has(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                on
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'glass-effect border-border text-fg-3 hover:border-primary/30'
              }`}
            >
              {t(`dietary.${tag}` as 'dietary.vegan')}
            </button>
          )
        })}
        {tags.size > 0 && (
          <button
            type="button"
            onClick={() => setTags(new Set())}
            className="ms-1 text-[11px] text-fg-3 hover:text-fg-1 underline underline-offset-2"
          >
            {t('clearFilters')}
          </button>
        )}
      </div>

      {/* Results */}
      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-12 text-center">
          <ChefHat
            className="w-9 h-9 mx-auto mb-3 text-fg-3"
            strokeWidth={1.5}
          />
          <p className="text-base font-semibold text-fg-1">{t('noResults')}</p>
          <p className="mt-1 text-sm text-fg-2">{t('noResultsBody')}</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((r) => (
            <RecipeCard
              key={r.id}
              t={t}
              recipe={r}
              saved={saved.has(r.id)}
              onSave={() => toggleSave(r.id)}
              onOpen={() => setActive(r)}
            />
          ))}
        </ul>
      )}

      {active && (
        <RecipeDrawer
          t={t}
          recipe={active}
          saved={saved.has(active.id)}
          onSave={() => toggleSave(active.id)}
          onClose={() => setActive(null)}
        />
      )}
    </div>
  )
}

function RecipeCard({
  t,
  recipe,
  saved,
  onSave,
  onOpen,
}: {
  t: ReturnType<typeof useTranslations>
  recipe: Recipe
  saved: boolean
  onSave: () => void
  onOpen: () => void
}) {
  return (
    <li className="rounded-xl border border-border bg-surface overflow-hidden hover:border-primary/40 transition-colors group">
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-start"
      >
        {/* Visual placeholder — replaced with real recipe images in Cluster H */}
        <div
          className="relative aspect-[4/3] w-full"
          style={{ background: recipe.hue }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <ChefHat
              className="w-10 h-10 text-fg-1/40"
              strokeWidth={1}
            />
          </div>
          {recipe.drPick && (
            <span className="absolute top-3 start-3 inline-flex items-center gap-1 rounded-pill bg-bg/80 backdrop-blur-sm px-2.5 h-6 text-[10px] uppercase tracking-eyebrow font-semibold text-lime-400 border border-primary/30">
              <Sparkles className="w-3 h-3" strokeWidth={2} />
              {t('drPicked')}
            </span>
          )}
        </div>
        <div className="p-4">
          <p className="text-[10px] uppercase tracking-eyebrow text-fg-3 font-semibold">
            {t(`categories.${recipe.category}` as 'categories.breakfast')}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-fg-1 leading-snug line-clamp-2 min-h-[2.5em]">
            {recipe.name}
          </h3>
          <div className="mt-3 flex items-center gap-3 text-xs text-fg-2 font-mono" dir="ltr">
            <span className="inline-flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-fg-3" strokeWidth={1.75} />
              {recipe.calories}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-fg-3" strokeWidth={1.75} />
              {recipe.minutes}m
            </span>
            <span className="text-fg-3">P{recipe.protein}g</span>
          </div>
        </div>
      </button>
      <div className="px-4 pb-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="text-xs font-semibold text-lime-400 hover:underline inline-flex items-center gap-1"
        >
          {t('viewRecipe')}
          <ArrowRight className="w-3 h-3 rtl:rotate-180" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={onSave}
          aria-label={saved ? t('saved') : t('save')}
          className={`w-8 h-8 rounded-md inline-flex items-center justify-center transition-colors ${
            saved
              ? 'text-lime-400 bg-primary/15'
              : 'text-fg-3 hover:text-fg-1 hover:bg-surface-raised'
          }`}
        >
          <Bookmark
            className="w-4 h-4"
            strokeWidth={1.75}
            fill={saved ? 'currentColor' : 'none'}
          />
        </button>
      </div>
    </li>
  )
}

function RecipeDrawer({
  t,
  recipe,
  saved,
  onSave,
  onClose,
}: {
  t: ReturnType<typeof useTranslations>
  recipe: Recipe
  saved: boolean
  onSave: () => void
  onClose: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={recipe.name}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-bg-deeper/70 backdrop-blur-sm"
      />
      <div className="relative w-full md:max-w-2xl max-h-[90vh] flex flex-col rounded-t-2xl md:rounded-2xl bg-surface border border-border shadow-2xl overflow-hidden">
        {/* Hero */}
        <div
          className="relative aspect-[16/9] w-full shrink-0"
          style={{ background: recipe.hue }}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <ChefHat className="w-16 h-16 text-fg-1/40" strokeWidth={1} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 end-3 w-9 h-9 rounded-full bg-bg/70 backdrop-blur-sm border border-border text-fg-1 hover:bg-bg flex items-center justify-center"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
          {recipe.drPick && (
            <span className="absolute top-3 start-3 inline-flex items-center gap-1 rounded-pill bg-bg/80 backdrop-blur-sm px-3 h-7 text-[11px] uppercase tracking-eyebrow font-semibold text-lime-400 border border-primary/30">
              <Sparkles className="w-3 h-3" strokeWidth={2} />
              {t('drPicked')}
            </span>
          )}
        </div>

        <div className="p-5 md:p-6 overflow-y-auto">
          <p className="text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
            {t(`categories.${recipe.category}` as 'categories.breakfast')}
          </p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <h2 className="text-xl md:text-2xl font-display font-bold text-fg-1 tracking-tight">
              {recipe.name}
            </h2>
            <button
              type="button"
              onClick={onSave}
              aria-label={saved ? t('saved') : t('save')}
              className={`shrink-0 inline-flex items-center gap-1.5 rounded-pill h-9 px-4 text-xs font-semibold transition-colors ${
                saved
                  ? 'bg-primary/20 text-lime-400'
                  : 'bg-surface-raised border border-border text-fg-2 hover:border-primary/40 hover:text-fg-1'
              }`}
            >
              <Bookmark
                className="w-3.5 h-3.5"
                strokeWidth={1.75}
                fill={saved ? 'currentColor' : 'none'}
              />
              {saved ? t('saved') : t('save')}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat label={t('time', { minutes: recipe.minutes })} />
            <Stat label={t('kcal', { calories: recipe.calories })} />
            <Stat label={t('servings', { count: recipe.servings })} />
          </div>

          {recipe.tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-pill bg-surface-raised border border-border px-2.5 h-6 text-[11px] font-medium text-fg-2 inline-flex items-center"
                >
                  {t(`dietary.${tag}` as 'dietary.vegan')}
                </span>
              ))}
            </div>
          )}

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
                {t('viewRecipe')}
              </p>
              <p className="text-sm text-fg-2 leading-relaxed">
                Full recipe content lives on the recipe row in Supabase. The
                builder in the nutritionist console (Cluster F) writes it; this
                drawer hydrates from the same row in production.
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
                Macros
              </p>
              <ul className="text-sm text-fg-1 font-mono space-y-1" dir="ltr">
                <li>{recipe.calories} kcal</li>
                <li>P {recipe.protein} g</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ label }: { label: string }) {
  return (
    <div className="rounded-lg bg-bg-deeper/50 border border-border px-3 py-2.5 text-center">
      <p className="text-xs font-mono text-fg-1" dir="ltr">
        {label}
      </p>
    </div>
  )
}
