// Trip Planner API client (spec v4 §7). Calls go through the Next.js proxy: relative URLs only.
import type { BulkPaymentSchedule, BulkSpendMilesCard, ProjectionMonth } from '@/lib/bulk-spend-miles/api'
import type { Airline as MilesAirline, MilesGoalSimulationResponse, ToggleState } from '@/lib/miles-goal/contracts'
import { isMilesGoalResponse } from '@/lib/miles-goal/contracts'
import { MilesGoalApiError } from '@/lib/miles-goal/api'

const API_BASE = ''

export type Airline = 'emirates' | 'etihad'
export type Cabin = 'economy' | 'business' | 'upgrade'
export type Party = 'single' | 'couple' | 'family4'

export interface TripPlannerRequest {
  salary_aed: number
  regular_spend: Record<string, number>
  scheduled_payments: BulkPaymentSchedule[]
  /** null = step skipped, [] = holds no card, list = bank codes held. */
  banks_held: string[] | null
  skywards_balance: number
  etihad_balance: number
  existing_card_ids: string[]
}

export interface TopCard {
  earnn_card_id: string
  card_name: string
  bank_code: string
  bank_name: string
  miles_when_reached: number
}

/** How the one card reaches the trip: what it earns, month by month, up to the month the trip is reached. */
export interface TripHow {
  miles_needed: number
  month_reached: number
  /** Miles at the end of month 1..month_reached, including any starting balance. */
  cumulative_miles: number[]
  starting_balance: number
  spend_miles: number
  welcome_miles: number
  welcome_month: number | null
  recurring_bonus_miles: number
  annual_bonus_miles: number
}

export interface TripItem {
  trip_id: string
  hook: string
  destination_names: string[]
  cabin: Cabin
  party: Party
  travellers: number
  miles_needed: number
  /** Approximate months until the top card reaches the miles; 0 means ready now. */
  months: number
  ready_now: boolean
  /** 'stretch' = reachable in months 13-24 and clearly better; shown last as "Worth the wait". */
  slot: 'normal' | 'stretch'
  /** The highest-Priority normal trip; never the stretch trip. */
  is_hero: boolean
  /** Total of the five scores that ranked this trip. */
  score: number
  /** Detail view only: the first view never shows the airline. */
  airline: Airline
  top_card: TopCard | null
  /** The one card's plan ("Show me how"); null when the user's balance already covers the trip. */
  how: TripHow | null
  region_keys: string[]
}

export interface TripView {
  trips: TripItem[]
  best_miles: Record<string, Record<string, number>>
  empty_reason: string | null
}

export interface NonMilesCard {
  earnn_card_id: string
  card_name: string
  reward_program_type: string
}

export interface TripPlannerResponse {
  calculation_version: 'trip_planner_v1'
  new_cards: TripView
  existing_cards: TripView | null
  ignored_non_miles_cards: NonMilesCard[]
  assumptions: Record<string, unknown>
  data_warnings: string[]
}

export interface BankOption { bank_code: string; bank_name: string }
export interface BankCard { earnn_card_id: string; card_name: string; is_miles_card: boolean; reward_program_type: string }

async function send<T>(path: string, fallback: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init)
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload && typeof payload === 'object' ? (payload as { detail?: { message?: string } }).detail : null
    throw new Error(detail?.message || fallback)
  }
  return payload as T
}

export const planTrips = (request: TripPlannerRequest) => send<TripPlannerResponse>(
  '/api/trip-planner/trips', 'We could not work out your trips right now.',
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) },
)

export const getBanks = () => send<{ banks: BankOption[] }>('/api/trip-planner/banks', 'We could not load the banks right now.')

export const getBankCards = (bankCode: string) => send<{ bank_code: string; cards: BankCard[] }>(
  `/api/trip-planner/banks/${encodeURIComponent(bankCode)}/cards`, 'We could not load that bank’s cards right now.',
)

/** "Show me how": one card's Bulk Spend plan for one airline (same card shape the Max Miles result uses). */
export interface TripPlanRequest extends TripPlannerRequest {
  earnn_card_id: string
  airline: Airline
  /** false for a bank the user already holds and for the "only my existing cards" view. */
  include_welcome: boolean
}

export interface TripPlanResponse {
  card: BulkSpendMilesCard
  monthly_projection: ProjectionMonth[]
  topic_labels: Record<string, string>
  include_welcome: boolean
  assumption: string
}

export const getTripPlan = (request: TripPlanRequest, signal?: AbortSignal) => send<TripPlanResponse>(
  '/api/trip-planner/plan', 'We could not load the plan for this card right now.',
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal },
)

export interface TripCustomizeRequest extends TripPlannerRequest {
  destination_region: string
  airline: MilesAirline
  /** true = only the cards in existing_card_ids ("only my existing cards" view). */
  use_existing_only: boolean
  toggle_state?: ToggleState
}

/** Customize My Trip: the Miles Goal result (same contract the Miles Goal pages already consume), from the Trip Planner engine. */
export async function simulateTripCustomize(request: TripCustomizeRequest, options: { signal?: AbortSignal } = {}): Promise<MilesGoalSimulationResponse> {
  const response = await fetch(`${API_BASE}/api/trip-planner/customize`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: options.signal,
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
    const detail = body.detail && typeof body.detail === 'object' ? body.detail as Record<string, unknown> : body
    throw new MilesGoalApiError(typeof detail.message === 'string' ? detail.message : 'We could not calculate this trip right now.',
      response.status, typeof detail.code === 'string' ? detail.code : 'trip_customize_failed')
  }
  if (!isMilesGoalResponse(payload)) throw new MilesGoalApiError('The trip response version is not supported.', 502, 'unsupported_contract_version')
  return payload
}
