import { type LucideIcon } from 'lucide-react'

/**
 * Reusable icon-in-a-rounded-tile chrome for dashboard surfaces.
 * Defaults to a 32×32 lime-tinted tile holding a 16px lucide icon.
 *
 * Use whenever an icon sits next to text as a section header,
 * card label, or inline label. NOT for icons inside chips,
 * pills, table cells, or buttons — those already have their own
 * size constraints that a 32px tile would burst.
 *
 * Pre-tinted variants:
 *   <IconTileBlue  icon={Calendar} />  for booking / calendar / water
 *   <IconTileAmber icon={Flame}    />  for streak / morning / warning
 *   <IconTileRed   icon={Trash2}   />  for destructive / errors
 */
interface IconTileProps {
  icon: LucideIcon
  size?: number
  color?: string
  bg?: string
  tileSize?: number
  radius?: number
}

export function IconTile({
  icon: Icon,
  size = 16,
  color = 'var(--gf-primary-text, #a3e635)',
  bg = 'rgba(132,204,22,0.12)',
  tileSize = 32,
  radius = 8,
}: IconTileProps) {
  return (
    <span
      style={{
        width: tileSize,
        height: tileSize,
        minWidth: tileSize,
        borderRadius: radius,
        background: bg,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <Icon size={size} color={color} strokeWidth={1.75} />
    </span>
  )
}

export const IconTileBlue = (props: Omit<IconTileProps, 'bg' | 'color'>) => (
  <IconTile {...props} bg="rgba(96,165,250,0.12)" color="#60a5fa" />
)

export const IconTileAmber = (props: Omit<IconTileProps, 'bg' | 'color'>) => (
  <IconTile {...props} bg="rgba(251,191,36,0.12)" color="#fbbf24" />
)

export const IconTileRed = (props: Omit<IconTileProps, 'bg' | 'color'>) => (
  <IconTile {...props} bg="rgba(248,113,113,0.12)" color="#f87171" />
)
