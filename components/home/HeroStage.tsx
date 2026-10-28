'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import adcb365 from '@/assets/home-cards/adcb-365.webp'
import dibShams from '@/assets/home-cards/dib-shams-signature.webp'
import enbdLuluPlatinum from '@/assets/home-cards/enbd-lulu-platinum.webp'
import styles from './HeroStage.module.css'

// The home hero: "There is a right credit card for every ..." with the last word rotating through the four things Earnn does.
// The card fan never moves. The four tiles are the calls to action; each one takes a turn, and while it is selected its own
// example (what someone would ask that tool) appears in a bubble just below the tiles, then goes away before the next turn.
const SCENES = [
  { word: 'person', label: 'Find my cards', tagline: 'Built around you', href: '/find-my-best-cards', icon: 'ti-user-check', question: 'What are the best three cards for me?' },
  { word: 'transaction', label: 'Check before I pay', tagline: 'Swipe the right card', href: '/merchant-lookup', icon: 'ti-scan', question: 'What card should I use at Lulu?' },
  { word: 'big purchase', label: 'Plan a big payment', tagline: 'Earn on big bills', href: '/bulk-spend', icon: 'ti-calendar-dollar', question: 'I have to pay my child’s school fees. Which card should I use?' },
  { word: 'trip', label: 'Turn spending into flights', tagline: 'Fly on your spend', href: '/trip-planner', icon: 'ti-plane-departure', question: 'I spend AED 120,000 a year. How can I turn that into a business class ticket?' },
] as const

const ROTATE_MS = 4800
const FADE_MS = 450 // matches the bubble's opacity transition, so it finishes fading just as the next tile takes over

export default function HeroStage() {
  const [active, setActive] = useState(0)
  const [shown, setShown] = useState(true)
  const [paused, setPaused] = useState(false)
  const [calm, setCalm] = useState(false)

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setCalm(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  // Each turn: show the example, start fading it so it is gone exactly when the next tile takes over. Hovering or focusing a tile holds its example open.
  useEffect(() => {
    setShown(true)
    if (paused || calm) return
    const hide = window.setTimeout(() => setShown(false), ROTATE_MS - FADE_MS)
    const next = window.setTimeout(() => setActive(index => (index + 1) % SCENES.length), ROTATE_MS)
    return () => { window.clearTimeout(hide); window.clearTimeout(next) }
  }, [active, paused, calm])

  const scene = SCENES[active]
  // The bubble spans two tile columns starting at its tile (the last one ends at the right edge); its pointer sits over that tile
  const bubbleVars = { '--col': Math.min(active, 2) + 1, '--ptr': active === 3 ? '75%' : '25%' } as CSSProperties

  return (
    <section className={styles.hero} style={{ '--cycle': `${ROTATE_MS}ms` } as CSSProperties}>
      <div className={styles.inner}>
        <div className={styles.copy}>
          <p className={styles.tag}><i className="ti ti-sparkles" aria-hidden /> UAE’s First Multi-Credit Card Rewards Simulator</p>
          <h1>
            <span className={styles.lead}>There is a right credit card for every</span>
            <span className={styles.wordBox} aria-hidden>
              <span key={scene.word} className={styles.word}>{scene.word}</span>
              <span className={styles.dot}>.</span>
            </span>
            <span className={styles.visuallyHidden}>person, transaction, big purchase and trip.</span>
          </h1>
          <p className={styles.sub}>Earnn helps you find the right credit cards, know which one to use, and get more cashback, miles and benefits from your spending.</p>
          <p className={styles.free}><i className="ti ti-circle-check" aria-hidden /> Free to explore. No sign-up needed.</p>
        </div>

        <div className={styles.stage} aria-hidden>
          <div className={styles.halo} />
          <div className={`${styles.layer} ${styles.layerC}`}><div className={`${styles.card} ${styles.cardC}`}><Image src={dibShams} alt="" width={240} height={150} /><span>Card C</span></div></div>
          <div className={`${styles.layer} ${styles.layerB}`}><div className={`${styles.card} ${styles.cardB}`}><Image src={adcb365} alt="" width={240} height={150} /><span>Card B</span></div></div>
          <div className={`${styles.layer} ${styles.layerA}`}><div className={`${styles.card} ${styles.cardA}`}><Image src={enbdLuluPlatinum} alt="" width={240} height={150} priority /><span>Card A</span></div></div>
        </div>
      </div>

      <ul className={styles.tabs} aria-label="What Earnn does" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
        {SCENES.map((item, index) => (
          <li key={item.word}>
            <Link href={item.href} className={`${styles.tab} ${index === active ? styles.tabOn : ''}`} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)}>
              <i className={`ti ${item.icon} ${styles.tabIcon}`} aria-hidden />
              <span className={styles.tabText}><b>{item.label}</b><small>{item.tagline}</small></span>
              <i className={`ti ti-chevron-right ${styles.go}`} aria-hidden />
              <em className={styles.bar} data-run={index === active && !paused && !calm ? 'on' : 'off'} key={index === active ? `on-${active}-${paused}` : `off-${index}`} />
            </Link>
          </li>
        ))}
      </ul>

      <div className={styles.slot} aria-live="polite">
        <div key={active} className={`${styles.bubble} ${shown ? styles.bubbleOn : ''}`} style={bubbleVars}>
          <i className="ti ti-message-circle" aria-hidden />
          <p>{scene.question}</p>
        </div>
      </div>
    </section>
  )
}
