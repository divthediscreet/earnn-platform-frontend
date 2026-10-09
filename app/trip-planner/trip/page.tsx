'use client'

// One opened trip, on its own page: the destination, the card that gets there, and how the miles are earned.
// The results page hands the trip over through sessionStorage and keeps its own answer, so going back loses nothing.
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TripDetail } from '@/components/trip-planner/TripShowcase'
import { readExistingOnly, readSelectedTrip, readTripRequest } from '@/lib/trip-planner/session'
import type { TripItem, TripPlannerRequest } from '@/lib/trip-planner/api'

export default function TripDetailPage() {
  const router = useRouter()
  const [state, setState] = useState<{ trip: TripItem, request: TripPlannerRequest, existingOnly: boolean } | null>(null)

  useEffect(() => {
    const trip = readSelectedTrip()
    const request = readTripRequest()
    if (!trip || !request) {
      router.replace('/trip-planner/results')
      return
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ trip, request, existingOnly: readExistingOnly() })
  }, [router])

  const back = () => (window.history.length > 1 ? router.back() : router.push('/trip-planner/results'))
  if (!state) return null
  return <TripDetail trip={state.trip} request={state.request} existingOnly={state.existingOnly} onBack={back} />
}
