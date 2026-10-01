'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/** Horizontally scrolling row of cards with left/right arrows (a moving "ribbon"). Arrows appear
 *  only when there is more to see in that direction; touch/trackpad scrolling still works. */
export function Ribbon({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    setEdges({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    const first = setTimeout(measure, 0) // don't depend on the observer's first (paint-timed) callback
    el.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      clearTimeout(first)
      el.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  const move = (dir: 1 | -1) => {
    const el = ref.current
    if (!el) return
    const tile = el.querySelector<HTMLElement>(':scope > *')
    const step = tile ? tile.getBoundingClientRect().width + 16 : el.clientWidth * 0.8
    // move by whole cards so the next hidden card comes fully into view
    const distance = Math.max(step, Math.floor(el.clientWidth / step) * step)
    const target = Math.min(el.scrollWidth - el.clientWidth, Math.max(0, el.scrollLeft + dir * distance))
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollTo({ left: target, behavior: reduce ? 'auto' : 'smooth' })
    window.setTimeout(measure, reduce ? 0 : 450) // scroll events also update this; don't rely on them alone
  }

  const arrow = 'absolute top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full border border-ws-border bg-ws-card text-[18px] text-ws-primary shadow-ws-lift transition-opacity hover:bg-ws-secondary'
  return (
    <div className="relative mt-5">
      <div ref={ref} role="region" aria-label={label}
        className="ws-no-scrollbar -mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
        {children}
      </div>
      {edges.right && (
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 hidden w-16 bg-gradient-to-l from-ws-card to-transparent sm:block" />
      )}
      {edges.left && (
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 hidden w-16 bg-gradient-to-r from-ws-card to-transparent sm:block" />
      )}
      {edges.left && (
        <button type="button" onClick={() => move(-1)} aria-label={`Previous cards: ${label}`} className={`${arrow} left-1 sm:-left-5`}>←</button>
      )}
      {edges.right && (
        <button type="button" onClick={() => move(1)} aria-label={`More cards: ${label}`} className={`${arrow} right-1 sm:-right-5`}>→</button>
      )}
    </div>
  )
}
