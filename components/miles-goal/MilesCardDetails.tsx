'use client'

import { useEffect, useState } from 'react'
import { fetchCardDetail } from '@/lib/api'
import type { Airline, MilesGoalSimulationResponse, StrategyId, ToggleState } from '@/lib/miles-goal/contracts'
import type { MilesDisplayCard } from '@/lib/miles-goal/selectors'
import { activeEvents, resolveCatalog, withEventOverride } from '@/lib/miles-goal/resolver'
import { airlineLabel, feeRouteLabel, formatAed, formatMiles, formatMonths } from '@/lib/miles-goal/format'
import MilesTimeline from './MilesTimeline'
import MilesOpportunityCard from './MilesOpportunityCard'
import styles from './MilesDetails.module.css'

export default function MilesCardDetails({ card, focused, responses, toggles, onToggleChange }: {
  card: MilesDisplayCard
  focused: StrategyId
  responses: Partial<Record<Airline, MilesGoalSimulationResponse>>
  toggles: Partial<Record<Airline, ToggleState>>
  onToggleChange: (airline: Airline, state: ToggleState) => void
}) {
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const winner = card.strategy[focused]
  const response = winner ? responses[winner.airline] : undefined
  const catalogCard = winner ? card.catalogs[winner.airline] : undefined
  const state = winner && response ? (toggles[winner.airline] ?? response.interaction_catalog.toggle_defaults) : undefined

  useEffect(() => {
    let active = true
    fetchCardDetail(card.earnn_card_id).then(value => { if (active) setDetail(value as Record<string, unknown>) }).catch(() => {})
    return () => { active = false }
  }, [card.earnn_card_id])

  if (!winner || !response || !catalogCard || !state) return null
  const trajectory = catalogCard.base_trajectories.find(item => item.trajectory_id === winner.selected_trajectory_id)
  const currentlyActive = new Set(activeEvents(catalogCard, winner.fee_route, state).map(event => event.event_id))
  const displays = response.interaction_catalog.event_display_catalog
  const relevantEvents = catalogCard.conditional_events.filter(event => event.effect_type !== 'cost_reduce' || event.route_requirement !== 'monthly_only')
  const hasNewToBankEvent = catalogCard.conditional_events.some(event => event.toggle_key?.startsWith('new_to_bank:'))
  const bankNewToBank = state.new_to_bank_by_bank[catalogCard.bank_code.toUpperCase()] ?? state.new_to_bank_default
  const cardNewToBank = state.new_to_bank_by_card[catalogCard.earnn_card_id] ?? bankNewToBank

  const alternativeMonth = (eventId: string, enabled: boolean): number | null => {
    try {
      const nextState = withEventOverride(state, catalogCard, eventId, enabled)
      const view = resolveCatalog(response.interaction_catalog, nextState)
      const strategy = view.strategies.find(item => item.strategy_id === focused)
      const reached = strategy?.default_ranked_candidates.find(item => item.earnn_card_id === card.earnn_card_id && item.fee_route === winner.fee_route)
      const conditional = strategy?.conditionally_reachable_candidates.find(item => item.earnn_card_id === card.earnn_card_id && item.fee_route === winner.fee_route)
      return reached?.months_to_goal ?? conditional?.alternative_months_to_goal ?? null
    } catch { return null }
  }

  const benefitRows = detail && Array.isArray(detail.benefits) ? detail.benefits as { benefit_name?: string; benefit_description?: string }[] : []
  return <div className={styles.details}>
    {hasNewToBankEvent && <section className={styles.cardAssumption}><div><small>CARD-SPECIFIC ASSUMPTION</small><strong>New to {catalogCard.bank_name} for this card?</strong><span>This overrides the global and bank setting only for {catalogCard.card_name}.</span></div><button type="button" role="switch" aria-checked={cardNewToBank} className={cardNewToBank ? styles.switchOn : ''} onClick={() => onToggleChange(winner.airline, { ...state, new_to_bank_by_card: { ...state.new_to_bank_by_card, [catalogCard.earnn_card_id]: !cardNewToBank } })}><span /></button></section>}
    <section className={styles.summaryGrid}>
      <div><small>Winning route</small><strong>{feeRouteLabel(winner.fee_route)}</strong><span>{trajectory?.monthly_fee_uplift_target_miles ? `+${formatMiles(trajectory.monthly_fee_uplift_target_miles)} monthly uplift` : 'Base card earning'}</span></div>
      <div><small>Base miles / month</small><strong>{formatMiles(trajectory?.monthly_base_target_miles ?? 0)}</strong><span>{airlineLabel(winner.airline)} currency</span></div>
      <div><small>Cost by goal</small><strong>{formatAed(winner.fee_cost_at_goal_aed)}</strong><span>Card route fees through month {winner.months_to_goal}</span></div>
      <div><small>Airline cash amount</small><strong>{formatAed(winner.associated_cash_aed)}</strong><span>In addition to target miles</span></div>
    </section>

    {card.routeCandidates[focused].length > 1 && <section><h3>Fee-route comparison</h3><div className={styles.routeTable}>{card.routeCandidates[focused].map(candidate => <div key={`${candidate.airline}-${candidate.selected_trajectory_id}`}><span>{airlineLabel(candidate.airline)} · {feeRouteLabel(candidate.fee_route)}</span><strong>{formatMonths(candidate.months_to_goal)}</strong><small>{formatAed(candidate.fee_cost_at_goal_aed)} by goal</small></div>)}</div></section>}
    <section><h3>Your achievement story</h3><MilesTimeline candidate={winner} card={catalogCard} displays={displays} /></section>
    {relevantEvents.length > 0 && <section><h3>Ways to move the goal</h3><p className={styles.sectionIntro}>These switches use the returned bank conditions and recompute locally—no new calculation request.</p><div className={styles.opportunityGrid}>{relevantEvents.map(event => {
      const active = currentlyActive.has(event.event_id)
      return <MilesOpportunityCard key={event.event_id} event={event} display={displays[event.event_id]} active={active} currentMonths={winner.months_to_goal} alternativeMonths={alternativeMonth(event.event_id, !active)} onToggle={enabled => onToggleChange(winner.airline, withEventOverride(state, catalogCard, event.event_id, enabled))} />
    })}</div></section>}
    {benefitRows.length > 0 && <section><h3>More card benefits</h3><ul className={styles.benefits}>{benefitRows.slice(0, 3).map((benefit, index) => <li key={`${benefit.benefit_name}-${index}`}><i className="ti ti-circle-check" /><span><strong>{benefit.benefit_name || 'Card benefit'}</strong>{benefit.benefit_description && <small>{benefit.benefit_description}</small>}</span></li>)}</ul></section>}
  </div>
}
