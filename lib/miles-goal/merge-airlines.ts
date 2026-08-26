import type { Airline, AirlineScope, MilesGoalSimulationResponse, ReachedCandidate, StrategyId } from './contracts'

export interface AirlineCandidate extends ReachedCandidate { airline: Airline }

export function responsesForScope(
  responses: Partial<Record<Airline, MilesGoalSimulationResponse>>,
  scope: AirlineScope,
): [Airline, MilesGoalSimulationResponse][] {
  return (Object.entries(responses) as [Airline, MilesGoalSimulationResponse][])
    .filter(([airline]) => scope === 'best' || scope === airline)
}

export function rankedCandidates(
  responses: Partial<Record<Airline, MilesGoalSimulationResponse>>,
  scope: AirlineScope,
  strategyId: StrategyId,
): AirlineCandidate[] {
  return responsesForScope(responses, scope)
    .flatMap(([airline, response]) => {
      const strategy = response.resolved_view.strategies.find(item => item.strategy_id === strategyId)
      return (strategy?.default_ranked_candidates ?? []).map(candidate => ({ ...candidate, airline }))
    })
    .sort((a, b) => a.months_to_goal - b.months_to_goal || a.annual_fee_from_year2_aed - b.annual_fee_from_year2_aed || a.earnn_card_id.localeCompare(b.earnn_card_id))
}

export function bestCandidateForCard(
  responses: Partial<Record<Airline, MilesGoalSimulationResponse>>,
  scope: AirlineScope,
  strategyId: StrategyId,
  cardId: string,
): AirlineCandidate | null {
  return rankedCandidates(responses, scope, strategyId).find(candidate => candidate.earnn_card_id === cardId) ?? null
}
