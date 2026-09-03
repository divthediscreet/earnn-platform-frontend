import type { SpendProfile } from '@/lib/spend-categories'

export type Airline = 'emirates' | 'etihad'
export type AirlineScope = 'best' | Airline
export type StrategyId = 'easiest' | 'dream' | 'smartest'
export type FeeRoute = 'standard_annual' | 'monthly_fee_acceleration'

export interface ToggleState {
  new_to_bank_default: boolean
  balance_transfer_default: boolean
  new_to_bank_by_bank: Record<string, boolean>
  new_to_bank_by_card: Record<string, boolean>
  event_overrides: Record<string, boolean>
}

export const DEFAULT_TOGGLE_STATE: ToggleState = {
  new_to_bank_default: true,
  balance_transfer_default: true,
  new_to_bank_by_bank: {},
  new_to_bank_by_card: {},
  event_overrides: {},
}

export interface MilesGoalSimulationRequest {
  destination_region: string
  airline: Airline
  salary_aed: number
  spend: SpendProfile
  current_usable_miles?: number
  merchant_prefs?: Record<string, string[]>
  toggle_state?: ToggleState
}

export interface ConditionalRewardEvent {
  event_id: string
  earnn_card_id: string
  source_ref: string
  effect_type: 'miles_add' | 'target_reduce' | 'cost_reduce'
  effect_value: number
  condition_type: 'none' | 'spend_threshold' | 'binary_fact'
  feasibility_gated: boolean
  eligible_spend_basis: 'total' | 'category_filtered' | 'merchant_gated'
  threshold_aed: number | null
  recurrence: 'one_shot_window' | 'per_period'
  window_days: number | null
  period: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | null
  quantity_per_period: number | null
  route_requirement: 'any' | 'standard_only' | 'monthly_only'
  toggle_key: string | null
  toggle_required_value: boolean | null
  mutual_exclusion_group: string
  feasibility_ratio: number
  unlock_month_actual: number | null
  unlock_month_if_forced: number | null
  default_on: boolean
}

export interface BaseFeeTrajectory {
  trajectory_id: string
  earnn_card_id: string
  fee_route: FeeRoute
  monthly_base_target_miles: number
  monthly_fee_uplift_target_miles: number
  monthly_fee_aed: number | null
  fee_acceleration_bonus_pct: number | null
  fee_acceleration_cap_target_miles: number | null
  fee_acceleration_cap_period: 'monthly' | 'quarterly' | 'semi_annual' | 'annual' | null
  cumulative_base_miles_by_month: number[]
  cumulative_route_cost_aed_by_month: number[]
}

export interface StrategyDefinition {
  strategy_id: StrategyId
  strategy_name: string
  original_target_miles: number
  associated_cash_aed: number
}

export interface CardStrategyTargetOptions {
  strategy_id: StrategyId
  original_target_miles: number
  voucher_event_ids: string[]
}

export interface EventDisplay {
  event_id: string
  source_ref: string
  mechanic: string
  title: string | null
  conditions: string | null
  additional_info: string | null
  expiry: string | null
  source_currency: string | null
  conversion_denominator: number | null
  eligible_declared_monthly_spend_aed: number | null
  extra_spend_in_period_aed: number | null
  extra_monthly_spend_aed: number | null
}

export interface CardInteractionModel {
  earnn_card_id: string
  card_name: string
  bank_code: string
  bank_name: string
  annual_fee_year1_aed?: number
  annual_fee_year1_free?: boolean
  annual_fee_from_year2_aed: number
  free_for_life?: boolean
  base_trajectories: BaseFeeTrajectory[]
  conditional_events: ConditionalRewardEvent[]
  strategy_targets: CardStrategyTargetOptions[]
}

export interface InteractionCatalog {
  horizon_months: 36
  target_reward_currency: 'skywards_miles' | 'etihad_guest_miles'
  current_usable_miles: number
  toggle_defaults: ToggleState
  strategies: StrategyDefinition[]
  cards: CardInteractionModel[]
  event_display_catalog: Record<string, EventDisplay>
}

export interface EventUnlock { event_id: string; unlock_months: number[] }

export interface ReachedCandidate {
  default_rank: number | null
  earnn_card_id: string
  fee_route: FeeRoute
  months_to_goal: number
  selected_trajectory_id: string
  target_at_goal_miles: number
  original_target_miles: number
  active_event_ids: string[]
  event_unlocks: EventUnlock[]
  total_miles_at_goal: number
  fee_cost_at_goal_aed: number
  associated_cash_aed: number
  annual_fee_from_year2_aed: number
}

export interface ConditionalCandidate {
  default_rank: null
  earnn_card_id: string
  fee_route: FeeRoute
  default_months_to_goal: null
  alternative_months_to_goal: number
  selected_trajectory_id: string
  original_target_miles: number
  target_at_goal_miles: number
  required_event_overrides: Record<string, boolean>
  active_event_ids: string[]
  event_unlocks: EventUnlock[]
  total_miles_at_goal: number
  fee_cost_at_goal_aed: number
  associated_cash_aed: number
  annual_fee_from_year2_aed: number
}

export interface StrategyResolvedResult {
  strategy_id: StrategyId
  best_default_candidate: ReachedCandidate | null
  default_ranked_candidates: ReachedCandidate[]
  conditionally_reachable_candidates: ConditionalCandidate[]
}

export interface ResolvedMilesGoalView { strategies: StrategyResolvedResult[] }

export interface MilesGoalSimulationResponse {
  calculation_version: 'miles_goal_v3'
  resolution_contract_version: 'conditional_event_v1'
  route: { miles_goal_id: string; origin: string; destination: string; airline: Airline }
  assumptions: {
    horizon_months: 36
    new_to_bank_default: boolean
    balance_transfer_default: boolean
    feasibility_spend_buffer_pct: 20
    base_accrual_uses_declared_spend_only: true
  }
  interaction_catalog: InteractionCatalog
  resolved_view: ResolvedMilesGoalView
  exclusions: { details: { scope: string; code: string; source_ref: string | null; earnn_card_id: string | null; message: string }[] }
}

export function isMilesGoalResponse(value: unknown): value is MilesGoalSimulationResponse {
  if (!value || typeof value !== 'object') return false
  const response = value as Partial<MilesGoalSimulationResponse>
  return response.calculation_version === 'miles_goal_v3'
    && response.resolution_contract_version === 'conditional_event_v1'
    && !!response.interaction_catalog
    && Array.isArray(response.interaction_catalog.cards)
    && Array.isArray(response.resolved_view?.strategies)
}

export interface PersonalizedProfile {
  salary_aed: number
  spend: SpendProfile
  airline_preference: 'none' | Airline
  skywards_miles: number
  etihad_guest_miles: number
  merchant_prefs?: Record<string, string[]>
}
