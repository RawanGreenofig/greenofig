'use client'

import { useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useUser } from '@/lib/hooks/useUser'
import { getBrowserSupabase } from '@/lib/supabase/client'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Coffee,
  Sun,
  Moon,
  Cookie,
  Droplets,
  Pill,
  Trash2,
  Search,
  X,
  type LucideIcon,
} from 'lucide-react'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

interface FoodEntry {
  id: string
  name: string
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface Supplement {
  id: string
  name: string
  dose: string
}

const MEAL_ORDER: { type: MealType; Icon: LucideIcon; tint: string }[] = [
  { type: 'breakfast', Icon: Coffee,  tint: '#f97316' },
  { type: 'lunch',     Icon: Sun,     tint: '#eab308' },
  { type: 'dinner',    Icon: Moon,    tint: '#a855f7' },
  { type: 'snack',     Icon: Cookie,  tint: '#06b6d4' },
]

const COMMON_FOODS: Omit<FoodEntry, 'id'>[] = [
  { name: 'Greek yogurt',          servingLabel: '170 g',  calories: 100, protein: 17, carbs: 6,  fat: 0 },
  { name: 'Banana',                servingLabel: '1 medium', calories: 105, protein: 1,  carbs: 27, fat: 0 },
  { name: 'Oatmeal, cooked',       servingLabel: '1 cup',  calories: 158, protein: 6,  carbs: 27, fat: 3 },
  { name: 'Chicken breast, grilled', servingLabel: '120 g', calories: 198, protein: 37, carbs: 0,  fat: 4 },
  { name: 'Brown rice, cooked',    servingLabel: '150 g',  calories: 165, protein: 4,  carbs: 35, fat: 1 },
  { name: 'Avocado',               servingLabel: '½ fruit', calories: 120, protein: 1,  carbs: 6,  fat: 11 },
  { name: 'Almonds',               servingLabel: '28 g',   calories: 164, protein: 6,  carbs: 6,  fat: 14 },
  { name: 'Egg, boiled',           servingLabel: '1 large', calories: 78,  protein: 6,  carbs: 1,  fat: 5 },
  { name: 'Salmon, baked',         servingLabel: '100 g',  calories: 208, protein: 22, carbs: 0,  fat: 13 },
  { name: 'Olive oil',             servingLabel: '1 tbsp', calories: 119, protein: 0,  carbs: 0,  fat: 14 },
]

const TARGETS = { calories: 1840, protein: 120, carbs: 200, fat: 60 }

function formatDateKey(d: Date) {
  return d.toISOString().slice(0, 10)
}
function isSameDay(a: Date, b: Date) {
  return formatDateKey(a) === formatDateKey(b)
}

export default function TrackPage() {
  const t = useTranslations('track')
  const tScanner = useTranslations('scanner')

  const { profile } = useUser()
  const userId = profile?.id ?? null

  const [date, setDate] = useState<Date>(() => new Date())
  const [entries, setEntries] = useState<Record<MealType, FoodEntry[]>>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  })
  const [waterGlasses, setWaterGlasses] = useState(0)
  const [supplements, setSupplements] = useState<Supplement[]>([])
  const [pickerOpen, setPickerOpen] = useState<MealType | null>(null)

  // Hydrate the day's logs from Supabase. Falls back to local state when
  // env unset (no-op in dev) so the seed UX still works.
  useEffect(() => {
    if (!userId) return
    const supabase = getBrowserSupabase()
    if (!supabase) return

    let cancelled = false
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart)
    dayEnd.setDate(dayEnd.getDate() + 1)

    void (async () => {
      const { data } = await supabase
        .from('nutrition_logs')
        .select('id, food_name, serving_size, calories, protein_g, carbs_g, fat_g, meal_type, source')
        .eq('user_id', userId)
        .gte('logged_at', dayStart.toISOString())
        .lt('logged_at', dayEnd.toISOString())
        .order('logged_at', { ascending: true })

      if (cancelled) return
      type LogRow = {
        id: string
        food_name: string
        serving_size: string | null
        calories: number | null
        protein_g: number | null
        carbs_g: number | null
        fat_g: number | null
        meal_type: string | null
      }
      const rows = (data as LogRow[] | null) ?? []
      const next: Record<MealType, FoodEntry[]> = {
        breakfast: [], lunch: [], dinner: [], snack: [],
      }
      for (const row of rows) {
        const meal = (
          row.meal_type === 'breakfast' || row.meal_type === 'lunch' ||
          row.meal_type === 'dinner'    || row.meal_type === 'snack'
            ? row.meal_type : 'snack'
        ) as MealType
        next[meal].push({
          id: row.id,
          name: row.food_name,
          servingLabel: row.serving_size ?? '1 serving',
          calories: row.calories ?? 0,
          protein: row.protein_g ?? 0,
          carbs: row.carbs_g ?? 0,
          fat: row.fat_g ?? 0,
        })
      }
      setEntries(next)
    })()

    return () => { cancelled = true }
  }, [userId, date])

  const totals = useMemo(() => {
    const all = Object.values(entries).flat()
    return all.reduce(
      (acc, f) => ({
        calories: acc.calories + f.calories,
        protein: acc.protein + f.protein,
        carbs: acc.carbs + f.carbs,
        fat: acc.fat + f.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    )
  }, [entries])

  const addEntry = (meal: MealType, food: Omit<FoodEntry, 'id'>) => {
    const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setEntries((prev) => ({
      ...prev,
      [meal]: [...prev[meal], { ...food, id: localId }],
    }))
    setPickerOpen(null)

    // Persist to Supabase (best-effort) and swap the local id for the
    // real row id when the insert returns.
    const supabase = getBrowserSupabase()
    if (supabase && userId) {
      void supabase
        .from('nutrition_logs')
        .insert({
          user_id: userId,
          meal_type: meal,
          food_name: food.name,
          serving_size: food.servingLabel,
          calories: food.calories,
          protein_g: food.protein,
          carbs_g: food.carbs,
          fat_g: food.fat,
          source: 'manual',
          logged_at: date.toISOString(),
        } as never)
        .select('id')
        .maybeSingle()
        .then(({ data }) => {
          const realId = (data as { id?: string } | null)?.id
          if (!realId) return
          setEntries((prev) => ({
            ...prev,
            [meal]: prev[meal].map((e) =>
              e.id === localId ? { ...e, id: realId } : e,
            ),
          }))
        })
    }
  }

  const removeEntry = (meal: MealType, id: string) => {
    const supabase = getBrowserSupabase()
    if (supabase && userId && /^[0-9a-f-]{32,}$/i.test(id)) {
      void supabase.from('nutrition_logs').delete().eq('id', id)
    }
    setEntries((prev) => ({
      ...prev,
      [meal]: prev[meal].filter((e) => e.id !== id),
    }))
  }

  const isToday = isSameDay(date, new Date())
  const dateLabel = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="px-4 md:px-8 py-6 md:py-8 max-w-screen-xl mx-auto space-y-6">
      {/* Header + date nav */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            {t('title')}
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
        </div>
        <DatePager
          date={date}
          dateLabel={dateLabel}
          isToday={isToday}
          onChange={setDate}
        />
      </header>

      {/* Totals */}
      <TotalsCard t={t} totals={totals} />

      {/* Meals */}
      <section aria-label="Meals" className="space-y-4">
        {MEAL_ORDER.map(({ type, Icon, tint }) => (
          <MealSection
            key={type}
            t={t}
            tScanner={tScanner}
            type={type}
            Icon={Icon}
            tint={tint}
            entries={entries[type]}
            onAdd={() => setPickerOpen(type)}
            onRemove={(id) => removeEntry(type, id)}
          />
        ))}
      </section>

      {/* Water + Supplements */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WaterCard
          t={t}
          glasses={waterGlasses}
          onChange={setWaterGlasses}
        />
        <SupplementsCard
          t={t}
          supplements={supplements}
          onAdd={(s) => setSupplements((prev) => [...prev, s])}
          onRemove={(id) =>
            setSupplements((prev) => prev.filter((s) => s.id !== id))
          }
        />
      </section>

      {/* Food picker modal */}
      {pickerOpen && (
        <FoodPicker
          t={t}
          tScanner={tScanner}
          meal={pickerOpen}
          onClose={() => setPickerOpen(null)}
          onPick={(food) => addEntry(pickerOpen, food)}
        />
      )}
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────── */

function DatePager({
  date,
  dateLabel,
  isToday,
  onChange,
}: {
  date: Date
  dateLabel: string
  isToday: boolean
  onChange: (d: Date) => void
}) {
  const shift = (delta: number) => {
    const next = new Date(date)
    next.setDate(next.getDate() + delta)
    onChange(next)
  }
  return (
    <div className="inline-flex items-center gap-1 rounded-pill bg-surface border border-border p-1">
      <button
        type="button"
        onClick={() => shift(-1)}
        className="w-9 h-9 rounded-full inline-flex items-center justify-center text-fg-2 hover:text-fg-1 hover:bg-surface-raised"
        aria-label="Previous day"
      >
        <ChevronLeft className="w-4 h-4 rtl:rotate-180" strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => onChange(new Date())}
        className={`px-4 h-9 rounded-pill text-sm font-medium transition-colors ${
          isToday
            ? 'bg-primary/15 text-lime-400'
            : 'text-fg-1 hover:bg-surface-raised'
        }`}
      >
        {dateLabel}
      </button>
      <button
        type="button"
        onClick={() => shift(1)}
        className="w-9 h-9 rounded-full inline-flex items-center justify-center text-fg-2 hover:text-fg-1 hover:bg-surface-raised disabled:opacity-30"
        aria-label="Next day"
        disabled={isToday}
      >
        <ChevronRight className="w-4 h-4 rtl:rotate-180" strokeWidth={1.75} />
      </button>
    </div>
  )
}

function TotalsCard({
  t,
  totals,
}: {
  t: ReturnType<typeof useTranslations>
  totals: { calories: number; protein: number; carbs: number; fat: number }
}) {
  return (
    <article className="rounded-xl border border-border bg-surface p-5 md:p-6">
      <div className="flex items-baseline justify-between gap-4 mb-5">
        <h2 className="text-base font-semibold text-fg-1">{t('todayTotals')}</h2>
        <p className="font-mono text-sm text-fg-3" dir="ltr">
          <span className="text-fg-1 text-2xl font-bold">
            {Math.round(totals.calories)}
          </span>
          <span className="ms-1.5">/ {TARGETS.calories} kcal</span>
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MacroBar label={t('calories')} value={totals.calories} target={TARGETS.calories} unit="kcal" color="#84cc16" />
        <MacroBar label={t('protein')}  value={totals.protein}  target={TARGETS.protein}  unit="g" color="#3b82f6" />
        <MacroBar label={t('carbs')}    value={totals.carbs}    target={TARGETS.carbs}    unit="g" color="#f97316" />
        <MacroBar label={t('fat')}      value={totals.fat}      target={TARGETS.fat}      unit="g" color="#a855f7" />
      </div>
    </article>
  )
}

function MacroBar({
  label,
  value,
  target,
  unit,
  color,
}: {
  label: string
  value: number
  target: number
  unit: string
  color: string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: 'var(--gf-surface-raised)',
        border: '1px solid var(--gf-border)',
      }}
    >
      <p
        className="text-[11px] uppercase tracking-eyebrow font-medium"
        style={{ color: 'var(--gf-fg-3)' }}
      >
        {label}
      </p>
      <p
        className="mt-1 font-mono text-base font-bold"
        style={{ color: 'var(--gf-fg-1)' }}
        dir="ltr"
      >
        {Math.round(value)}
        <span className="text-xs ms-0.5" style={{ color: 'var(--gf-fg-3)' }}>
          /{target}{unit}
        </span>
      </p>
      <div
        className="mt-2 h-1 rounded-pill overflow-hidden"
        style={{ background: 'var(--gf-border)' }}
      >
        <div
          className="h-full rounded-pill transition-all duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

function MealSection({
  t,
  tScanner,
  type,
  Icon,
  tint,
  entries,
  onAdd,
  onRemove,
}: {
  t: ReturnType<typeof useTranslations>
  tScanner: ReturnType<typeof useTranslations>
  type: MealType
  Icon: LucideIcon
  tint: string
  entries: FoodEntry[]
  onAdd: () => void
  onRemove: (id: string) => void
}) {
  const totalKcal = entries.reduce((acc, e) => acc + e.calories, 0)
  return (
    <article className="rounded-xl border border-border bg-surface overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${tint}1a`, color: tint }}
          >
            <Icon className="w-4 h-4" strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-fg-1">
              {tScanner(type)}
            </h3>
            <p className="text-xs text-fg-3 font-mono" dir="ltr">
              {totalKcal} kcal
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-pill h-9 px-4 text-xs font-semibold bg-primary/15 text-lime-400 hover:bg-primary/25"
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          {t('addFood')}
        </button>
      </header>

      {entries.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-fg-3">{t('noEntries')}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-4 px-5 py-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg-1 truncate">
                  {entry.name}
                </p>
                <p className="mt-0.5 text-xs text-fg-3" dir="ltr">
                  {entry.servingLabel} · P{Math.round(entry.protein)} · C
                  {Math.round(entry.carbs)} · F{Math.round(entry.fat)}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="font-mono text-sm text-fg-1" dir="ltr">
                  {entry.calories}
                  <span className="text-xs text-fg-3 ms-1">kcal</span>
                </p>
                <button
                  type="button"
                  onClick={() => onRemove(entry.id)}
                  aria-label={t('deleteEntry')}
                  className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-rose-400 hover:bg-surface-raised"
                >
                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function WaterCard({
  t,
  glasses,
  onChange,
}: {
  t: ReturnType<typeof useTranslations>
  glasses: number
  onChange: (v: number) => void
}) {
  const TARGET = 8
  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'rgb(6 182 212 / 0.15)', color: '#06b6d4' }}
          >
            <Droplets className="w-4 h-4" strokeWidth={1.75} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-fg-1">{t('water')}</h3>
            <p className="text-xs text-fg-3 font-mono" dir="ltr">
              {t('waterGlasses', { count: glasses })} / {TARGET}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(TARGET + 4, glasses + 1))}
          className="inline-flex items-center gap-1.5 rounded-pill h-9 px-4 text-xs font-semibold bg-cyan-500/15 text-cyan-300 hover:bg-cyan-500/25"
          style={{ color: '#06b6d4' }}
        >
          <Plus className="w-3.5 h-3.5" strokeWidth={2} />
          {t('addGlass')}
        </button>
      </div>
      <div className="grid grid-cols-8 gap-1.5">
        {Array.from({ length: TARGET }).map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1 === glasses ? i : i + 1)}
            className="aspect-square rounded-md border transition-colors"
            style={{
              background:
                i < glasses ? 'rgb(6 182 212 / 0.6)' : 'var(--gf-bg-deeper)',
              borderColor:
                i < glasses
                  ? 'rgb(6 182 212 / 0.8)'
                  : 'var(--gf-border)',
            }}
            aria-label={`Glass ${i + 1}`}
          />
        ))}
      </div>
    </article>
  )
}

function SupplementsCard({
  t,
  supplements,
  onAdd,
  onRemove,
}: {
  t: ReturnType<typeof useTranslations>
  supplements: Supplement[]
  onAdd: (s: Supplement) => void
  onRemove: (id: string) => void
}) {
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [adding, setAdding] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    onAdd({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      dose: dose.trim(),
    })
    setName('')
    setDose('')
    setAdding(false)
  }

  return (
    <article className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: 'rgb(168 85 247 / 0.15)', color: '#a855f7' }}
          >
            <Pill className="w-4 h-4" strokeWidth={1.75} />
          </span>
          <h3 className="text-sm font-semibold text-fg-1">{t('supplements')}</h3>
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-pill h-9 px-4 text-xs font-semibold bg-purple-500/15 hover:bg-purple-500/25"
            style={{ color: '#a855f7' }}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            {t('addSupplement')}
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={submit} className="mb-4 space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Vitamin D3"
            autoFocus
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
          />
          <input
            type="text"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
            placeholder="2000 IU"
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 rounded-md bg-primary/20 text-lime-400 h-9 text-xs font-semibold hover:bg-primary/30"
            >
              {t('addSupplement')}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false)
                setName('')
                setDose('')
              }}
              className="px-3 rounded-md bg-surface-raised text-fg-2 h-9 text-xs font-medium hover:text-fg-1"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        </form>
      )}

      {supplements.length === 0 ? (
        <p className="text-sm text-fg-3">{t('noSupplements')}</p>
      ) : (
        <ul className="space-y-2">
          {supplements.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 rounded-md bg-bg-deeper/50 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-fg-1 truncate">{s.name}</p>
                {s.dose && (
                  <p className="text-xs text-fg-3 mt-0.5">{s.dose}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onRemove(s.id)}
                aria-label={t('deleteEntry')}
                className="w-8 h-8 rounded-md inline-flex items-center justify-center text-fg-3 hover:text-rose-400"
              >
                <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

function FoodPicker({
  t,
  tScanner,
  meal,
  onClose,
  onPick,
}: {
  t: ReturnType<typeof useTranslations>
  tScanner: ReturnType<typeof useTranslations>
  meal: MealType
  onClose: () => void
  onPick: (food: Omit<FoodEntry, 'id'>) => void
}) {
  const [query, setQuery] = useState('')
  const filtered = COMMON_FOODS.filter((f) =>
    f.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('addFood')}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-bg-deeper/70 backdrop-blur-sm"
      />
      <div className="relative w-full md:max-w-lg max-h-[85vh] md:max-h-[80vh] flex flex-col rounded-t-2xl md:rounded-2xl bg-surface border border-border shadow-2xl">
        <header className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div>
            <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold">
              {tScanner(meal)}
            </p>
            <h3 className="text-base font-semibold text-fg-1 mt-0.5">
              {t('addFood')}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-md inline-flex items-center justify-center bg-surface-raised text-fg-2 hover:text-fg-1"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </header>

        <div className="px-5 py-3 border-b border-border shrink-0">
          <div className="relative">
            <Search
              className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-3"
              strokeWidth={1.75}
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              autoFocus
              className="w-full h-10 rounded-md bg-bg-deeper border border-border ps-9 pe-3 text-sm text-fg-1 placeholder-fg-3 focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <p className="px-5 pt-4 pb-2 text-[11px] uppercase tracking-eyebrow text-fg-3 font-semibold">
            {t('commonFoods')}
          </p>
          <ul className="px-2 pb-3">
            {filtered.map((food) => (
              <li key={food.name}>
                <button
                  type="button"
                  onClick={() => onPick(food)}
                  className="w-full text-start rounded-md px-3 py-3 hover:bg-surface-raised flex items-center justify-between gap-4 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-fg-1 truncate">
                      {food.name}
                    </p>
                    <p className="mt-0.5 text-xs text-fg-3" dir="ltr">
                      {food.servingLabel} · P{food.protein} · C{food.carbs} · F
                      {food.fat}
                    </p>
                  </div>
                  <p className="font-mono text-sm text-fg-1 shrink-0" dir="ltr">
                    {food.calories}
                    <span className="text-xs text-fg-3 ms-1">kcal</span>
                  </p>
                </button>
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-6 text-center text-sm text-fg-3">
                No matches
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  )
}
