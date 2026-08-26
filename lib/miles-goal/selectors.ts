import type { Airline, AirlineScope, CardInteractionModel, MilesGoalSimulationResponse, StrategyId } from './contracts'
import { rankedCandidates, responsesForScope, type AirlineCandidate } from './merge-airlines'

export const STRATEGY_IDS: StrategyId[] = ['easiest', 'dream', 'smartest']

export interface MilesDisplayCard {
  earnn_card_id: string
  card_name: string
  bank_name: string
  bank_code: string
  focused_rank: number
  strategy: Record<StrategyId, AirlineCandidate | null>
  routeCandidates: Record<StrategyId, AirlineCandidate[]>
  catalogs: Partial<Record<Airline, CardInteractionModel>>
}

export function buildDisplayCards(
  responses: Partial<Record<Airline, MilesGoalSimulationResponse>>,
  scope: AirlineScope,
  focused: StrategyId,
): MilesDisplayCard[] {
  const focusedCandidates = rankedCandidates(responses, scope, focused)
  const orderedIds = [...new Set(focusedCandidates.map(candidate => candidate.earnn_card_id))]
  return orderedIds.map((cardId, index) => {
    const catalogs: Partial<Record<Airline, CardInteractionModel>> = {}
    for (const [airline, response] of responsesForScope(responses, scope)) {
      const card = response.interaction_catalog.cards.find(item => item.earnn_card_id === cardId)
      if (card) catalogs[airline] = card
    }
    const identity = Object.values(catalogs)[0]!
    const strategy = Object.fromEntries(STRATEGY_IDS.map(strategyId => {
      const candidate = rankedCandidates(responses, scope, strategyId).find(item => item.earnn_card_id === cardId) ?? null
      return [strategyId, candidate]
    })) as Record<StrategyId, AirlineCandidate | null>
    const routeCandidates = Object.fromEntries(STRATEGY_IDS.map(strategyId => [
      strategyId,
      rankedCandidates(responses, scope, strategyId).filter(item => item.earnn_card_id === cardId),
    ])) as Record<StrategyId, AirlineCandidate[]>
    return {
      earnn_card_id: cardId,
      card_name: identity.card_name,
      bank_name: identity.bank_name,
      bank_code: identity.bank_code,
      focused_rank: index + 1,
      strategy,
      routeCandidates,
      catalogs,
    }
  })
}

export interface ConditionalDisplayCard {
  earnn_card_id: string
  card_name: string
  bank_name: string
  airline: Airline
  months: number
  requiredOverrides: Record<string, boolean>
}

export function conditionalCards(
  responses: Partial<Record<Airline, MilesGoalSimulationResponse>>,
  scope: AirlineScope,
  focused: StrategyId,
): ConditionalDisplayCard[] {
  const rows = responsesForScope(responses, scope).flatMap(([airline, response]) => {
    const result = response.resolved_view.strategies.find(item => item.strategy_id === focused)
    return (result?.conditionally_reachable_candidates ?? []).map(candidate => {
      const card = response.interaction_catalog.cards.find(item => item.earnn_card_id === candidate.earnn_card_id)
      return card ? {
        earnn_card_id: card.earnn_card_id, card_name: card.card_name, bank_name: card.bank_name,
        airline, months: candidate.alternative_months_to_goal,
        requiredOverrides: candidate.required_event_overrides,
      } : null
    }).filter((item): item is ConditionalDisplayCard => item !== null)
  })
  const best = new Map<string, ConditionalDisplayCard>()
  for (const row of rows) {
    const current = best.get(row.earnn_card_id)
    if (!current || row.months < current.months) best.set(row.earnn_card_id, row)
  }
  return [...best.values()].sort((a, b) => a.months - b.months || a.earnn_card_id.localeCompare(b.earnn_card_id))
}
