'use client'

/**
 * Icon module alias — wraps every commonly used Lucide icon in a
 * 32×32 lime-tinted tile by default. Anywhere a dashboard page
 * already imports from 'lucide-react', flip the import to '@/icons'
 * and every icon picks up the tile automatically.
 *
 * Escape hatch:
 *   <Flame noTile size={14} />     ← render the bare svg, no tile.
 *
 * Custom dimensions:
 *   <Flame tileSize={40} size={20} />
 *
 * Pre-tinted icons (per the design spec):
 *   - Lime (default):  Flame, Utensils, Apple, TrendingUp, Activity,
 *                      ShoppingBag, MessageCircle, Bell, BookOpen,
 *                      ChefHat, Camera, Users, BarChart2, Settings,
 *                      Shield
 *   - Blue (water/calendar/scale): Droplets, CalendarDays, Scale, Clock
 *   - Amber (streak/sun/target/star/zap/truck): Sparkles, Sun, Target,
 *                                                Star, Zap, Truck
 *   - Violet (Pill, Moon)
 *   - Orange (Coffee)
 *   - Red (Heart)
 *   - Green (CheckCircle)
 *
 * Anything not enumerated here is re-exported from lucide-react
 * unchanged via `export * from 'lucide-react'`.
 */

import * as Lucide from 'lucide-react'

type TiledProps = Lucide.LucideProps & {
  tileSize?: number
  noTile?: boolean
}

function tile(
  Icon: Lucide.LucideIcon,
  bg = 'rgba(132,204,22,0.12)',
  color = '#a3e635',
) {
  function TiledIcon({
    size = 16,
    tileSize = 32,
    noTile = false,
    ...props
  }: TiledProps) {
    if (noTile) {
      return (
        <Icon
          size={size}
          color={color}
          strokeWidth={1.75}
          {...props}
        />
      )
    }
    return (
      <span
        style={{
          width: tileSize,
          height: tileSize,
          minWidth: tileSize,
          borderRadius: Math.round(tileSize * 0.25),
          background: bg,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={size} color={color} strokeWidth={1.75} {...props} />
      </span>
    )
  }
  // Cast to LucideIcon so consumers passing the icon as
  // `Icon: LucideIcon` props (KpiCard, StatCard, etc.) typecheck.
  // The runtime shape is a regular function component which React
  // accepts the same way it accepts a ForwardRefExoticComponent.
  return TiledIcon as unknown as Lucide.LucideIcon
}

// ── Lime tiles (default) ─────────────────────────────────────────
export const Flame = tile(Lucide.Flame)
export const Utensils = tile(Lucide.Utensils)
export const Apple = tile(Lucide.Apple)
export const TrendingUp = tile(Lucide.TrendingUp)
export const Activity = tile(Lucide.Activity)
export const ShoppingBag = tile(Lucide.ShoppingBag)
export const MessageCircle = tile(Lucide.MessageCircle)
export const Bell = tile(Lucide.Bell)
export const BookOpen = tile(Lucide.BookOpen)
export const ChefHat = tile(Lucide.ChefHat)
export const Camera = tile(Lucide.Camera)
export const Users = tile(Lucide.Users)
export const BarChart2 = tile(Lucide.BarChart2)
export const Settings = tile(Lucide.Settings)
export const Shield = tile(Lucide.Shield)

// ── Blue tiles (water / calendar / scale / clock) ────────────────
export const Droplets = tile(Lucide.Droplets, 'rgba(96,165,250,0.12)', '#60a5fa')
export const CalendarDays = tile(Lucide.CalendarDays, 'rgba(96,165,250,0.12)', '#60a5fa')
export const Scale = tile(Lucide.Scale, 'rgba(96,165,250,0.12)', '#60a5fa')
export const Clock = tile(Lucide.Clock, 'rgba(96,165,250,0.12)', '#60a5fa')

// ── Amber tiles (streak / sun / target / star / zap / truck) ─────
export const Sparkles = tile(Lucide.Sparkles, 'rgba(251,191,36,0.12)', '#fbbf24')
export const Sun = tile(Lucide.Sun, 'rgba(251,191,36,0.12)', '#fbbf24')
export const Target = tile(Lucide.Target, 'rgba(251,191,36,0.12)', '#fbbf24')
export const Star = tile(Lucide.Star, 'rgba(251,191,36,0.12)', '#fbbf24')
export const Zap = tile(Lucide.Zap, 'rgba(251,191,36,0.12)', '#fbbf24')
export const Truck = tile(Lucide.Truck, 'rgba(251,191,36,0.12)', '#fbbf24')

// ── Violet (Pill / Moon) ─────────────────────────────────────────
export const Pill = tile(Lucide.Pill, 'rgba(167,139,250,0.12)', '#a78bfa')
export const Moon = tile(Lucide.Moon, 'rgba(96,165,250,0.12)', '#818cf8')

// ── Orange (Coffee) ──────────────────────────────────────────────
export const Coffee = tile(Lucide.Coffee, 'rgba(251,191,36,0.12)', '#fb923c')

// ── Red (Heart) ──────────────────────────────────────────────────
export const Heart = tile(Lucide.Heart, 'rgba(248,113,113,0.12)', '#f87171')

// ── Green (CheckCircle) ──────────────────────────────────────────
export const CheckCircle = tile(Lucide.CheckCircle, 'rgba(74,222,128,0.12)', '#4ade80')

// Everything else (ChevronLeft, X, Plus, ArrowRight, Check,
// CheckCheck, Search, Trash2, etc.) re-exports unchanged. This
// keeps existing chip / button / inline icons rendering exactly
// as they did, so the alias swap is non-breaking for those.
export * from 'lucide-react'
