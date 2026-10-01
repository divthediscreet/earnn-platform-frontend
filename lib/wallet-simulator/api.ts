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
}

export type Wallet = {
  cards: string[]
  monthly_reward_aed: number
  annual_reward_aed: number
  per_card: CardInWallet[]
  allocation: AllocationLine[]
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

export type RecommendResponse = {
  spend: SpendSummary
  recommendation: {
    wallet: Wallet
    size: number
    increments_annual_aed: Record<string, number>
    min_increment_annual_aed: number
  }
  alternatives: Wallet[]
  best_by_size: Record<string, BestOfSize>
  discovery_blocks: DiscoveryBlock[]
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
  spend: SpendSummary
  wallet: Wallet
  meta: { elapsed_ms: number }
}

export type SimulatorRequest = {
  form_spend: Record<string, number>
  salary_aed?: number
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

export type SimulatorCard = { card_id: string; card_name: string; bank_name: string | null }

/** Every card the simulator can evaluate, from the backend's cached rules (sorted by bank, then name). */
export async function listSimulatorCards(signal?: AbortSignal): Promise<SimulatorCard[]> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}/api/simulator/cards`, { signal })
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

const noopSubscribe = () => () => {}
const readRaw = () => { try { return sessionStorage.getItem(SIMULATOR_SESSION_KEY) } catch { return null } }

/** The saved session: undefined during server render/hydration, then the session or null. */
export function useSimulatorSession(): SimulatorSession | null | undefined {
  const raw = useSyncExternalStore(noopSubscribe, readRaw, () => undefined)
  return useMemo(() => {
    if (raw === undefined) return undefined
    try { return raw ? (JSON.parse(raw) as SimulatorSession) : null } catch { return null }
  }, [raw])
}

export function loadSession(): SimulatorSession | null {
  try {
    const raw = sessionStorage.getItem(SIMULATOR_SESSION_KEY)
    return raw ? (JSON.parse(raw) as SimulatorSession) : null
  } catch {
    return null
  }
}
