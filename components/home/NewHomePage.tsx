'use client'

import Link from 'next/link'
import Image, { type StaticImageData } from 'next/image'
import { useEffect, useMemo, useRef, useState } from 'react'
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

const merchantMap = [
  ['Talabat', 'Dining'], ['DEWA', 'Utilities'], ['School', 'Education'],
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

function CardImage({ card, compact = false, priority = false }: { card?: HomeCard; compact?: boolean; priority?: boolean }) {
  if (!card) return <div className={`${styles.cardImage} ${compact ? styles.cardImageCompact : ''} ${styles.cardLoading}`} aria-label="Loading card image" />
  return (
    <div className={`${styles.cardImage} ${compact ? styles.cardImageCompact : ''}`}>
      <Image src={card.imageSrc || getCardImageUrl(card.earnn_card_id)} alt={`${card.card_name} credit card`} width={142} height={88} unoptimized={!card.imageSrc} priority={priority} />
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
  const reducedMotion = usePrefersReducedMotion()
  const [chooseRef, chooseVisible] = useInViewOnce<HTMLElement>()

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
              <div className={styles.cardStack}>{featured.map(card => <CardImage key={card.earnn_card_id} card={card} compact priority />)}{!featured.length && [0,1,2,3].map(i => <CardImage key={i} compact />)}</div>
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

      <section className={`${styles.section} ${styles.navySection} ${styles.rewardGapSection}`}>
        <SectionTitle light eyebrow="WHY YOU MAY BE MISSING REWARDS" title="Your card isn't always as rewarding as it looks." copy="Where you spend, how much you spend and which card you use can make a big difference." />
        <div className={styles.rewardGapContent}>
          <div className={styles.gapIssueGrid}>
            {[
              ['ti-arrows-exchange', 'Wrong card', 'Great for travel. Weak on groceries.'],
              ['ti-target', "Didn't spend enough", 'Some rewards only kick in after you spend certain amount on card.'],
              ['ti-ban', 'Hit the reward limit', 'After that, you may earn much less.'],
              ['ti-plane', 'Spending abroad', 'The wrong card can mean extra FX fees.'],
            ].map(([icon, title, description]) => <div key={title} className={styles.gapIssue}><i className={`ti ${icon} ${styles.gapIssueIcon}`} /><b>{title}</b><span>{description}</span></div>)}
          </div>
          <article className={styles.gapWalletCard}>
            <div className={styles.gapWalletMetric}>
              <span>Your current wallet</span>
              <Money suffix="/mo">616</Money>
              <div className={styles.gapWalletMeter}><i style={{ width: '55%' }} /></div>
            </div>
            <div className={styles.gapWalletFlow} aria-label="Potential reward gap of AED 500 per month">
              <div className={styles.gapWalletGain}><strong>+AED 500</strong><span>Potential reward gap</span></div>
            </div>
            <div className={`${styles.gapWalletMetric} ${styles.gapWalletOptimized}`}>
              <span>Optimized potential</span>
              <Money suffix="/mo">1,116</Money>
              <div className={styles.gapWalletMeter}><i style={{ width: '100%' }} /></div>
            </div>
            <small>Figures shown are illustrative examples, not guaranteed returns.</small>
          </article>
        </div>
        <Link href="/analyse" className={styles.rewardCta}>Find My Reward Gap <i className="ti ti-arrow-right" /></Link>
      </section>

      <section className={`${styles.section} ${styles.surface} ${styles.howItWorksSection}`}>
        <SectionTitle eyebrow="How it works" title="From statement to strategy in four steps." />
        <div className={styles.stepsGrid}>
          <article className={styles.productPanel}><p className={styles.eyebrow}>Step 01 — Upload</p><div className={styles.uploadMock}><i className="ti ti-file-description" /><div><b>statement-may.pdf</b><span><i /></span></div></div><h3>Upload your statement</h3><ul className={styles.uploadAssurances}><li>Processed securely in the UAE.</li><li>No bank login.</li><li>No GPT models.</li><li>No statement storage.</li></ul></article>
          <article className={styles.productPanel}><p className={styles.eyebrow}>Step 02 — Understand</p><div className={styles.mapList}>{merchantMap.map(([merchant,category]) => <div key={merchant}><b>{merchant}</b><i className="ti ti-arrow-right" /><span>{category}</span></div>)}</div><h3>We make sense of your spending</h3><p className={styles.stepDescription}>Earnn groups your spending so we can see where your money goes each month.</p><ul className={styles.understandSummary}><li>Dining</li><li>Travel</li><li>Bills</li><li>Groceries</li><li>Shopping</li><li>Fuel</li></ul></article>
          <article className={styles.productPanel}><p className={styles.eyebrow}>Step 03 — Optimize</p><div className={styles.optimizeMock}><div className={styles.optimizeCategories}>{['Education','Retail','Telecom','Online'].map(category => <span key={category}>{category}</span>)}</div><svg className={styles.optimizeFlow} viewBox="0 0 240 38" fill="none" aria-hidden="true"><path d="M24 3 C 24 27, 72 10, 88 35" /><path d="M88 3 C 88 24, 122 12, 132 35" /><path d="M152 3 C 152 24, 142 16, 132 35" /><path d="M216 3 C 216 27, 172 10, 176 35" /></svg><div className={styles.cardStack}>{featured.slice(0,3).map(card => <CardImage key={card.earnn_card_id} card={card} compact />)}</div><div><span>Potential rewards</span><Money suffix="/mo">1,116</Money></div></div><h3>We find the right cards for you</h3><p>We find which cards could reward your spending better and when it makes sense to switch cards to keep earning more.</p></article>
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
            <p>One card is never enough. Choose a set of 2, 3, or 4 cards and see your earnings increase instantly.</p>
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
