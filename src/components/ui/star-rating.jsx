import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function StarRating({ rating, onRatingChange, readonly = false, size = 'md' }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  const handleClick = (value) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value)
    }
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => handleClick(value)}
          disabled={readonly}
          className={cn(
            'transition-colors focus:outline-none',
            !readonly && 'cursor-pointer hover:scale-110'
          )}
        >
          <Star
            className={cn(
              sizes[size],
              value <= rating
                ? 'fill-primary text-primary'
                : 'fill-muted text-muted-foreground'
            )}
          />
        </button>
      ))}
    </div>
  )
}

export function StarRatingDisplay({ rating, size = 'sm', showValue = false }) {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  }

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={cn(
            sizes[size],
            value <= rating
              ? 'fill-primary text-primary'
              : 'fill-muted text-muted-foreground'
          )}
        />
      ))}
      {showValue && (
        <span className="text-sm text-muted-foreground ms-1">({rating})</span>
      )}
    </div>
  )
}
