'use client'

/* eslint-disable @next/next/no-img-element */
// The hero's looping story: spending flows in -> Earnn tests every UAE card -> the best cards fan out with what they earn.
// Figures are an illustration (labelled "Example" on screen), not a promise. With reduced motion it shows the finished picture.
import { useEffect, useRef, useState } from 'react'
import styles from './explore.module.css'

const CHIPS = [
  { icon: 'ti-shopping-cart', label: 'Groceries', amount: 1500 },
  { icon: 'ti-coffee', label: 'Dining', amount: 800 },
  { icon: 'ti-gas-station', label: 'Fuel', amount: 600 },
  { icon: 'ti-plane', label: 'Travel', amount: 400 },
] as const

const CARDS = [
  { src: '/images/home/stack-1.webp', tag: 'Groceries · 5% back' },
  { src: '/images/home/stack-2.webp', tag: 'Dining · 4% back' },
  { src: '/images/home/stack-3.webp', tag: 'Big spends · 3% back' },
] as const

const BANKS = ['Emirates NBD', 'FAB', 'ADCB', 'Mashreq', 'RAKBANK', 'HSBC', 'Dubai Islamic', 'CBD', 'Emirates Islamic', 'Standard Chartered']
const TARGET = 4380
// how long each stage of the story lasts (ms): idle, spending flows in, testing cards, result held
const PHASE_MS = [600, 2300, 2300, 5200] as const

export default function ExploreStage() {
  const [phase, setPhase] = useState(0)
  const [bank, setBank] = useState(0)
  const [amount, setAmount] = useState(0)
  const reduced = useRef(false)
  // The scene is drawn at 560 x 460 and scaled down to fit narrow screens.
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useEffect(() => {
    const element = wrapRef.current
    if (!element) return
    const fit = () => setScale(Math.min(1, element.clientWidth / 560))
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // the story loop
  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPhase(3)
      setAmount(TARGET)
      return
    }
    let timer: ReturnType<typeof setTimeout>
    let current = 0
    const next = () => {
      current = (current + 1) % PHASE_MS.length
      setPhase(current)
      timer = setTimeout(next, PHASE_MS[current])
    }
    timer = setTimeout(next, PHASE_MS[0])
    return () => clearTimeout(timer)
  }, [])

  // bank names flick past while Earnn is "testing"
  useEffect(() => {
    if (phase !== 2) return
    const timer = setInterval(() => setBank(value => (value + 1) % BANKS.length), 210)
    return () => clearInterval(timer)
  }, [phase])

  // the yearly reward counts up when the result appears
  useEffect(() => {
    if (reduced.current) return
    if (phase !== 3) { setAmount(0); return } // eslint-disable-line react-hooks/set-state-in-effect
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start - 650) / 1500)
      setAmount(Math.round(TARGET * (1 - Math.pow(1 - Math.max(0, t), 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase])

  return (
    <div ref={wrapRef} className={styles.stageWrap} style={{ height: 460 * scale }}>
    <div className={styles.stage} style={{ transform: `scale(${scale})` }} data-chips={phase >= 1} data-engine={phase >= 2} data-result={phase >= 3} aria-label="Illustration: your monthly spending goes in, Earnn tests every UAE card, and the best cards come out with what they earn" role="img">
      <div className={styles.stageGrid} aria-hidden />

      <div className={styles.chips} aria-hidden>
        {CHIPS.map((chip, index) => (
          <div key={chip.label} className={styles.chip} style={{ transitionDelay: `${index * 140}ms` }}>
            <i className={`ti ${chip.icon}`} />
            <span><b>{chip.label}</b><small>AED {chip.amount.toLocaleString()}</small></span>
          </div>
        ))}
      </div>

      <svg className={styles.pipes} viewBox="0 0 560 460" preserveAspectRatio="none" aria-hidden>
        {[73, 209, 345, 481].map(x => <path key={x} d={`M ${x} 64 C ${x} 108, 280 100, 280 146`} />)}
        <path d="M 280 198 L 280 252" className={styles.pipeOut} />
      </svg>

      <div className={styles.engine} aria-hidden>
        <span className={styles.ring} />
        <span className={styles.core}><img src="/earnn_logo.jpeg" alt="" width={30} height={30} />earnn</span>
        <span className={styles.testing}>{phase === 2 ? `Testing ${BANKS[bank]}` : phase >= 3 ? 'Best cards found' : 'Every UAE card'}</span>
      </div>

      <div className={styles.fan} aria-hidden>
        {CARDS.map((card, index) => (
          <div key={card.src} className={`${styles.fanCard} ${styles[`fan${index}` as 'fan0']}`}>
            <span className={styles.fanTag}>{card.tag}</span>
            <img src={card.src} alt="" width={150} height={94} loading="eager" />
          </div>
        ))}
      </div>

      <div className={styles.reward} aria-hidden>
        <span className={styles.rewardLabel}>Back in rewards, every year</span>
        <b>AED {amount.toLocaleString()}</b>
        <small>Example</small>
      </div>
    </div>
    </div>
  )
}
