'use client'

import { useState } from 'react'
import type { Airline, ConditionalRewardEvent, EventDisplay, FeeRoute, MilesGoalSimulationResponse, StrategyId, ToggleState } from '@/lib/miles-goal/contracts'
import type { MilesDisplayCard } from '@/lib/miles-goal/selectors'
import { activeEvents, withEventOverride } from '@/lib/miles-goal/resolver'
import { formatAed, formatMiles } from '@/lib/miles-goal/format'
import MilesTimeline from './MilesTimeline'
import styles from './MilesDetails.module.css'
import legacyStyles from './MilesCardTile.module.css'
import conditionStyles from './MilesDetailsConditions.module.css'

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

function customerFacingLabel(value: string | null | undefined): string | null {
  if (!value) return null
  const labels: Record<string, string> = {
    joining_bonus: 'Joining Bonus',
    spend_bonus: 'Spend Bonus',
    restricted_spend_bonus: 'Restricted Spend Bonus',
    balance_transfer_bonus: 'Balance Transfer Bonus',
    joining_fee_reversal: 'Joining Fee Reversal',
    spend_acceleration: 'Spend Acceleration Bonus',
    annual_benefit_acceleration: 'Annual Miles Bonus',
    miles_discount_voucher: 'Miles Discount Voucher',
  }
  const normalized = value.trim().toLowerCase()
  return labels[normalized] || value.replaceAll('_', ' ')
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
  return customerFacingLabel(display?.title) || fallbackConditionName(event)
}

export default function MilesCardDetails({ card, focused, monthlySpend, responses, toggles, onToggleChange }: {
  card: MilesDisplayCard
  focused: StrategyId
  monthlySpend: number
  responses: Partial<Record<Airline, MilesGoalSimulationResponse>>
  toggles: Partial<Record<Airline, ToggleState>>
  onToggleChange: (airline: Airline, state: ToggleState) => void
}) {
  const [feeRouteOverride, setFeeRouteOverride] = useState<FeeRoute | null>(null)
  const [feeInfoOpen, setFeeInfoOpen] = useState(false)
  const rankedWinner = card.strategy[focused]
  const winner = feeRouteOverride && rankedWinner
    ? card.routeCandidates[focused].find(candidate => candidate.airline === rankedWinner.airline && candidate.fee_route === feeRouteOverride) ?? rankedWinner
    : rankedWinner
  const response = winner ? responses[winner.airline] : undefined
  const catalogCard = winner ? card.catalogs[winner.airline] : undefined
  const state = winner && response ? (toggles[winner.airline] ?? response.interaction_catalog.toggle_defaults) : undefined

  if (!winner || !response || !catalogCard || !state) return null
  const displays = response.interaction_catalog.event_display_catalog
  const trajectory = catalogCard.base_trajectories.find(item => item.trajectory_id === winner.selected_trajectory_id)
  const visibleEvents = catalogCard.conditional_events.filter(event => event.effect_type !== 'cost_reduce' && appliesToRoute(event, winner.fee_route))
  const activeEventIds = new Set(activeEvents(catalogCard, winner.fee_route, state).map(event => event.event_id))
  const hasNewToBankEvent = catalogCard.conditional_events.some(event => event.toggle_key?.startsWith('new_to_bank:'))
  const bankNewToBank = state.new_to_bank_by_bank[catalogCard.bank_code.toUpperCase()] ?? state.new_to_bank_default
  const cardNewToBank = state.new_to_bank_by_card[catalogCard.earnn_card_id] ?? bankNewToBank
  const monthlyRoute = catalogCard.base_trajectories.find(item => item.fee_route === 'monthly_fee_acceleration')
  const monthlyRouteCandidate = card.routeCandidates[focused].find(candidate => candidate.airline === winner.airline && candidate.fee_route === 'monthly_fee_acceleration')
  const standardRouteCandidate = card.routeCandidates[focused].find(candidate => candidate.airline === winner.airline && candidate.fee_route === 'standard_annual')
  const monthlyRouteRecommended = winner.fee_route === 'monthly_fee_acceleration'
  const canSwitchFeeRoute = !!monthlyRouteCandidate && !!standardRouteCandidate

  const toggleCondition = (event: ConditionalRewardEvent, enabled: boolean) => {
    onToggleChange(winner.airline, withEventOverride(state, catalogCard, event.event_id, enabled))
  }

  const selectFeeRoute = (useMonthlyRoute: boolean) => {
    if (!canSwitchFeeRoute) return
    setFeeRouteOverride(useMonthlyRoute ? 'monthly_fee_acceleration' : 'standard_annual')
    setFeeInfoOpen(false)
  }

  return <div className={styles.details}>
    <section><h3>Conditions</h3><div className={conditionStyles.panel}><div className={legacyStyles.conditionsColumn} aria-label="Conditions and miles"><div className={legacyStyles.tableHeading}><span>CONDITION</span><span>MILES</span></div><div className={legacyStyles.conditions}>
      <div className={`${legacyStyles.monthlySpendRow} ${monthlyRouteRecommended ? legacyStyles.feeRouteActive : ''} ${monthlyRoute && !canSwitchFeeRoute ? legacyStyles.feeRouteDisabled : ''}`}><div><span>Your monthly spend <strong>{formatAed(monthlySpend)}</strong></span>{monthlyRoute && <div className={legacyStyles.feeRouteInline}><span>Express miles monthly route</span>{monthlyRouteRecommended && <button type="button" className={legacyStyles.feeInfoButton} aria-label="Explain Express Miles monthly route" aria-expanded={feeInfoOpen} onClick={() => setFeeInfoOpen(open => !open)}>+</button>}</div>}</div><strong>{formatMiles((trajectory?.monthly_base_target_miles ?? 0) + (trajectory?.monthly_fee_uplift_target_miles ?? 0)).replace(' miles', ' miles/month')}</strong>{monthlyRoute ? <label><input type="checkbox" checked={monthlyRouteRecommended} disabled={!canSwitchFeeRoute} onChange={toggle => selectFeeRoute(toggle.target.checked)} /><span className={legacyStyles.checkmark} aria-hidden="true"><i className="ti ti-check" /></span></label> : <span aria-hidden="true" />}
        {feeInfoOpen && monthlyRoute && <div className={legacyStyles.feeInfo} role="dialog" aria-label="Express Miles monthly route details"><button type="button" onClick={() => setFeeInfoOpen(false)} aria-label="Close">×</button><strong>Express Miles monthly route</strong><p>Instead of paying <b>{formatAed(catalogCard.annual_fee_from_year2_aed)}</b> per year, you pay <b>{formatAed(monthlyRoute.monthly_fee_aed ?? monthlyRoute.cumulative_route_cost_aed_by_month[0])}</b> per month.</p><p>You get <b>{monthlyRoute.fee_acceleration_bonus_pct ?? Math.round((monthlyRoute.monthly_fee_uplift_target_miles / Math.max(monthlyRoute.monthly_base_target_miles, 1)) * 100)}% bonus miles</b> on eligible spend{monthlyRoute.fee_acceleration_cap_target_miles !== null && monthlyRoute.fee_acceleration_cap_target_miles !== undefined ? <> — capped at <b>{formatMiles(monthlyRoute.fee_acceleration_cap_target_miles)}</b> per {monthlyRoute.fee_acceleration_cap_period ?? 'month'}.</> : '.'}</p></div>}
      </div>
      {hasNewToBankEvent && <label className={cardNewToBank ? legacyStyles.conditionActive : ''}><input type="checkbox" checked={cardNewToBank} onChange={toggle => onToggleChange(winner.airline, { ...state, new_to_bank_by_card: { ...state.new_to_bank_by_card, [catalogCard.earnn_card_id]: toggle.target.checked } })} /><span className={legacyStyles.conditionName}>New to {catalogCard.bank_name}</span><strong>Welcome offers</strong><span className={legacyStyles.checkmark} aria-hidden="true"><i className="ti ti-check" /></span></label>}
      {visibleEvents.map(event => {
        const active = activeEventIds.has(event.event_id)
        return <label key={event.event_id} className={active ? legacyStyles.conditionActive : ''}><input type="checkbox" checked={active} onChange={toggle => toggleCondition(event, toggle.target.checked)} /><span className={legacyStyles.conditionName}>{conditionSentence(event, displays[event.event_id])}</span><strong>{conditionValue(event)}</strong><span className={legacyStyles.checkmark} aria-hidden="true"><i className="ti ti-check" /></span></label>
      })}
    </div></div></div></section>
    <section><h3>Your achievement story</h3><MilesTimeline candidate={winner} card={catalogCard} displays={displays} /></section>
  </div>
}
