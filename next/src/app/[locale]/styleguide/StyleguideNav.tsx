'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/cn'

export type NavSection = { id: string; label: string }

export function StyleguideNav({ sections }: { sections: NavSection[] }) {
  const [active, setActive] = useState(sections[0]?.id ?? '')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-30% 0px -60% 0px', threshold: [0, 0.25, 0.5, 1] },
    )
    sections.forEach((s) => {
      const el = document.getElementById(s.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  return (
    <nav className="hidden lg:block w-56 shrink-0 sticky top-12 self-start max-h-[calc(100vh-6rem)] overflow-y-auto pr-4">
      <p className="text-xs tracking-eyebrow uppercase text-fg-3 mb-3">
        Sections
      </p>
      <ul className="space-y-1">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={cn(
                'block rounded-md px-3 py-2 text-sm transition-colors duration-fast ease-out',
                active === s.id
                  ? 'bg-primary/15 text-lime-400 font-medium'
                  : 'text-fg-2 hover:bg-surface-raised hover:text-fg-1',
              )}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
