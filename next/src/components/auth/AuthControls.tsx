'use client'

import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import { Eye, EyeOff, Check } from 'lucide-react'

/**
 * Premium dark form input.
 * - Subtle glassy background (rgb(255 255 255 / 0.04))
 * - Lime focus ring via box-shadow (no Tailwind ring jitter)
 * - Optional show/hide toggle on type="password"
 * - Optional trailing slot to mount actions next to the label
 */
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  trailing?: ReactNode
  /** When true, render an Eye/EyeOff toggle and swap input type on click. */
  reveal?: boolean
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, trailing, reveal, type = 'text', id, className, ...rest },
  ref,
) {
  const reactId = useId()
  const fieldId = id ?? reactId
  const [show, setShow] = useState(false)
  const effectiveType = reveal && show ? 'text' : type

  return (
    <div className="mb-5">
      <div className="flex items-baseline justify-between mb-1.5">
        <label
          htmlFor={fieldId}
          className="block text-sm font-medium text-fg-2"
        >
          {label}
        </label>
        {trailing && <div className="text-xs">{trailing}</div>}
      </div>
      <div className="relative">
        <input
          {...rest}
          ref={ref}
          id={fieldId}
          type={effectiveType}
          className={`block w-full rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#444] transition-all duration-200 focus:outline-none ${className ?? ''}`}
          style={{
            background: '#111',
            border: error ? '1px solid #ef4444' : '1px solid #222',
            paddingInlineEnd: reveal ? '44px' : undefined,
          }}
          onFocus={(e) => {
            if (!error) {
              e.currentTarget.style.borderColor = '#4ade80'
            }
            rest.onFocus?.(e)
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = error ? '#ef4444' : '#222'
            rest.onBlur?.(e)
          }}
        />
        {reveal && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-fg-3 hover:text-fg-1 transition-colors"
          >
            {show ? (
              <EyeOff className="w-4 h-4" strokeWidth={1.75} />
            ) : (
              <Eye className="w-4 h-4" strokeWidth={1.75} />
            )}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-red-400">{error}</p>
      )}
    </div>
  )
})

/**
 * Primary forest-gradient submit button. Loading spinner replaces text.
 */
export function PrimarySubmit({
  pending,
  children,
}: {
  pending?: boolean
  children: ReactNode
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="group relative w-full inline-flex items-center justify-center rounded-xl py-3 text-sm font-semibold transition-colors duration-200 disabled:opacity-70 disabled:cursor-wait"
      style={{ background: '#4ade80', color: '#000', border: 'none' }}
      onMouseEnter={(e) => {
        if (!pending) e.currentTarget.style.background = '#86efac'
      }}
      onMouseLeave={(e) => (e.currentTarget.style.background = '#4ade80')}
    >
      {pending ? (
        <span
          className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{ borderColor: 'rgb(0 0 0 / 0.2)', borderTopColor: '#000' }}
          aria-hidden
        />
      ) : (
        children
      )}
    </button>
  )
}

/**
 * Outlined link/button for the secondary action ("Create account",
 * "Already have an account?", etc.) — full-width.
 */
export function SecondaryLink({
  children,
}: {
  children: ReactNode
}) {
  return (
    <span
      className="block w-full text-center rounded-[10px] py-3.5 px-4 text-[15px] text-fg-1 transition-colors duration-fast ease-out"
      style={{
        background: 'transparent',
        border: '1px solid rgb(255 255 255 / 0.12)',
      }}
    >
      {children}
    </span>
  )
}

/**
 * "or" divider — two hairlines around small caps text.
 */
export function OrDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <span className="flex-1 h-px" style={{ background: '#222' }} />
      <span
        className="text-xs uppercase tracking-eyebrow"
        style={{ color: '#444' }}
      >
        {label}
      </span>
      <span className="flex-1 h-px" style={{ background: '#222' }} />
    </div>
  )
}

/**
 * Custom checkbox — replaces browser default for terms acceptance.
 */
export function Checkbox({
  id,
  checked,
  onCheckedChange,
  children,
}: {
  id: string
  checked: boolean
  onCheckedChange: (next: boolean) => void
  children: ReactNode
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 text-sm text-fg-2 cursor-pointer select-none"
    >
      <span className="relative shrink-0 mt-0.5">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
        />
        <span
          aria-hidden
          className="block w-4 h-4 rounded-[4px] border transition-colors"
          style={{
            background: checked ? 'var(--gf-primary)' : 'transparent',
            borderColor: checked
              ? 'var(--gf-primary)'
              : 'rgb(255 255 255 / 0.2)',
          }}
        />
        {checked && (
          <Check
            aria-hidden
            className="absolute inset-0 m-auto w-3 h-3 text-fg-1"
            strokeWidth={3}
          />
        )}
      </span>
      <span className="leading-relaxed">{children}</span>
    </label>
  )
}
