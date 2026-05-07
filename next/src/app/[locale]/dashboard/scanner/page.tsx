'use client'


import { motion } from 'framer-motion'
import { useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import {
  Camera,
  Upload,
  Sparkles,
  Loader2,
  X,
  AlertCircle,
  Lightbulb,
  Zap,
  Check,
  ImageIcon,
} from '@/icons'
import { useUser } from '@/lib/hooks/useUser'
import { ScannerUsageBanner } from '@/components/dashboard/ScannerUsageBanner'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

interface DetectedFood {
  name: string
  confidence: number
  servingLabel: string
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface ScanResult {
  imageUrl: string
  foods: DetectedFood[]
  drNote: string
  alternatives: string[]
}

const MEAL_TYPES: { value: MealType; key: MealType }[] = [
  { value: 'breakfast', key: 'breakfast' },
  { value: 'lunch', key: 'lunch' },
  { value: 'dinner', key: 'dinner' },
  { value: 'snack', key: 'snack' },
]

const FREE_DAILY_LIMIT = 1

function pickGreetingMeal(): MealType {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 21) return 'dinner'
  return 'snack'
}

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export default function ScannerPage() {
  const t = useTranslations('scanner')
  const { tier } = useUser()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const [stage, setStage] = useState<
    'idle' | 'analyzing' | 'result' | 'error' | 'no-food'
  >('idle')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [meal, setMeal] = useState<MealType>(pickGreetingMeal())
  const [logged, setLogged] = useState(false)
  const [scansToday, setScansToday] = useState(0) // Wired to nutrition_logs in Cluster H
  const [dragOver, setDragOver] = useState(false)
  const [noFoodReason, setNoFoodReason] = useState<string | null>(null)

  const isFree = tier === 'free' || tier == null
  const limitHit = isFree && scansToday >= FREE_DAILY_LIMIT
  const scansLeft = Math.max(0, FREE_DAILY_LIMIT - scansToday)

  const startAnalyze = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setLogged(false)
    setStage('analyzing')

    void (async () => {
      // 1. Read the file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result ?? ''))
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // 2. Call /api/scanner — falls back to a friendly demo result
      // when Gemini env isn't configured (503).
      try {
        const res = await fetch('/api/scanner', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mealType: meal }),
        })
        if (res.ok) {
          const data = (await res.json()) as {
            foods: DetectedFood[]
            drNote: string
            alternatives: string[]
            detected?: boolean
            reason?: string
          }
          // Server-side gate said this image isn't food. Don't fabricate
          // calories — surface a clear empty-state message instead.
          if (data.detected === false || !data.foods?.length) {
            setNoFoodReason(
              data.reason ||
                'No food detected. Please point the camera at food or a meal.',
            )
            setStage('no-food')
            return
          }
          setResult({
            imageUrl: url,
            foods: data.foods,
            drNote: data.drNote,
            alternatives: data.alternatives ?? [],
          })
          setStage('result')
          setScansToday((n) => n + 1)
          return
        }
        if (res.status === 429) {
          // Quota — server already enforced it
          setStage('error')
          return
        }
      } catch {
        /* fall through */
      }

      // No food detected / network failure — show the empty state instead
      // of fabricating a demo plate. The API has already enforced quotas
      // and refused non-food images by this point.
      setNoFoodReason(
        'No food detected. Please point the camera at food or a meal.',
      )
      setStage('no-food')
    })()
  }, [meal])

  const handleFile = useCallback(
    (file: File | null | undefined) => {
      if (!file || limitHit) return
      startAnalyze(file)
    },
    [limitHit, startAnalyze],
  )

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault()
      setDragOver(false)
      handleFile(e.dataTransfer.files?.[0])
    },
    [handleFile],
  )

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setResult(null)
    setLogged(false)
    setNoFoodReason(null)
    setStage('idle')
  }

  const total =
    result?.foods.reduce(
      (acc, f) => ({
        calories: acc.calories + f.calories,
        protein: acc.protein + f.protein,
        carbs: acc.carbs + f.carbs,
        fat: acc.fat + f.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    ) ?? { calories: 0, protein: 0, carbs: 0, fat: 0 }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="px-4 md:px-8 py-6 md:py-8 max-w-screen-lg mx-auto space-y-6">
      <ScannerUsageBanner />
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{ fontSize: 'clamp(28px, 4vw, 40px)', lineHeight: 1.1 }}
          >
            <span className="gradient-text">{t('title')}</span>
          </h1>
          <p className="mt-2 text-sm md:text-base text-fg-2">{t('subtitle')}</p>
        </div>
        <QuotaPill
          isFree={isFree}
          left={scansLeft}
          unlimitedLabel={t('unlimitedScans')}
          leftLabel={t('scansLeftToday', { count: scansLeft })}
        />
      </header>

      {/* Main panel */}
      {limitHit && stage === 'idle' ? (
        <LimitCard t={t} />
      ) : stage === 'idle' ? (
        <DropZone
          dragOver={dragOver}
          onDragEnter={() => setDragOver(true)}
          onDragLeave={() => setDragOver(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onPickFile={() => fileInputRef.current?.click()}
          onPickCamera={() => cameraInputRef.current?.click()}
          fileInputRef={fileInputRef}
          cameraInputRef={cameraInputRef}
          onFile={handleFile}
          t={t}
        />
      ) : stage === 'analyzing' ? (
        <AnalyzingCard previewUrl={previewUrl} t={t} />
      ) : stage === 'no-food' ? (
        <NoFoodCard
          previewUrl={previewUrl}
          reason={noFoodReason}
          onRetry={() => {
            setNoFoodReason(null)
            setPreviewUrl(null)
            setStage('idle')
          }}
        />
      ) : stage === 'result' && result ? (
        <ResultPanel
          t={t}
          result={result}
          total={total}
          meal={meal}
          setMeal={setMeal}
          logged={logged}
          onLog={() => setLogged(true)}
          onRescan={reset}
        />
      ) : null}

      {/* Recent scans */}
      <section aria-label={t('recentScans')}>
        <h2 className="text-base font-semibold text-fg-1 mb-3">
          {t('recentScans')}
        </h2>
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-8 text-center">
          <ImageIcon
            className="w-7 h-7 mx-auto mb-3 text-fg-3"
            strokeWidth={1.5}
          />
          <p className="text-sm text-fg-2">{t('noRecentScans')}</p>
        </div>
      </section>
    </motion.div>
  )
}

/* ── Sub-components ──────────────────────────────────────────────── */

function QuotaPill({
  isFree,
  left,
  unlimitedLabel,
  leftLabel,
}: {
  isFree: boolean
  left: number
  unlimitedLabel: string
  leftLabel: string
}) {
  if (!isFree) {
    return (
      <span
        className="hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
        style={{
          background: 'rgba(132,204,22,0.12)',
          border: '1px solid rgba(132,204,22,0.3)',
          color: '#a3e635',
        }}
      >
        <Sparkles className="h-4 w-4 text-yellow-500" strokeWidth={2} />
        {unlimitedLabel}
      </span>
    )
  }
  return (
    <span
      className={`hidden sm:inline-flex items-center gap-1.5 rounded-pill px-3 h-8 text-xs font-semibold ${
        left > 0
          ? 'bg-amber-500/15 text-amber-300'
          : 'bg-rose-500/15 text-rose-300'
      }`}
      style={left > 0 ? { color: '#e8912a' } : undefined}
    >
      <Zap className="w-3.5 h-3.5" strokeWidth={2} />
      {leftLabel}
    </span>
  )
}

function DropZone({
  dragOver,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onPickFile,
  onPickCamera,
  fileInputRef,
  cameraInputRef,
  onFile,
  t,
}: {
  dragOver: boolean
  onDragEnter: () => void
  onDragLeave: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent<HTMLLabelElement>) => void
  onPickFile: () => void
  onPickCamera: () => void
  fileInputRef: React.RefObject<HTMLInputElement>
  cameraInputRef: React.RefObject<HTMLInputElement>
  onFile: (file: File | null | undefined) => void
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="space-y-4">
      <label
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className={`glass-effect relative flex flex-col items-center justify-center min-h-[280px] md:min-h-[360px] rounded-xl border-2 border-dashed transition-colors duration-fast cursor-pointer ${
          dragOver ? 'border-lime-400' : 'hover:border-primary/60'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />

        <div className="flex flex-col items-center gap-4 py-2">
          <Camera className="h-8 w-8 text-purple-500" strokeWidth={1.75} />
          <div className="text-center">
            <p className="text-base font-semibold mb-1 text-fg-1">
              {t('dropHere')}{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  onPickFile()
                }}
                className="text-primary underline underline-offset-2 cursor-pointer"
              >
                {t('chooseFile')}
              </button>
            </p>
            <p className="text-sm text-fg-3">{t('supportedFormats')}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onPickCamera()
            }}
            className="inline-flex items-center gap-2 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-10 px-5 text-sm shadow-lime-glow border border-lime-600/60 hover:-translate-y-px transition-transform"
          >
            <Camera className="w-4 h-4" strokeWidth={2} />
            {t('capture')}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault()
              onPickFile()
            }}
            className="inline-flex items-center gap-2 rounded-pill bg-surface-raised border border-border text-fg-1 font-medium h-10 px-5 text-sm hover:border-primary/60"
          >
            <Upload className="w-4 h-4" strokeWidth={1.75} />
            {t('upload')}
          </button>
        </div>
      </label>
    </div>
  )
}

function NoFoodCard({
  previewUrl,
  reason,
  onRetry,
}: {
  previewUrl: string | null
  reason: string | null
  onRetry: () => void
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ background: '#111', border: '1px solid #1a1a1a' }}
    >
      {previewUrl && (
        <div className="relative w-full aspect-[16/9]" style={{ background: '#080808' }}>
          <Image
            src={previewUrl}
            alt=""
            fill
            unoptimized
            className="object-cover opacity-40"
          />
        </div>
      )}
      <div className="p-10 flex flex-col items-center text-center gap-3">
        <span
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: '#1a1a1a', color: '#333' }}
        >
          <Camera className="w-8 h-8" strokeWidth={1.5} />
        </span>
        <p className="text-sm" style={{ color: '#888' }}>
          {reason ?? 'Point your camera at food'}
        </p>
        <p className="text-xs" style={{ color: '#444' }}>
          We&apos;ll identify it and calculate nutrition
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="btn-primary mt-3"
          style={{ height: 40, padding: '0 20px', borderRadius: 12 }}
        >
          Try another photo
        </button>
      </div>
    </div>
  )
}

function AnalyzingCard({
  previewUrl,
  t,
}: {
  previewUrl: string | null
  t: ReturnType<typeof useTranslations>
}) {
  return (
    <div className="rounded-xl border border-border bg-surface overflow-hidden">
      <div className="relative w-full aspect-[16/9] bg-bg-deeper">
        {previewUrl && (
          <Image
            src={previewUrl}
            alt=""
            fill
            unoptimized
            className="object-cover opacity-70"
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-bg/40 backdrop-blur-sm">
          <Loader2
            className="w-9 h-9 animate-spin text-lime-400"
            strokeWidth={2}
          />
          <p className="text-base font-semibold text-fg-1">{t('analyzing')}</p>
          <p className="text-sm text-fg-2">{t('analyzingBody')}</p>
        </div>
      </div>
    </div>
  )
}

function ResultPanel({
  t,
  result,
  total,
  meal,
  setMeal,
  logged,
  onLog,
  onRescan,
}: {
  t: ReturnType<typeof useTranslations>
  result: ScanResult
  total: { calories: number; protein: number; carbs: number; fat: number }
  meal: MealType
  setMeal: (m: MealType) => void
  logged: boolean
  onLog: () => void
  onRescan: () => void
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Photo */}
      <div className="lg:col-span-2 rounded-xl border border-border bg-surface overflow-hidden">
        <div className="relative w-full aspect-square bg-bg-deeper">
          <Image
            src={result.imageUrl}
            alt=""
            fill
            unoptimized
            className="object-cover"
          />
          <button
            type="button"
            onClick={onRescan}
            aria-label={t('rescan')}
            className="absolute top-3 end-3 w-9 h-9 rounded-full bg-bg/70 backdrop-blur-sm border border-border text-fg-1 hover:bg-bg flex items-center justify-center"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
        <div className="p-4 border-t border-border">
          <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
            {t('drNote')}
          </p>
          <p className="text-sm text-fg-1 leading-relaxed">{result.drNote}</p>
        </div>
      </div>

      {/* Detection + macros */}
      <div className="lg:col-span-3 space-y-4">
        {/* Foods */}
        <article className="rounded-xl border border-border bg-surface p-5">
          <h3 className="text-base font-semibold text-fg-1 mb-4">
            {t('detectedFoods')}
          </h3>
          <ul className="divide-y divide-border">
            {result.foods.map((food) => (
              <li
                key={food.name}
                className="py-3 first:pt-0 last:pb-0 flex items-baseline justify-between gap-4"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-fg-1 truncate">
                    {food.name}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-3">
                    {food.servingLabel} ·{' '}
                    {t('confidence', { pct: food.confidence })}
                  </p>
                </div>
                <p className="font-mono text-sm text-fg-1 shrink-0" dir="ltr">
                  {food.calories}{' '}
                  <span className="text-xs text-fg-3">kcal</span>
                </p>
              </li>
            ))}
          </ul>

          {/* Totals row */}
          <div className="mt-5 pt-4 border-t border-border grid grid-cols-4 gap-2 text-center">
            <Stat label={t('calories')} value={total.calories} unit="kcal" />
            <Stat label={t('protein')} value={total.protein} unit="g" />
            <Stat label={t('carbs')} value={total.carbs} unit="g" />
            <Stat label={t('fat')} value={total.fat} unit="g" />
          </div>
        </article>

        {/* Alternatives */}
        {result.alternatives.length > 0 && (
          <article className="rounded-xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="w-5 h-5 text-lime-400" strokeWidth={1.75} />
              <h3 className="text-sm font-semibold text-fg-1">
                {t('alternatives')}
              </h3>
            </div>
            <ul className="space-y-2">
              {result.alternatives.map((alt) => (
                <li
                  key={alt}
                  className="flex items-start gap-2 text-sm text-fg-2"
                >
                  <span
                    className="mt-2 w-1 h-1 rounded-full bg-lime-400 shrink-0"
                    aria-hidden
                  />
                  {alt}
                </li>
              ))}
            </ul>
          </article>
        )}

        {/* Meal selector + log */}
        <article className="rounded-xl border border-border bg-surface p-5">
          <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
            {t('mealType')}
          </p>
          <div className="flex flex-wrap gap-2 mb-5">
            {MEAL_TYPES.map(({ value, key }) => (
              <button
                key={value}
                type="button"
                onClick={() => setMeal(value)}
                className={`rounded-pill px-4 h-9 text-sm font-medium border transition-colors duration-fast ${
                  meal === value
                    ? 'bg-primary/15 border-primary/40 text-lime-400'
                    : 'bg-surface-raised border-border text-fg-2 hover:border-primary/40'
                }`}
              >
                {t(key)}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onLog}
              disabled={logged}
              className={`inline-flex items-center gap-2 rounded-pill h-11 px-6 text-sm font-semibold transition-all ${
                logged
                  ? 'bg-primary/20 text-lime-400 cursor-default'
                  : 'bg-gradient-to-b from-lime-400 to-lime-600 text-bg shadow-lime-glow border border-lime-600/60 hover:-translate-y-px'
              }`}
            >
              {logged ? (
                <>
                  <Check className="w-4 h-4" strokeWidth={2.25} />
                  {t('mealLogged')}
                </>
              ) : (
                t('logMeal')
              )}
            </button>
            <button
              type="button"
              onClick={onRescan}
              className="inline-flex items-center gap-2 rounded-pill h-11 px-5 text-sm font-medium bg-surface-raised border border-border text-fg-1 hover:border-primary/60"
            >
              {t('rescan')}
            </button>
          </div>
        </article>
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  unit,
}: {
  label: string
  value: number
  unit: string
}) {
  return (
    <div>
      <p className="font-mono text-base font-bold text-fg-1" dir="ltr">
        {Math.round(value)}
        <span className="text-xs text-fg-3 ms-0.5">{unit}</span>
      </p>
      <p className="mt-0.5 text-[11px] uppercase tracking-eyebrow text-fg-3 font-medium">
        {label}
      </p>
    </div>
  )
}

function LimitCard({ t }: { t: ReturnType<typeof useTranslations> }) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 md:p-8 text-center">
      <span
        className="inline-flex w-12 h-12 rounded-full items-center justify-center mb-4"
        style={{ background: 'rgb(232 145 42 / 0.15)', color: '#e8912a' }}
      >
        <AlertCircle className="w-5 h-5" strokeWidth={1.75} />
      </span>
      <h2 className="text-lg font-semibold text-fg-1">{t('limitReached')}</h2>
      <p className="mt-2 text-sm text-fg-2 max-w-md mx-auto">
        {t('limitReachedBody')}
      </p>
    </div>
  )
}
