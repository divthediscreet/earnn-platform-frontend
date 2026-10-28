'use client'

/* eslint-disable @next/next/no-img-element */
// "Choose & Test Cards Myself" visual: cards slide into a one-row tray, numbered 1 to 5. Each helpful card lifts the yearly
// reward counter and the meter; the 4th card repeats a job the wallet already does, so it gets a cross and adds nothing;
// the 5th card lifts both again. The figures are an illustration (the box says "Example"). Reduced motion shows the end state.
import { useEffect, useRef, useState } from 'react'
import styles from './explore.module.css'

const CARDS = [
  { src: '/images/home/stack-1.webp', gain: 1240 },
  { src: '/images/home/stack-2.webp', gain: 910 },
  { src: '/images/home/stack-3.webp', gain: 830 },
  { src: '/images/home/stack-1.webp', gain: 0 }, // does the same job as card 1: nothing new
  { src: '/images/home/stack-2.webp', gain: 1400 },
] as const
const TOTALS = CARDS.reduce<number[]>((all, card) => [...all, (all[all.length - 1] ?? 0) + card.gain], [])
const MAX = TOTALS[TOTALS.length - 1]
// how long each step shows (ms): 0 = empty tray, 1..5 = that card just added, 6 = finished picture held
const STEP_MS = [800, 1700, 1700, 1700, 2100, 1900, 3200] as const

export default function WalletTray() {
  const [step, setStep] = useState(0)
  const [amount, setAmount] = useState(0)
  const reduced = useRef(false)
  const shown = useRef(0)

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced.current) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStep(6)
      setAmount(MAX)
      shown.current = MAX
      return
    }
    let timer: ReturnType<typeof setTimeout>
    let current = 0
    const next = () => {
      current = (current + 1) % STEP_MS.length
      setStep(current)
      timer = setTimeout(next, STEP_MS[current])
    }
    timer = setTimeout(next, STEP_MS[0])
    return () => clearTimeout(timer)
  }, [])

  // the counter eases to the new total each time a card is added
  useEffect(() => {
    if (reduced.current) return
    const target = step === 0 ? 0 : TOTALS[Math.min(step, 5) - 1]
    const from = shown.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start - 450) / 700)
      const value = Math.round(from + (target - from) * (1 - Math.pow(1 - Math.max(0, t), 3)))
      shown.current = value
      setAmount(value)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [step])

  const added = Math.min(step, 5)
  return (
    <div className={styles.tray} aria-hidden>
      <div className={styles.trayRow}>
        {CARDS.map((card, index) => {
          const placed = added > index
          const useless = card.gain === 0
          return (
            <div key={index} className={styles.trayCol}>
              <span className={styles.trayNum} data-on={placed}>{index + 1}</span>
              <span className={styles.traySlot}>
                <img src={card.src} alt="" width={64} height={40} loading="lazy" className={styles.trayCard} data-placed={placed} />
                {placed && useless && <i className={`ti ti-x ${styles.trayCross}`} />}
              </span>
              <span className={styles.trayNote} data-on={placed} data-bad={useless}>{useless ? 'adds nothing' : `+${card.gain.toLocaleString()}`}</span>
            </div>
          )
        })}
      </div>
      <div className={styles.trayMeter}>
        <span className={styles.trayBar}><span style={{ width: `${(amount / MAX) * 100}%` }} /></span>
        <span className={styles.trayAmount}><b>AED {amount.toLocaleString()}</b> / year <small>Example</small></span>
      </div>
    </div>
  )
}
