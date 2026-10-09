'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ToolDiscoveryCard from './ToolDiscoveryCard'
import { TOOLS } from './tools'
import s from './Home.module.css'

const MOBILE_QUERY = '(max-width: 820px)'

export default function ToolDiscoveryTray() {
  const [active, setActive] = useState(0)
  const trayRef = useRef<HTMLDivElement>(null)
  const n = TOOLS.length

  const isMobile = () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches

  // On phones the tray is a swipe strip: bring the chosen card into view.
  const reveal = useCallback((index: number) => {
    const tray = trayRef.current
    if (!tray || !isMobile()) return
    const card = tray.children[index] as HTMLElement | undefined
    if (!card) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    tray.scrollTo({ left: card.offsetLeft - tray.offsetLeft - 16, behavior: reduce ? 'auto' : 'smooth' })
  }, [])

  const select = useCallback((index: number) => {
    setActive(index)
    reveal(index)
  }, [reveal])

  const step = (dir: -1 | 1) => select((active + dir + n) % n)

  const keyNav = (index: number, dir: -1 | 1) => {
    const next = (index + dir + n) % n
    select(next)
    requestAnimationFrame(() => {
      const hit = trayRef.current?.querySelectorAll<HTMLButtonElement>('button[aria-expanded]')[next]
      hit?.focus()
    })
  }

  // Swiping on phones changes the active card.
  useEffect(() => {
    const tray = trayRef.current
    if (!tray) return
    let raf = 0
    const onScroll = () => {
      if (!isMobile()) return
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const first = tray.children[0] as HTMLElement
        const second = tray.children[1] as HTMLElement
        const pitch = second.offsetLeft - first.offsetLeft
        if (pitch > 0) setActive(Math.min(n - 1, Math.max(0, Math.round(tray.scrollLeft / pitch))))
      })
    }
    tray.addEventListener('scroll', onScroll, { passive: true })
    return () => { tray.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) }
  }, [n])

  return (
    <section id="tools" className={s.tools} aria-labelledby="tools-title">
      <div className={s.toolsHead}>
        <div>
          <h2 id="tools-title">What do you want to do?</h2>
          <p>Whatever the goal, start with what matters to you.</p>
        </div>
        <div className={s.toolsNav}>
          <span className={s.counter} aria-live="polite">{String(active + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
          <button type="button" aria-label="Previous tool" onClick={() => step(-1)}><i className="ti ti-arrow-left" aria-hidden /></button>
          <button type="button" aria-label="Next tool" onClick={() => step(1)}><i className="ti ti-arrow-right" aria-hidden /></button>
        </div>
      </div>

      <div className={s.tray} ref={trayRef} role="group" aria-label="Earnn tools">
        {TOOLS.map((tool, i) => (
          <ToolDiscoveryCard key={tool.key} tool={tool} index={i} active={i === active} onSelect={select} onKeyNav={keyNav} />
        ))}
      </div>
    </section>
  )
}
