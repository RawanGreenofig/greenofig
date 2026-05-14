'use client'

/**
 * /[locale]/settings/notifications — meal / hydration / workout
 * reminder preferences for the Capacitor wrapper's local
 * notifications.
 *
 * English-only strings on purpose: shipping the wiring first, the
 * messages/{en,ar}.json pass is a follow-up. The page itself
 * renders fine on web — toggles persist to Supabase — but only
 * the Android wrapper actually schedules the reminders. We make
 * that explicit in a banner on the web.
 */

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { isInsideCapacitor } from '@/lib/is-capacitor'
import {
  applyToDevice,
  fetchPreferences,
  upsertPreferences,
  requestPermissionIfNeeded,
  type WritablePrefs,
} from '@/lib/notifications/sync'
import { DEFAULT_PREFS } from '@/lib/notifications/types'

/** "08:00:00" (postgres time) ↔ "08:00" (HTML <input type="time">) */
function pgToInput(t: string): string {
  return (t || '').slice(0, 5)
}
function inputToPg(t: string): string {
  // <input type="time"> emits "HH:MM"; pad seconds for postgres.
  return /^\d{2}:\d{2}$/.test(t) ? `${t}:00` : t
}

export default function NotificationSettingsPage() {
  const { user, isLoading } = useAuth()
  const [prefs, setPrefs] = useState<WritablePrefs>(() => ({ ...DEFAULT_PREFS }))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'saved'; rescheduled: boolean }
    | { kind: 'error'; message: string }
  >({ kind: 'idle' })

  const insideCap = useMemo(() => isInsideCapacitor(), [])

  // Initial load. We don't gate on `isLoading` from auth — the
  // page can render defaults while the fetch is in flight, then
  // hydrate. Avoids a full-screen spinner for a 1-row read.
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      const next = await fetchPreferences(user.id)
      if (!cancelled) {
        setPrefs(next)
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user?.id])

  const onSave = async () => {
    if (!user?.id || saving) return
    setSaving(true)
    setStatus({ kind: 'idle' })
    const res = await upsertPreferences(user.id, prefs)
    if (!res.ok) {
      setStatus({ kind: 'error', message: res.error })
      setSaving(false)
      return
    }
    // Re-apply to the device queue right away. If we're on the
    // web this is a no-op; the wrapper picks the new prefs up the
    // next time the user opens the app.
    let rescheduled = false
    if (insideCap) {
      // Make sure permission is granted before scheduling — if
      // the user has never opened the app's notification gate,
      // this is the moment to ask.
      const granted = await requestPermissionIfNeeded()
      if (granted) rescheduled = await applyToDevice(prefs)
    }
    setStatus({ kind: 'saved', rescheduled })
    setSaving(false)
  }

  if (!isLoading && !user) {
    return (
      <div className="min-h-[60vh] mx-auto max-w-md px-6 py-16 text-center text-[#a8b5a8]">
        You need to be signed in to manage notification preferences.
      </div>
    )
  }

  return (
    <main className="min-h-screen px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-8">
          <h1 className="text-2xl font-semibold text-[#f0ede6] sm:text-3xl">
            Notifications
          </h1>
          <p className="mt-2 text-sm text-[#a8b5a8]">
            On-device reminders for meals, hydration, and workouts.
            Stored on your account so they follow you to a new
            install.
          </p>
        </header>

        {!insideCap && (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            These reminders are delivered by the Greenofig Android
            app. Saving here updates your preferences — the
            notifications themselves will appear next time you open
            the app on your phone.
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-8 text-center text-sm text-[#a8b5a8]">
            Loading preferences…
          </div>
        ) : (
          <div className="space-y-4">
            <ReminderCard
              title="Breakfast"
              description="Time for breakfast! Log your meal 🍳"
              enabled={prefs.breakfast_enabled}
              onToggle={(v) =>
                setPrefs((p) => ({ ...p, breakfast_enabled: v }))
              }
              time={pgToInput(prefs.breakfast_time)}
              onTime={(v) =>
                setPrefs((p) => ({ ...p, breakfast_time: inputToPg(v) }))
              }
            />
            <ReminderCard
              title="Lunch"
              description="Don't forget to log your lunch 🥗"
              enabled={prefs.lunch_enabled}
              onToggle={(v) => setPrefs((p) => ({ ...p, lunch_enabled: v }))}
              time={pgToInput(prefs.lunch_time)}
              onTime={(v) =>
                setPrefs((p) => ({ ...p, lunch_time: inputToPg(v) }))
              }
            />
            <ReminderCard
              title="Dinner"
              description="Log your dinner and stay on track 🍽️"
              enabled={prefs.dinner_enabled}
              onToggle={(v) => setPrefs((p) => ({ ...p, dinner_enabled: v }))}
              time={pgToInput(prefs.dinner_time)}
              onTime={(v) =>
                setPrefs((p) => ({ ...p, dinner_time: inputToPg(v) }))
              }
            />
            <ReminderCard
              title="Workout"
              description="Time to move! Your workout is waiting 💪"
              enabled={prefs.workout_enabled}
              onToggle={(v) =>
                setPrefs((p) => ({ ...p, workout_enabled: v }))
              }
              time={pgToInput(prefs.workout_time)}
              onTime={(v) =>
                setPrefs((p) => ({ ...p, workout_time: inputToPg(v) }))
              }
            />

            {/* Hydration is a range, not a single time, so it has its
                own card with start/end + interval. */}
            <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-[#f0ede6]">
                    Hydration
                  </h2>
                  <p className="mt-1 text-sm text-[#a8b5a8]">
                    Stay hydrated! Drink a glass of water 💧
                  </p>
                </div>
                <Toggle
                  checked={prefs.hydration_enabled}
                  onChange={(v) =>
                    setPrefs((p) => ({ ...p, hydration_enabled: v }))
                  }
                  ariaLabel="Hydration reminders"
                />
              </div>
              {prefs.hydration_enabled && (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <Field label="Start">
                    <TimeInput
                      value={pgToInput(prefs.hydration_start_time)}
                      onChange={(v) =>
                        setPrefs((p) => ({
                          ...p,
                          hydration_start_time: inputToPg(v),
                        }))
                      }
                    />
                  </Field>
                  <Field label="End">
                    <TimeInput
                      value={pgToInput(prefs.hydration_end_time)}
                      onChange={(v) =>
                        setPrefs((p) => ({
                          ...p,
                          hydration_end_time: inputToPg(v),
                        }))
                      }
                    />
                  </Field>
                  <Field label="Every">
                    <select
                      value={prefs.hydration_interval_hours}
                      onChange={(e) =>
                        setPrefs((p) => ({
                          ...p,
                          hydration_interval_hours: Number(e.target.value),
                        }))
                      }
                      className="h-11 w-full rounded-lg border border-white/10 bg-[#162b1e] px-3 text-sm text-[#f0ede6] focus:border-[#a3e635] focus:outline-none"
                    >
                      {[1, 2, 3, 4].map((h) => (
                        <option key={h} value={h}>
                          {h} {h === 1 ? 'hour' : 'hours'}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 flex items-center gap-3">
          <button
            type="button"
            onClick={onSave}
            disabled={saving || loading || !user?.id}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-b from-[#a3e635] to-[#84cc16] px-6 text-sm font-semibold text-[#0d1a12] shadow-[0_8px_22px_rgba(132,217,61,0.3)] disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {status.kind === 'saved' && (
            <span className="text-sm text-[#a3e635]">
              Saved.
              {insideCap && status.rescheduled
                ? ' Reminders rescheduled on this device.'
                : !insideCap
                  ? ' Open the app to apply.'
                  : ''}
            </span>
          )}
          {status.kind === 'error' && (
            <span className="text-sm text-red-300">
              Could not save: {status.message}
            </span>
          )}
        </div>
      </div>
    </main>
  )
}

function ReminderCard({
  title,
  description,
  enabled,
  onToggle,
  time,
  onTime,
}: {
  title: string
  description: string
  enabled: boolean
  onToggle: (v: boolean) => void
  time: string
  onTime: (v: string) => void
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-[#f0ede6]">{title}</h2>
          <p className="mt-1 text-sm text-[#a8b5a8]">{description}</p>
        </div>
        <Toggle
          checked={enabled}
          onChange={onToggle}
          ariaLabel={`${title} reminder`}
        />
      </div>
      {enabled && (
        <div className="mt-4">
          <Field label="Time">
            <TimeInput value={time} onChange={onTime} />
          </Field>
        </div>
      )}
    </div>
  )
}

function Toggle({
  checked,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
        checked ? 'bg-[#84cc16]' : 'bg-white/10'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#a8b5a8]">
        {label}
      </span>
      {children}
    </label>
  )
}

function TimeInput({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <input
      type="time"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full rounded-lg border border-white/10 bg-[#162b1e] px-3 text-sm text-[#f0ede6] focus:border-[#a3e635] focus:outline-none"
    />
  )
}
