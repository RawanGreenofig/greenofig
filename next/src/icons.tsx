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

// ── Green (success / confirmed) ──────────────────────────────────
export const CheckCircle = colored(Lucide.CheckCircle, '#4ade80')
export const CheckCircle2 = colored(Lucide.CheckCircle2, '#4ade80')
export const BadgeCheck = colored(Lucide.BadgeCheck, '#4ade80')
export const ShieldCheck = colored(Lucide.ShieldCheck, '#4ade80')

// ── Lime (action / save / send / new) ───────────────────────────
export const Plus = colored(Lucide.Plus, '#a3e635')
export const Save = colored(Lucide.Save, '#a3e635')
export const Send = colored(Lucide.Send, '#a3e635')
export const Tag = colored(Lucide.Tag, '#a3e635')
export const Gift = colored(Lucide.Gift, '#a3e635')
export const Wallet = colored(Lucide.Wallet, '#a3e635')
export const Trophy = colored(Lucide.Trophy, '#a3e635')
export const ThumbsUp = colored(Lucide.ThumbsUp, '#a3e635')
export const UserPlus = colored(Lucide.UserPlus, '#a3e635')
export const LogIn = colored(Lucide.LogIn, '#a3e635')

// ── Blue (calendar / mail / globe / link) ───────────────────────
export const Calendar = colored(Lucide.Calendar, '#60a5fa')
export const CalendarClock = colored(Lucide.CalendarClock, '#60a5fa')
export const CalendarX = colored(Lucide.CalendarX, '#60a5fa')
export const Mail = colored(Lucide.Mail, '#60a5fa')
export const MailOpen = colored(Lucide.MailOpen, '#60a5fa')
export const Globe = colored(Lucide.Globe, '#60a5fa')
export const ExternalLink = colored(Lucide.ExternalLink, '#60a5fa')
export const Database = colored(Lucide.Database, '#60a5fa')
export const Smartphone = colored(Lucide.Smartphone, '#60a5fa')
export const Video = colored(Lucide.Video, '#60a5fa')
export const Inbox = colored(Lucide.Inbox, '#60a5fa')
export const Microscope = colored(Lucide.Microscope, '#60a5fa')

// ── Amber (featured / streak / loyalty / shipping) ──────────────
export const Lightbulb = colored(Lucide.Lightbulb, '#fbbf24')
export const Pin = colored(Lucide.Pin, '#fbbf24')
export const Bookmark = colored(Lucide.Bookmark, '#fbbf24')

// ── Violet (AI / bot / restricted) ──────────────────────────────
export const Bot = colored(Lucide.Bot, '#a78bfa')
export const Lock = colored(Lucide.Lock, '#a78bfa')
export const KeyRound = colored(Lucide.KeyRound, '#a78bfa')
export const Key = colored(Lucide.Key, '#a78bfa')

// ── Red (danger / destructive / decline) ────────────────────────
export const Trash2 = colored(Lucide.Trash2, '#f87171')
export const AlertCircle = colored(Lucide.AlertCircle, '#f87171')
export const AlertTriangle = colored(Lucide.AlertTriangle, '#fb923c')
export const AlertOctagon = colored(Lucide.AlertOctagon, '#f87171')
export const XCircle = colored(Lucide.XCircle, '#f87171')
export const Ban = colored(Lucide.Ban, '#f87171')
export const ThumbsDown = colored(Lucide.ThumbsDown, '#f87171')

// ── Cyan (search / filter / inspect — neutral utility) ──────────
export const Search = colored(Lucide.Search, '#06b6d4')
export const Filter = colored(Lucide.Filter, '#06b6d4')
export const Eye = colored(Lucide.Eye, '#06b6d4')
export const EyeOff = colored(Lucide.EyeOff, '#9ca3af')

// Everything else (ChevronLeft, X, Edit3, ArrowRight, Check,
// CheckCheck, Save, Trash2, etc.) re-exports unchanged.
export * from 'lucide-react'
