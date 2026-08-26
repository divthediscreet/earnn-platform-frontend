import type {
  BaseFeeTrajectory, CardInteractionModel, ConditionalCandidate, ConditionalRewardEvent,
  InteractionCatalog, ReachedCandidate, ResolvedMilesGoalView, StrategyDefinition,
  StrategyResolvedResult, ToggleState,
} from './contracts'

const PERIOD_MONTHS: Record<string, number> = { monthly: 1, quarterly: 3, semi_annual: 6, annual: 12 }

export class InvalidMilesToggleState extends Error {}

function bankState(card: CardInteractionModel, state: ToggleState): boolean {
  if (card.earnn_card_id in state.new_to_bank_by_card) return state.new_to_bank_by_card[card.earnn_card_id]
  if (card.bank_code.toUpperCase() in state.new_to_bank_by_bank) return state.new_to_bank_by_bank[card.bank_code.toUpperCase()]
  return state.new_to_bank_default
}

function routeMatches(event: ConditionalRewardEvent, route: string): boolean {
  return event.route_requirement === 'any'
    || (event.route_requirement === 'standard_only' && route === 'standard_annual')
    || (event.route_requirement === 'monthly_only' && route === 'monthly_fee_acceleration')
}

export function activeEvents(card: CardInteractionModel, route: string, state: ToggleState): ConditionalRewardEvent[] {
  const explicitByGroup = new Map<string, string[]>()
  for (const event of card.conditional_events) {
    if (state.event_overrides[event.event_id] === true) {
      explicitByGroup.set(event.mutual_exclusion_group, [...(explicitByGroup.get(event.mutual_exclusion_group) ?? []), event.event_id])
    }
  }
  for (const ids of explicitByGroup.values()) {
    if (ids.length > 1) throw new InvalidMilesToggleState('Only one option can be selected in this reward group.')
  }
  const selectedByGroup = new Map([...explicitByGroup.entries()].map(([group, ids]) => [group, ids[0]]))
  const active: ConditionalRewardEvent[] = []
  for (const event of card.conditional_events) {
    if (!routeMatches(event, route)) continue
    let enabled: boolean
    if (event.event_id in state.event_overrides) enabled = state.event_overrides[event.event_id]
    else if (selectedByGroup.has(event.mutual_exclusion_group)) enabled = selectedByGroup.get(event.mutual_exclusion_group) === event.event_id
    else if (event.toggle_key?.startsWith('new_to_bank:')) enabled = bankState(card, state) === event.toggle_required_value
    else if (event.toggle_key === 'balance_transfer') enabled = state.balance_transfer_default === event.toggle_required_value
    else enabled = event.default_on
    if (enabled) active.push(event)
  }
  const groups = new Set<string>()
  for (const event of active) {
    if (groups.has(event.mutual_exclusion_group)) throw new InvalidMilesToggleState('Two rewards in one group cannot be active together.')
    groups.add(event.mutual_exclusion_group)
  }
  return active
}

function unlockMonths(event: ConditionalRewardEvent): number[] {
  const first = event.unlock_month_actual ?? event.unlock_month_if_forced
  if (!first || first > 36) return []
  if (event.recurrence === 'one_shot_window') return [first]
  const period = event.period ? PERIOD_MONTHS[event.period] : undefined
  if (!period) return []
  const offset = ((first - 1) % period) + 1
  const result: number[] = []
  for (let start = 1; start + offset - 1 <= 36; start += period) result.push(start + offset - 1)
  return result
}

interface Crossing {
  month: number
  target: number
  miles: number
  cost: number
  events: ConditionalRewardEvent[]
  unlocks: Record<string, number[]>
}

function findCrossing(catalog: InteractionCatalog, card: CardInteractionModel, trajectory: BaseFeeTrajectory, strategy: StrategyDefinition, state: ToggleState): Crossing | null {
  const events = activeEvents(card, trajectory.fee_route, state)
  const unlocks = Object.fromEntries(events.map(event => [event.event_id, unlockMonths(event)]))
  for (let month = 1; month <= catalog.horizon_months; month += 1) {
    let miles = catalog.current_usable_miles + trajectory.cumulative_base_miles_by_month[month - 1]
    let reduction = 0
    let target = strategy.original_target_miles
    for (const event of events) {
      const occurred = unlocks[event.event_id].filter(unlock => unlock <= month).length
      const quantity = event.quantity_per_period ?? 1
      if (event.effect_type === 'miles_add') miles += occurred * event.effect_value * quantity
      if (event.effect_type === 'cost_reduce') reduction += occurred * event.effect_value * quantity
      if (event.effect_type === 'target_reduce' && occurred) target = Math.ceil(strategy.original_target_miles * (1 - event.effect_value / 100))
    }
    const cost = Math.max(trajectory.cumulative_route_cost_aed_by_month[month - 1] - reduction, 0)
    if (miles >= target) return { month, target, miles, cost, events, unlocks }
  }
  return null
}

function optimisticState(card: CardInteractionModel, state: ToggleState): ToggleState {
  const groups = new Map<string, ConditionalRewardEvent[]>()
  for (const event of card.conditional_events.filter(event => event.effect_type !== 'cost_reduce')) {
    groups.set(event.mutual_exclusion_group, [...(groups.get(event.mutual_exclusion_group) ?? []), event])
  }
  const overrides = { ...state.event_overrides }
  for (const members of groups.values()) {
    const winner = [...members].sort((a, b) => b.effect_value - a.effect_value || (a.unlock_month_actual ?? a.unlock_month_if_forced ?? 99) - (b.unlock_month_actual ?? b.unlock_month_if_forced ?? 99))[0]
    for (const event of members) overrides[event.event_id] = event.event_id === winner.event_id
  }
  return { ...state, event_overrides: overrides }
}

function reached(card: CardInteractionModel, trajectory: BaseFeeTrajectory, strategy: StrategyDefinition, crossing: Crossing): ReachedCandidate {
  return {
    default_rank: null,
    earnn_card_id: card.earnn_card_id,
    fee_route: trajectory.fee_route,
    months_to_goal: crossing.month,
    selected_trajectory_id: trajectory.trajectory_id,
    target_at_goal_miles: crossing.target,
    original_target_miles: strategy.original_target_miles,
    active_event_ids: crossing.events.map(event => event.event_id),
    event_unlocks: crossing.events.map(event => ({ event_id: event.event_id, unlock_months: crossing.unlocks[event.event_id] })),
    total_miles_at_goal: crossing.miles,
    fee_cost_at_goal_aed: crossing.cost,
    associated_cash_aed: strategy.associated_cash_aed,
    annual_fee_from_year2_aed: card.annual_fee_from_year2_aed,
  }
}

export function resolveCatalog(catalog: InteractionCatalog, state: ToggleState = catalog.toggle_defaults): ResolvedMilesGoalView {
  const strategies: StrategyResolvedResult[] = catalog.strategies.map(strategy => {
    const reachedCandidates: ReachedCandidate[] = []
    const conditional: ConditionalCandidate[] = []
    for (const card of catalog.cards) {
      if (!card.strategy_targets.some(target => target.strategy_id === strategy.strategy_id)) continue
      const optimistic = optimisticState(card, state)
      for (const trajectory of card.base_trajectories) {
        const base = findCrossing(catalog, card, trajectory, strategy, state)
        if (base) {
          reachedCandidates.push(reached(card, trajectory, strategy, base))
          continue
        }
        const alternative = findCrossing(catalog, card, trajectory, strategy, optimistic)
        if (!alternative) continue
        const defaultIds = new Set(activeEvents(card, trajectory.fee_route, state).map(event => event.event_id))
        const alternativeIds = new Set(alternative.events.map(event => event.event_id))
        const required = Object.fromEntries(card.conditional_events
          .filter(event => defaultIds.has(event.event_id) !== alternativeIds.has(event.event_id))
          .map(event => [event.event_id, alternativeIds.has(event.event_id)]))
        conditional.push({
          default_rank: null, default_months_to_goal: null,
          earnn_card_id: card.earnn_card_id, fee_route: trajectory.fee_route,
          alternative_months_to_goal: alternative.month, selected_trajectory_id: trajectory.trajectory_id,
          original_target_miles: strategy.original_target_miles, target_at_goal_miles: alternative.target,
          required_event_overrides: required, active_event_ids: alternative.events.map(event => event.event_id),
          event_unlocks: alternative.events.map(event => ({ event_id: event.event_id, unlock_months: alternative.unlocks[event.event_id] })),
          total_miles_at_goal: alternative.miles, fee_cost_at_goal_aed: alternative.cost,
          associated_cash_aed: strategy.associated_cash_aed,
          annual_fee_from_year2_aed: card.annual_fee_from_year2_aed,
        })
      }
    }
    reachedCandidates.sort((a, b) => a.months_to_goal - b.months_to_goal || a.annual_fee_from_year2_aed - b.annual_fee_from_year2_aed || a.earnn_card_id.localeCompare(b.earnn_card_id) || a.selected_trajectory_id.localeCompare(b.selected_trajectory_id))
    const ranked = reachedCandidates.map((candidate, index) => ({ ...candidate, default_rank: index + 1 }))
    conditional.sort((a, b) => a.alternative_months_to_goal - b.alternative_months_to_goal || a.annual_fee_from_year2_aed - b.annual_fee_from_year2_aed || a.earnn_card_id.localeCompare(b.earnn_card_id))
    return { strategy_id: strategy.strategy_id, best_default_candidate: ranked[0] ?? null, default_ranked_candidates: ranked, conditionally_reachable_candidates: conditional }
  })
  return { strategies }
}

export function withEventOverride(state: ToggleState, card: CardInteractionModel, eventId: string, enabled: boolean): ToggleState {
  const event = card.conditional_events.find(item => item.event_id === eventId)
  if (!event) return state
  const overrides = { ...state.event_overrides, [eventId]: enabled }
  if (enabled) {
    for (const sibling of card.conditional_events) {
      if (sibling.event_id !== eventId && sibling.mutual_exclusion_group === event.mutual_exclusion_group) overrides[sibling.event_id] = false
    }
  }
  return { ...state, event_overrides: overrides }
}
