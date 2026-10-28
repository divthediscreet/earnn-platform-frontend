'use client'

// A block whose explanation appears when the mouse is anywhere over it (not only on the "i" icon). The "i" icon is the visible
// cue; on a touch screen, tapping it opens and closes the same panel. The panel is drawn on the page itself (not inside the
// block), so a clipped or rounded block never cuts it off, and it stays open while the mouse is on the block or on the panel.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/** True on devices with a real pointer that can hover; on touch screens the "i" icon is tapped instead. */
const canHover = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover)').matches

const PANEL_WIDTH = 440

// Each panel has its own background colour so the two explanations are easy to tell apart: rewards soft blue, fees warm amber.
const TONES = {
  gain: { bg: '#DCE9FF', border: '#93B4EC', title: '#0A2A66', sub: '#3F66A8', glow: 'rgba(14, 55, 133, .28)' },
  fee: { bg: '#FFE7BD', border: '#EBB763', title: '#6B3B00', sub: '#98631A', glow: 'rgba(224, 123, 31, .30)' },
} as const
const EDGE = 12

export function InfoHover({ label, panelTitle, panelSub, tone = 'gain', align = 'left', className, panel, children }: {
  label: string                       // accessible name of the "i" button, e.g. "How your rewards are worked out"
  panelTitle: string
  panelSub?: string
  tone?: keyof typeof TONES            // colour scheme of the panel
  align?: 'left' | 'right'            // which edge of the block the panel lines up with
  className?: string
  panel: React.ReactNode
  children: (icon: React.ReactNode) => React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; width: number; host: Element } | null>(null)
  const block = useRef<HTMLDivElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => { if (closeTimer.current) clearTimeout(closeTimer.current); setOpen(true) }, [])
  // a short delay lets the mouse cross the gap between the block and the panel without the panel closing
  const hide = useCallback(() => { if (closeTimer.current) clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpen(false), 140) }, [])
  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current) }, [])

  // place the panel under the block, kept inside the screen
  useLayoutEffect(() => {
    if (!open || !block.current) return
    const r = block.current.getBoundingClientRect()
    const width = Math.min(PANEL_WIDTH, window.innerWidth - EDGE * 2)
    const wanted = align === 'right' ? r.right - width : r.left
    setPos({ top: r.bottom + 6, left: Math.max(EDGE, Math.min(wanted, window.innerWidth - width - EDGE)), width, host: block.current.closest('.ws-root') ?? document.body })
  }, [open, align])

  // the panel is fixed to the screen, so close it when the page scrolls (it opens again on the next mouse move)
  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener('scroll', close, { passive: true })
    return () => window.removeEventListener('scroll', close)
  }, [open])

  // a small "i" in a filled grey circle, on the same line as the figure it explains
  const icon = (
    <button type="button" aria-label={label} aria-expanded={open}
      onClick={() => { if (!canHover()) setOpen(v => !v) }}
      onFocus={show} onBlur={hide}
      className="grid size-[18px] shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-[#9AA6BC] p-0 text-white transition hover:bg-[#6F7F9E]">
      <svg aria-hidden viewBox="0 0 24 24" className="size-[12px]" fill="currentColor">
        <circle cx="12" cy="5.2" r="2.1" /><rect x="10.2" y="9.6" width="3.6" height="10.6" rx="1.4" />
      </svg>
    </button>
  )

  return (
    <div ref={block} className={`relative ${className ?? ''}`}
      onMouseEnter={() => { if (canHover()) show() }}
      onMouseLeave={() => { if (canHover()) hide() }}>
      {children(icon)}
      {open && pos && createPortal(
        <div role="tooltip" onMouseEnter={() => { if (canHover()) show() }} onMouseLeave={() => { if (canHover()) hide() }}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 1100, borderColor: TONES[tone].border, background: TONES[tone].bg, boxShadow: `0 18px 44px ${TONES[tone].glow}, 0 4px 12px rgba(13, 24, 40, .08)` }}
          className="ws-animate-rise ws-scrollbar max-h-[70vh] overflow-y-auto rounded-2xl border-2 p-4 text-left [&_.rounded-xl]:bg-white/70">
          <p className="font-display text-[16px] leading-tight font-bold" style={{ color: TONES[tone].title }}>{panelTitle}</p>
          {panelSub && <p className="mb-3 text-[12.5px]" style={{ color: TONES[tone].sub }}>{panelSub}</p>}
          {panel}
        </div>,
        pos.host,
      )}
    </div>
  )
}
