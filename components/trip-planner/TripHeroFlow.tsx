'use client'

/* eslint-disable @next/next/no-img-element */
// Trip Planner results hero: one left-to-right story. A real wallet with cards -> a piggy bank that collects miles as you spend ->
// where those miles can take you. The miles total, the yearly spend and the destinations are the user's own results.
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import citiPremier from '@/assets/home-cards/citi-premier.webp'
import shukranAdcb from '@/assets/home-cards/shukran-adcb.webp'
import fabGems from '@/assets/home-cards/fab-gems-world.webp'
import styles from './TripHeroFlow.module.css'

export type HeroDestination = { place: string, image: string | null, months: number, cabin: string }

// Spending categories, scattered over the upper part of the wallet area (no arc): [icon, label, left %, top %, delay s].
const CATEGORIES = [
  ['ti-tools-kitchen-2', 'Dining', 27, 9, 0.3],
  ['ti-plane', 'Travel', 69, 8, 0.5],
  ['ti-shopping-cart', 'Groceries', 11, 28, 0.2],
  ['ti-gas-station', 'Fuel', 87, 26, 0.4],
] as const

// Three hand-drawn looking arrows from the piggy bank to the three options: different curves, different weights.
const ARROWS = [
  { d: 'M2 150 C 30 150, 34 52, 70 48', width: 3, top: '16%', color: '#3a6fd8' },
  { d: 'M2 150 C 28 146, 40 160, 70 150', width: 7, top: '50%', color: '#0b1b3a' },
  { d: 'M2 150 C 24 156, 36 258, 70 252', width: 4.5, top: '84%', color: '#c9a02e' },
] as const

export default function TripHeroFlow({ yearly, miles: totalMiles, destinations, onBreakup, onChoose }: {
  yearly: number, miles: number, destinations: HeroDestination[], onBreakup: () => void, onChoose: () => void
}) {
  const root = useRef<HTMLDivElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [miles, setMiles] = useState(0)

  useEffect(() => {
    const node = root.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setPlaying(true)
      observer.disconnect()
    }, { threshold: 0.25 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!playing) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const frame = window.requestAnimationFrame(() => setMiles(totalMiles))
      return () => window.cancelAnimationFrame(frame)
    }
    let frame = 0
    const startedAt = performance.now() + 200
    const tick = (now: number) => {
      const progress = Math.min(Math.max((now - startedAt) / 1800, 0), 1)
      setMiles(Math.round(totalMiles * (1 - Math.pow(1 - progress, 3))))
      if (progress < 1) frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [playing, totalMiles])

  const shown = destinations.slice(0, 2)

  return (
    <div ref={root} className={`${styles.flow} ${playing ? styles.play : ''}`} aria-label="What your spending could unlock">
      <h2 className={styles.title}><span>Wow, your spending could</span><em>unlock {destinations[0]?.cabin ?? 'Business'} Class!</em></h2>
      <div className={styles.inner}>
      {/* 1. The wallet, with the spending categories being made around it */}
      <section className={styles.stage}>
        <p className={styles.label}>You spend</p>
        <div className={styles.walletArt}>
          {CATEGORIES.map(([icon, label, left, top, delay]) => (
            <span key={label} className={styles.cat} style={{ left: `${left}%`, top: `${top}%`, animationDelay: `${delay}s` }}><i className={`ti ${icon}`} aria-hidden /> {label}</span>
          ))}
          <div className={styles.walletBox} role="img" aria-label="A leather wallet with credit cards inside">
            <Image className={styles.cardL} src={fabGems} alt="" width={240} height={150} />
            <Image className={styles.cardR} src={shukranAdcb} alt="" width={240} height={150} />
            <Image className={styles.cardM} src={citiPremier} alt="" width={240} height={150} />
            <div className={styles.leatherBack} />
            <div className={styles.leatherFront}><span className={styles.clasp} /></div>
          </div>
        </div>
        <div className={styles.spendLine}>
          <strong>AED {Math.round(yearly).toLocaleString('en-US')} <small>a year</small></strong>
          <button type="button" className={styles.adds} onClick={onBreakup}><i className="ti ti-bulb" aria-hidden /> How it adds up</button>
        </div>
      </section>

      {/* wallet -> piggy bank */}
      <svg className={styles.hop} viewBox="0 0 80 60" aria-hidden>
        <path id="hopPath" d="M4 44 C 22 6, 52 6, 70 34" fill="none" stroke="#c9a02e" strokeWidth="5" strokeLinecap="round" strokeDasharray="1 9" />
        <path d="M58 22 L 74 36 L 54 42" fill="none" stroke="#c9a02e" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
        <circle r="5" fill="#0b1b3a"><animateMotion dur="2.6s" repeatCount="indefinite" begin="1s"><mpath href="#hopPath" /></animateMotion></circle>
      </svg>

      {/* 2. The miles piggy bank */}
      <section className={`${styles.stage} ${styles.bankStage}`}>
        <p className={styles.label}>Collect miles</p>
        <div className={styles.bank}>
          <div className={styles.tokens} aria-hidden>
            <span className={styles.token}><i className="ti ti-plane" /></span>
            <span className={styles.token}><i className="ti ti-plane" /></span>
            <span className={styles.token}><i className="ti ti-plane" /></span>
          </div>
          <svg className={styles.pig} viewBox="0 0 240 180" role="img" aria-label="A piggy bank collecting miles">
            <defs>
              <linearGradient id="pigGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#f8e08e" /><stop offset=".55" stopColor="#e2b53c" /><stop offset="1" stopColor="#b8862a" /></linearGradient>
              <linearGradient id="pigShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".5" /><stop offset=".5" stopColor="#fff" stopOpacity="0" /></linearGradient>
            </defs>
            <ellipse cx="116" cy="168" rx="84" ry="7" fill="#0b1b3a" opacity=".12" />
            <path d="M44 100 C 18 96, 14 70, 30 64 C 40 60, 44 72, 36 78" fill="none" stroke="#b8862a" strokeWidth="6" strokeLinecap="round" />
            <rect x="66" y="128" width="22" height="36" rx="9" fill="#c9962f" />
            <rect x="150" y="128" width="22" height="36" rx="9" fill="#c9962f" />
            <path d="M156 58 L 168 30 C 176 36, 184 48, 184 64 Z" fill="#d6a53a" />
            <ellipse cx="116" cy="98" rx="86" ry="58" fill="url(#pigGold)" />
            <ellipse cx="116" cy="98" rx="86" ry="58" fill="url(#pigShade)" />
            <ellipse cx="204" cy="106" rx="22" ry="18" fill="#e9bf4f" />
            <ellipse cx="204" cy="106" rx="22" ry="18" fill="url(#pigShade)" />
            <circle cx="198" cy="106" r="3.2" fill="#8a5a12" /><circle cx="210" cy="106" r="3.2" fill="#8a5a12" />
            <circle cx="170" cy="84" r="4.6" fill="#0b1b3a" /><circle cx="171.5" cy="82.6" r="1.4" fill="#fff" />
            <rect x="96" y="44" width="44" height="7" rx="3.5" fill="#0b1b3a" />
            <text x="110" y="112" textAnchor="middle" fontSize="23" fontWeight="800" letterSpacing="3" fill="#0b1b3a" fontFamily="'Plus Jakarta Sans', sans-serif">MILES</text>
            <path d="M84 126 H 138" stroke="#0b1b3a" strokeOpacity=".35" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div className={styles.total}>
          <small>You may collect up to</small>
          <strong>{miles.toLocaleString('en-US')}</strong>
          <span>miles / yr from your spending</span>
        </div>
      </section>

      {/* 3. Arrows to the options, and the options */}
      <section className={`${styles.stage} ${styles.outStage}`}>
        <p className={styles.label}>Your miles can fly you to</p>
        <div className={styles.outRow}>
          <div className={styles.fan} aria-hidden>
            <svg viewBox="0 0 80 300" preserveAspectRatio="none">
              {ARROWS.map((arrow, index) => (
                <path key={index} className={styles.stroke} d={arrow.d} fill="none" stroke={arrow.color} strokeWidth={arrow.width} strokeLinecap="round" vectorEffect="non-scaling-stroke" style={{ animationDelay: `${0.3 + index * 0.1}s` }} />
              ))}
            </svg>
            {ARROWS.map((arrow, index) => (
              <i key={index} className={styles.head} style={{ top: arrow.top, borderLeftColor: arrow.color, borderTopWidth: 5 + arrow.width * 1.1, borderBottomWidth: 5 + arrow.width * 1.1, borderLeftWidth: 8 + arrow.width * 2.2 }} />
            ))}
          </div>
          <ul className={styles.outs}>
            {shown.map(dest => (
              <li key={dest.place} className={styles.dest}>
                {dest.image ? <img src={dest.image} alt="" loading="eager" /> : <span className={styles.pin}><i className="ti ti-plane" aria-hidden /></span>}
                <span className={styles.destText}>
                  <small>{dest.months <= 0 ? 'You can fly to' : 'Possible to fly to'}</small>
                  <b>{dest.place}<span className={styles.cls}>{dest.cabin}</span></b>
                  <em><i className="ti ti-clock" aria-hidden /> {dest.months <= 0 ? 'right now' : `in ~${dest.months} month${dest.months === 1 ? '' : 's'}`}</em>
                </span>
              </li>
            ))}
            <li className={`${styles.dest} ${styles.choose}`}>
              <span className={styles.pin}><i className="ti ti-map-pin-search" aria-hidden /></span>
              <span className={styles.destText}>
                <b>Choose your destination?</b>
                <button type="button" className={styles.go} onClick={onChoose}>See how long it will take <i className="ti ti-arrow-down" aria-hidden /></button>
              </span>
            </li>
          </ul>
        </div>
      </section>
      </div>
    </div>
  )
}
