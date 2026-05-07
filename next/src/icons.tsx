'use client'

/**
 * Icon module alias — re-exports every commonly used Lucide icon
 * with a default colour preset (lime / blue / amber / etc.) so
 * dashboard pages don't have to repeat colour Tailwind classes.
 *
 * Default render is FLAT: a coloured svg, no tile wrapper. Use
 * the existing <IconTile icon={X}> component (or .icon-tile
 * className) when a tile is wanted.
 *
 * Sizing: pass `size` (number, in px) or rely on the className
 * (e.g. `className="h-4 w-4"`) — both work. strokeWidth defaults
 * to 1.75 to match the rest of the design system.
 *
 * Anything not enumerated here re-exports from lucide-react
 * unchanged via `export * from 'lucide-react'`.
 */

import * as Lucide from 'lucide-react'

function colored(Icon: Lucide.LucideIcon, color: string) {
  function ColoredIcon({
    size,
    color: overrideColor,
    strokeWidth = 1.75,
    ...props
  }: Lucide.LucideProps) {
    return (
      <Icon
        size={size}
        color={overrideColor ?? color}
        strokeWidth={strokeWidth}
        {...props}
      />
    )
  }
  return ColoredIcon as unknown as Lucide.LucideIcon
}

// ── Lime tint (default accent) ───────────────────────────────────
export const Flame = colored(Lucide.Flame, '#a3e635')
export const Utensils = colored(Lucide.Utensils, '#a3e635')
export const Apple = colored(Lucide.Apple, '#a3e635')
export const TrendingUp = colored(Lucide.TrendingUp, '#a3e635')
export const Activity = colored(Lucide.Activity, '#a3e635')
export const ShoppingBag = colored(Lucide.ShoppingBag, '#a3e635')
export const MessageCircle = colored(Lucide.MessageCircle, '#a3e635')
export const Bell = colored(Lucide.Bell, '#a3e635')
export const BookOpen = colored(Lucide.BookOpen, '#a3e635')
export const ChefHat = colored(Lucide.ChefHat, '#a3e635')
export const Camera = colored(Lucide.Camera, '#a3e635')
export const Users = colored(Lucide.Users, '#a3e635')
export const BarChart2 = colored(Lucide.BarChart2, '#a3e635')
export const Settings = colored(Lucide.Settings, '#a3e635')
export const Shield = colored(Lucide.Shield, '#a3e635')

// ── Blue tint (water / calendar / scale / clock) ─────────────────
export const Droplets = colored(Lucide.Droplets, '#60a5fa')
export const CalendarDays = colored(Lucide.CalendarDays, '#60a5fa')
export const Scale = colored(Lucide.Scale, '#60a5fa')
export const Clock = colored(Lucide.Clock, '#60a5fa')

// ── Amber tint (streak / sun / target / star / zap / truck) ──────
export const Sparkles = colored(Lucide.Sparkles, '#fbbf24')
export const Sun = colored(Lucide.Sun, '#fbbf24')
export const Target = colored(Lucide.Target, '#fbbf24')
export const Star = colored(Lucide.Star, '#fbbf24')
export const Zap = colored(Lucide.Zap, '#fbbf24')
export const Truck = colored(Lucide.Truck, '#fbbf24')

// ── Violet (Pill / Moon) ─────────────────────────────────────────
export const Pill = colored(Lucide.Pill, '#a78bfa')
export const Moon = colored(Lucide.Moon, '#818cf8')

// ── Orange (Coffee) ──────────────────────────────────────────────
export const Coffee = colored(Lucide.Coffee, '#fb923c')

// ── Red (Heart) ──────────────────────────────────────────────────
export const Heart = colored(Lucide.Heart, '#f87171')

// ── Green (CheckCircle) ──────────────────────────────────────────
export const CheckCircle = colored(Lucide.CheckCircle, '#4ade80')

// Everything else (ChevronLeft, X, Plus, ArrowRight, Check,
// CheckCheck, Search, Trash2, etc.) re-exports unchanged.
export * from 'lucide-react'
