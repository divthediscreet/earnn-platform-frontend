// lib/wallet-simulator/api.ts — Wallet Reward Simulator (Phase C API) client.
// Types mirror Backend/core/wallet_simulator/schemas.py. The backend is the source of truth for every
// reward number; nothing here calculates rewards.

import { useMemo, useSyncExternalStore } from 'react'

const API_BASE = '' // relative: proxied to the backend by next.config.ts rewrites

export type SpendGroup = { group: string; label: string; monthly_spend_aed: number }

export type SpendSummary = {
  eligible_spend_aed: number
  excluded_spend_aed: number
  groups: SpendGroup[]
}

/** The numbers behind a card's expected annual fee (shown in the "how is this calculated" popup). */
export type FeeDetail = {
  free_for_life: boolean
  first_year_fee_aed: number | null // only when it differs from the year-2 fee
  year2_fee_aed: number
  waiver_threshold_aed: number | null // annual spend that waives the fee; null = no spend waiver
  annual_spend_aed: number
  waiver_applied: boolean // fee counted as fully waived
  spend_gap_aed: number // yearly spend still needed to reach the waiver target (0 = met)
  fee_benefit_aed: number
  expected_fee_aed: number
}

export type CardInWallet = {
  card_id: string
  card_name: string
  bank_name: string | null
  routed_spend_aed: number
  monthly_reward_aed: number
  annual_reward_aed: number
  contribution_annual_aed: number // wallet reward lost if this card is removed
  band: string
  band_min_spend_aed: number
  caps_hit: string[]
  card_cap_hit: boolean
  salary_eligible: boolean | null
  annual_fee_aed: number // true annual fee (waivers and fee benefits applied), as in Analyse
  fee_detail?: FeeDetail | null
}

export type AllocationLine = {
  line_id: string
  label: string
  group: string | null
  card_id: string
  amount_aed: number
  rate: number
  bonus_spend_aed: number
  post_cap_spend_aed: number
  monthly_reward_aed: number
  payment_condition_and_other_restrictions: string | null
  merchant_list: string | null
}

export type Wallet = {
  cards: string[]
  monthly_reward_aed: number
  annual_reward_aed: number
  total_fee_aed: number        // sum of the cards' true annual fees
  net_annual_value_aed: number // annual rewards - fees
  per_card: CardInWallet[]
  allocation: AllocationLine[]
}

/** One of the three hero strategies, chosen as in the Analyse flow (net of fees). */
export type Strategy = {
  key: 'recommended' | 'second' | 'third'
  title: string
  message: string | null
  n_cards: number
  annual_reward_aed: number
  total_fee_aed: number
  net_annual_value_aed: number
  wallet: Wallet
}

export type BestOfSize = { cards: string[]; annual_reward_aed: number }

export type BlockCard = {
  card_id: string
  card_name: string
  bank_name: string | null
  annual_reward_aed: number
  min_card_spend_aed: number | null
}

export type DiscoveryBlock = {
  kind: 'category' | 'all_rounder'
  group: string | null
  label: string
  monthly_spend_aed: number
  potential_annual_aed: number
  cards: BlockCard[]
}

export type CardScore = {
  card_id: string
  card_name: string
  bank_name: string | null
  card_family: string | null
  summary_tag: string | null
  annual_reward_aed: number // this card alone, on the whole profile
  annual_fee_aed: number    // fee from year 2
  groups: Record<string, { monthly_reward_aed: number; rate: number }> // rate = published (raw) rate
}

export type RecommendResponse = {
  mode?: RewardMode
  spend: SpendSummary
  recommendation: {
    wallet: Wallet
    size: number
    increments_annual_aed: Record<string, number>
    min_increment_annual_aed: number
  }
  alternatives: Wallet[]
  best_by_size: Record<string, BestOfSize>
  top_by_size?: Record<string, Wallet[]> // best few wallets of each size (1-3 cards); absent on older backends/results
  discovery_blocks: DiscoveryBlock[]
  card_scores?: CardScore[] // absent in results saved before the customiser existed
  strategies?: Strategy[]   // absent in results saved before the strategies existed
  meta: {
    cards_considered: number
    candidates: number
    combinations_evaluated: number
    lp_solves: number
    engine_best_by_size: Record<string, BestOfSize>
    elapsed_ms: number
  }
}

export type EvaluateResponse = {
  mode?: RewardMode
  spend: SpendSummary
  wallet: Wallet
  meta: { elapsed_ms: number; switch_margin?: number }
}

/** The view: AED cashback (default) or miles. In the miles view every `*_aed` reward figure from the
 *  backend is in miles; fees (`annual_fee_aed`, `total_fee_aed`) stay in AED. */
export type RewardMode = 'cashback' | 'miles'

/** One `/api/statements/upload` spend_summary row (a statement's spend grouped by granular category). */
export type StatementSpendRow = { earnn_category_granular_code: string | null; total_spend_aed: number }

/** Exactly one of `form_spend` (manual form) or `spend_summary` (parsed statement) is set. */
export type SimulatorRequest = {
  form_spend?: Record<string, number>
  spend_summary?: StatementSpendRow[]
  salary_aed?: number
  reward_mode?: RewardMode
}

export class SimulatorApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new SimulatorApiError(0, "We couldn't reach Earnn. Check your connection and try again.")
  }
  if (!res.ok) {
    let message = 'Something went wrong on our side. Please try again.'
    if (res.status === 503) message = 'Card data is briefly unavailable. Please try again in a moment.'
    try {
      const data = await res.json()
      const detail = data?.detail
      if (res.status === 422 && detail?.message) message = detail.message
    } catch { /* keep the generic message */ }
    throw new SimulatorApiError(res.status, message)
  }
  return res.json() as Promise<T>
}

export function recommendWallet(request: SimulatorRequest, signal?: AbortSignal) {
  return post<RecommendResponse>('/api/simulator/recommend', request, signal)
}

export function evaluateWallet(request: SimulatorRequest, cardIds: string[], signal?: AbortSignal) {
  return post<EvaluateResponse>('/api/simulator/evaluate', { ...request, card_ids: cardIds }, signal)
}

/** The Simulate page's own wallet: up to 8 cards the user chose, calculated as given (no search for a better set).
 *  Smart Wallet keeps evaluateWallet (3 cards). */
export const MAX_SIMULATE_WALLET = 10

/** The card's monthly minimum-spend tiers against what the wallet routes to it. */
export type MinSpend = {
  status: 'none' | 'met' | 'not_reached' // none: the card has no tiers; met: its tier is reached; not_reached: a higher tier exists and is not reached
  tier_floor_aed: number
  next_min_spend_aed: number | null
  next_reachable: boolean | null // can the next tier be reached with the user's total spend
  next_effect_monthly_aed: number | null // wallet reward change if the card were pushed into that tier (<= 0: the optimiser took the better option)
}

export type LargeCardInWallet = CardInWallet & {
  role: 'active' | 'reserve'
  role_reason: 'carries_spend' | 'not_used' | 'left_out_for_simplicity' | 'no_rewards'
  min_spend: MinSpend
  conditional_on_minimum_aed: number // monthly reward that disappears if the card's minimum spend is not reached
  conditional_on_merchant_aed: number // monthly reward earned on spend with a merchant/channel condition (the engine approximates these)
  reward_currency?: string | null // the programme's own unit (miles view, valued in AED)
  aed_per_unit?: number | null // the AED value of one unit used for the optimisation
  native_monthly_reward?: number | null // the reward in the programme's own unit
}

export type CurrencyReward = { currency: string; aed_monthly: number; native_monthly: number; aed_per_unit: number | null; cards: string[] }

/** One step of a category: this card takes this much of the category. Ordered; `switch_after` says why to move to the next card. */
export type InstructionStep = {
  order: number
  position: 'only' | 'first' | 'next' | 'remaining'
  card_id: string
  amount_aed: number
  rate: number
  monthly_reward_aed: number
  bonus_spend_aed: number
  post_cap_spend_aed: number
  limit_reached: boolean
  switch_after: { reason: 'reward_limit' | 'share_used'; amount_aed: number } | null
  condition: string | null
  merchant_list: string | null
}

export type InstructionCategory = { group: string; label: string; monthly_spend_aed: number; monthly_reward_aed: number; steps: InstructionStep[] }

export type InstructionCard = {
  card_id: string
  role: 'active' | 'reserve'
  monthly_spend_aed: number
  monthly_reward_aed: number
  use_for: { group: string; amount_aed: number }[]
  minimum: {
    status: 'none' | 'met' | 'not_reached'
    required_aed: number | null
    routed_aed: number
    met: boolean
    shortfall_aed: number | null
    next_min_spend_aed: number | null
    next_reachable: boolean | null
    next_effect_monthly_aed: number | null
  }
  reward_cap: { limits_reached_on: string[]; card_cap_reached: boolean; spend_past_cap_aed: number }
  reward_conditional_on_minimum_aed: number
  reward_conditional_on_merchant_aed: number
}

export type Instructions = { categories: InstructionCategory[]; cards: InstructionCard[]; monthly_spend_aed: number; monthly_reward_aed: number }

export type Plan = {
  kind: 'maximum' | 'simpler'
  wallet: Wallet
  per_card: LargeCardInWallet[]
  active_cards: string[]
  reserve_cards: string[]
  instructions: Instructions
  rewards_by_currency?: CurrencyReward[]
  reward_vs_maximum_annual_aed: number
}

export type LadderStep = {
  size: number
  cards: string[]
  annual_reward_aed: number
  loss_vs_maximum_annual_aed: number
  loss_vs_maximum_pct: number
  exact: boolean
}

export type EvaluateLargeResponse = {
  mode: RewardMode
  spend: SpendSummary
  wallet: Wallet
  per_card: LargeCardInWallet[]
  active_cards: string[]
  reserve_cards: string[]
  instructions: Instructions
  rewards_by_currency?: CurrencyReward[]
  no_meaningful_rewards: boolean
  simpler_plan: Plan | null
  recommended_plan: 'simpler' | 'maximum' // the plan shown as the recommended strategy
  extra_effort: {
    cards: { card_id: string; adds_annual_aed: number }[] // the maximum plan's extra cards, each on its own added to the recommended strategy
    all_annual_aed: number // all of them together
    all_pct: number
    recommended_annual_aed: number
    maximum_annual_aed: number
    tolerance_annual_aed: number // the larger of AED 60 and 2% of the maximum plan's yearly rewards
    replaced_cards: string[] // recommended cards the maximum plan would stop using
  } | null
  ladder: LadderStep[]
  simple_tolerance_annual_aed: number
  valuation: { mode: 'native' | 'aed_equivalent'; unit: 'aed' | 'miles'; currencies: string[]; mixed_currencies: boolean; comparable: boolean; rates?: Record<string, { currency: string; aed_per_unit: number; source: 'data' | 'override' }> }
  meta: { elapsed_ms: number; switch_margin?: number }
}

/** The maximum-reward plan always. Cashback view maximises AED value; Miles view maximises converted miles (AED value / each card's stored ratio, every
 *  programme's mile counted as equal). Both are the engine's native views: no extra valuation is requested. */
export function evaluateLargeWallet(request: SimulatorRequest, cardIds: string[], signal?: AbortSignal) {
  return post<EvaluateLargeResponse>('/api/simulator/evaluate-large', { ...request, card_ids: cardIds, valuation: 'native' }, signal)
}

export type PlannedExpense = { label: string; group: string; amount_aed: number }

export type ExceptionalResponse = {
  normal: EvaluateLargeResponse
  exceptional: EvaluateLargeResponse
  changes: {
    become_active: string[]
    no_longer_needed: string[]
    still_reserve: string[]
    reward_normal_month_aed: number
    reward_exceptional_month_aed: number
    reward_if_normal_active_cards_only_aed: number
    extra_from_using_reserve_cards_aed: number
    planned_expense_routing: { label: string; card_id: string; amount_aed: number; rate: number; monthly_reward_aed: number }[]
  }
}

/** A normal month against the same month with planned expenses added (backend: /evaluate-exceptional). */
export function evaluateExceptionalMonth(request: SimulatorRequest, cardIds: string[], planned: PlannedExpense[], signal?: AbortSignal) {
  return post<ExceptionalResponse>('/api/simulator/evaluate-exceptional', { ...request, card_ids: cardIds, planned_expenses: planned, valuation: 'native' }, signal)
}

export type SimulatorCard = { card_id: string; card_name: string; bank_name: string | null; bank_code?: string | null }

/** Every card the simulator can evaluate, from the backend's cached rules (sorted by bank, then name). */
export async function listSimulatorCards(mode: RewardMode = 'cashback', signal?: AbortSignal): Promise<SimulatorCard[]> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/simulator/cards?mode=${mode}`, { signal })
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e
    throw new SimulatorApiError(0, "We couldn't reach Earnn. Check your connection and try again.")
  }
  if (!res.ok) throw new SimulatorApiError(res.status, 'The card list is briefly unavailable. Please try again.')
  return ((await res.json()) as { cards: SimulatorCard[] }).cards
}

/** Session handoff from the spend form to the result page (same pattern as Analyse → Results). */
export const SIMULATOR_SESSION_KEY = 'earnn_simulator'

export type SimulatorSession = { request: SimulatorRequest; result: RecommendResponse }

export function saveSession(session: SimulatorSession) {
  try { sessionStorage.setItem(SIMULATOR_SESSION_KEY, JSON.stringify(session)) } catch { /* storage full/blocked */ }
}

/** Sessions saved before the in-store grocery input was renamed `grocery` -> `grocery_store`. */
function migrate(session: SimulatorSession): SimulatorSession {
  const spend = session.request?.form_spend
  if (spend && 'grocery' in spend) {
    const { grocery, ...rest } = spend
    session.request.form_spend = { ...rest, grocery_store: (rest.grocery_store ?? 0) + grocery }
  }
  return session
}

const noopSubscribe = () => () => {}
const readRaw = () => { try { return sessionStorage.getItem(SIMULATOR_SESSION_KEY) } catch { return null } }

/** The saved session: undefined during server render/hydration, then the session or null. */
export function useSimulatorSession(): SimulatorSession | null | undefined {
  const raw = useSyncExternalStore(noopSubscribe, readRaw, () => undefined)
  return useMemo(() => {
    if (raw === undefined) return undefined
    try { return raw ? migrate(JSON.parse(raw) as SimulatorSession) : null } catch { return null }
  }, [raw])
}

export function loadSession(): SimulatorSession | null {
  try {
    const raw = sessionStorage.getItem(SIMULATOR_SESSION_KEY)
    return raw ? migrate(JSON.parse(raw) as SimulatorSession) : null
  } catch {
    return null
  }
}
