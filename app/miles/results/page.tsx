'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AirlineScopeSwitch from '@/components/miles-goal/AirlineScopeSwitch'
import MilesCardTile from '@/components/miles-goal/MilesCardTile'
import MilesCustomizeDrawer from '@/components/miles-goal/MilesCustomizeDrawer'
import MilesDisclosure from '@/components/miles-goal/MilesDisclosure'
import MilesLoadingState from '@/components/miles-goal/MilesLoadingState'
import StrategyFocusTabs from '@/components/miles-goal/StrategyFocusTabs'
import { simulateMilesGoal } from '@/lib/miles-goal/api'
import type {
  Airline, AirlineScope, MilesGoalSimulationResponse, PersonalizedProfile,
  StrategyId, ToggleState,
} from '@/lib/miles-goal/contracts'
import { DEFAULT_TOGGLE_STATE } from '@/lib/miles-goal/contracts'
import { airlineLabel, formatAed } from '@/lib/miles-goal/format'
import { getMilesRegion } from '@/lib/miles-goal/regions'
import { resolveCatalog } from '@/lib/miles-goal/resolver'
import { buildDisplayCards } from '@/lib/miles-goal/selectors'
import { clearMilesGoalSession, readMilesGoalSession, writeMilesGoalSession } from '@/lib/miles-goal/storage'
import styles from './MilesResults.module.css'

const AIRLINES: Airline[] = ['emirates', 'etihad']

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

function MilesResultsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const region = getMilesRegion(searchParams.get('region'))
  const [profile, setProfile] = useState<PersonalizedProfile | null>(null)
  const [responses, setResponses] = useState<Partial<Record<Airline, MilesGoalSimulationResponse>>>({})
  const [toggles, setToggles] = useState<Partial<Record<Airline, ToggleState>>>({})
  const [airlineScope, setAirlineScope] = useState<AirlineScope>('best')
  const [focused, setFocused] = useState<StrategyId>('dream')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingAirlines, setLoadingAirlines] = useState<Airline[]>([])
  const [errors, setErrors] = useState<Partial<Record<Airline, string>>>({})
  const [announcement, setAnnouncement] = useState('')
  const requestIdRef = useRef(0)
  const controllersRef = useRef<AbortController[]>([])
  const initializedRef = useRef(false)

  useEffect(() => {
    if (!region || initializedRef.current) return
    initializedRef.current = true
    const stored = readMilesGoalSession()
    const frame = requestAnimationFrame(() => {
      if (stored?.region_id === region.id && stored.profile && Object.keys(stored.responses).length) {
        setProfile(stored.profile)
        setResponses(stored.responses)
        setToggles(stored.toggles)
        setAirlineScope(stored.airline_scope)
        setFocused(stored.focused_strategy)
      } else {
        setDrawerOpen(true)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [region])

  useEffect(() => () => controllersRef.current.forEach(controller => controller.abort()), [])

  const effectiveResponses = useMemo(() => {
    const next: Partial<Record<Airline, MilesGoalSimulationResponse>> = {}
    for (const airline of AIRLINES) {
      const response = responses[airline]
      if (!response) continue
      const state = toggles[airline] ?? response.interaction_catalog.toggle_defaults
      next[airline] = { ...response, resolved_view: resolveCatalog(response.interaction_catalog, state) }
    }
    return next
  }, [responses, toggles])

  useEffect(() => {
    if (!region || !profile || !Object.keys(responses).length) return
    writeMilesGoalSession({
      version: 2, region_id: region.id, mode: 'personalized', airline_scope: airlineScope,
      focused_strategy: focused, profile, responses, toggles, saved_at: Date.now(), expires_at: Date.now() + 30 * 60 * 1000,
    })
  }, [region, profile, responses, toggles, airlineScope, focused])

  const runSimulation = useCallback(async (nextProfile: PersonalizedProfile, requested: Airline[], replace: boolean) => {
    if (!region) return
    controllersRef.current.forEach(controller => controller.abort())
    const requestId = ++requestIdRef.current
    const controllers = requested.map(() => new AbortController())
    controllersRef.current = controllers
    setLoading(true)
    setLoadingAirlines(requested)
    setErrors(current => {
      if (replace) return {}
      const next = { ...current }
      requested.forEach(airline => delete next[airline])
      return next
    })
    const settled = await Promise.allSettled(requested.map((airline, index) => simulateMilesGoal({
      destination_region: region.id,
      airline,
      salary_aed: nextProfile.salary_aed,
      spend: nextProfile.spend,
      current_usable_miles: airline === 'emirates' ? nextProfile.skywards_miles : nextProfile.etihad_guest_miles,
      merchant_prefs: nextProfile.merchant_prefs,
      toggle_state: toggles[airline],
    }, { signal: controllers[index].signal })))
    if (requestId !== requestIdRef.current) return

    const succeeded: Partial<Record<Airline, MilesGoalSimulationResponse>> = {}
    const failed: Partial<Record<Airline, string>> = {}
    settled.forEach((result, index) => {
      const airline = requested[index]
      if (result.status === 'fulfilled') succeeded[airline] = result.value
      else if (result.reason?.name !== 'AbortError') failed[airline] = result.reason instanceof Error ? result.reason.message : 'This airline could not be calculated.'
    })
    setResponses(current => replace ? succeeded : { ...current, ...succeeded })
    setToggles(current => {
      const next = replace ? {} : { ...current }
      for (const airline of requested) {
        const response = succeeded[airline]
        if (!response) continue
        next[airline] = current[airline] ?? cloneDefaultToggle(response)
      }
      return next
    })
    setErrors(current => replace ? failed : ({ ...current, ...failed }))
    setLoading(false)
    setLoadingAirlines([])
    if (Object.keys(succeeded).length) {
      setProfile(nextProfile)
      setDrawerOpen(false)
      setAnnouncement('Your personal miles plan is ready.')
      if (requested.length === 1) setAirlineScope(requested[0])
      else setAirlineScope('best')
    }
  }, [region, toggles])

  const submitProfile = useCallback((nextProfile: PersonalizedProfile) => {
    const requested: Airline[] = nextProfile.airline_preference === 'none' ? AIRLINES : [nextProfile.airline_preference]
    void runSimulation(nextProfile, requested, true)
  }, [runSimulation])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const changeToggle = useCallback((airline: Airline, state: ToggleState) => {
    setToggles(current => ({ ...current, [airline]: state }))
    setAnnouncement('Miles timelines updated using your selected assumptions.')
  }, [])

  const startOver = () => {
    controllersRef.current.forEach(controller => controller.abort())
    clearMilesGoalSession()
    router.push('/miles')
  }

  if (!region) return <div className={styles.invalid}><i className="ti ti-map-off" /><h1>Choose a supported destination</h1><p>This route is not part of the current Miles Goal coverage.</p><Link className="btn-primary" href="/miles">View destinations</Link></div>

  const displayCards = buildDisplayCards(effectiveResponses, airlineScope, focused)
  const available = { emirates: !!responses.emirates, etihad: !!responses.etihad }
  const partial = available.emirates !== available.etihad
  const totalSpend = profile ? Object.values(profile.spend).reduce((sum, value) => sum + value, 0) : 0
  const origins = [...new Set((Object.values(effectiveResponses) as MilesGoalSimulationResponse[]).map(response => response.route.origin))]

  return <div className={styles.page}>
    <div className={styles.announcement} aria-live="polite">{announcement}</div>
    <header className={styles.hero}>
      <div><span className={styles.kicker}>YOUR MILES GOAL</span><h1>{profile ? 'Your personal plan is ready' : `Plan your flight to ${region.label} ✈`}</h1><p>{profile ? `Based on ${formatAed(totalSpend)} monthly spending` : 'Add salary and spending to calculate eligible card routes without inventing your profile.'}</p>{origins.length > 0 && <small>{region.label} estimate based on {origins.join(' / ')} → {region.label} redemption routes.</small>}</div>
      <div className={styles.heroActions}><button className="btn-primary" onClick={() => setDrawerOpen(true)}>{profile ? 'Update my plan' : 'Personalize my plan'} <i className="ti ti-adjustments-horizontal" /></button><button className={styles.startOver} onClick={startOver}>Start over</button></div>
    </header>

    {Object.keys(errors).length > 0 && <section className={styles.partial} role="status"><i className="ti ti-alert-triangle" /><div><strong>{Object.keys(effectiveResponses).length ? 'Some airline results are unavailable' : 'We could not build the plan yet'}</strong>{AIRLINES.filter(airline => errors[airline]).map(airline => <p key={airline}>{airlineLabel(airline)}: {errors[airline]} {profile && <button onClick={() => void runSimulation(profile, [airline], false)}>Retry</button>}</p>)}</div></section>}

    {!profile && !loading && <section className={styles.profileGate}><div><i className="ti ti-lock-open" /></div><span>PERSONALIZED, NOT FABRICATED</span><h2>Add your salary and monthly spending</h2><p>Card eligibility depends on salary, so Earnn will not assume one for you. Your inputs stay in this browser session.</p><button className="btn-primary" onClick={() => setDrawerOpen(true)}>Build my plan <i className="ti ti-arrow-right" /></button></section>}
    {loading && !Object.keys(effectiveResponses).length && <MilesLoadingState destination={region.label} />}

    {Object.keys(effectiveResponses).length > 0 && <>
      <section className={styles.controls} aria-label="Miles plan controls">
        <div><span>AIRLINE VIEW</span><AirlineScopeSwitch value={airlineScope} onChange={setAirlineScope} available={available} partial={partial} /></div>
        <div><span>RANK CARDS FOR</span><StrategyFocusTabs value={focused} onChange={setFocused} /></div>
      </section>

      <div className={styles.resultHeading}><div><span>FASTEST OPTIONS</span><h2>{focused === 'easiest' ? 'Economy — Easiest' : focused === 'dream' ? 'Business — Dream' : 'Upgrade — Smartest'}</h2></div><p>{displayCards.length} card{displayCards.length === 1 ? '' : 's'} reach this goal within 36 months using the selected assumptions.</p></div>
      {displayCards.length ? <section className={styles.cards}>{displayCards.map(card => <MilesCardTile key={card.earnn_card_id} card={card} monthlySpend={totalSpend} responses={effectiveResponses} toggles={toggles} onToggleChange={changeToggle} />)}</section> : <section className={styles.empty}><i className="ti ti-plane-off" /><h2>No route reaches this goal within 36 months</h2><p>Try another strategy, airline, or update your spending profile.</p></section>}
    </>}

    {loading && Object.keys(effectiveResponses).length > 0 && <div className={styles.updating} role="status"><span /><strong>Updating {loadingAirlines.map(airlineLabel).join(' and ')} plan…</strong></div>}
    <MilesDisclosure />
    {drawerOpen && <MilesCustomizeDrawer open onClose={closeDrawer} onSubmit={submitProfile} initial={profile} submitting={loading} />}
  </div>
}

export default function MilesResultsPage() {
  return <Suspense fallback={<div className={styles.page}><MilesLoadingState destination="your destination" /></div>}><MilesResultsContent /></Suspense>
}
