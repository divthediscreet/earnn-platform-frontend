'use client'

import Link from 'next/link'
import Image, { type StaticImageData } from 'next/image'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { fetchCards, getCardImageUrl } from '@/lib/api'
import citiPremierImage from '@/assets/home-cards/citi-premier.webp'
import shukranAdcbImage from '@/assets/home-cards/shukran-adcb.webp'
import fabGemsWorldImage from '@/assets/home-cards/fab-gems-world.webp'
import eibCashbackPlusImage from '@/assets/home-cards/eib-cashback-plus.webp'
import sibCashbackTitaniumImage from '@/assets/home-cards/sib-cashback-titanium.webp'
import eibAmazonWorldImage from '@/assets/home-cards/eib-amazon-world.webp'
import styles from './NewHomePage.module.css'

interface HomeCard {
  earnn_card_id: string
  card_name: string
  bank_name: string
  bank_code: string | null
  earnn_score: number
  effective_reward_rate: number
  expected_annual_return_aed: number
  annual_fee_year1_aed: number | null
  free_for_life: boolean
  has_lounge_access: boolean
  display_reward_rate_dining: number
  display_reward_rate_grocery: number
  display_reward_rate_travel: number
  display_reward_rate_all_spend: number
  imageSrc?: StaticImageData
}

const spending = [
  ['Education', '6,538', '100%'],
  ['Everyday & Other', '5,921', '90%'],
  ['Retail', '3,365', '52%'],
  ['Online Shopping', '1,547', '26%'],
  ['Telecom', '1,481', '24%'],
]

const makeHomeCard = (earnn_card_id: string, card_name: string, bank_name: string, bank_code: string, imageSrc: StaticImageData): HomeCard => ({
  earnn_card_id,
  card_name,
  bank_name,
  bank_code,
  imageSrc,
  earnn_score: 0,
  effective_reward_rate: 0,
  expected_annual_return_aed: 0,
  annual_fee_year1_aed: null,
  free_for_life: false,
  has_lounge_access: false,
  display_reward_rate_dining: 0,
  display_reward_rate_grocery: 0,
  display_reward_rate_travel: 0,
  display_reward_rate_all_spend: 0,
})

const HOME_FEATURED_CARDS = [
  makeHomeCard('citi_03', 'Citi Premier Credit Card', 'Citibank Bank UAE', 'CITI', citiPremierImage),
  makeHomeCard('adcb_01', 'Shukran ADCB Credit Card', 'Abu Dhabi Commercial Bank', 'ADCB', shukranAdcbImage),
  makeHomeCard('fab_04', 'FAB GEMS World Credit Card', 'First Abu Dhabi Bank', 'FAB', fabGemsWorldImage),
  makeHomeCard('eib_02', 'Emirates Islamic Cashback Plus Credit Card', 'Emirates Islamic Bank', 'EIB', eibCashbackPlusImage),
]

const HOME_ONLINE_CARDS = [
  makeHomeCard('sib_01', 'SIB Cashback Titanium Covered Card', 'Sharjah Islamic Bank', 'SIB', sibCashbackTitaniumImage),
  makeHomeCard('eib_06', 'Emirates Islamic Amazon World Credit Card', 'Emirates Islamic Bank', 'EIB', eibAmazonWorldImage),
]

const allocationRoutes = [
  { from: 1, to: 0 },
  { from: 2, to: 1 },
  { from: 0, to: 2 },
  { from: 4, to: 3 },
  { from: 3, to: 0 },
  { from: 0, to: 3, spill: true },
]

const friction = [
  ['Monthly cap', 'AED 200'],
  ['Minimum spend', 'AED 5,000'],
  ['Eligible categories only', 'Groceries, dining'],
  ['Selected merchants', 'Partner list'],
]

const merchantMap = [
  ['Talabat', 'Dining'], ['DEWA', 'Utilities'], ['GEMS', 'Education'],
  ['Careem', 'Transport'], ['Amazon', 'Online Shopping'],
]

const walletChoices = [
  { key: 'simple', selector: '2 Cards', title: 'Keep It Simple', cardCount: 2, monthlyReward: 784 },
  { key: 'balance', selector: '3 Cards', title: 'Best Balance', cardCount: 3, monthlyReward: 962 },
  { key: 'maximum', selector: '4 Cards', title: 'Maximum Rewards', cardCount: 4, monthlyReward: 1116 },
] as const

type WalletChoiceKey = typeof walletChoices[number]['key']

const formatAed = (value: number | null | undefined) =>
  `AED ${Math.round(Number(value || 0)).toLocaleString('en-AE')}`

const rate = (value: number | null | undefined) => `${(Number(value || 0) * 100).toFixed(1)}%`

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncPreference = () => setReducedMotion(media.matches)
    syncPreference()
    media.addEventListener('change', syncPreference)
    return () => media.removeEventListener('change', syncPreference)
  }, [])

  return reducedMotion
}

function useInViewOnce<T extends HTMLElement>() {
  const ref = useRef<T | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setVisible(true)
      observer.disconnect()
    }, { threshold: 0.25 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  return [ref, visible] as const
}

function AnimatedNumber({ value, active = true, delay = 0, duration = 900, reducedMotion = false, precision = 0 }: {
  value: number
  active?: boolean
  delay?: number
  duration?: number
  reducedMotion?: boolean
  precision?: number
}) {
  const [displayValue, setDisplayValue] = useState(active && reducedMotion ? value : 0)
  const previousValue = useRef(displayValue)

  useEffect(() => {
    if (!active) return
    if (reducedMotion) {
      const frame = window.requestAnimationFrame(() => setDisplayValue(value))
      previousValue.current = value
      return () => window.cancelAnimationFrame(frame)
    }

    let animationFrame = 0
    const from = previousValue.current
    const timer = window.setTimeout(() => {
      const startedAt = performance.now()
      const animate = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        const multiplier = 10 ** precision
        const nextValue = Math.round((from + ((value - from) * eased)) * multiplier) / multiplier
        setDisplayValue(nextValue)
        if (progress < 1) animationFrame = window.requestAnimationFrame(animate)
        else previousValue.current = value
      }
      animationFrame = window.requestAnimationFrame(animate)
    }, delay)

    return () => {
      window.clearTimeout(timer)
      window.cancelAnimationFrame(animationFrame)
    }
  }, [active, delay, duration, precision, reducedMotion, value])

  return <>{displayValue.toLocaleString('en-AE', { minimumFractionDigits: precision, maximumFractionDigits: precision })}</>
}

function CardImage({ card, compact = false }: { card?: HomeCard; compact?: boolean }) {
  if (!card) return <div className={`${styles.cardImage} ${compact ? styles.cardImageCompact : ''} ${styles.cardLoading}`} aria-label="Loading card image" />
  return (
    <div className={`${styles.cardImage} ${compact ? styles.cardImageCompact : ''}`}>
      <Image src={card.imageSrc || getCardImageUrl(card.earnn_card_id)} alt={`${card.card_name} credit card`} width={142} height={88} unoptimized={!card.imageSrc} priority={Boolean(card.imageSrc)} />
    </div>
  )
}

function Money({ children, suffix }: { children: React.ReactNode; suffix?: string }) {
  return <span className={styles.money}><small>AED</small> {children}{suffix && <em>{suffix}</em>}</span>
}

function SectionTitle({ eyebrow, title, copy, light = false, className = '' }: { eyebrow: string; title: React.ReactNode; copy?: string; light?: boolean; className?: string }) {
  return (
    <div className={`${styles.sectionHeading} ${className}`}>
      <p className={light ? styles.eyebrowLight : styles.eyebrow}>{eyebrow}</p>
      <h2>{title}</h2>
      {copy && <p className={light ? styles.copyLight : styles.copy}>{copy}</p>}
    </div>
  )
}

export default function NewHomePage() {
  const [cards, setCards] = useState<HomeCard[]>([])
  const [strategy, setStrategy] = useState<WalletChoiceKey>('simple')
  const [strategyPinned, setStrategyPinned] = useState(false)
  const [heroMotionCycle, setHeroMotionCycle] = useState(0)
  const [rateMotionCycle, setRateMotionCycle] = useState(0)
  const reducedMotion = usePrefersReducedMotion()
  const [rateStoryRef, rateStoryVisible] = useInViewOnce<HTMLDivElement>()
  const [allocationRef, allocationVisible] = useInViewOnce<HTMLDivElement>()
  const [chooseRef, chooseVisible] = useInViewOnce<HTMLElement>()
  const spendPanelRef = useRef<HTMLElement | null>(null)
  const walletPanelRef = useRef<HTMLElement | null>(null)
  const spendRouteRefs = useRef<(HTMLDivElement | null)[]>([])
  const walletRouteRefs = useRef<(HTMLDivElement | null)[]>([])
  const [allocationPaths, setAllocationPaths] = useState<string[]>([])
  const [allocationBox, setAllocationBox] = useState({ width: 0, height: 0 })

  const measureAllocation = useCallback(() => {
    const grid = allocationRef.current
    if (!grid) return
    const gridBox = grid.getBoundingClientRect()
    const leftBox = spendPanelRef.current?.getBoundingClientRect()
    const rightBox = walletPanelRef.current?.getBoundingClientRect()
    const paths = allocationRoutes.map(route => {
      const source = spendRouteRefs.current[route.from]?.getBoundingClientRect()
      const target = walletRouteRefs.current[route.to]?.getBoundingClientRect()
      if (!source || !target) return ''
      const x1 = (leftBox?.right ?? source.right) - gridBox.left
      const y1 = source.top + (source.height / 2) - gridBox.top
      const x2 = (rightBox?.left ?? target.left) - gridBox.left
      const y2 = target.top + (target.height / 2) - gridBox.top
      const curve = Math.max((x2 - x1) * 0.62, 28)
      return `M ${x1} ${y1} C ${x1 + curve} ${y1}, ${x2 - curve} ${y2}, ${x2} ${y2}`
    })
    setAllocationBox({ width: gridBox.width, height: gridBox.height })
    setAllocationPaths(paths)
  }, [allocationRef])

  useLayoutEffect(() => {
    measureAllocation()
  }, [measureAllocation])

  useEffect(() => {
    const grid = allocationRef.current
    if (!grid) return
    const observer = new ResizeObserver(measureAllocation)
    observer.observe(grid)
    window.addEventListener('resize', measureAllocation)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measureAllocation)
    }
  }, [allocationRef, measureAllocation])

  useEffect(() => {
    let active = true
    fetchCards({ sort_by: 'card_ranking', limit: 6 })
      .then(ranked => {
        if (!active) return
        const rankedCards = (ranked.cards || []).slice(0, 6) as HomeCard[]
        setCards(rankedCards)
      })
      .catch(() => { /* Homepage remains usable while the catalogue wakes up. */ })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!chooseVisible || strategyPinned || reducedMotion) return
    const timer = window.setInterval(() => {
      setStrategy(current => {
        const currentIndex = walletChoices.findIndex(option => option.key === current)
        return walletChoices[(currentIndex + 1) % walletChoices.length].key
      })
    }, 1500)
    return () => window.clearInterval(timer)
  }, [chooseVisible, reducedMotion, strategyPinned])

  useEffect(() => {
    if (reducedMotion) return
    const timer = window.setInterval(() => setHeroMotionCycle(current => current + 1), 10000)
    return () => window.clearInterval(timer)
  }, [reducedMotion])

  useEffect(() => {
    if (!rateStoryVisible || reducedMotion) return
    const timer = window.setInterval(() => setRateMotionCycle(current => current + 1), 5500)
    return () => window.clearInterval(timer)
  }, [rateStoryVisible, reducedMotion])

  const featured = HOME_FEATURED_CARDS
  const compared = useMemo(() => cards.slice(0, 3), [cards])
  const onlinePrimaryCard = HOME_ONLINE_CARDS[0]
  const onlineAlternateCard = HOME_ONLINE_CARDS[1]
  const activeWalletChoice = walletChoices.find(option => option.key === strategy) || walletChoices[0]

  const chooseWallet = (choice: WalletChoiceKey) => {
    setStrategyPinned(true)
    setStrategy(choice)
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.orbOne} /><div className={styles.orbTwo} />
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}><i className="ti ti-sparkles" /> Financial Intelligence for UAE Credit Cards</span>
            <h1>Stop Using the<br /><span>Wrong Credit Card.</span></h1>
            <p>Your spending is unique. Earnn finds the card strategy that could reward it better. Upload your statement and see what your spending could really earn.</p>
            <div className={styles.actions}>
              <Link href="/analyse" className={styles.primaryCta}>Analyse My Spending <i className="ti ti-arrow-right" /></Link>
              <Link href="/compare" className={styles.secondaryCta}>Explore UAE Cards</Link>
            </div>
            <div className={styles.trustLine}><i className="ti ti-lock" /> No bank login required <b>•</b> Free analysis <b>•</b> Takes about 60 seconds</div>
          </div>

          <div key={heroMotionCycle} className={styles.heroComposition}>
            <article className={`${styles.floatingPanel} ${styles.rewardPanel}`}>
              <p className={styles.miniLabel}>Your reward gap</p>
              <strong className={styles.heroGapValue}>+AED <AnimatedNumber value={500} delay={900} duration={650} reducedMotion={reducedMotion} /> <small>/mo</small></strong>
              <span>Potential rewards you could be missing</span>
              <div className={styles.rewardCompare}><div><small>Current wallet</small><b>AED <AnimatedNumber value={616} delay={200} duration={700} reducedMotion={reducedMotion} />/mo</b></div><i className="ti ti-arrow-up-right" /><div><small>Optimized potential</small><b>AED <AnimatedNumber value={1116} delay={1550} duration={800} reducedMotion={reducedMotion} />/mo</b></div></div>
            </article>
            <article className={`${styles.floatingPanel} ${styles.walletPanel}`}>
              <div className={styles.panelTop}><p className={styles.miniLabel}>Your maximum-rewards wallet</p><span>4 cards</span></div>
              <div className={styles.cardStack}>{featured.map(card => <CardImage key={card.earnn_card_id} card={card} compact />)}{!featured.length && [0,1,2,3].map(i => <CardImage key={i} compact />)}</div>
              <div className={styles.panelTotal}><span>Potential rewards</span><Money suffix="/mo"><AnimatedNumber value={1116} delay={2500} duration={800} reducedMotion={reducedMotion} /></Money></div>
            </article>
            <article className={styles.playbookPanel}>
              <div className={styles.playbookTitle}><i className="ti ti-package" /><b>Online Shopping</b><span>AED 7,000/mo</span></div>
              <div className={styles.playbookStep}><small>First AED 3,000</small><b>→ {onlinePrimaryCard?.card_name || 'Loading live card…'}</b></div>
              <div className={styles.capReached}>● Reward capping reached</div>
              <div className={styles.heroFlow} aria-hidden="true"><i /></div>
              <div className={styles.playbookStep}><small>Remaining AED 4,000</small><b>→ {onlineAlternateCard?.card_name || 'Loading live card…'}</b></div>
              <div className={styles.playbookTotal}><span>Potential</span><Money suffix="/mo"><AnimatedNumber value={460} delay={4300} duration={650} reducedMotion={reducedMotion} /></Money></div>
            </article>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <SectionTitle eyebrow="Why credit card rewards are confusing" title={<>The headline rate is only <span className={styles.blue}>half the story.</span></>} copy="A card advertising 10% cashback doesn't mean you're earning 10% across your spending. Caps, thresholds, categories, fees and reward values change what you actually get." />
        <div key={rateMotionCycle} ref={rateStoryRef} className={`${styles.rateStory} ${rateStoryVisible ? styles.rateStoryActive : ''}`}>
          <div className={styles.rateBig}><small>Bank advertises</small><strong><AnimatedNumber value={10} active={rateStoryVisible} duration={480} reducedMotion={reducedMotion} />%</strong><span>Cashback</span></div>
          <i className={`ti ti-arrow-right ${styles.rateArrow} ${styles.rateArrowFirst}`} />
          <div className={styles.butPanel}><p>But…</p>{friction.map(([label, value]) => <div key={label}><span>{label}</span><b>{value}</b></div>)}</div>
          <i className={`ti ti-arrow-right ${styles.rateArrow} ${styles.rateArrowSecond}`} />
          <div className={styles.effectivePanel}><small>Effective reward</small><strong><AnimatedNumber value={2.1} precision={1} active={rateStoryVisible} delay={1900} duration={650} reducedMotion={reducedMotion} />%</strong><span>On real spending</span></div>
        </div>
        <div className={styles.explainerLine}><b>Earnn calculates what the reward could actually be worth for your spending.</b><small>Figures shown are illustrative examples, not guaranteed returns.</small></div>
      </section>

      <section className={`${styles.section} ${styles.navySection} ${styles.rewardGapSection}`}>
        <SectionTitle light eyebrow="Your reward gap" title="See Why You Could Be Missing Rewards" />
        <div className={styles.gapIssueGrid}>
          {[
            ['🔀', 'Using Skywards for groceries?'],
            ['🎯', 'Minimum spend threshold missed'],
            ['💱', 'FX fees on every trip abroad'],
            ['🛑', 'Cashback cap hit and forgotten'],
          ].map(([icon, text]) => <div key={text} className={styles.gapIssue}><span>{icon}</span><b>{text}</b></div>)}
        </div>
        <div className={styles.gapGrid}>
          <div className={styles.gapBox}><span>Your current cards</span><Money suffix="/mo">616</Money><div className={styles.meter}><i style={{ width: '55%' }} /></div></div>
          <div className={styles.gapBridge}>
            <svg viewBox="0 0 150 62" fill="none" aria-hidden="true"><path d="M4 50 C 48 50, 78 12, 146 12" /></svg>
            <div className={styles.gapGain}><strong>+AED 500</strong><span>Potential reward gap</span></div>
          </div>
          <div className={`${styles.gapBox} ${styles.gapOptimized}`}><span>Optimized wallet</span><Money suffix="/mo">1,116</Money><div className={styles.meter}><i style={{ width: '100%' }} /></div></div>
        </div>
        <Link href="/analyse" className={styles.rewardCta}>Find My Reward Gap <i className="ti ti-arrow-right" /></Link>
      </section>

      <section className={`${styles.section} ${styles.surface} ${styles.strategySection}`}>
        <SectionTitle eyebrow="Not just another card ranking" title={<>One card isn&apos;t always the answer.<br /><span className={styles.blue}>The right strategy is.</span></>} copy="Earnn can combine cards so different parts of your spending are routed where they could earn the most value." />
        <div ref={allocationRef} className={`${styles.allocationGrid} ${allocationVisible ? styles.allocationVisible : ''}`}>
          {allocationBox.width > 0 && <svg className={styles.allocationRoutes} width={allocationBox.width} height={allocationBox.height} viewBox={`0 0 ${allocationBox.width} ${allocationBox.height}`} fill="none" aria-hidden="true">
            {allocationPaths.map((path, index) => path ? <path key={`${allocationRoutes[index].from}-${allocationRoutes[index].to}-${index}`} d={path} pathLength={1} className={allocationRoutes[index].spill ? styles.spillRoute : styles.standardRoute} strokeDasharray={allocationRoutes[index].spill ? '0.045 0.055' : '1'} strokeDashoffset={allocationVisible ? 0 : 1} style={{ transitionDelay: `${index * 170}ms` }} /> : null)}
          </svg>}
          <article ref={spendPanelRef} className={styles.productPanel}>
            <p className={styles.miniLabel}>Your spending</p>
            <div className={styles.spendList}>{spending.map(([label, amount, width], index) => <div key={label} ref={node => { spendRouteRefs.current[index] = node }}><div><span>{label}</span><b>AED {amount}</b></div><i><em style={{ width }} /></i></div>)}</div>
            <div className={styles.monthTotal}><span>Monthly spend</span><Money>19,794</Money></div>
          </article>
          <div className={styles.routeSpacer} aria-hidden="true" />
          <article ref={walletPanelRef} className={styles.productPanel}>
            <p className={styles.miniLabel}>Optimized wallet — what each card does</p>
            <div className={styles.walletList}>{featured.map((card, index) => <div key={card.earnn_card_id} ref={node => { walletRouteRefs.current[index] = node }} className={styles.walletRow}><CardImage card={card} compact /><div><b>{card.card_name}</b><span>{['Everyday spending · Online','Retail · Transport','Education','Telecom · after cap'][index] || 'Optimized spend'}</span></div><strong>AED <AnimatedNumber value={306 - index * 19} active={allocationVisible} delay={650 + (index * 240)} reducedMotion={reducedMotion} /><small>/mo</small></strong></div>)}</div>
            <div className={styles.walletSummary}><div><span>Potential monthly rewards</span><Money><AnimatedNumber value={1116} active={allocationVisible} delay={1700} duration={1100} reducedMotion={reducedMotion} /></Money></div><div><span>Estimated net annual value</span><Money suffix="/year"><AnimatedNumber value={12567} active={allocationVisible} delay={1900} duration={1200} reducedMotion={reducedMotion} /></Money></div></div>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.capStrategySection}`}>
        <SectionTitle className={styles.capSectionHeading} eyebrow="Smarter than ‘use this card’" title={<>Hit the Cap? <span className={styles.green}>Switch the Card.</span></>} copy="Earnn can redirect remaining spend to the next-best card when a reward limit is reached." />
        <article className={styles.capCard}>
          <div className={styles.categoryHeader}><i className="ti ti-package" /><div><b>Online Shopping</b><span>AED 7,000 / month</span></div></div>
          <div className={styles.capFlow}>
            <div className={styles.capFlowCard}>
              <p className={styles.miniLabel}>First AED 3,000</p>
              <div><CardImage card={onlinePrimaryCard} compact /><span><b>{onlinePrimaryCard?.card_name || 'Loading live card…'}</b><small>Potential reward</small><Money>244</Money></span></div>
            </div>
            <div className={styles.capSwitch}>
              <span><i className="ti ti-alert-triangle" /> Reward capping reached</span>
              <b>Then switch <i className="ti ti-arrow-right" /></b>
            </div>
            <div className={styles.capFlowCard}>
              <p className={styles.miniLabel}>Remaining AED 4,000</p>
              <div><CardImage card={onlineAlternateCard} compact /><span><b>{onlineAlternateCard?.card_name || 'Loading live card…'}</b><small>Potential reward</small><Money>216</Money></span></div>
            </div>
            <div className={styles.capFlowTotal}><span>Total potential rewards</span><Money suffix="/month">460</Money></div>
          </div>
        </article>
      </section>

      <section className={`${styles.section} ${styles.surface} ${styles.howItWorksSection}`}>
        <SectionTitle eyebrow="How it works" title="From statement to strategy in four steps." />
        <div className={styles.stepsGrid}>
          <article className={styles.productPanel}><p className={styles.eyebrow}>Step 01 — Upload</p><div className={styles.uploadMock}><i className="ti ti-file-description" /><div><b>statement-may.pdf</b><span><i /></span></div></div><h3>Upload your statement</h3><p>No bank login. No account linking. Just your statement.</p></article>
          <article className={styles.productPanel}><p className={styles.eyebrow}>Step 02 — Understand</p><div className={styles.mapList}>{merchantMap.map(([merchant,category]) => <div key={merchant}><b>{merchant}</b><i className="ti ti-arrow-right" /><span>{category}</span></div>)}</div><h3>We understand your spending</h3><p>Earnn identifies where your money goes and how different reward rules apply.</p></article>
          <article className={styles.productPanel}><p className={styles.eyebrow}>Step 03 — Optimize</p><div className={styles.optimizeMock}><div className={styles.optimizeCategories}>{['Education','Retail','Telecom','Online'].map(category => <span key={category}>{category}</span>)}</div><svg className={styles.optimizeFlow} viewBox="0 0 240 38" fill="none" aria-hidden="true"><path d="M24 3 C 24 27, 72 10, 88 35" /><path d="M88 3 C 88 24, 122 12, 132 35" /><path d="M152 3 C 152 24, 142 16, 132 35" /><path d="M216 3 C 216 27, 172 10, 176 35" /></svg><div className={styles.cardStack}>{featured.slice(0,3).map(card => <CardImage key={card.earnn_card_id} card={card} compact />)}</div><div><span>Potential rewards</span><Money suffix="/mo">1,116</Money></div></div><h3>Get your card playbook</h3><p>See which cards could work best, where to use them and what your spending could potentially earn.</p></article>
          <article ref={chooseRef} className={`${styles.productPanel} ${styles.chooseStep}`}>
            <p className={styles.eyebrow}>Step 04 — Choose</p>
            <div className={styles.chooseMock}>
              <div className={styles.chooseSelectors} aria-label="Choose a wallet size">
                {walletChoices.map(option => <button key={option.key} type="button" aria-pressed={strategy === option.key} className={strategy === option.key ? styles.chooseSelectorActive : ''} onClick={() => chooseWallet(option.key)}>{option.selector}</button>)}
              </div>
              <div key={strategy} className={styles.chooseStage} aria-live="polite">
                <b className={styles.chooseStateLabel}>{activeWalletChoice.title}</b>
                <div className={`${styles.chooseCards} ${activeWalletChoice.cardCount === 3 ? styles.chooseCardsThree : ''} ${activeWalletChoice.cardCount === 4 ? styles.chooseCardsFour : ''}`}>
                  {featured.slice(0, activeWalletChoice.cardCount).map((card, index) => <div key={card.earnn_card_id} className={styles.chooseCard} style={{ animationDelay: `${index * 80}ms` }}><CardImage card={card} compact /></div>)}
                </div>
                <div className={`${styles.chooseSummary} ${activeWalletChoice.cardCount === 4 ? styles.chooseSummaryFour : ''}`}><span>{activeWalletChoice.cardCount} cards</span><Money suffix="/mo"><AnimatedNumber value={activeWalletChoice.monthlyReward} duration={500} reducedMotion={reducedMotion} /></Money></div>
              </div>
              <div className={styles.chooseSwap}>Or swap any card ↻</div>
            </div>
            <h3>Make the strategy yours.</h3>
            <p>Choose 2, 3 or 4 cards — or swap a card you prefer. See the impact instantly.</p>
          </article>
        </div>
      </section>

      <section className={`${styles.section} ${styles.compareSection}`}>
        <SectionTitle className={styles.compareSectionHeading} eyebrow="Explore UAE credit cards" title={<>Compare real earning potential,<br />not just headline rates.</>} copy="Live card data from Earnn's UAE catalogue: estimated earning potential, effective reward rates, fees, benefits and key conditions." />
        <div className={styles.compareTable}><table><thead><tr><th>Metric</th>{compared.map(card => <th key={card.earnn_card_id}><CardImage card={card} compact /><span>{card.card_name}</span></th>)}</tr></thead><tbody>{[
          ['Earnn Score', (c:HomeCard) => c.earnn_score.toFixed(0)],
          ['Effective Reward Rate', (c:HomeCard) => rate(c.effective_reward_rate)],
          ['Annual Fee', (c:HomeCard) => c.free_for_life ? 'Free for life' : formatAed(c.annual_fee_year1_aed)],
          ['Estimated Annual Reward', (c:HomeCard) => formatAed(c.expected_annual_return_aed)],
          ['Dining', (c:HomeCard) => rate(c.display_reward_rate_dining)],
          ['Grocery', (c:HomeCard) => rate(c.display_reward_rate_grocery)],
          ['Travel', (c:HomeCard) => rate(c.display_reward_rate_travel)],
          ['Base Spend', (c:HomeCard) => rate(c.display_reward_rate_all_spend)],
          ['Lounge Access', (c:HomeCard) => c.has_lounge_access ? 'Included' : '—'],
        ].map(([label,getValue],i) => <tr key={String(label)}><td>{String(label)}</td>{compared.map(card => <td key={card.earnn_card_id} className={i < 4 ? styles.strongCell : ''}>{(getValue as (c:HomeCard)=>string)(card)}</td>)}</tr>)}</tbody></table>{!compared.length && <div className={styles.tableLoading}>Loading live card comparisons…</div>}</div>
        <Link href="/compare" className={styles.primaryCta}>Compare Cards <i className="ti ti-arrow-right" /></Link>
      </section>

      <section className={`${styles.section} ${styles.surface}`}>
        <div className={styles.earnieGrid}>
          <div><SectionTitle eyebrow="Meet Earnie" title={<>Have a credit card question?<br /><span className={styles.green}>Just ask.</span></>} copy="Ask about rewards, fees, benefits, comparisons or which card might suit the way you spend." /><Link href="/chat" className={styles.lightCta}>Ask Earnie <i className="ti ti-arrow-right" /></Link></div>
          <div className={styles.chatMock}><div className={styles.chatHeader}><i className="ti ti-sparkles" /><span><b>Earnie</b><small>UAE credit card expert</small></span></div><div className={styles.botBubble}>Hi! What are you trying to figure out?</div>{['Best card for dining at restaurants?','Which cards offer lounge access?','Is my cashback card worth keeping?'].map(text => <div key={text} className={styles.promptBubble}>“{text}”</div>)}<div className={styles.chatInput}>Ask Earnie anything… <i className="ti ti-send" /></div></div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.navySection} ${styles.securitySection}`}>
        <SectionTitle light eyebrow="Security & privacy" title="Your statement. Your control." />
        <div className={styles.passwordPromise}><i className="ti ti-lock" /> We never ask for your online banking password.</div>
        <div className={styles.securityGrid}>{[
          ['ti-key','No bank login','Earnn analyses the statement you provide. No online banking credentials are required.'],
          ['ti-shield-check','Sensitive details protected','Card numbers and personal details are handled in line with Earnn’s security implementation.'],
          ['ti-file-lock','Statement handling','Encrypted during processing and deleted after analysis.'],
        ].map(([icon,title,body]) => <article key={title} className={styles.productPanel}><i className={`ti ${icon}`} /><h3>{title}</h3><p>{body}</p></article>)}</div>
        <div className={styles.finalCta}><h2>Find out what your spending could really earn.</h2><p>Upload a statement and Earnn will build a card strategy around the way you actually spend.</p><Link href="/analyse" className={styles.rewardCta}>Analyse My Spending <i className="ti ti-arrow-right" /></Link><small>No bank login required • Free analysis • Takes about 60 seconds</small></div>
      </section>
    </div>
  )
}
