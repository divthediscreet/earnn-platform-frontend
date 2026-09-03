'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { getCardImageUrl } from '@/lib/api'
import type { Airline, ConditionalRewardEvent, EventDisplay, FeeRoute, MilesGoalSimulationResponse, StrategyId, ToggleState } from '@/lib/miles-goal/contracts'
import type { MilesDisplayCard } from '@/lib/miles-goal/selectors'
import { activeEvents, withEventOverride } from '@/lib/miles-goal/resolver'
import { airlineLabel, formatAed, formatMiles } from '@/lib/miles-goal/format'
import MilesCardDetails from './MilesCardDetails'
import styles from './MilesCardTile.module.css'

const STRATEGIES: StrategyId[] = ['smartest', 'dream', 'easiest']

const strategyContent: Record<StrategyId, { tab: string; description: string; target: string }> = {
  smartest: { tab: 'Dream Big. But Smartly', description: 'Buy Premium Economy and upgrade to Business Class using miles.', target: 'Book Deluxe Economy and upgrade to Business Class' },
  dream: { tab: 'Dream Trip. Pay Nothing', description: 'Accumulate miles and fly into Business Class. You pay only the minimal airline fee.', target: 'To fly Business Class' },
  easiest: { tab: 'Quickest. Still Free', description: 'Fly Economy — this is quickest. You pay only a small airline fee.', target: 'To fly Economy' },
}

function appliesToRoute(event: ConditionalRewardEvent, route: string): boolean {
  return event.route_requirement === 'any'
    || (event.route_requirement === 'standard_only' && route === 'standard_annual')
    || (event.route_requirement === 'monthly_only' && route === 'monthly_fee_acceleration')
}

function conditionValue(event: ConditionalRewardEvent): string {
  if (event.effect_type === 'miles_add') return formatMiles(event.effect_value)
  if (event.effect_type === 'target_reduce') return `Get ${event.effect_value}% miles discount voucher`
  return 'Fee reduced'
}

function fallbackConditionName(event: ConditionalRewardEvent): string {
  if (event.effect_type === 'target_reduce') return 'Miles discount voucher'
  if (event.toggle_key?.startsWith('new_to_bank:')) return 'New-to-bank offer'
  if (event.toggle_key === 'balance_transfer') return 'Balance transfer bonus'
  if (event.recurrence === 'per_period') return 'Ongoing reward boost'
  return 'Joining Bonus'
}

function qualifyingPeriod(event: ConditionalRewardEvent): string | null {
  if (event.window_days) {
    const months = Math.ceil(event.window_days / 30)
    return `${months} ${months === 1 ? 'month' : 'months'}`
  }
  const labels: Record<string, string> = { monthly: '1 month', quarterly: '3 months', semi_annual: '6 months', annual: '12 months' }
  return event.period ? labels[event.period] ?? null : null
}

function conditionSentence(event: ConditionalRewardEvent, display: EventDisplay | undefined): string {
  if (event.toggle_key === 'balance_transfer') return 'Open to balance transfer'
  if (event.condition_type === 'spend_threshold' && event.threshold_aed) {
    const basis = event.eligible_spend_basis === 'category_filtered' ? 'Eligible category spend' : event.eligible_spend_basis === 'merchant_gated' ? 'Eligible merchant spend' : 'Spend'
    const period = qualifyingPeriod(event)
    return `${basis} ${formatAed(event.threshold_aed)}${period ? ` in ${period}` : ''}`
  }
  if (display?.mechanic === 'annual_benefit_acceleration') return 'Annual miles bonus (credited every 12 months)'
  if ((display?.title || '').trim().toLowerCase().replaceAll('_', ' ') === 'joining bonus') return 'Joining Bonus'
  return display?.title || fallbackConditionName(event)
}

export default function MilesCardTile({ card, monthlySpend, responses, toggles, onToggleChange }: {
  card: MilesDisplayCard
  monthlySpend: number
  responses: Partial<Record<Airline, MilesGoalSimulationResponse>>
  toggles: Partial<Record<Airline, ToggleState>>
  onToggleChange: (airline: Airline, state: ToggleState) => void
}) {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyId>('smartest')
  const [expanded, setExpanded] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [feeRouteOverride, setFeeRouteOverride] = useState<FeeRoute | null>(null)
  const [feeInfoOpen, setFeeInfoOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rankedWinner = card.strategy[selectedStrategy]
  const winner = feeRouteOverride && rankedWinner
    ? card.routeCandidates[selectedStrategy].find(candidate => candidate.airline === rankedWinner.airline && candidate.fee_route === feeRouteOverride) ?? rankedWinner
    : rankedWinner
  const winnerCard = winner ? card.catalogs[winner.airline] : undefined
  const winnerResponse = winner ? responses[winner.airline] : undefined
  const state = winner && winnerResponse ? (toggles[winner.airline] ?? winnerResponse.interaction_catalog.toggle_defaults) : undefined

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  const toggleCondition = (event: ConditionalRewardEvent, enabled: boolean) => {
    if (!winner || !winnerCard || !state) return
    setRecalculating(true)
    onToggleChange(winner.airline, withEventOverride(state, winnerCard, event.event_id, enabled))
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setRecalculating(false), 350)
  }

  const visibleEvents = winnerCard?.conditional_events.filter(event => event.effect_type !== 'cost_reduce' && appliesToRoute(event, winner?.fee_route ?? '')) ?? []
  const activeEventIds = new Set(winnerCard && state && winner ? activeEvents(winnerCard, winner.fee_route, state).map(event => event.event_id) : [])
  const hasNewToBankCondition = winnerCard?.conditional_events.some(event => event.toggle_key?.startsWith('new_to_bank:')) ?? false
  const bankNewToBank = winnerCard && state
    ? state.new_to_bank_by_card[winnerCard.earnn_card_id]
      ?? state.new_to_bank_by_bank[winnerCard.bank_code.toUpperCase()]
      ?? state.new_to_bank_default
    : true
  const trajectory = winnerCard?.base_trajectories.find(item => item.trajectory_id === winner?.selected_trajectory_id)
  const monthlyRoute = winnerCard?.base_trajectories.find(item => item.fee_route === 'monthly_fee_acceleration')
  const monthlyRouteCandidate = winner && card.routeCandidates[selectedStrategy].find(candidate => candidate.airline === winner.airline && candidate.fee_route === 'monthly_fee_acceleration')
  const standardRouteCandidate = winner && card.routeCandidates[selectedStrategy].find(candidate => candidate.airline === winner.airline && candidate.fee_route === 'standard_annual')
  const monthlyRouteRecommended = winner?.fee_route === 'monthly_fee_acceleration'
  const canSwitchFeeRoute = !!monthlyRouteCandidate && !!standardRouteCandidate
  const selectedMonthlyFee = monthlyRouteRecommended && trajectory
    ? trajectory.monthly_fee_aed ?? trajectory.cumulative_route_cost_aed_by_month[0]
    : null
  const feeSummary = winnerCard ? (() => {
    const firstYearFee = winnerCard.annual_fee_year1_aed ?? winnerCard.annual_fee_from_year2_aed
    const firstYearFree = winnerCard.annual_fee_year1_free ?? false
    if (selectedMonthlyFee !== null) return { label: 'FEE / YEAR', primary: formatAed(selectedMonthlyFee * 12), secondary: `${formatAed(selectedMonthlyFee)} monthly route` }
    if (winnerCard.free_for_life) return { label: 'FEE', primary: 'FREE FOR LIFE', secondary: null }
    if (firstYearFree) return { label: 'FIRST YEAR', primary: 'FREE', secondary: `Then ${formatAed(winnerCard.annual_fee_from_year2_aed)} / year` }
    if (firstYearFee !== winnerCard.annual_fee_from_year2_aed) return { label: 'FIRST YEAR', primary: formatAed(firstYearFee), secondary: `Then ${formatAed(winnerCard.annual_fee_from_year2_aed)} / year` }
    return { label: 'FEE / YEAR', primary: formatAed(winnerCard.annual_fee_from_year2_aed), secondary: null }
  })() : null
  const content = strategyContent[selectedStrategy]

  const selectFeeRoute = (useMonthlyRoute: boolean) => {
    if (!canSwitchFeeRoute) return
    setRecalculating(true)
    setFeeRouteOverride(useMonthlyRoute ? 'monthly_fee_acceleration' : 'standard_annual')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setRecalculating(false), 350)
  }

  const toggleNewToBank = (enabled: boolean) => {
    if (!winner || !winnerCard || !state) return
    setRecalculating(true)
    onToggleChange(winner.airline, {
      ...state,
      new_to_bank_by_card: { ...state.new_to_bank_by_card, [winnerCard.earnn_card_id]: enabled },
    })
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setRecalculating(false), 350)
  }

  return <article className={`${styles.tile} ${card.focused_rank === 1 ? styles.top : ''}`}>
    <div className={styles.header}>
      <span className={styles.rank}>#{card.focused_rank}</span>
      <Image width={108} height={66} unoptimized src={getCardImageUrl(card.earnn_card_id)} onError={event => { event.currentTarget.src = '/card-dummy.svg' }} alt={`${card.card_name} credit card`} />
      <div className={styles.identity}><span>{card.bank_name}</span><h2>{card.card_name}</h2>{card.focused_rank === 1 && <small><i className="ti ti-sparkles" /> Fastest for your selected ranking</small>}</div>
      {feeSummary && <div className={styles.feePanel}><small>{feeSummary.label}</small><strong>{feeSummary.primary}</strong>{feeSummary.secondary && <span>{feeSummary.secondary}</span>}</div>}
    </div>

    <div className={styles.tabs} role="tablist" aria-label={`Miles strategy for ${card.card_name}`}>
      {STRATEGIES.map(strategy => <button key={strategy} type="button" role="tab" aria-selected={selectedStrategy === strategy} className={selectedStrategy === strategy ? styles.activeTab : ''} onClick={() => { setSelectedStrategy(strategy); setFeeRouteOverride(null); setFeeInfoOpen(false) }}>{strategyContent[strategy].tab}</button>)}
    </div>

    {winner && winnerCard && winnerResponse && state ? <>
      <p className={styles.strategyDescription}>{content.description}</p>
      <div className={styles.planGrid}>
        <section className={styles.targetColumn} aria-label="Target miles"><span className={styles.columnLabel}>YOUR FLIGHT TARGET</span><p>Fly UAE to <strong>{winnerResponse.route.destination}</strong> with {airlineLabel(winner.airline)}.</p><small>{content.target}, you need approximately</small><strong className={styles.targetMiles}>{formatMiles(winner.target_at_goal_miles)}</strong></section>
        <section className={styles.conditionsColumn} aria-label="Conditions and miles"><div className={styles.tableHeading}><span>CONDITION</span><span>MILES</span></div><div className={styles.conditions}>
          <div className={`${styles.monthlySpendRow} ${monthlyRouteRecommended ? styles.feeRouteActive : ''} ${monthlyRoute && !canSwitchFeeRoute ? styles.feeRouteDisabled : ''}`}><div><span>Your monthly spend <strong>{formatAed(monthlySpend)}</strong></span>{monthlyRoute && <div className={styles.feeRouteInline}><span>Express miles monthly route</span>{monthlyRouteRecommended && <button type="button" className={styles.feeInfoButton} aria-label="Explain Express Miles monthly route" aria-expanded={feeInfoOpen} onClick={() => setFeeInfoOpen(open => !open)}>+</button>}</div>}</div><strong>{formatMiles((trajectory?.monthly_base_target_miles ?? 0) + (trajectory?.monthly_fee_uplift_target_miles ?? 0))}</strong>{monthlyRoute ? <label><input type="checkbox" checked={monthlyRouteRecommended} disabled={!canSwitchFeeRoute} onChange={toggle => selectFeeRoute(toggle.target.checked)} /><span className={styles.checkmark} aria-hidden="true"><i className="ti ti-check" /></span></label> : <span aria-hidden="true" />}
            {feeInfoOpen && monthlyRoute && <div className={styles.feeInfo} role="dialog" aria-label="Express Miles monthly route details"><button type="button" onClick={() => setFeeInfoOpen(false)} aria-label="Close">×</button><strong>Express Miles monthly route</strong><p>Instead of paying <b>{formatAed(winnerCard.annual_fee_from_year2_aed)}</b> per year, you pay <b>{formatAed(monthlyRoute.monthly_fee_aed ?? monthlyRoute.cumulative_route_cost_aed_by_month[0])}</b> per month.</p><p>You get <b>{monthlyRoute.fee_acceleration_bonus_pct ?? Math.round((monthlyRoute.monthly_fee_uplift_target_miles / Math.max(monthlyRoute.monthly_base_target_miles, 1)) * 100)}% bonus miles</b> on eligible spend{monthlyRoute.fee_acceleration_cap_target_miles !== null && monthlyRoute.fee_acceleration_cap_target_miles !== undefined ? <> — capped at <b>{formatMiles(monthlyRoute.fee_acceleration_cap_target_miles)}</b> per {monthlyRoute.fee_acceleration_cap_period ?? 'month'}.</> : '.'}</p></div>}
          </div>
          {hasNewToBankCondition && <label className={bankNewToBank ? styles.conditionActive : ''}><input type="checkbox" checked={bankNewToBank} onChange={toggle => toggleNewToBank(toggle.target.checked)} /><span className={styles.conditionName}>New to {winnerCard.bank_name}</span><strong>Welcome offers</strong><span className={styles.checkmark} aria-hidden="true"><i className="ti ti-check" /></span></label>}
          {visibleEvents.map(event => {
          const active = activeEventIds.has(event.event_id)
          const display = winnerResponse.interaction_catalog.event_display_catalog[event.event_id]
          return <label key={event.event_id} className={active ? styles.conditionActive : ''}><input type="checkbox" checked={active} onChange={toggle => toggleCondition(event, toggle.target.checked)} /><span className={styles.conditionName}>{conditionSentence(event, display)}</span><strong>{conditionValue(event)}</strong><span className={styles.checkmark} aria-hidden="true"><i className="ti ti-check" /></span></label>
          })}</div></section>
        <section className={styles.timelineColumn} aria-live="polite" aria-label="Months to goal"><p className={styles.timelineLead}>YOU NEED</p>{recalculating ? <div className={styles.calculating} aria-label="Updating timeline"><i className="ti ti-plane-inflight" /></div> : <strong className={styles.months}>{winner.months_to_goal}</strong>}<p className={styles.timelineCaption}>{winner.months_to_goal === 1 ? 'month' : 'months'} (approx), to reach this target.</p><button type="button" className={styles.exploreButton} onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>{expanded ? 'Hide plan' : 'Explore plan'} <i className={`ti ti-chevron-${expanded ? 'up' : 'down'}`} /></button></section>
      </div>
    </> : <div className={styles.unavailable}><i className="ti ti-plane-off" /><div><strong>{content.tab} is not available for this card within 36 months.</strong><span>Try another strategy or card from the ranked list.</span></div></div>}
    {expanded && winnerCard && <MilesCardDetails card={card} focused={selectedStrategy} responses={responses} toggles={toggles} onToggleChange={onToggleChange} />}
  </article>
}
