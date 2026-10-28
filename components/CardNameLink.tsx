'use client'

// A card name that opens the card's detail popup (benefits, fees, best for, things to note) when clicked.
// It keeps its own popup state, so any result screen can show a card name as a link without extra wiring.
import { useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import CardDetailPopup from '@/components/CardDetailPopup'
import { prefetchCardDetail } from '@/lib/api'

interface Props {
  cardId: string
  children: ReactNode
  className?: string
  style?: CSSProperties
  mode?: 'cashback' | 'miles'   // the view the link is shown in, so the popup uses the same unit
  arrow?: boolean               // a small arrow after the name, so it reads as a link
}

// A small arrow after the name, so it reads as a link
const ARROW = <svg aria-hidden viewBox="0 0 24 24" width="0.8em" height="0.8em" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', marginLeft: 5, verticalAlign: '-0.05em', opacity: 0.7 }}><path d="M7 17L17 7M9 7h8v8" /></svg>

export default function CardNameLink({ cardId, children, className, style, mode, arrow }: Props) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" className={className} title="View card details"
      style={{ all: 'unset', cursor: 'pointer', color: 'inherit', font: 'inherit', textDecoration: 'underline dotted', textUnderlineOffset: 3, textDecorationThickness: 1, ...style }}
      onMouseEnter={() => prefetchCardDetail(cardId)} onFocus={() => prefetchCardDetail(cardId)} onTouchStart={() => prefetchCardDetail(cardId)}
      onClick={event => { event.stopPropagation(); event.preventDefault(); setOpen(true) }}>
      {arrow && typeof children === 'string' ? <>
        {children.includes(' ') ? children.slice(0, children.lastIndexOf(' ') + 1) : ''}
        {/* the last word and the arrow never split across lines */}
        <span style={{ whiteSpace: 'nowrap' }}>{children.slice(children.lastIndexOf(' ') + 1)}{ARROW}</span>
      </> : <>{children}{arrow && ARROW}</>}
    </button>
    {open && typeof document !== 'undefined' && createPortal(<div onClick={event => event.stopPropagation()}><CardDetailPopup cardId={cardId} mode={mode} onClose={() => setOpen(false)} /></div>, document.body)}
  </>
}
