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
}

export default function CardNameLink({ cardId, children, className, style, mode }: Props) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" className={className} title="View card details"
      style={{ all: 'unset', cursor: 'pointer', color: 'inherit', font: 'inherit', textDecoration: 'underline dotted', textUnderlineOffset: 3, textDecorationThickness: 1, ...style }}
      onMouseEnter={() => prefetchCardDetail(cardId)} onFocus={() => prefetchCardDetail(cardId)} onTouchStart={() => prefetchCardDetail(cardId)}
      onClick={event => { event.stopPropagation(); event.preventDefault(); setOpen(true) }}>
      {children}
    </button>
    {open && typeof document !== 'undefined' && createPortal(<div onClick={event => event.stopPropagation()}><CardDetailPopup cardId={cardId} mode={mode} onClose={() => setOpen(false)} /></div>, document.body)}
  </>
}
