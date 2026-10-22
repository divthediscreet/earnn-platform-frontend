'use client'

import Image, { type StaticImageData } from 'next/image'
import { useEffect, useRef, useState } from 'react'
import citiPremierImage from '@/assets/home-cards/citi-premier.webp'
import shukranAdcbImage from '@/assets/home-cards/shukran-adcb.webp'
import fabGemsWorldImage from '@/assets/home-cards/fab-gems-world.webp'
import old from './NewHomePage.module.css'

// The 2/3/4 card picker from the previous homepage's step 4, rebuilt for 1/2/3 cards. All cashback figures are illustrative.
const CARDS: { id: string; name: string; image: StaticImageData }[] = [
  { id: 'citi_03', name: 'Citi Premier Credit Card', image: citiPremierImage },
  { id: 'adcb_01', name: 'Shukran ADCB Credit Card', image: shukranAdcbImage },
  { id: 'fab_04', name: 'FAB GEMS World Credit Card', image: fabGemsWorldImage },
]

const CHOICES = [
  { key: 'one', selector: '1 Card', title: 'Keep It Simple', cardCount: 1, monthlyReward: 480 },
  { key: 'two', selector: '2 Cards', title: 'Best Balance', cardCount: 2, monthlyReward: 784 },
  { key: 'three', selector: '3 Cards', title: 'Maximum Rewards', cardCount: 3, monthlyReward: 962 },
] as const

type ChoiceKey = typeof CHOICES[number]['key']

function AnimatedNumber({ value, reducedMotion }: { value: number; reducedMotion: boolean }) {
  const [display, setDisplay] = useState(value)
  const previous = useRef(value)

  useEffect(() => {
    if (reducedMotion) {
      const frame = window.requestAnimationFrame(() => setDisplay(value))
      previous.current = value
      return () => window.cancelAnimationFrame(frame)
    }
    let frame = 0
    const from = previous.current
    const startedAt = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / 500, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (value - from) * eased))
      if (progress < 1) frame = window.requestAnimationFrame(tick)
      else previous.current = value
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [reducedMotion, value])

  return <>{display.toLocaleString('en-AE')}</>
}

export default function CardSetPicker() {
  const [choice, setChoice] = useState<ChoiceKey>('one')
  const [pinned, setPinned] = useState(false)
  const [visible, setVisible] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(media.matches)
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    const node = rootRef.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setVisible(true)
      observer.disconnect()
    }, { threshold: 0.3 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible || pinned || reducedMotion) return
    const timer = window.setInterval(() => {
      setChoice(current => {
        const index = CHOICES.findIndex(option => option.key === current)
        return CHOICES[(index + 1) % CHOICES.length].key
      })
    }, 1800)
    return () => window.clearInterval(timer)
  }, [visible, pinned, reducedMotion])

  const active = CHOICES.find(option => option.key === choice) || CHOICES[0]
  const pick = (key: ChoiceKey) => { setPinned(true); setChoice(key) }

  return (
    <div ref={rootRef} className={old.page} style={{ background: 'transparent', overflow: 'visible' }}>
      <div className={old.chooseMock} style={{ marginTop: 0 }}>
        <div className={old.chooseSelectors} aria-label="Choose how many cards">
          {CHOICES.map(option => (
            <button key={option.key} type="button" aria-pressed={choice === option.key}
              className={choice === option.key ? old.chooseSelectorActive : ''} onClick={() => pick(option.key)}>
              {option.selector}
            </button>
          ))}
        </div>
        <div key={choice} className={old.chooseStage} aria-live="polite">
          <b className={old.chooseStateLabel}>{active.title}</b>
          <div className={`${old.chooseCards} ${active.cardCount === 3 ? old.chooseCardsThree : ''}`}>
            {CARDS.slice(0, active.cardCount).map((card, index) => (
              <div key={card.id} className={old.chooseCard} style={{ animationDelay: `${index * 80}ms` }}>
                <div className={`${old.cardImage} ${old.cardImageCompact}`}>
                  <Image src={card.image} alt={`${card.name} credit card`} width={142} height={88} />
                </div>
              </div>
            ))}
          </div>
          <div className={old.chooseSummary}>
            <span>{active.cardCount} {active.cardCount === 1 ? 'card' : 'cards'}</span>
            <span className={old.money}><small>AED</small> <AnimatedNumber value={active.monthlyReward} reducedMotion={reducedMotion} /><em>/mo</em></span>
          </div>
        </div>
      </div>
    </div>
  )
}
