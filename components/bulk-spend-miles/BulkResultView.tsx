'use client'

// Presentation of a Max Miles result as a plan rather than a leaderboard:
//   Hero (Earnn's pick) → Why this card → Your payment plan → Don't leave this behind →
//   What your reward can do → Other good options → See all cards → How we calculated it.
//
// Pure presentation. Every number shown comes straight from the simulate / simulate-aed response;
// nothing here re-derives a reward, a bonus or a ranking.
import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import type {
  BulkSpendAedCard, BulkSpendMilesCard, ProjectionMonth, SpendRewardBreakdown,
} from '@/lib/bulk-spend-miles/api'
import { getCardImageUrl } from '@/lib/api'
import type { BulkResultSort } from './BulkSpendResultFilters'
import styles from './BulkResultView.module.css'

export type PlanUnit = 'miles' | 'aed'
type ItemKind = 'guaranteed' | 'potential' | 'alternative'

export interface PlanItem {
  group: 'welcome' | 'benefit'
  title: string
  kind: ItemKind
  /** Miles or AED, depending on the plan unit. */
  value: number
  /** A cash benefit attached to a miles offer. */
  cashAed: number
  detail: string
  month: number | null
  /** Already part of the headline total (so it is not "extra" potential). */
  inTotal: boolean
  deadlineMonth: number | null
}

export interface PlanCard {
  id: string
  name: string
  bank: string
  unit: PlanUnit
  /** Canonical total from the backend (total_guaranteed_miles / net_rewards_12_months_aed). */
  total: number
  spend: number
  welcome: number
  benefits: number
  fee: number
  potential: number
  breakdown: SpendRewardBreakdown[]
  welcomeItems: PlanItem[]
  benefitItems: PlanItem[]
}

const ALTERNATIVE_MARKER = 'Only one offer in this set applies.'

// ── formatting ───────────────────────────────────────────────────────────────
export const formatMiles = (value: number) => `${Math.round(value).toLocaleString()} miles`
export const formatAed = (value: number) => `AED ${Math.round(value).toLocaleString()}`
const fmt = (unit: PlanUnit, value: number) => unit === 'miles' ? formatMiles(value) : formatAed(value)
const compact = (value: number) => {
  const rounded = Math.round(value)
  if (rounded >= 10_000) return `${(rounded / 1000).toFixed(rounded >= 100_000 ? 0 : 1).replace(/\.0$/, '')}K`
  return rounded.toLocaleString()
}

// ── travel aspiration (miles view only) ──────────────────────────────────────
const TRAVEL_LADDER = [
  [159_000, 'Business Class flight to New York'],
  [120_000, 'Business Class flight to New York or Sydney'],
  [106_000, 'Business Class flight to Sydney'],
  [81_000, 'Business Class upgrade to New York or Sydney'],
  [60_000, 'Business Class flight to London or Europe'],
  [50_000, 'Business Class flight to the Maldives'],
  [45_000, 'Business Class upgrade to London or Europe'],
  [30_000, 'Business Class flight to Egypt'],
  [22_000, 'Business Class upgrade to India or Egypt'],
  [20_000, 'Economy flight to London or Europe'],
  [10_000, 'Economy flight to India or Egypt'],
] as const

export function travelPotentialForMiles(miles: number) {
  return TRAVEL_LADDER.find(([minimum]) => miles >= minimum)?.[1] ?? TRAVEL_LADDER[TRAVEL_LADDER.length - 1][1]
}

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1600&q=80`
const ART = {
  manhattan: { city: 'New York', image: photo('1485871981521-5b1fd3805eee') },
  liberty: { city: 'New York', image: photo('1605130284535-11dd9eedc58a') },
  sydney: { city: 'Sydney', image: photo('1506973035872-a4ec16b8e8d9') },
  london: { city: 'London or Europe', image: photo('1513635269975-59663e0ac1ad') },
  maldives: { city: 'The Maldives', image: photo('1514282401047-d79a71a590e8') },
  egypt: { city: 'Egypt', image: photo('1568322445389-f64ac2515020') },
  india: { city: 'India', image: photo('1524492412937-b28074a5d7da') },
  dubai: { city: 'Dubai', image: photo('1512453979798-5ea266f8880c') },
}
export const AED_HERO_ART = ART.dubai

/** One background per band of the travel ladder above, so the hero image always matches the headline. */
export function travelArtworkForMiles(miles: number) {
  if (miles >= 120_000) return ART.manhattan
  if (miles >= 106_000) return ART.sydney
  if (miles >= 81_000) return ART.liberty
  if (miles >= 60_000) return ART.london
  if (miles >= 50_000) return ART.maldives
  if (miles >= 45_000) return ART.london
  if (miles >= 30_000) return ART.egypt
  if (miles >= 22_000) return ART.india
  if (miles >= 20_000) return ART.london
  return ART.india
}

// The simulate response gives a generic "Fee benefit" for Express Miles/Points programmes (the
// name, fee and cap are not sent). These three cards have the programme, so show it in plain words.
// Source: fact_benefits rows enbd_10_/enbd_11_/enbd_14_benefit_004. Update if those rows change.
const FEE_PROGRAMME_COPY: Record<string, { title: string, text: string }> = {
  enbd_11: { title: 'Express Miles benefit', text: 'Instead of the annual fee of AED 1,500, pay AED 250 per month and get 50% additional miles monthly (capped at 4,000 miles/mo).' },
  enbd_14: { title: 'Express Miles benefit', text: 'Instead of the annual fee of AED 1,500, pay AED 250 per month and get 50% additional miles monthly (capped at 4,000 miles/mo).' },
  enbd_10: { title: 'Express Points benefit', text: 'Instead of the annual fee, pay AED 300 per month and get 50% additional points monthly (capped at 12,000 points/mo).' },
}

function feeProgrammeCopy(cardId: string, category: string) {
  return category === 'fee_acceleration' ? FEE_PROGRAMME_COPY[cardId] : undefined
}

// ── response → plan model ────────────────────────────────────────────────────
function milesItems(card: BulkSpendMilesCard, group: PlanItem['group']): PlanItem[] {
  const source = group === 'welcome' ? card.welcome_bonuses : card.benefit_opportunities
  return source.map(item => {
    const counts = 'counts_towards_ranking' in item ? item.counts_towards_ranking : true
    const alternative = counts === false && item.detail.includes(ALTERNATIVE_MARKER)
    const copy = 'benefit_category' in item ? feeProgrammeCopy(card.earnn_card_id, item.benefit_category) : undefined
    return {
      group,
      title: copy?.title ?? item.title,
      kind: alternative ? 'alternative' : item.status,
      value: item.generic_miles,
      cashAed: 'additional_cash_aed' in item ? item.additional_cash_aed : 0,
      detail: copy?.text ?? item.detail,
      month: 'achieved_month' in item ? item.achieved_month ?? null : 'unlock_month' in item ? item.unlock_month ?? null : null,
      inTotal: item.status === 'guaranteed' && !alternative && counts !== false,
      deadlineMonth: 'deadline_month' in item ? item.deadline_month ?? null : null,
    }
  })
}

function aedItems(card: BulkSpendAedCard, group: PlanItem['group']): PlanItem[] {
  const source = group === 'welcome' ? card.welcome_bonuses : card.benefit_opportunities
  return source.map(item => {
    const alternative = !item.counts_towards_ranking && item.detail.includes(ALTERNATIVE_MARKER)
    const unlocked = group === 'benefit' && item.status === 'guaranteed'
    const kind: ItemKind = alternative ? 'alternative'
      : item.counts_towards_ranking ? (item.status === 'guaranteed' ? 'guaranteed' : 'potential')
      : unlocked ? 'guaranteed' : 'potential'
    const copy = 'benefit_category' in item ? feeProgrammeCopy(card.earnn_card_id, item.benefit_category) : undefined
    return {
      group,
      title: copy?.title ?? item.title,
      kind,
      value: item.reward_aed,
      cashAed: 0,
      detail: copy?.text ?? item.detail,
      month: 'achieved_month' in item ? item.achieved_month ?? null : 'unlock_month' in item ? item.unlock_month ?? null : null,
      inTotal: item.counts_towards_ranking,
      deadlineMonth: 'deadline_month' in item ? item.deadline_month ?? null : null,
    }
  })
}

const withinReach = (items: PlanItem[]) => items.filter(item => item.kind === 'potential' && !item.inTotal).reduce((sum, item) => sum + item.value, 0)

export function milesPlan(card: BulkSpendMilesCard, includeNewCard: boolean): PlanCard {
  const welcomeItems = includeNewCard ? milesItems(card, 'welcome') : []
  const benefitItems = milesItems(card, 'benefit')
  return {
    id: card.earnn_card_id, name: card.card_name, bank: card.bank_name, unit: 'miles',
    total: includeNewCard ? card.total_guaranteed_miles : card.total_guaranteed_miles - card.guaranteed_welcome_miles,
    spend: card.spend_miles_12_months,
    welcome: includeNewCard ? card.guaranteed_welcome_miles : 0,
    benefits: card.guaranteed_benefit_miles,
    fee: 0,
    potential: withinReach(welcomeItems) + withinReach(benefitItems),
    breakdown: card.spend_reward_breakdown, welcomeItems, benefitItems,
  }
}

export function aedPlan(card: BulkSpendAedCard, includeNewCard: boolean): PlanCard {
  const welcomeItems = includeNewCard ? aedItems(card, 'welcome') : []
  const benefitItems = aedItems(card, 'benefit')
  return {
    id: card.earnn_card_id, name: card.card_name, bank: card.bank_name, unit: 'aed',
    total: includeNewCard ? card.net_rewards_12_months_aed : card.net_rewards_12_months_aed - card.selected_welcome_rewards_aed,
    spend: card.spend_rewards_12_months_aed,
    welcome: includeNewCard ? card.selected_welcome_rewards_aed : 0,
    benefits: card.selected_benefit_rewards_aed,
    fee: card.first_year_fee_aed,
    potential: withinReach(welcomeItems) + withinReach(benefitItems),
    breakdown: card.spend_reward_breakdown, welcomeItems, benefitItems,
  }
}

export const bulkReward = (entries: SpendRewardBreakdown[]) =>
  entries.filter(entry => entry.category !== 'recurring').reduce((total, entry) => total + entry.earned_value, 0)

/** The number a plan is ranked and headlined by under the user's chosen view. */
export function planMetric(plan: PlanCard, sort: BulkResultSort) {
  if (sort === 'bulk_only') return bulkReward(plan.breakdown)
  if (sort === 'bulk_plus_regular') return plan.spend
  return plan.total
}

const headlineLabel = (sort: BulkResultSort, unit: PlanUnit) =>
  sort === 'bulk_only' ? 'from your big payments'
    : sort === 'bulk_plus_regular' ? 'from your spending'
    : unit === 'miles' ? 'guaranteed from your plan' : 'net reward after fees'

// ── small helpers ────────────────────────────────────────────────────────────
function topicIcon(code: string) {
  const key = code.toLowerCase()
  if (key === 'recurring') return '🛒'
  if (/educ|school|tuition|universit|nursery/.test(key)) return '🎓'
  if (/insur/.test(key)) return '🛡️'
  if (/rent|real_?estate|property|mortgage/.test(key)) return '🏠'
  if (/util|dewa|electric|water|gas/.test(key)) return '💡'
  if (/telecom|mobile|internet|etisalat|du\b/.test(key)) return '📶'
  if (/tax|govern|fine|visa|fees?/.test(key)) return '🏛️'
  if (/medic|health|hospital|clinic/.test(key)) return '🏥'
  if (/hotel/.test(key)) return '🏨'
  if (/jewel/.test(key)) return '💎'
  if (/electron/.test(key)) return '📱'
  if (/furnitur/.test(key)) return '🛋️'
  if (/travel|airline|flight/.test(key)) return '✈️'
  if (/car|auto|fuel|salik|parking/.test(key)) return '🚗'
  return '💳'
}

// The topic catalogue's labels are long, emoji-led questions ("School fees coming up?"); the plan
// copy needs a short noun phrase, so name the known topics here and title-case anything new.
const TOPIC_NAMES: Record<string, string> = {
  airlines: 'Flights', health: 'Medical payments', education: 'School fees', real_estate: 'Property payments',
  hotel: 'Hotel bookings', jewellery: 'Jewellery', electronics: 'Electronics', car_dealer: 'Car purchase',
  furniture: 'Furniture', insurance: 'Insurance',
}
const topicName = (code: string) => TOPIC_NAMES[code.trim().toLowerCase()] ?? code.replace(/_/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase())

const normal = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, '_')

/** Backend-supplied numbers inside a "potential" sentence, e.g. "your plan spends AED 12,000 ... add AED 18,000 more within those 3 months". */
function potentialProgress(detail: string) {
  const projected = /your plan spends AED ([\d,]+)/.exec(detail)
  const additional = /add AED ([\d,]+) more within ([^,]+),/.exec(detail)
  if (!projected || !additional) return null
  const have = Number(projected[1].replace(/,/g, ''))
  const need = Number(additional[1].replace(/,/g, ''))
  if (!Number.isFinite(have) || !Number.isFinite(need) || have + need <= 0) return null
  return { have, need, target: have + need, window: additional[2].trim() }
}

function itemReward(unit: PlanUnit, item: PlanItem) {
  if (item.value > 0) return `+${fmt(unit, item.value)}`
  if (item.cashAed > 0) return `${formatAed(item.cashAed)} cash`
  return ''
}

function CardImage({ id, width, height }: { id: string, width: number, height: number }) {
  return <Image src={getCardImageUrl(id)} alt="" width={width} height={height} unoptimized className={styles.cardImg} />
}

// ── main view ────────────────────────────────────────────────────────────────
export default function BulkResultView({ unit, plans, sort, includeNewCard, projection, onOpenFilters, activeFilters }: {
  unit: PlanUnit
  /** Filtered and ordered by the page; plans[0] is Earnn's pick. */
  plans: PlanCard[]
  sort: BulkResultSort
  includeNewCard: boolean
  projection: ProjectionMonth[]
  onOpenFilters: () => void
  activeFilters: number
}) {
  const [focusId, setFocusId] = useState<string | null>(null)
  const [showAll, setShowAll] = useState(false)
  const topPlan = plans[0]
  const plan = plans.find(item => item.id === focusId) ?? topPlan
  const isPick = plan.id === topPlan.id

  const topicLabel = topicName

  const choose = (id: string) => {
    setFocusId(id)
    requestAnimationFrame(() => document.getElementById('plan-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
  }

  const alternatives = plans.filter(item => item.id !== plan.id).slice(0, 15)
  const plannedSpend = projection.reduce((total, month) => total + month.total_spend_aed, 0)
  const headline = planMetric(plan, sort)
  const heroArt = unit === 'miles' ? travelArtworkForMiles(headline) : AED_HERO_ART
  const potentialItems = [...plan.welcomeItems, ...plan.benefitItems].filter(item => item.kind === 'potential')
  const alternativeOffers = [...plan.welcomeItems, ...plan.benefitItems].filter(item => item.kind === 'alternative')

  return <div className={styles.view}>
    {!isPick && <button type="button" className={styles.backLink} onClick={() => setFocusId(null)}>← Back to Earnn&apos;s pick</button>}
    <section id="plan-top" className={styles.hero}>
      <div key={heroArt.image} className={styles.heroBg} style={{ backgroundImage: `url(${heroArt.image})` }} aria-hidden="true" />
      <div className={styles.heroCopy}>
        <span className={styles.badge}>★ {isPick ? "EARNN'S PICK" : 'ALTERNATIVE PLAN'}</span>
        <p className={styles.heroLead}>Your {formatAed(plannedSpend)} spending plan could earn</p>
        <h2 className={styles.heroValue}>{fmt(unit, headline)}</h2>
        <p className={styles.heroSub}>{headlineLabel(sort, unit)}{unit === 'aed' && plan.fee > 0 && sort === 'combined' ? ` · after ${formatAed(plan.fee)} first-year fee` : ''}</p>
        <div className={styles.heroCard}><strong>{plan.name}</strong><small>{plan.bank}</small></div>
        {unit === 'miles' && headline > 0 && <div className={styles.heroUnlock}>
          <i className="ti ti-plane-departure" aria-hidden="true" />
          <div><small>This could unlock</small><strong>{travelPotentialForMiles(headline)}</strong></div>
        </div>}
      </div>
      <div className={styles.heroArt}>
        <div className={styles.heroArtInner}>
          <CardImage id={plan.id} width={300} height={186} />
        </div>
      </div>
      <div className={styles.stats}>
        <div><span className={styles.statIcon}><i className="ti ti-coins" aria-hidden="true" /></span><p><b>{compactAed(plannedSpend)}</b><span>Planned spend</span></p></div>
        <div><span className={styles.statIcon}><i className="ti ti-shopping-cart" aria-hidden="true" /></span><p><b>{unit === 'miles' ? compact(plan.spend) : compactAed(plan.spend)}</b><span>From spending</span></p></div>
        <div className={styles.statBonus}><span className={styles.statIcon}><i className="ti ti-gift" aria-hidden="true" /></span><p><b>{unit === 'miles' ? compact(plan.welcome + plan.benefits) : compactAed(plan.welcome + plan.benefits)}</b><span>Bonuses unlocked</span></p></div>
        {plan.potential > 0 && <div className={styles.statReach}><span className={styles.statIcon}><i className="ti ti-star" aria-hidden="true" /></span><p><b>+{unit === 'miles' ? compact(plan.potential) : compactAed(plan.potential)}</b><span>Within reach · not guaranteed</span></p></div>}
      </div>
    </section>

    <WhyThisCard plan={plan} unit={unit} topicLabel={topicLabel} includeNewCard={includeNewCard} />
    <PaymentPlan plan={plan} unit={unit} projection={projection} topicLabel={topicLabel} />
    <Opportunities plan={plan} unit={unit} items={potentialItems} alternatives={alternativeOffers} />

    <div className={styles.filterBar}>
      <span>Not the right fit? Narrow the cards by bank, airline or how they are ranked.</span>
      <button type="button" className={styles.filterButton} onClick={onOpenFilters}><i className="ti ti-adjustments-horizontal" /> Filter &amp; sort{activeFilters > 0 ? ` · ${activeFilters}` : ''}</button>
    </div>

    {alternatives.length > 0 && <section className={`${styles.section} ${styles.tinted}`} aria-labelledby="alt-title">
      <Carousel plans={alternatives} pick={topPlan} sort={sort} unit={unit} topicLabel={topicLabel} onSelect={choose} />
    </section>}

    {plans.length > 1 && <section className={styles.allCards}>
      <button type="button" className={styles.allToggle} aria-expanded={showAll} onClick={() => setShowAll(value => !value)}>{showAll ? 'Hide full ranking' : `See all ${plans.length} cards`} <span aria-hidden="true">{showAll ? '↑' : '→'}</span></button>
      {showAll && <ol className={styles.allList}>{plans.map((item, index) => <li key={item.id} className={item.id === plan.id ? styles.allActive : ''}>
        <span className={styles.allRank}>#{index + 1}</span>
        <CardImage id={item.id} width={56} height={35} />
        <span className={styles.allName}><strong>{item.name}</strong><small>{item.bank}</small></span>
        <b>{fmt(unit, planMetric(item, sort))}</b>
        <button type="button" onClick={() => choose(item.id)}>{item.id === plan.id ? 'Viewing' : 'See this plan'}</button>
      </li>)}</ol>}
    </section>}
  </div>
}

const compactAed = (value: number) => `AED ${compact(value)}`

// ── why this card ────────────────────────────────────────────────────────────
function WhyThisCard({ plan, unit, topicLabel, includeNewCard }: { plan: PlanCard, unit: PlanUnit, topicLabel: (code: string) => string, includeNewCard: boolean }) {
  const bonusTotal = plan.welcome + plan.benefits
  const bulk = bulkReward(plan.breakdown)
  const regular = Math.max(0, plan.spend - bulk)
  const parts = [
    { key: 'bulk', label: 'Big payments', value: bulk, className: styles.segBulk },
    { key: 'regular', label: 'Regular spending', value: regular, className: styles.segRegular },
    { key: 'bonus', label: 'Guaranteed bonuses', value: bonusTotal, className: styles.segBonus },
  ]
  const sum = parts.reduce((total, part) => total + part.value, 0)
  const guaranteedWelcome = includeNewCard ? plan.welcomeItems.filter(item => item.kind === 'guaranteed' && item.inTotal) : []
  const guaranteedBenefits = plan.benefitItems.filter(item => item.kind === 'guaranteed' && item.inTotal)
  const bonusRows = [...guaranteedWelcome, ...guaranteedBenefits.filter(item => item.value > 0)]
  const perks = guaranteedBenefits.filter(item => item.value <= 0)
  const compactSpend = (value: number) => value >= 1000 ? `AED ${Number((value / 1000).toFixed(1))}K` : `AED ${Math.round(value)}`

  return <section className={styles.section}>
    <header className={styles.sectionHead}><span>WHY THIS CARD</span><h3>How you earn {fmt(unit, plan.total)}</h3></header>
    {sum > 0 && <div className={styles.split} role="img" aria-label={parts.map(part => `${part.label} ${fmt(unit, part.value)}`).join(', ')}>
      <div className={styles.splitBar}>{parts.filter(part => part.value > 0).map(part => <i key={part.key} className={part.className} style={{ width: `${(part.value / sum) * 100}%` }} />)}</div>
      <ul className={styles.splitLegend}>{parts.map(part => <li key={part.key}><i className={part.className} />{part.label}<b>{fmt(unit, part.value)}</b></li>)}</ul>
    </div>}

    <h4 className={styles.groupTitle}>FROM YOUR SPENDING</h4>
    <ul className={styles.why}>
      {plan.breakdown.map(entry => {
        const isRecurring = entry.category === 'recurring'
        const per = entry.months_count > 0 ? entry.spend_aed / entry.months_count : entry.spend_aed
        return <li key={entry.category}>
          <span className={styles.whyIcon} aria-hidden="true">{topicIcon(entry.category)}</span>
          <span className={styles.whyText}>
            <strong>{isRecurring ? 'Regular spending' : topicLabel(entry.category)}<span className={styles.whyMeta}> · {compactSpend(per)}{entry.months_count > 1 ? ` × ${entry.months_count}` : ''}</span></strong>
            {entry.payment_conditions?.map(condition => <em key={condition}>Condition: {condition}</em>)}
          </span>
          <b>→ {fmt(unit, entry.earned_value)}</b>
        </li>
      })}
    </ul>

    {bonusRows.length > 0 && <>
      <h4 className={`${styles.groupTitle} ${styles.groupBonus}`}>BONUSES YOU UNLOCKED</h4>
      <ul className={styles.why}>{bonusRows.map((item, index) => <li key={`bonus${index}`} className={styles.whyBonus}>
        <span className={styles.whyIcon} aria-hidden="true">{item.group === 'welcome' ? '🎁' : '⭐'}</span>
        <span className={styles.whyText}><strong>{item.title}<span className={styles.whyMeta}> · {item.month ? `Unlocked in month ${item.month}` : 'No further spend needed'}</span></strong></span>
        <b>{itemReward(unit, item) || '—'}</b>
      </li>)}</ul>
    </>}

    {unit === 'aed' && plan.fee > 0 && <>
      <h4 className={`${styles.groupTitle} ${styles.groupFee}`}>DEDUCTED</h4>
      <ul className={styles.why}><li className={styles.whyFee}>
        <span className={styles.whyIcon} aria-hidden="true">🧾</span>
        <span className={styles.whyText}><strong>First-year card fee</strong></span>
        <b>−{formatAed(plan.fee)}</b>
      </li></ul>
    </>}

    {perks.length > 0 && <ul className={styles.perks}>{perks.map((item, index) => <li key={index}><b>{item.title}</b> {item.detail}</li>)}</ul>}
  </section>
}

// ── payment plan ─────────────────────────────────────────────────────────────
interface Step { order: number, when: string, icon: string, title: string, text?: string, reward?: string, chips?: string[] }

function PaymentPlan({ plan, unit, projection, topicLabel }: { plan: PlanCard, unit: PlanUnit, projection: ProjectionMonth[], topicLabel: (code: string) => string }) {
  const monthLabel = (month: number | null) => month ? projection[month - 1]?.label ?? `Month ${month}` : ''
  const steps: Step[] = [{ order: 0, when: 'NOW', icon: '💳', title: `Start using the ${plan.name} for this plan`, text: 'Put the payments below on this card so each one earns what is shown.' }]

  const byTopic = new Map<string, { firstMonth: number, entries: { label: string, amount: number }[] }>()
  for (const month of projection) {
    for (const [code, amount] of Object.entries(month.scheduled_by_category_aed)) {
      const group = byTopic.get(code) ?? { firstMonth: month.month_number, entries: [] }
      group.entries.push({ label: month.label, amount })
      byTopic.set(code, group)
    }
  }
  for (const [code, group] of byTopic) {
    const entry = plan.breakdown.find(item => normal(item.category) === normal(code))
    const amounts = group.entries.map(item => item.amount)
    const same = amounts.every(amount => amount === amounts[0])
    steps.push({
      order: group.firstMonth,
      when: group.entries.map(item => item.label).join(' · ').toUpperCase(),
      icon: topicIcon(code),
      title: `Pay ${same ? formatAed(amounts[0]) : formatAed(amounts.reduce((a, b) => a + b, 0)) + ' in total'} ${topicLabel(code).toLowerCase()} with this card`,
      text: same && group.entries.length > 1 ? `${group.entries.length} payments of ${formatAed(amounts[0])}` : undefined,
      chips: same ? undefined : group.entries.map(item => `${item.label}: ${formatAed(item.amount)}`),
      reward: entry ? `+${fmt(unit, entry.earned_value)}` : undefined,
    })
  }
  for (const item of [...plan.welcomeItems, ...plan.benefitItems]) {
    if (item.kind !== 'guaranteed' || !item.month) continue
    steps.push({ order: item.month + 0.5, when: monthLabel(item.month).toUpperCase(), icon: item.group === 'welcome' ? '🎁' : '⭐', title: `${item.title} unlocked`, reward: itemReward(unit, item) || undefined })
  }
  const recurring = plan.breakdown.find(item => item.category === 'recurring')
  if (recurring && recurring.spend_aed > 0) {
    steps.push({ order: 99, when: 'EVERY MONTH', icon: '🛒', title: `Put your ${formatAed(recurring.spend_aed / Math.max(1, recurring.months_count))} regular spending on this card`, reward: `~${fmt(unit, recurring.earned_value)} a year` })
  }
  steps.sort((a, b) => a.order - b.order)

  const unlocks = new Map<number, string[]>()
  for (const item of [...plan.welcomeItems, ...plan.benefitItems]) {
    if (item.kind === 'guaranteed' && item.month) unlocks.set(item.month, [...(unlocks.get(item.month) ?? []), item.title])
  }
  const maxSpend = Math.max(1, ...projection.map(month => month.total_spend_aed))

  return <section className={styles.section}>
    <header className={styles.sectionHead}><span>YOUR PAYMENT PLAN</span><h3>What to pay, and when</h3></header>
    <ol className={styles.steps}>{steps.map((step, index) => <li key={index}>
      <span className={styles.stepWhen}>{step.when}</span>
      <span className={styles.stepIcon} aria-hidden="true">{step.icon}</span>
      <span className={styles.stepBody}>
        <strong>{step.title}</strong>
        {step.text && <small>{step.text}</small>}
        {step.chips && <span className={styles.chips}>{step.chips.map(chip => <i key={chip}>{chip}</i>)}</span>}
      </span>
      {step.reward && <b className={styles.stepReward}>{step.reward}</b>}
    </li>)}</ol>
    <details className={styles.calendar}>
    <summary>View my 12-month spending calendar</summary>
    <div className={styles.monthStrip} aria-label="Spending by month">{projection.map(month => {
      const scheduled = Object.entries(month.scheduled_by_category_aed)
      return <div key={month.month_number} className={scheduled.length ? styles.monthActive : ''}>
        <span className={styles.monthName}>{month.label}</span>
        <i className={styles.monthBar}><u style={{ height: `${Math.max(6, (month.total_spend_aed / maxSpend) * 100)}%` }} /></i>
        <b>{compactAed(month.total_spend_aed)}</b>
        {scheduled.map(([code]) => <small key={code}><span aria-hidden="true">{topicIcon(code)}</span> {topicLabel(code)}</small>)}
        {(unlocks.get(month.month_number) ?? []).map(title => <em key={title}>🎁 {title}</em>)}
      </div>
    })}</div>
    </details>
  </section>
}

// ── potential opportunities ──────────────────────────────────────────────────
function Opportunities({ plan, unit, items, alternatives }: { plan: PlanCard, unit: PlanUnit, items: PlanItem[], alternatives: PlanItem[] }) {
  if (!items.length && !alternatives.length) return null
  const groupLabel = (item: PlanItem) => item.group === 'welcome' ? 'Welcome bonus' : 'Card benefit'
  return <section className={`${styles.section} ${styles.reachSection}`}>
    <header className={styles.sectionHead}><span>DON&apos;T LEAVE THIS BEHIND</span><h3>{plan.potential > 0 ? `Up to ${fmt(unit, plan.potential)} more is within reach` : 'More you could unlock'}</h3><p>These are <b>not</b> in your guaranteed total. Your plan does not reach them yet, so a small change could.</p></header>
    <div className={styles.reachList}>{items.map((item, index) => {
      const progress = potentialProgress(item.detail)
      const reward = itemReward(unit, item)
      const percent = progress ? Math.min(100, Math.round((progress.have / progress.target) * 100)) : 0
      return <article key={`${item.title}-${index}`} className={styles.reachItem}>
        <div className={styles.reachTop}><span className={styles.tagPotential}>Potential · {groupLabel(item)}</span>{reward && <b>{reward}</b>}</div>
        <strong>{item.title}</strong>
        {progress ? <>
          <div className={styles.progressLabels}><span>{formatAed(progress.have)} / {formatAed(progress.target)}</span><span>{percent}%</span></div>
          <div className={styles.progress} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><i style={{ width: `${percent}%` }} /></div>
          <p className={styles.reachAsk}>Just <b>{formatAed(progress.need)}</b> more within {progress.window}{reward ? <> could unlock <b>{reward.replace(/^\+/, '')}</b></> : null}.</p>
        </> : <p className={styles.reachAsk}>{item.detail}</p>}
        {item.inTotal && <small className={styles.inTotal}>Included in the ranking above even though the target is not reached.</small>}
      </article>
    })}</div>
    {alternatives.length > 0 && <details className={styles.altOffers}>
      <summary>{alternatives.length} alternative offer{alternatives.length === 1 ? '' : 's'} on this card — only one applies</summary>
      <div className={styles.altList}>{alternatives.map((item, index) => <div key={`${item.title}-${index}`}><strong>{item.title}</strong>{itemReward(unit, item) && <b>{itemReward(unit, item)}</b>}<p>{item.detail}</p></div>)}</div>
    </details>}
  </section>
}

// ── alternatives carousel ────────────────────────────────────────────────────
function reasonFor(plan: PlanCard, pick: PlanCard, unit: PlanUnit, topicLabel: (code: string) => string): string | null {
  // Only genuine, data-backed differences. No filler when there is nothing to say.
  if (unit === 'aed' && plan.fee < pick.fee) return `Lower first-year fee: ${formatAed(plan.fee)} vs ${formatAed(pick.fee)}`
  const pickBulk = new Map(pick.breakdown.map(entry => [entry.category, entry.earned_value]))
  const stronger = plan.breakdown
    .filter(entry => entry.category !== 'recurring' && entry.earned_value > (pickBulk.get(entry.category) ?? 0) * 1.05 + 1)
    .sort((a, b) => (b.earned_value - (pickBulk.get(b.category) ?? 0)) - (a.earned_value - (pickBulk.get(a.category) ?? 0)))[0]
  if (stronger) return `Better reward on your ${topicLabel(stronger.category).toLowerCase()}`
  if (plan.welcome === 0 && pick.welcome > 0) return "Doesn't depend on a welcome bonus"
  if (plan.potential > pick.potential) return `+${fmt(unit, plan.potential)} more within reach`
  if (plan.welcome > pick.welcome) return 'Bigger welcome bonus'
  return null
}

function Carousel({ plans, pick, sort, unit, topicLabel, onSelect }: { plans: PlanCard[], pick: PlanCard, sort: BulkResultSort, unit: PlanUnit, topicLabel: (code: string) => string, onSelect: (id: string) => void }) {
  const track = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })

  useEffect(() => {
    const element = track.current
    if (!element) return
    const sync = () => setEdge({ start: element.scrollLeft <= 2, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2 })
    sync()
    element.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => { element.removeEventListener('scroll', sync); window.removeEventListener('resize', sync) }
  }, [plans.length])

  const step = (direction: 1 | -1) => {
    const element = track.current
    const tile = element?.querySelector<HTMLElement>('[data-tile]')
    if (!element || !tile) return
    element.scrollBy({ left: direction * (tile.getBoundingClientRect().width + 14), behavior: 'smooth' })
  }

  return <>
    <header className={`${styles.sectionHead} ${styles.carouselHead}`}>
      <div><span>OTHER GOOD OPTIONS</span><h3 id="alt-title">Want another option?</h3></div>
      <div className={styles.arrows}>
        <button type="button" onClick={() => step(-1)} disabled={edge.start} aria-label="Previous cards">←</button>
        <button type="button" onClick={() => step(1)} disabled={edge.end} aria-label="Next cards">→</button>
      </div>
    </header>
    <div className={styles.trackWrap}>
      <div className={styles.track} ref={track} tabIndex={0} aria-label="Alternative cards">
        {plans.map(item => {
          const difference = planMetric(pick, sort) - planMetric(item, sort)
          return <article key={item.id} data-tile className={styles.tile}>
            <div className={styles.tileTop}><CardImage id={item.id} width={64} height={40} /><span className={styles.tileName}><strong>{item.name}</strong><small>{item.bank}</small></span></div>
            <b className={styles.tileValue}>{fmt(unit, planMetric(item, sort))}</b>
            <small className={styles.tileDiff}>{difference > 0.5 ? `${fmt(unit, difference)} less than Earnn's pick` : difference < -0.5 ? `${fmt(unit, -difference)} more than Earnn's pick` : "Same as Earnn's pick"}</small>
            {(() => { const reason = reasonFor(item, pick, unit, topicLabel); return <p className={styles.tileReason}>{reason ?? ''}</p> })()}
            <button type="button" onClick={() => onSelect(item.id)}>See this plan</button>
          </article>
        })}
      </div>
    </div>
  </>
}
