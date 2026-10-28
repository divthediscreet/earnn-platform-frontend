'use client'

// "View 2" of Show me how: the calculation exactly as the Miles Goal result shows it inside a card: which bonuses you can unlock
// (switch any off and the timeline updates), "Here's how you reach your goal" (existing miles + spend miles + bonuses = total, with the
// target bar) and the cash required to take the flight. It is the Miles Goal's own component, fed with this trip's card and airline.
import { useMemo, useState } from 'react'
import type { Airline, ToggleState } from '@/lib/miles-goal/contracts'
import { buildDisplayCards } from '@/lib/miles-goal/selectors'
import type { TripItem, TripPlannerRequest } from '@/lib/trip-planner/api'
import { CABIN_STRATEGY, resolveTripResponses, type TripResponses } from '@/lib/trip-planner/alternatives'
import MilesCardDetails from '@/components/miles-goal/MilesCardDetails'
import styles from './TripCalculation.module.css'

export default function TripCalculation({ trip, request, responses, loading, failed }: {
  trip: TripItem, request: TripPlannerRequest, responses: TripResponses | null, loading: boolean, failed: boolean
}) {
  const [toggles, setToggles] = useState<Partial<Record<Airline, ToggleState>>>({})
  const strategy = CABIN_STRATEGY[trip.cabin]
  const monthlySpend = Object.values(request.regular_spend).reduce((sum, value) => sum + value, 0)
  const cardId = trip.top_card?.earnn_card_id

  const card = useMemo(() => {
    if (!responses || !cardId) return null
    const resolved = resolveTripResponses(responses, trip.travellers, toggles)
    const cards = buildDisplayCards(resolved, trip.airline, strategy)
    const found = cards.find(item => item.earnn_card_id === cardId) ?? null
    return found ? { card: found, resolved } : null
  }, [responses, cardId, trip.airline, trip.travellers, strategy, toggles])

  if (loading) return <p className={styles.status} role="status"><i className="ti ti-loader-2" /> Working out the calculation for this card…</p>
  if (failed || !card) return <p className={styles.status} role="status"><i className="ti ti-info-circle" /> The calculation view is not available for this trip yet. The plan view shows how the miles add up.</p>
  return <div className={styles.wrap}>
    <MilesCardDetails card={card.card} focused={strategy} responses={card.resolved} toggles={toggles}
      onToggleChange={(airline, state) => setToggles(current => ({ ...current, [airline]: state }))} monthlySpend={monthlySpend} />
  </div>
}
