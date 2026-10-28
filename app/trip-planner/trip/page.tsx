'use client'

// One opened trip, on its own page: the destination, the card that gets there, and how the miles are earned.
// The results page hands the trip over through sessionStorage and keeps its own answer, so going back loses nothing.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TripDetail } from '@/components/trip-planner/TripShowcase'
import { readExistingOnly, readSelectedTrip, readTripAlternatives, readTripRequest, saveSelectedTrip, saveTripAlternatives, type TripAlternative } from '@/lib/trip-planner/session'
import { loadTripResponses, tripAlternatives, type TripResponses } from '@/lib/trip-planner/alternatives'
import TripCalculation from '@/components/trip-planner/TripCalculation'
import type { TripItem, TripPlannerRequest } from '@/lib/trip-planner/api'

export default function TripDetailPage() {
  const router = useRouter()
  const [state, setState] = useState<{ trip: TripItem, request: TripPlannerRequest, existingOnly: boolean, alternatives: TripAlternative[] } | null>(null)

  useEffect(() => {
    const trip = readSelectedTrip()
    const request = readTripRequest()
    if (!trip || !request) {
      router.replace('/trip-planner/results')
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ trip, request, existingOnly: readExistingOnly(), alternatives: readTripAlternatives() })
  }, [router])

  // The Customize engine's answer for this trip's region: it feeds the calculation view and, for the example trip and the tiles under it
  // (which arrive without other cards), the "Want another option?" row, so every trip page ends the same way.
  const [responses, setResponses] = useState<TripResponses | null>(null)
  const [calcState, setCalcState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const regionKey = state ? `${state.trip.region_keys.join(',')}|${state.existingOnly}` : ''
  useEffect(() => {
    if (!state) return
    const controller = new AbortController()
    loadTripResponses(state.trip, state.request, state.existingOnly, controller.signal)
      .then(found => {
        if (controller.signal.aborted) return
        if (!Object.keys(found).length) return setCalcState('failed')
        setResponses(found)
        setCalcState('ready')
        setState(current => {
          if (!current || current.alternatives.length) return current
          const list = tripAlternatives(found, current.trip)
          if (list.length) saveTripAlternatives(list)
          return list.length ? { ...current, alternatives: list } : current
        })
      })
      .catch(() => { if (!controller.signal.aborted) setCalcState('failed') })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [regionKey])

  const back = () => (window.history.length > 1 ? router.back() : router.push('/trip-planner/results'))
  if (!state) return null
  // "See this plan" on another card: the same trip, reached with that card (and its airline), shown in the same page.
  const pick = (alternative: TripAlternative) => {
    const trip: TripItem = {
      ...state.trip,
      airline: alternative.airline,
      months: alternative.months,
      ready_now: alternative.months <= 0,
      miles_needed: alternative.miles_needed,
      top_card: { earnn_card_id: alternative.earnn_card_id, card_name: alternative.card_name, bank_code: alternative.bank_code, bank_name: alternative.bank_name, miles_when_reached: alternative.miles_needed },
      how: null,
    }
    saveSelectedTrip(trip)
    setState({ ...state, trip })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return <TripDetail key={`${state.trip.top_card?.earnn_card_id}-${state.trip.airline}`} trip={state.trip} request={state.request} existingOnly={state.existingOnly} onBack={back} alternatives={state.alternatives} onPick={pick}
    calculation={<TripCalculation trip={state.trip} request={state.request} responses={responses} loading={calcState === 'loading'} failed={calcState === 'failed'} />} />
}
