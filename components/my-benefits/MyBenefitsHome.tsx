'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { setCards } from '@/lib/my-benefits/cardsSlice'
import { BENEFIT_FEATURES, benefitSections, type BenefitFeature } from '@/lib/my-benefits/features'
import { useAppDispatch, useAppSelector } from '@/lib/my-benefits/hooks'
import BenefitCarousel from './BenefitCarousel'
import CardSelectionFlow from './CardSelectionFlow'
import styles from './MyBenefitsHome.module.css'

// The My Benefits landing page: a hero with six quick categories, then "Browse your benefits" with filter chips.
// Each chip shows the tiles of the benefit pages that belong to it; "All" shows every section as before.
type Chip = { name: string; icon: string; tone: string; features: (feature: BenefitFeature) => boolean }

const slugs = (...list: string[]) => (feature: BenefitFeature) => list.includes(feature.slug)
const CHIPS: Chip[] = [
  { name: 'Dining', icon: 'ti-tools-kitchen-2', tone: styles.green, features: slugs('restaurant-discounts', 'dining-food-delivery') },
  { name: 'Shopping', icon: 'ti-shopping-bag', tone: styles.mint, features: feature => feature.category === 'Shopping' && feature.slug !== 'restaurant-discounts' },
  { name: 'Movies', icon: 'ti-movie', tone: styles.violet, features: slugs('cinema', 'streaming-media', 'apps-streaming-media', 'theme-parks-attractions', 'exclusive-experiences') },
  { name: 'Fitness', icon: 'ti-barbell', tone: styles.peach, features: slugs('health-fitness', 'wellness-leisure', 'golf') },
  { name: 'Travel', icon: 'ti-plane', tone: styles.mint, features: feature => feature.category === 'Travel' },
  { name: 'Protection', icon: 'ti-shield-check', tone: styles.sage, features: feature => feature.category === 'Protection & Assistance' || feature.slug === 'insurance-protection' },
]

export default function MyBenefitsHome() {
  const dispatch = useAppDispatch()
  const { cards } = useAppSelector(state => state.selectedCards)
  const [active, setActive] = useState<string>('All')
  const [managing, setManaging] = useState(false)
  const browse = useRef<HTMLElement>(null)

  // Picking a category brings the "Browse your benefits" section to the top of the screen, once the new tiles are drawn.
  const [scrollTick, setScrollTick] = useState(0)
  const choose = (name: string) => {
    setActive(name)
    setScrollTick(tick => tick + 1)
  }
  useEffect(() => {
    if (scrollTick > 0) browse.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [scrollTick])

  const shown = useMemo(() => {
    const chip = CHIPS.find(item => item.name === active)
    if (!chip) return null
    const seen = new Set<string>()
    return BENEFIT_FEATURES.filter(chip.features).filter(feature => {
      if (seen.has(feature.momentId)) return false
      seen.add(feature.momentId)
      return true
    })
  }, [active])

  return <div className={styles.page}>
    <div className={styles.heroBand}>
    <section className={styles.hero} aria-labelledby="my-benefits-title">
      <div>
        <p className={styles.eyebrow}>MY BENEFITS</p>
        <h1 id="my-benefits-title">Your cards come with more<i>.</i></h1>
        <p className={styles.lead}>Discover offers and perks you already have — for shopping, dining, movies, fitness, travel and more.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => choose('All')}>Explore my benefits <i className="ti ti-arrow-right" aria-hidden="true" /></button>
          <button type="button" className={styles.link} onClick={() => setManaging(true)}>{cards.length ? 'Manage my cards' : 'Add my cards'}</button>
        </div>
      </div>

      <div>
        <ul className={styles.tiles}>
          {CHIPS.map(chip => <li key={chip.name}>
            <button type="button" className={styles.tile} onClick={() => choose(chip.name)}>
              <span className={`${styles.badge} ${chip.tone}`}><i className={`ti ${chip.icon}`} aria-hidden="true" /></span>
              <span className={styles.tileName}>{chip.name} <i className="ti ti-chevron-right" aria-hidden="true" /></span>
            </button>
          </li>)}
        </ul>
        <p className={styles.note}>Benefits depend on your selected cards</p>
      </div>
    </section>
    </div>

    <section className={styles.browse} ref={browse} aria-label="Browse your benefits">
      <div className={styles.browseHead}>
        <h2>Browse your benefits</h2>
        <ul className={styles.chips}>
          {['All', ...CHIPS.map(chip => chip.name)].map(name => <li key={name}>
            <button type="button" aria-pressed={active === name} className={`${styles.chip} ${active === name ? styles.chipOn : ''}`} onClick={() => choose(name)}>{name}</button>
          </li>)}
        </ul>
      </div>
      {shown
        ? shown.length
          ? <BenefitCarousel key={active} category={active} features={shown} wide />
          : <p className={styles.empty}>Nothing here yet.</p>
        : benefitSections().map((section, index) => <div key={section.category}>
          {index > 0 && <hr className={styles.divider} />}
          <BenefitCarousel category={section.category} features={section.features} wide />
        </div>)}
    </section>

    {managing && <CardSelectionFlow current={cards} onConfirm={chosen => { dispatch(setCards(chosen)); setManaging(false) }} onCancel={() => setManaging(false)} />}
  </div>
}
