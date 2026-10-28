'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { fetchAllBenefits } from '@/lib/life-moments/api'
import { useSavedProfile } from '@/lib/profile/useSavedProfile'
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
  { name: 'Dining', icon: 'ti-tools-kitchen-2', tone: styles.cDining, features: slugs('restaurant-discounts', 'dining-food-delivery') },
  { name: 'Shopping', icon: 'ti-shopping-bag', tone: styles.cShopping, features: feature => feature.category === 'Shopping' && feature.slug !== 'restaurant-discounts' },
  { name: 'Movies', icon: 'ti-movie', tone: styles.cMovies, features: slugs('cinema', 'streaming-media', 'apps-streaming-media', 'theme-parks-attractions', 'exclusive-experiences') },
  { name: 'Fitness', icon: 'ti-barbell', tone: styles.cFitness, features: slugs('health-fitness', 'wellness-leisure', 'golf') },
  { name: 'Travel', icon: 'ti-plane', tone: styles.cTravel, features: feature => feature.category === 'Travel' },
  { name: 'Protection', icon: 'ti-shield-check', tone: styles.cProtection, features: feature => feature.category === 'Protection & Assistance' || feature.slug === 'insurance-protection' },
]

const aed = (n: number) => `AED ${Math.round(n).toLocaleString('en-US')}`

// Perk chips that drift around the hero: decoration only (they are not links).
const FLOATERS = [
  { icon: 'ti-sofa', text: 'Airport lounge', cls: 'f1' },
  { icon: 'ti-tools-kitchen-2', text: '20% off dining', cls: 'f3' },
  { icon: 'ti-barbell', text: 'Gym pass', cls: 'f4' },
  { icon: 'ti-shield-check', text: 'Purchase protection', cls: 'f5' },
] as const

export default function MyBenefitsHome() {
  const dispatch = useAppDispatch()
  const { cards } = useAppSelector(state => state.selectedCards)
  const saved = useSavedProfile()
  const [active, setActive] = useState<string>('All')
  // 'all' = every benefit tile; 'mine' = only the tiles where the user's own cards have something to show
  const [view, setView] = useState<'all' | 'mine'>('all')
  const [owned, setOwned] = useState<{ key: string; counts: Record<string, number>; total: number } | null>(null)
  const [ownedFailed, setOwnedFailed] = useState(false)
  const cardKey = useMemo(() => cards.map(card => card.earnn_card_id).sort().join('|'), [cards])
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

  // What the user's cards offer, counted per benefit group (one call for all of them).
  useEffect(() => {
    if (view !== 'mine' || !cardKey) return
    let cancelled = false
    /* eslint-disable react-hooks/set-state-in-effect */
    setOwnedFailed(false)
    /* eslint-enable react-hooks/set-state-in-effect */
    fetchAllBenefits(cardKey.split('|'))
      .then(response => {
        if (cancelled) return
        const counts: Record<string, number> = {}
        let total = 0
        for (const group of response.groups) {
          const n = group.cards.reduce((sum, card) => sum + card.benefits.length, 0)
          if (n > 0) { counts[group.display_group] = n; total += n }
        }
        setOwned({ key: cardKey, counts, total })
      })
      .catch(() => { if (!cancelled) setOwnedFailed(true) })
    return () => { cancelled = true }
  }, [view, cardKey])
  const mineReady = view === 'mine' && !!cardKey && owned?.key === cardKey
  const hasSomething = useMemo(() => (feature: BenefitFeature) => view !== 'mine' || !mineReady || feature.groups.some(group => (owned?.counts[group] ?? 0) > 0), [view, mineReady, owned])

  const shown = useMemo(() => {
    const chip = CHIPS.find(item => item.name === active)
    if (!chip) return null
    const seen = new Set<string>()
    return BENEFIT_FEATURES.filter(chip.features).filter(hasSomething).filter(feature => {
      if (seen.has(feature.momentId)) return false
      seen.add(feature.momentId)
      return true
    })
  }, [active, hasSomething])

  return <div className={styles.page}>
    <div className={styles.heroBand}>
    <div className={styles.glow} aria-hidden="true"><span /><span /><span /></div>
    <section className={styles.hero} aria-labelledby="my-benefits-title">
      <ul className={styles.floaters} aria-hidden="true">
        {FLOATERS.map(item => <li key={item.text} className={`${styles.floater} ${styles[item.cls]}`}><i className={`ti ${item.icon}`} />{item.text}</li>)}
      </ul>
      <div className={styles.copy}>
        <p className={styles.eyebrow}><span className={styles.pulse} aria-hidden="true" />MY BENEFITS</p>
        <h1 id="my-benefits-title">Get <mark>more</mark> from the cards you <span className={styles.wavy}>already have</span><i>.</i></h1>
        <p className={styles.lead}>Discover discounts, offers and hidden perks on your credit cards, from dining and shopping to movies, fitness, travel and more.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.link} onClick={() => setManaging(true)}><i className="ti ti-credit-card" aria-hidden="true" />{cards.length ? 'Manage my cards' : 'Add my cards'}<i className="ti ti-arrow-right" aria-hidden="true" /></button>
        </div>
      </div>

      <div className={styles.right}>
        <ul className={styles.tiles}>
          {CHIPS.map((chip, index) => <li key={chip.name} style={{ animationDelay: `${0.15 + index * 0.07}s` }} className={styles.tileItem}>
            <button type="button" className={`${styles.tile} ${chip.tone}`} onClick={() => choose(chip.name)}>
              <span className={styles.badge}><i className={`ti ${chip.icon}`} aria-hidden="true" /></span>
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
        <div role="tablist" aria-label="Which benefits to show" className={styles.viewSwitch}>
          {([['all', 'Show all benefits'], ['mine', 'Show only my benefits']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} className={`${styles.viewOption} ${view === id ? styles.viewOn : ''}`} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
        <ul className={styles.chips}>
          {['All', ...CHIPS.map(chip => chip.name)].map(name => <li key={name}>
            <button type="button" aria-pressed={active === name} className={`${styles.chip} ${active === name ? styles.chipOn : ''}`} onClick={() => choose(name)}>{name}</button>
          </li>)}
        </ul>
      </div>
      {view === 'mine' && (
        <p className={styles.mineNote} role="status">
          {!cards.length
            ? <>You have not added your cards yet. <button type="button" className={styles.noteLink} onClick={() => setManaging(true)}>Add my cards</button> to see only the benefits you already have.</>
            : ownedFailed
              ? 'We could not check the benefits on your cards just now. Please try again in a moment.'
              : !mineReady
                ? 'Checking what your cards offer…'
                : <>
                  <b>{cards.length === 1 ? 'Your card' : `Your ${cards.length} cards`}</b>: {cards.slice(0, 3).map(card => card.card_name).join(', ')}{cards.length > 3 ? ` and ${cards.length - 3} more` : ''}.
                  {saved.totalMonthly > 0 && <> Monthly spend {aed(saved.totalMonthly)}.</>}
                  {' '}{owned!.total > 0 ? <>Between them they offer <b>{owned!.total} {owned!.total === 1 ? 'benefit' : 'benefits'}</b>, shown below.</> : 'These cards have no benefits to show yet.'}
                  {' '}<button type="button" className={styles.noteLink} onClick={() => setManaging(true)}>Change cards</button>
                </>}
        </p>
      )}
      {view === 'mine' && (!cards.length || ownedFailed || !mineReady) ? null : shown
        ? shown.length
          ? <BenefitCarousel key={active} category={active} features={shown} wide />
          : <p className={styles.empty}>Nothing here yet.</p>
        : benefitSections()
          .map(section => ({ ...section, features: section.features.filter(hasSomething) }))
          .filter(section => section.features.length > 0)
          .map((section, index) => <div key={section.category}>
            {index > 0 && <hr className={styles.divider} />}
            <BenefitCarousel category={section.category} features={section.features} wide />
          </div>)}
    </section>

    {managing && <CardSelectionFlow current={cards} onConfirm={chosen => { dispatch(setCards(chosen)); setManaging(false) }} onCancel={() => setManaging(false)} />}
  </div>
}
