'use client'

import { cropStyle } from './tools'
import s from './Home.module.css'

// The "spending journey": an everyday moment, the card decision, the tap, and where it can lead.
const FRAME_ASPECT = 0.62
const JOURNEY = [
  { step: 'Spend', alt: 'A cup of coffee on a marble table', src: '/images/heroes/Analyze-new.webp', crop: cropStyle(0.965, 0.62, 2.0, FRAME_ASPECT) },
  { step: 'Choose', alt: 'Bank cards in a leather wallet', src: '/images/heroes/Analyze-new.webp', crop: cropStyle(0.72, 0.5, 1.15, FRAME_ASPECT) },
  { step: 'Earn', alt: 'A card tapped on a payment terminal in a mall', src: '/images/heroes/CardMatch.webp', crop: cropStyle(0.77, 0.68, 1.3, FRAME_ASPECT) },
  { step: 'Experience', alt: 'An infinity pool above the sea', src: '/images/heroes/TripPlanner.webp', crop: cropStyle(0.715, 0.28, 2.2, FRAME_ASPECT, 2.695) },
]

export default function HomeHero() {
  const goToTools = () => {
    const el = document.getElementById('tools')
    if (!el) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <section className={s.hero} aria-labelledby="home-hero-title">
      <div className={s.heroInner}>
        <div className={s.heroText}>
          <p className={s.eyebrow}>The Hyper-Personalized Finance Platform</p>
          <h1 id="home-hero-title">Turning every transaction into a smarter financial decision.</h1>
          <p className={s.heroLead}>
            Find the right cards. Know which one to use where.<br />
            Plan big expenses. Turn spending into flight tickets.
          </p>
          <div className={s.heroActions}>
            <button type="button" className="btn-primary" onClick={goToTools}>
              Explore Earnn <i className="ti ti-arrow-down" aria-hidden />
            </button>
            <span className={s.uaeLine}>Built for UAE credit cards &amp; rewards</span>
          </div>
        </div>

        <ol className={s.journey} aria-label="From everyday spending to better outcomes">
          {JOURNEY.map((j, i) => (
            <li key={j.step} className={s.journeyStep} style={{ marginTop: i % 2 ? 34 : 0 }}>
              <div
                className={s.journeyFrame}
                role="img"
                aria-label={j.alt}
                style={{ backgroundImage: `url(${j.src})`, ...j.crop }}
              />
              <span className={s.journeyLabel}><b>0{i + 1}</b>{j.step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
