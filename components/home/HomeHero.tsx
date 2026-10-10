'use client'

import s from './Home.module.css'

// The "spending journey": an everyday moment, the card decision, the tap, and where it can lead.
// Each picture is a pre-cropped, sharpened image (public/images/home) at 2x and 3x so it stays crisp on high-density screens.
const JOURNEY = [
  { step: 'Spend', alt: 'A cup of coffee on a marble table', file: 'journey-spend' },
  { step: 'Choose', alt: 'Bank cards in a leather wallet', file: 'journey-choose' },
  { step: 'Earn', alt: 'A card tapped on a payment terminal in a mall', file: 'journey-earn' },
  { step: 'Experience', alt: 'An infinity pool above the sea', file: 'journey-experience' },
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
              <img
                className={s.journeyFrame}
                src={`/images/home/${j.file}-216.webp`}
                srcSet={`/images/home/${j.file}-216.webp 216w, /images/home/${j.file}-324.webp 324w`}
                sizes="120px"
                width={216}
                height={348}
                alt={j.alt}
                decoding="async"
              />
              <span className={s.journeyLabel}><b>0{i + 1}</b>{j.step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
