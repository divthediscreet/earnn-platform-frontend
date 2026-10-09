'use client'

// Trip Planner's version of the Max Miles "Why this card" and "Your payment plan" sections.
// Same look (the Max Miles stylesheet and helpers), but the spending is grouped the way a trip reader wants it:
//   Regular spending (monthly, expandable by category)  +  one line per big payment (amount x occurrences).
// Pure presentation: every miles value comes from /api/trip-planner/plan (the Bulk Spend engine).
import type { ProjectionMonth, SpendRewardBreakdown } from '@/lib/bulk-spend-miles/api'
import type { TripPlannerRequest } from '@/lib/trip-planner/api'
import { formatAed, formatMiles, topicIcon, type PlanCard } from '@/components/bulk-spend-miles/BulkResultView'
import plan from '@/components/bulk-spend-miles/BulkResultView.module.css'
import styles from './TripShowcase.module.css'

const REGULAR_PREFIX = 'reg_'
const MONTHS = 12

interface RegularLine { code: string, label: string, monthlyAed: number, monthlyMiles: number }
interface BulkLine { code: string, label: string, amountAed: number, occurrences: number, miles: number, uniform: boolean }
export interface SpendSummary { regular: RegularLine[], bulk: BulkLine[], regularMiles: number, bulkMiles: number, regularMonthlyAed: number }

// One icon per Analyse category (the Max Miles topic icons cover big payments only).
const GROUP_ICON: Record<string, string> = {
  dineout: '🍽️', food_delivery: '🛵', grocery_store: '🛒', grocery_online: '🧺', travel: '✈️', taxi: '🚕', online: '🛍️',
  retail: '👜', fuel: '⛽', telecom: '📶', utility: '💡', education: '🎓', miscellaneous: '💳', recurring: '💳',
}
const groupIcon = (code: string) => GROUP_ICON[code.replace(REGULAR_PREFIX, '')] ?? '💳'
/** Miles earned per AED 1 spent, e.g. "0.625" (up to 3 decimals, so rate x spend reproduces the miles). */
const rateText = (miles: number, aed: number) => aed > 0 ? String(Number((miles / aed).toFixed(3))) : '—'

const compactAed = (value: number) => value >= 1000 ? `AED ${Number((value / 1000).toFixed(1))}K` : `AED ${Math.round(value)}`

/** Bulk amount scheduled in one month for a topic: a payment merged into an Analyse group (e.g. education) is that group's total minus the regular part. */
function bulkInMonth(month: ProjectionMonth, code: string, regular: Record<string, number>) {
  const scheduled = month.scheduled_by_category_aed[code] ?? 0
  return code.startsWith(REGULAR_PREFIX) ? Math.max(0, scheduled - (regular[code.slice(REGULAR_PREFIX.length)] ?? 0)) : scheduled
}

/** Split the card's spend rewards into Regular spending (per category, per month) and big payments (amount x occurrences). */
export function summariseSpend(breakdown: SpendRewardBreakdown[], projection: ProjectionMonth[], request: TripPlannerRequest, labelFor: (code: string) => string): SpendSummary {
  const regularSpend = request.regular_spend
  const byCode = new Map(breakdown.map(entry => [entry.category, entry]))
  const regular: RegularLine[] = []
  const bulk: BulkLine[] = []

  const misc = byCode.get('recurring')
  if (misc && misc.spend_aed > 0) {
    regular.push({ code: 'recurring', label: 'Other / miscellaneous', monthlyAed: misc.spend_aed / MONTHS, monthlyMiles: misc.earned_value / MONTHS })
  }
  const codes = new Set<string>(breakdown.map(entry => entry.category).filter(code => code !== 'recurring'))
  for (const code of codes) {
    const entry = byCode.get(code)
    if (!entry) continue
    const regularAed = code.startsWith(REGULAR_PREFIX) ? (regularSpend[code.slice(REGULAR_PREFIX.length)] ?? 0) : 0
    const regularTotal = Math.min(entry.spend_aed, regularAed * MONTHS)
    // The category earns one rate, so its miles are shared by spend between the regular part and any big payment merged into it.
    const share = entry.spend_aed > 0 ? regularTotal / entry.spend_aed : 0
    if (regularTotal > 0) regular.push({ code, label: labelFor(code), monthlyAed: regularAed, monthlyMiles: (entry.earned_value * share) / MONTHS })
    const bulkAmounts = projection.map(month => bulkInMonth(month, code, regularSpend)).filter(amount => amount > 0)
    const bulkMiles = entry.earned_value * (1 - share)
    if (bulkAmounts.length && bulkMiles + 1e-6 >= 0) {
      const uniform = bulkAmounts.every(amount => Math.abs(amount - bulkAmounts[0]) < 0.5)
      bulk.push({ code, label: labelFor(code), amountAed: uniform ? bulkAmounts[0] : bulkAmounts.reduce((a, b) => a + b, 0), occurrences: bulkAmounts.length, miles: bulkMiles, uniform })
    }
  }
  regular.sort((a, b) => b.monthlyMiles - a.monthlyMiles || a.label.localeCompare(b.label)) // biggest earner first
  const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)
  return {
    regular, bulk,
    regularMiles: sum(regular.map(line => line.monthlyMiles)) * MONTHS,
    bulkMiles: sum(bulk.map(line => line.miles)),
    regularMonthlyAed: sum(regular.map(line => line.monthlyAed)),
  }
}

// ── Why this card ────────────────────────────────────────────────────────────
export function TripWhyThisCard({ plan: card, summary, includeNewCard, projection, request }: { plan: PlanCard, summary: SpendSummary, includeNewCard: boolean, projection: ProjectionMonth[], request: TripPlannerRequest }) {
  const bonusTotal = card.welcome + card.benefits
  const parts = [
    { key: 'regular', label: 'Regular spending', value: summary.regularMiles, className: plan.segRegular },
    { key: 'bulk', label: 'Big payments', value: summary.bulkMiles, className: plan.segBulk },
    { key: 'bonus', label: 'Guaranteed bonuses', value: bonusTotal, className: plan.segBonus },
  ]
  const sum = parts.reduce((total, part) => total + part.value, 0)
  const guaranteedWelcome = includeNewCard ? card.welcomeItems.filter(item => item.kind === 'guaranteed' && item.inTotal) : []
  const guaranteedBenefits = card.benefitItems.filter(item => item.kind === 'guaranteed' && item.inTotal)
  const bonusRows = [...guaranteedWelcome, ...guaranteedBenefits.filter(item => item.value > 0)]
  const perks = guaranteedBenefits.filter(item => item.value <= 0)
  const reward = (value: number, cash: number) => value > 0 ? `+${formatMiles(value)}` : cash > 0 ? `${formatAed(cash)} cash` : '—'

  return <section className={plan.section}>
    <header className={plan.sectionHead}><span>WHY THIS CARD</span><h3>How you earn {formatMiles(card.total)}</h3></header>
    {sum > 0 && <div className={plan.split} role="img" aria-label={parts.map(part => `${part.label} ${formatMiles(part.value)}`).join(', ')}>
      <div className={plan.splitBar}>{parts.filter(part => part.value > 0).map(part => <i key={part.key} className={part.className} style={{ width: `${(part.value / sum) * 100}%` }} />)}</div>
      <ul className={plan.splitLegend}>{parts.map(part => <li key={part.key}><i className={part.className} />{part.label}<b>{formatMiles(part.value)}</b></li>)}</ul>
    </div>}

    <h4 className={plan.groupTitle}>FROM YOUR SPENDING</h4>
    <ul className={plan.why}>
      {summary.regular.length > 0 && <li className={styles.expandRow}>
        <details>
          <summary>
            <span className={plan.whyIcon} aria-hidden="true">🛒</span>
            <span className={plan.whyText}><strong>Regular spending<span className={plan.whyMeta}> · {formatAed(summary.regularMonthlyAed)} × {MONTHS}</span></strong>
              <small>Tap to see it by category, per month</small></span>
            <b>→ {formatMiles(summary.regularMiles)}</b>
            <i className={`ti ti-chevron-down ${styles.expandChevron}`} aria-hidden="true" />
          </summary>
          <div className={styles.calc} role="table" aria-label="Regular spending by category, per month">
            <div className={styles.calcHead} role="row"><span role="columnheader">Category</span><span role="columnheader">Spend / month</span><span role="columnheader">Earn rate</span><span role="columnheader">Miles / month</span></div>
            {summary.regular.map(line => <div className={styles.calcRow} role="row" key={line.code}>
              <span className={styles.calcName} role="cell"><i aria-hidden="true">{groupIcon(line.code)}</i>{line.label}</span>
              <span role="cell">{formatAed(line.monthlyAed)}</span>
              <span className={styles.calcRate} role="cell">× {rateText(line.monthlyMiles, line.monthlyAed)}</span>
              <b role="cell">= {Math.round(line.monthlyMiles).toLocaleString()}</b>
            </div>)}
            <div className={`${styles.calcRow} ${styles.calcTotal}`} role="row">
              <span className={styles.calcName} role="cell">Every month</span>
              <span role="cell">{formatAed(summary.regularMonthlyAed)}</span>
              <span className={styles.calcRate} role="cell">× {rateText(summary.regularMiles, summary.regularMonthlyAed * MONTHS)}</span>
              <b role="cell">= {Math.round(summary.regularMiles / MONTHS).toLocaleString()}</b>
            </div>
            <p className={styles.calcFoot}>Miles per month × {MONTHS} months = {formatMiles(summary.regularMiles)}</p>
          </div>
        </details>
      </li>}
      {summary.bulk.map(line => <li key={line.code}>
        <span className={plan.whyIcon} aria-hidden="true">{topicIcon(line.code)}</span>
        <span className={plan.whyText}><strong>{line.label}<span className={plan.whyMeta}> · {line.uniform ? `${formatAed(line.amountAed)} × ${line.occurrences}` : `${formatAed(line.amountAed)} in ${line.occurrences} payments`}</span></strong></span>
        <b>→ {formatMiles(line.miles)}</b>
      </li>)}
    </ul>

    {bonusRows.length > 0 && <>
      <h4 className={`${plan.groupTitle} ${plan.groupBonus}`}>BONUSES YOU UNLOCKED</h4>
      <ul className={plan.why}>{bonusRows.map((item, index) => <li key={`bonus${index}`} className={plan.whyBonus}>
        <span className={plan.whyIcon} aria-hidden="true">{item.group === 'welcome' ? '🎁' : '⭐'}</span>
        <span className={plan.whyText}><strong>{item.title}<span className={plan.whyMeta}> · {item.month ? `Unlocked in month ${item.month}` : 'No further spend needed'}</span></strong></span>
        <b>{reward(item.value, item.cashAed)}</b>
      </li>)}</ul>
    </>}
    {perks.length > 0 && <div className={styles.perkBox}>
      <h4><i className="ti ti-gift" aria-hidden="true" /> PERKS YOU UNLOCK</h4>
      <ul>{perks.map((item, index) => <li key={index}><i className="ti ti-circle-check-filled" aria-hidden="true" /><div><strong>{item.title}</strong><p>{item.detail}</p></div></li>)}</ul>
    </div>}
    <TripSpendingCalendar plan={card} projection={projection} request={request} summary={summary} />
  </section>
}

// ── 12-month spending calendar: the last part of "Why this card", collapsed until opened ──
function TripSpendingCalendar({ plan: card, projection, request, summary }: { plan: PlanCard, projection: ProjectionMonth[], request: TripPlannerRequest, summary: SpendSummary }) {
  const bulkName = new Map(summary.bulk.map(line => [line.code, line.label]))
  const unlocks = new Map<number, string[]>()
  for (const item of [...card.welcomeItems, ...card.benefitItems]) {
    if (item.kind === 'guaranteed' && item.month) unlocks.set(item.month, [...(unlocks.get(item.month) ?? []), item.title])
  }
  const maxSpend = Math.max(1, ...projection.map(month => month.total_spend_aed))
  return <details className={styles.calendarBox}>
    <summary>Your 12-month spending calendar</summary>
    <div className={plan.monthStrip} aria-label="Spending by month">{projection.map(month => {
      const bulk = Object.keys(month.scheduled_by_category_aed).filter(code => bulkName.has(code) && bulkInMonth(month, code, request.regular_spend) > 0)
      return <div key={month.month_number} className={bulk.length ? plan.monthActive : ''}>
        <span className={plan.monthName}>{month.label}</span>
        <i className={plan.monthBar}><u style={{ height: `${Math.max(6, (month.total_spend_aed / maxSpend) * 100)}%` }} /></i>
        <b>{compactAed(month.total_spend_aed)}</b>
        <small>Everyday expense</small>
        {bulk.map(code => <small key={code}><span aria-hidden="true">{topicIcon(code)}</span> {bulkName.get(code)}</small>)}
        {(unlocks.get(month.month_number) ?? []).map(title => <em key={title}>🎁 {title}</em>)}
      </div>
    })}</div>
  </details>
}
