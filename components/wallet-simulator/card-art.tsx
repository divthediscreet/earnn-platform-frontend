'use client'

import { useEffect, useRef, useState } from 'react'
import { getCardImageUrl } from '@/lib/api'

export type CardInfo = { id: string; name: string; bank: string | null }

const FINISHES = ['ws-finish-navy', 'ws-finish-obsidian', 'ws-finish-emerald', 'ws-finish-plum', 'ws-finish-steel', 'ws-finish-gold']

function finishFor(key: string) {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return FINISHES[h % FINISHES.length]
}

/** Loading state of a card's real image, per card id (no reset effect needed when the id changes). */
function useCardImage(id: string) {
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const [failedId, setFailedId] = useState<string | null>(null)
  const state: 'loading' | 'loaded' | 'failed' = failedId === id ? 'failed' : loadedId === id ? 'loaded' : 'loading'
  return {
    state,
    imgProps: {
      src: getCardImageUrl(id),
      onLoad: () => setLoadedId(id),
      onError: () => setFailedId(id),
      // an image already in the browser cache can finish before React attaches onLoad
      ref: (el: HTMLImageElement | null) => { if (el?.complete && el.naturalWidth > 0) setLoadedId(id) },
    },
  }
}

/** Real card artwork (same gated image endpoint the rest of Earnn uses). While it loads, a plain
 *  placeholder shows; only if it is unavailable does a generated gradient card with the real bank
 *  and card name show instead — never stand-in artwork ahead of a real image. */
export function CardArt({ card, size = 'md', className = '', eager = false }: {
  card: CardInfo
  size?: 'sm' | 'md' | 'lg'
  className?: string
  eager?: boolean
}) {
  const { state, imgProps } = useCardImage(card.id)
  const finish = finishFor(card.bank || card.id)
  const light = finish === 'ws-finish-gold' || finish === 'ws-finish-steel'
  const pad = size === 'sm' ? 'p-3' : size === 'lg' ? 'p-5' : 'p-4'
  return (
    <div className={`relative aspect-[1.586] overflow-hidden rounded-xl shadow-ws-plastic ${className}`}>
      {state === 'loading' && <div aria-hidden className="ws-animate-pulse absolute inset-0 bg-gradient-to-br from-ws-secondary to-ws-border" />}
      {state === 'failed' ? (
        <div className={`ws-card-sheen ws-hairline absolute inset-0 flex flex-col justify-between ${finish} ${pad}`}>
          <span className={`relative z-10 font-display font-semibold tracking-tight ${size === 'sm' ? 'text-[11px]' : 'text-[13px]'} ${light ? 'text-black/75' : 'text-white'}`}>
            {card.bank ?? ''}
          </span>
          {size !== 'sm' && <span className={`relative z-10 h-6 w-9 rounded-[5px] ${light ? 'bg-black/15' : 'bg-white/25'}`} />}
          <span className={`relative z-10 line-clamp-2 text-[11px] font-medium ${light ? 'text-black/65' : 'text-white/85'}`}>{card.name}</span>
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img {...imgProps} alt={card.name} loading={eager ? 'eager' : 'lazy'}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`} />
      )}
    </div>
  )
}

/** Small card thumbnail (Lovable's "chip"), real artwork first. */
export function CardChip({ card, className = '' }: { card: CardInfo; className?: string }) {
  const { state, imgProps } = useCardImage(card.id)
  const finish = finishFor(card.bank || card.id)
  const light = finish === 'ws-finish-gold' || finish === 'ws-finish-steel'
  const initials = (card.bank || card.name).split(/\s+/).map(w => w[0]).join('').slice(0, 4).toUpperCase()
  return (
    <span className={`relative inline-block h-[30px] w-[48px] shrink-0 overflow-hidden rounded-[6px] shadow-ws-plastic ${className}`} title={card.name}>
      {state === 'loading' && <span aria-hidden className="absolute inset-0 bg-ws-secondary" />}
      {state === 'failed' ? (
        <span aria-hidden className={`ws-card-sheen ws-hairline absolute inset-0 grid place-items-center text-[9px] font-bold ${finish} ${light ? 'text-black/70' : 'text-white'}`}>
          <span className="relative z-10">{initials}</span>
        </span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img {...imgProps} alt="" loading="lazy"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`} />
      )}
    </span>
  )
}

/** Rolls a number toward its target — the reward total should feel alive. */
export function useCountUp(value: number, duration = 650) {
  const [display, setDisplay] = useState(value)
  const from = useRef(value)
  const raf = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const origin = from.current
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = origin + (value - origin) * eased
      setDisplay(v)
      from.current = v
      if (t < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    // Animation frames don't run in hidden/throttled tabs: always land on the real value.
    const settle = setTimeout(() => {
      cancelAnimationFrame(raf.current)
      from.current = value
      setDisplay(value)
    }, duration + 80)
    return () => { cancelAnimationFrame(raf.current); clearTimeout(settle) }
  }, [value, duration])
  return Math.round(display)
}

export function RollingAed({ value, className = '' }: { value: number; className?: string }) {
  const n = useCountUp(value)
  return (
    <span className={`tabular-nums ${className}`} aria-label={Math.round(value).toLocaleString('en-US')}>
      {n.toLocaleString('en-US')}
    </span>
  )
}
