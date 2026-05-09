'use client'

import { useEffect, useState } from 'react'
import { Calendar, Globe, Save, User } from '@/icons'
import { getBrowserSupabase } from '@/lib/supabase/client'
import { TimeOffManager } from '@/components/nutritionist/TimeOffManager'

type Day = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'

const DAYS: Day[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const DAY_LABEL: Record<Day, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}
const DAY_TO_DOW: Record<Day, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
}
const DOW_TO_DAY: Record<number, Day> = {
  0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat',
}

interface Nutritionist {
  id: string
  full_name: string
  timezone: string
}

interface DayCfg {
  open: boolean
  from: string
  to: string
}

const COMMON_TIMEZONES = [
  'Asia/Amman',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Beirut',
  'Europe/London',
  'Europe/Paris',
  'America/New_York',
  'America/Los_Angeles',
]

function trimTime(t: string): string {
  return t.length >= 5 ? t.slice(0, 5) : t
}

function defaultSchedule(): Record<Day, DayCfg> {
  return {
    mon: { open: true,  from: '09:00', to: '17:00' },
    tue: { open: true,  from: '09:00', to: '17:00' },
    wed: { open: true,  from: '09:00', to: '17:00' },
    thu: { open: true,  from: '09:00', to: '17:00' },
    fri: { open: false, from: '09:00', to: '17:00' },
    sat: { open: true,  from: '10:00', to: '14:00' },
    sun: { open: false, from: '09:00', to: '17:00' },
  }
}

export default function AdminAvailabilityPage() {
  const [nutritionists, setNutritionists] = useState<Nutritionist[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [schedule, setSchedule] = useState<Record<Day, DayCfg>>(defaultSchedule())
  const [timezone, setTimezone] = useState<string>('Asia/Amman')
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [dirty, setDirty] = useState(false)

  // Load list of nutritionists once.
  useEffect(() => {
    let cancelled = false
    void (async () => {
      const supabase = getBrowserSupabase()
      if (!supabase) return
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, timezone')
        .eq('role', 'nutritionist')
        .order('full_name', { ascending: true })
      if (cancelled) return
      type Row = { id: string; full_name: string | null; timezone: string | null }
      const rows = ((data as Row[] | null) ?? []).map((r) => ({
        id: r.id,
        full_name: r.full_name ?? 'Nutritionist',
        timezone: r.timezone ?? 'Asia/Amman',
      }))
      setNutritionists(rows)
      if (rows.length > 0) setSelectedId(rows[0].id)
    })()
    return () => { cancelled = true }
  }, [])

  // Load the selected nutritionist's schedule whenever the picker changes.
  useEffect(() => {
    if (!selectedId) return
    let cancelled = false
    void (async () => {
      const supabase = getBrowserSupabase()
      if (!supabase) return
      type Row = {
        day_of_week: number
        is_open: boolean
        start_time: string
        end_time: string
      }
      const { data } = await supabase
        .from('nutritionist_schedules')
        .select('day_of_week, is_open, start_time, end_time')
        .eq('nutritionist_id', selectedId)
      if (cancelled) return
      const next = defaultSchedule()
      for (const r of (data as Row[] | null) ?? []) {
        const day = DOW_TO_DAY[r.day_of_week]
        if (!day) continue
        next[day] = {
          open: r.is_open,
          from: trimTime(r.start_time),
          to: trimTime(r.end_time),
        }
      }
      setSchedule(next)
      const nut = nutritionists.find((n) => n.id === selectedId)
      if (nut) setTimezone(nut.timezone)
      setDirty(false)
      setSaveState('idle')
    })()
    return () => { cancelled = true }
  }, [selectedId, nutritionists])

  const updateDay = (day: Day, patch: Partial<DayCfg>) => {
    setSchedule((curr) => ({ ...curr, [day]: { ...curr[day], ...patch } }))
    setDirty(true)
    if (saveState === 'saved') setSaveState('idle')
  }

  const save = async () => {
    if (!selectedId) return
    setSaveState('saving')
    const supabase = getBrowserSupabase()
    if (!supabase) {
      setSaveState('idle')
      return
    }

    // Persist working hours
    const rows = DAYS.map((day) => ({
      nutritionist_id: selectedId,
      day_of_week: DAY_TO_DOW[day],
      is_open: schedule[day].open,
      start_time: schedule[day].from,
      end_time: schedule[day].to,
    }))
    await supabase
      .from('nutritionist_schedules')
      .upsert(rows as never, { onConflict: 'nutritionist_id,day_of_week' })

    // Persist timezone (admin can override the nutritionist's stored zone)
    await supabase
      .from('profiles')
      .update({ timezone } as never)
      .eq('id', selectedId)

    // Reflect change in the local cached list so the dropdown stays in sync
    setNutritionists((curr) =>
      curr.map((n) => (n.id === selectedId ? { ...n, timezone } : n)),
    )
    setSaveState('saved')
    setDirty(false)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-fg-1 flex items-center gap-2">
          <Calendar className="w-6 h-6" strokeWidth={1.75} style={{ color: '#a3e635' }} />
          Nutritionist availability
        </h1>
        <p className="text-sm text-fg-3 mt-1">
          Edit working hours, timezone, and time-off windows for any nutritionist.
        </p>
      </header>

      {nutritionists.length === 0 && (
        <div className="rounded-xl border border-dashed border-border bg-surface/50 p-10 text-center text-sm text-fg-3">
          No nutritionists onboarded yet.
        </div>
      )}

      {nutritionists.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <aside className="lg:col-span-3">
            <p className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-3">
              Nutritionists
            </p>
            <ul className="space-y-1">
              {nutritionists.map((n) => {
                const active = n.id === selectedId
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(n.id)}
                      className={`w-full flex items-center gap-2 rounded-md h-10 px-3 text-sm transition-colors ${
                        active
                          ? 'bg-primary/15 text-lime-400 border border-primary/40'
                          : 'bg-surface text-fg-2 border border-border hover:text-fg-1'
                      }`}
                    >
                      <User className="w-4 h-4" strokeWidth={1.75} />
                      <span className="truncate text-start">{n.full_name}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          {/* Main pane */}
          <section className="lg:col-span-9 space-y-6">
            {/* Timezone */}
            <article className="rounded-xl border border-border bg-surface p-5">
              <header className="flex items-center gap-2 mb-3">
                <Globe className="w-4 h-4 text-fg-3" strokeWidth={1.75} />
                <h3 className="text-sm font-semibold text-fg-1">Working timezone</h3>
              </header>
              <select
                value={timezone}
                onChange={(e) => {
                  setTimezone(e.target.value)
                  setDirty(true)
                  if (saveState === 'saved') setSaveState('idle')
                }}
                className="w-full md:w-72 h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm text-fg-1 focus:outline-none focus:border-primary"
              >
                {Array.from(new Set([timezone, ...COMMON_TIMEZONES])).map((tz) => (
                  <option key={tz} value={tz} className="bg-surface">
                    {tz}
                  </option>
                ))}
              </select>
              <p className="text-xs text-fg-3 mt-2">
                Working hours below are interpreted in this timezone. Customers see
                slots formatted in their own timezone.
              </p>
            </article>

            {/* Schedule grid */}
            <article className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
              {DAYS.map((d) => {
                const cfg = schedule[d]
                return (
                  <div key={d} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <div className="w-32 shrink-0">
                      <p className="text-sm font-semibold text-fg-1">{DAY_LABEL[d]}</p>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cfg.open}
                        onChange={(e) => updateDay(d, { open: e.target.checked })}
                        className="accent-lime-400"
                      />
                      <span
                        className={`text-xs font-semibold w-14 ${
                          cfg.open ? 'text-lime-400' : 'text-fg-3'
                        }`}
                      >
                        {cfg.open ? 'Open' : 'Closed'}
                      </span>
                    </label>
                    <div
                      className={`flex items-center gap-2 ms-auto ${
                        cfg.open ? '' : 'opacity-40 pointer-events-none'
                      }`}
                    >
                      <input
                        type="time"
                        value={cfg.from}
                        onChange={(e) => updateDay(d, { from: e.target.value })}
                        className="h-9 rounded-md bg-bg-deeper border border-border px-2 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary"
                        dir="ltr"
                      />
                      <span className="text-xs text-fg-3">—</span>
                      <input
                        type="time"
                        value={cfg.to}
                        onChange={(e) => updateDay(d, { to: e.target.value })}
                        className="h-9 rounded-md bg-bg-deeper border border-border px-2 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary"
                        dir="ltr"
                      />
                    </div>
                  </div>
                )
              })}
            </article>

            {/* Save bar */}
            {(dirty || saveState === 'saved') && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-surface border border-border px-5 py-3">
                <span className="text-xs text-fg-3">
                  {saveState === 'saved' ? 'Saved.' : 'Unsaved changes'}
                </span>
                <button
                  type="button"
                  onClick={save}
                  disabled={saveState === 'saving' || !dirty}
                  className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs shadow-lime-glow border border-lime-600/60 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" strokeWidth={2} />
                  {saveState === 'saving' ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            )}

            {/* Time-off manager (saves itself, doesn't go through the save bar) */}
            <TimeOffManager nutritionistId={selectedId} />
          </section>
        </div>
      )}
    </div>
  )
}
