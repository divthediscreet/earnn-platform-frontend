'use client'

import type { Airline, ConditionalRewardEvent, EventDisplay, MilesGoalSimulationResponse, StrategyId, ToggleState } from '@/lib/miles-goal/contracts'
import type { MilesDisplayCard } from '@/lib/miles-goal/selectors'
import { activeEvents, withEventOverride } from '@/lib/miles-goal/resolver'
import { formatAed, formatMiles } from '@/lib/miles-goal/format'
import MilesAchievementFormula from './MilesAchievementFormula'
import styles from './MilesDetails.module.css'
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

function conditionTiming(event: ConditionalRewardEvent): string {
  const period = qualifyingPeriod(event)
  if (event.condition_type === 'spend_threshold' && period) return `Complete within ${period}`
  const unlockMonth = event.unlock_month_actual ?? event.unlock_month_if_forced
  if (unlockMonth) return `Bonus credited in month ${unlockMonth}`
  if (period) return `Available every ${period}`
  return 'One-time offer'
}

function eventMechanic(event: ConditionalRewardEvent, display: EventDisplay | undefined): string {
  return (display?.mechanic || '').trim().toLowerCase()
}

const EVENT_ORDER: Record<string, number> = {
  joining_bonus: 1,
  spend_bonus: 2,
  restricted_spend_bonus: 3,
  annual_benefit_acceleration: 4,
  miles_discount_voucher: 5,
  balance_transfer_bonus: 6,
}

export default function MilesCardDetails({ card, focused, responses, toggles, onToggleChange }: {
  card: MilesDisplayCard
  focused: StrategyId
  responses: Partial<Record<Airline, MilesGoalSimulationResponse>>
  toggles: Partial<Record<Airline, ToggleState>>
  onToggleChange: (airline: Airline, state: ToggleState) => void
}) {
  const winner = card.strategy[focused]
  const response = winner ? responses[winner.airline] : undefined
  const catalogCard = winner ? card.catalogs[winner.airline] : undefined
  const state = winner && response ? (toggles[winner.airline] ?? response.interaction_catalog.toggle_defaults) : undefined

  if (!winner || !response || !catalogCard || !state) return null
  const displays = response.interaction_catalog.event_display_catalog
  const visibleEvents = catalogCard.conditional_events
    .filter(event => event.effect_type !== 'cost_reduce' && appliesToRoute(event, winner.fee_route))
    .sort((left, right) => (EVENT_ORDER[eventMechanic(left, displays[left.event_id])] ?? 99) - (EVENT_ORDER[eventMechanic(right, displays[right.event_id])] ?? 99))
  const activeEventIds = new Set(activeEvents(catalogCard, winner.fee_route, state).map(event => event.event_id))
  const hasNewToBankEvent = catalogCard.conditional_events.some(event => event.toggle_key?.startsWith('new_to_bank:'))
  const bankNewToBank = state.new_to_bank_by_bank[catalogCard.bank_code.toUpperCase()] ?? state.new_to_bank_default
  const cardNewToBank = state.new_to_bank_by_card[catalogCard.earnn_card_id] ?? bankNewToBank
  const toggleCondition = (event: ConditionalRewardEvent, enabled: boolean) => {
    onToggleChange(winner.airline, withEventOverride(state, catalogCard, event.event_id, enabled))
  }
  const conditionCount = visibleEvents.length + (hasNewToBankEvent ? 1 : 0)

  return <div className={styles.details}>
    <section><h3>Which bonuses can you unlock?</h3><p className={conditionStyles.intro}>Earnn included the bonuses that look within reach. Turn any off and your timeline updates instantly.</p><div className={conditionStyles.panel}><div className={conditionStyles.cards} style={{ '--condition-count': Math.min(Math.max(conditionCount, 1), 6) } as React.CSSProperties} aria-label="Conditions and bonuses">
      {hasNewToBankEvent && <label className={`${conditionStyles.card} ${cardNewToBank ? conditionStyles.active : ''}`}><input type="checkbox" checked={cardNewToBank} onChange={toggle => onToggleChange(winner.airline, { ...state, new_to_bank_by_card: { ...state.new_to_bank_by_card, [catalogCard.earnn_card_id]: toggle.target.checked } })} /><span className={conditionStyles.condition}>New to {catalogCard.bank_name}</span><span className={conditionStyles.timing}>Available when you join</span><span className={conditionStyles.bonusLabel}>Bonus</span><strong>Welcome offers</strong><span className={conditionStyles.toggle} aria-hidden="true"><i /></span><span className={conditionStyles.status}>{cardNewToBank ? 'I can do it' : "I can’t do this"}</span></label>}
      {visibleEvents.map(event => {
        const active = activeEventIds.has(event.event_id)
        const joiningBonus = eventMechanic(event, displays[event.event_id]) === 'joining_bonus'
        const newToBankOnly = event.toggle_key?.startsWith('new_to_bank:') && event.toggle_required_value === true
        const unavailable = joiningBonus || (newToBankOnly && !cardNewToBank)
        return <label key={event.event_id} className={`${conditionStyles.card} ${active && !unavailable ? conditionStyles.active : ''} ${unavailable ? conditionStyles.disabled : ''}`}><input type="checkbox" checked={active} disabled={unavailable} onChange={toggle => toggleCondition(event, toggle.target.checked)} /><span className={conditionStyles.condition}>{conditionSentence(event, displays[event.event_id])}</span><span className={conditionStyles.timing}>{conditionTiming(event)}</span><span className={conditionStyles.bonusLabel}>Bonus</span><strong>{conditionValue(event)}</strong><span className={conditionStyles.toggle} aria-hidden="true"><i /></span><span className={conditionStyles.status}>{joiningBonus ? 'No Condition' : unavailable ? 'Requires New to bank' : active ? 'I can do it' : "I can’t do this"}</span></label>
      })}
    </div></div></section>
    <section><h3>Here’s how you reach your goal</h3><MilesAchievementFormula candidate={winner} card={catalogCard} displays={displays} currentUsableMiles={response.interaction_catalog.current_usable_miles} rewardCurrency={response.interaction_catalog.target_reward_currency} /></section>
  </div>
}
