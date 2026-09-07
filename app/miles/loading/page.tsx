'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'
import MilesLoadingState from '@/components/miles-goal/MilesLoadingState'
import { simulateMilesGoal } from '@/lib/miles-goal/api'
import { DEFAULT_TOGGLE_STATE } from '@/lib/miles-goal/contracts'
import type { Airline, MilesGoalSimulationResponse, PersonalizedProfile, ToggleState } from '@/lib/miles-goal/contracts'
import { getMilesRegion } from '@/lib/miles-goal/regions'
import { writeMilesGoalSession } from '@/lib/miles-goal/storage'
import { emptySpendProfile } from '@/lib/spend-categories'
import styles from './MilesLoadingPage.module.css'

const AIRLINES: Airline[] = ['emirates', 'etihad']

function starterProfile(): PersonalizedProfile {
  return {
    salary_aed: 30000,
    spend: { ...emptySpendProfile(), miscellaneous: 10000 },
    airline_preference: 'none',
    skywards_miles: 0,
    etihad_guest_miles: 0,
    merchant_prefs: {},
  }
}

function cloneDefaultToggle(response: MilesGoalSimulationResponse): ToggleState {
  const value = response.interaction_catalog.toggle_defaults
  return {
    ...DEFAULT_TOGGLE_STATE,
    ...value,
    new_to_bank_by_bank: { ...value.new_to_bank_by_bank },
    new_to_bank_by_card: { ...value.new_to_bank_by_card },
    event_overrides: { ...value.event_overrides },
  }
}

function MilesPlanLoadingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const region = getMilesRegion(searchParams.get('region'))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!region) return
    const controller = new AbortController()
    const profile = starterProfile()

    void Promise.allSettled(AIRLINES.map(airline => simulateMilesGoal({
      destination_region: region.id,
      airline,
      salary_aed: profile.salary_aed,
      spend: profile.spend,
      current_usable_miles: airline === 'emirates' ? profile.skywards_miles : profile.etihad_guest_miles,
      merchant_prefs: profile.merchant_prefs,
    }, { signal: controller.signal }))).then(results => {
      if (controller.signal.aborted) return
      const responses: Partial<Record<Airline, MilesGoalSimulationResponse>> = {}
      const toggles: Partial<Record<Airline, ToggleState>> = {}
      results.forEach((result, index) => {
        if (result.status !== 'fulfilled') return
        const airline = AIRLINES[index]
        responses[airline] = result.value
        toggles[airline] = cloneDefaultToggle(result.value)
      })

      if (!Object.keys(responses).length) {
        setError('We could not calculate this flight plan right now. Please try again.')
        return
      }

      writeMilesGoalSession({
        version: 2,
        region_id: region.id,
        mode: 'personalized',
        airline_scope: Object.keys(responses).length === 1 ? Object.keys(responses)[0] as Airline : 'best',
        focused_strategy: 'dream',
        profile,
        responses,
        toggles,
        saved_at: Date.now(),
        expires_at: Date.now() + 30 * 60 * 1000,
      })
      router.replace(`/miles/results?region=${encodeURIComponent(region.id)}`)
    })

    return () => controller.abort()
  }, [region, router])

  if (!region) return <main className={styles.page}><div className={styles.error}><h1>Choose a supported destination</h1><Link className="btn-primary" href="/miles">View destinations</Link></div></main>
  if (error) return <main className={styles.page}><div className={styles.error}><i className="ti ti-alert-triangle" /><h1>We need another moment</h1><p>{error}</p><button className="btn-primary" onClick={() => window.location.reload()}>Try again</button><Link href="/miles">Choose another destination</Link></div></main>

  return <main className={styles.page}><MilesLoadingState destination={region.label} /></main>
}

export default function MilesPlanLoadingPage() {
  return <Suspense fallback={<main className={styles.page}><MilesLoadingState destination="your destination" /></main>}><MilesPlanLoadingContent /></Suspense>
}
