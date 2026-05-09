'use client'

/**
 * Avatar circle shared across all dashboards. Visual matches the
 * polished version on /dashboard/community — lime→blue gradient with
 * white initials. Sizes are explicit so layout never shifts when the
 * fallback initials replace a real photo.
 *
 * Pass `imageUrl` to render an actual photo (object-cover full bleed).
 * Pass `text` for initials/fallback. Falls back to '?' if both are empty.
 */
export function Avatar({
  text,
  imageUrl,
  size = 36,
  ringTint,
}: {
  text?: string
  imageUrl?: string | null
  size?: number
  /** Optional accent ring color (hex/rgba). For tier badges, online dots, etc. */
  ringTint?: string
}) {
  const fontSize = size <= 28 ? 11 : size <= 40 ? 13 : size <= 56 ? 15 : 18
  const initials = (text ?? '?').slice(0, 2).toUpperCase()

  return (
    <span
      aria-hidden={!text}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: imageUrl
          ? '#0d1a12'
          : 'linear-gradient(135deg, #4ade80, #60a5fa)',
        color: '#fff',
        fontSize,
        fontWeight: 700,
        lineHeight: `${size}px`,
        textAlign: 'center',
        flexShrink: 0,
        overflow: 'hidden',
        userSelect: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: ringTint ? `0 0 0 2px ${ringTint}` : undefined,
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={imageUrl}
          alt=""
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
          loading="lazy"
        />
      ) : (
        initials
      )}
    </span>
  )
}
