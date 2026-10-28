// What the trip page needs beyond the first answer: the Customize engine's result for the trip's region (the calculation view) and,
// from the same result, the other cards that reach the same trip ("Want another option?").
// The results page only hands the other cards over when the trip came from its own dropdowns. For the example trip and the tiles under
// it, this works them out the same way: the Customize engine for the trip's region, then the same ranking and the same traveller count.
import { simulateTripCustomize, type TripItem, type TripPlannerRequest } from '@/lib/trip-planner/api'
import type { Airline, MilesGoalSimulationResponse, StrategyId } from '@/lib/miles-goal/contracts'
import { rankedCandidates } from '@/lib/miles-goal/merge-airlines'
import { getMilesRegion, supportedMilesAirlines } from '@/lib/miles-goal/regions'
import { resolveCatalog, withTravellerTarget } from '@/lib/miles-goal/resolver'
import type { TripAlternative } from '@/lib/trip-planner/session'

export const CABIN_STRATEGY: Record<TripItem['cabin'], StrategyId> = { economy: 'easiest', business: 'dream', upgrade: 'smartest' }

export type TripResponses = Partial<Record<Airline, MilesGoalSimulationResponse>>

/** The Customize engine's answer for the trip's region, one airline after the other (the engine shares one database client). */
export async function loadTripResponses(trip: TripItem, request: TripPlannerRequest, existingOnly: boolean, signal?: AbortSignal): Promise<TripResponses> {
  const region = trip.region_keys.map(key => getMilesRegion(key)).find(Boolean)
  if (!region) return {}
  const responses: TripResponses = {}
  for (const airline of supportedMilesAirlines(region)) {
    responses[airline] = await simulateTripCustomize({ ...request, destination_region: region.id, airline, use_existing_only: existingOnly }, { signal })
  }
  return responses
}

/** Every airline's answer with the trip's traveller count and the given assumptions applied. */
export function resolveTripResponses(responses: TripResponses, travellers: number, toggles: Partial<Record<Airline, MilesGoalSimulationResponse['interaction_catalog']['toggle_defaults']>> = {}): TripResponses {
  const resolved: TripResponses = {}
  for (const [airline, response] of Object.entries(responses) as [Airline, MilesGoalSimulationResponse][]) {
    const catalog = withTravellerTarget(response.interaction_catalog, travellers, 1)
    resolved[airline] = { ...response, interaction_catalog: catalog, resolved_view: resolveCatalog(catalog, toggles[airline] ?? catalog.toggle_defaults) }
  }
  return resolved
}

export function tripAlternatives(responses: TripResponses, trip: TripItem): TripAlternative[] {
  const resolved = resolveTripResponses(responses, trip.travellers)
  const airlines = Object.keys(resolved) as Airline[]
  const scope = airlines.length === 1 ? airlines[0] : 'best'
  const alternatives: TripAlternative[] = []
  const seen = new Set<string>()
  for (const candidate of rankedCandidates(resolved, scope, CABIN_STRATEGY[trip.cabin])) {
    const key = `${candidate.earnn_card_id}|${candidate.airline}`
    const info = resolved[candidate.airline]?.interaction_catalog.cards.find(item => item.earnn_card_id === candidate.earnn_card_id)
    if (seen.has(key) || !info || alternatives.length >= 24) continue
    seen.add(key)
    alternatives.push({
      earnn_card_id: info.earnn_card_id, card_name: info.card_name, bank_code: info.bank_code, bank_name: info.bank_name,
      airline: candidate.airline, months: candidate.months_to_goal, miles_needed: candidate.original_target_miles,
      annual_fee_aed: candidate.annual_fee_from_year2_aed,
    })
  }
  return alternatives
}
