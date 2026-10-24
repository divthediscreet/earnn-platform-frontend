'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MilesCustomizeDrawer from '@/components/miles-goal/MilesCustomizeDrawer'
import CardDetailPopup from '@/components/CardDetailPopup'
import MilesDisclosure from '@/components/miles-goal/MilesDisclosure'
import MilesLoadingState from '@/components/miles-goal/MilesLoadingState'
import MilesResultPreview from '@/components/miles-goal/MilesResultPreview'
import MilesResultSummaryCard from '@/components/miles-goal/MilesResultSummaryCard'
import MilesResultFilters from '@/components/miles-goal/MilesResultFilters'
import { simulateMilesGoal } from '@/lib/miles-goal/api'
import CustomizeExistingToggle from '@/components/trip-planner/CustomizeExistingToggle'
import { simulateTripCustomize } from '@/lib/trip-planner/api'
import type { TripPlannerRequest } from '@/lib/trip-planner/api'
import { readExistingOnly, readFromWallet, readTripRequest } from '@/lib/trip-planner/session'
import type {
  Airline, AirlineScope, MilesGoalSimulationResponse, PersonalizedProfile,
  StrategyId, ToggleState,
} from '@/lib/miles-goal/contracts'
import { DEFAULT_TOGGLE_STATE } from '@/lib/miles-goal/contracts'
import { airlineLabel, formatAed, formatNumber } from '@/lib/miles-goal/format'
import { getMilesRegion, supportedMilesAirlines } from '@/lib/miles-goal/regions'
import { resolveCatalog, withTravellerTarget } from '@/lib/miles-goal/resolver'
import { buildDisplayCards, STRATEGY_IDS, withLockedDisplayOrder } from '@/lib/miles-goal/selectors'
import { rankedCandidates, responsesForScope } from '@/lib/miles-goal/merge-airlines'
import { clearMilesGoalSession, readMilesGoalSession, writeMilesGoalSession } from '@/lib/miles-goal/storage'
import { emptySpendProfile } from '@/lib/spend-categories'
import styles from './MilesResults.module.css'
import love from './LoveableMilesResult.module.css'
import density from './StrategyDensity.module.css'
import filterButton from './ResultsFilterButton.module.css'
import journey from './MilesJourney.module.css'
import loadingOverlay from './ResultsLoading.module.css'
import resultTopBar from './ResultsTopBar.module.css'

const AIRLINES: Airline[] = ['emirates', 'etihad']
const STRATEGY_COPY: Record<StrategyId, { eyebrow: string; label: string; outcome: string }> = {
  easiest: { eyebrow: 'EASIEST', label: 'Economy', outcome: 'Economy flight' },
  dream: { eyebrow: 'DREAM', label: 'Business Class', outcome: 'Business Class' },
  smartest: { eyebrow: 'SMARTEST', label: 'Upgrade to Business', outcome: 'Business Class upgrade' },
}

type JourneyStep = 'reveal' | 'personalize' | 'results'
type EditStep = 'strategy' | 'travellers' | null
type Travellers = { adults: number; children: number; infants: number }
type TripType = 'one_way' | 'return'

const DEFAULT_TRAVELLERS: Travellers = { adults: 1, children: 0, infants: 0 }
const DEFAULT_TRIP_TYPE: TripType = 'return'
const MIN_TARGET_LOADING_MS = 10_000

function waitFor(milliseconds: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, milliseconds))
}

function timelineBand(months: number): string {
  if (months <= 2) return 'As little as 1–3 months'
  if (months <= 4) return `Around ${Math.max(2, months - 1)}–${months + 1} months`
  if (months <= 10) return `Around ${months - 1}–${months + 1} months`
  if (months <= 14) return `Around ${months - 2}–${months + 2} months`
  if (months <= 20) return `Around ${months - 3}–${months + 3} months`
  return `Around ${Math.max(1, Math.floor(months * 0.8))}–${Math.ceil(months * 1.2)} months`
}

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

// ── Trip Planner "Customize My Trip" (?source=trip) ─────────────────────────
// The same journey and screens, calculated by the Trip Planner engine from the inputs entered there
// (guaranteed rewards only) instead of the Miles Goal personalise drawer.
const TRIP_CABIN_STRATEGY: Record<string, StrategyId> = { economy: 'easiest', business: 'dream', upgrade: 'smartest' }
const TRIP_PARTY_TRAVELLERS: Record<string, Travellers> = {
  single: { adults: 1, children: 0, infants: 0 },
  couple: { adults: 2, children: 0, infants: 0 },
  family4: { adults: 2, children: 2, infants: 0 },
}

function tripProfile(request: TripPlannerRequest): PersonalizedProfile {
  const regular = Object.values(request.regular_spend).reduce((sum, value) => sum + value, 0)
  const bulk = request.scheduled_payments.reduce((sum, payment) => sum + payment.amount_aed * payment.due_months.length, 0)
  return {
    salary_aed: request.salary_aed,
    spend: { ...emptySpendProfile(), miscellaneous: Math.round(regular + bulk / 12) }, // display only: the engine uses the Trip Planner inputs
    airline_preference: 'none',
    skywards_miles: request.skywards_balance,
    etihad_guest_miles: request.etihad_balance,
    merchant_prefs: {},
  }
}

function ViewOneResultsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const region = getMilesRegion(searchParams.get('region'))
  const supportedAirlines: Airline[] = region ? [...supportedMilesAirlines(region)] : []
  const [profile, setProfile] = useState<PersonalizedProfile | null>(null)
  const [responses, setResponses] = useState<Partial<Record<Airline, MilesGoalSimulationResponse>>>({})
  const [toggles, setToggles] = useState<Partial<Record<Airline, ToggleState>>>({})
  const [lockedCardOrder, setLockedCardOrder] = useState<Partial<Record<StrategyId, string[]>>>({})
  const [airlineScope, setAirlineScope] = useState<AirlineScope>('best')
  const [focused, setFocused] = useState<StrategyId>('dream')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [detailCardId, setDetailCardId] = useState<string | null>(null)
  const [bankFilter, setBankFilter] = useState('all')
  const [existingCardBanks, setExistingCardBanks] = useState<string[]>([])
  const [journeyStep, setJourneyStep] = useState<JourneyStep>('reveal')
  const [editStep, setEditStep] = useState<EditStep>(null)
  const [returnStep, setReturnStep] = useState<Exclude<JourneyStep, 'personalize'>>('reveal')
  const [travellers, setTravellers] = useState<Travellers>(DEFAULT_TRAVELLERS)
  const [tripType, setTripType] = useState<TripType>(DEFAULT_TRIP_TYPE)
  const [loading, setLoading] = useState(false)
  const [loadingAirlines, setLoadingAirlines] = useState<Airline[]>([])
  const [errors, setErrors] = useState<Partial<Record<Airline, string>>>({})
  const [announcement, setAnnouncement] = useState('')
  const [openNewViewWhenReady, setOpenNewViewWhenReady] = useState(false)
  const requestIdRef = useRef(0)
  const controllersRef = useRef<AbortController[]>([])
  const initializedRegionRef = useRef<string | null>(null)
  const tripMode = searchParams.get('source') === 'trip'
  // Reached through Trip Planner, which itself was opened from the Smart Wallet result: offer the way back.
  const [fromWallet, setFromWallet] = useState(false)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setFromWallet(tripMode && readFromWallet()) }, [tripMode])
  // Trip Planner's Customize pop-up already collected the trip: with ?direct=1 the result opens as soon as it is calculated.
  const preferredAirline = tripMode ? searchParams.get('airline') : null
  const tripAirlines = useMemo<Airline[]>(() => {
    const all: Airline[] = region ? [...supportedMilesAirlines(region)] : []
    return preferredAirline && all.includes(preferredAirline as Airline) ? [preferredAirline as Airline] : all
  }, [region, preferredAirline])
  const wizardFlow = tripMode && searchParams.get('direct') === '1'
  const tripRequestRef = useRef<TripPlannerRequest | null>(null)
  const tripExistingOnlyRef = useRef(false)
  const [tripExistingOnly, setTripExistingOnly] = useState(false)
  const [tripBankCodes, setTripBankCodes] = useState<string[] | null>(null) // banks held, for the Customize toggle (null = not trip mode)

  // Do not abort the initial request from an unmount cleanup. React Strict Mode
  // intentionally runs that cleanup once during development, which otherwise
  // cancels the only default target calculation before it can populate the page.

  const effectiveResponses = useMemo(() => {
    const next: Partial<Record<Airline, MilesGoalSimulationResponse>> = {}
    for (const airline of AIRLINES) {
      const response = responses[airline]
      if (!response) continue
      const catalog = withTravellerTarget(response.interaction_catalog, travellers.adults + travellers.children, tripType === 'return' ? 2 : 1)
      const state = toggles[airline] ?? catalog.toggle_defaults
      next[airline] = { ...response, interaction_catalog: catalog, resolved_view: resolveCatalog(catalog, state) }
    }
    return next
  }, [responses, toggles, travellers, tripType])

  useEffect(() => {
    if (!region || !profile || !Object.keys(responses).length) return
    writeMilesGoalSession({
      version: 2,
      region_id: region.id,
      mode: journeyStep === 'results' ? 'personalized' : 'generic',
      airline_scope: airlineScope,
      focused_strategy: focused,
      journey_step: journeyStep === 'personalize' ? returnStep : journeyStep,
      travellers,
      trip_type: tripType,
      existing_card_banks: existingCardBanks,
      profile,
      responses,
      toggles,
      locked_card_order: lockedCardOrder,
      saved_at: Date.now(),
      expires_at: Date.now() + 30 * 60 * 1000,
    })
  }, [region, profile, responses, toggles, lockedCardOrder, airlineScope, focused, journeyStep, returnStep, travellers, tripType, existingCardBanks])

  useEffect(() => {
    if (!openNewViewWhenReady || !region || !profile) return
    setOpenNewViewWhenReady(false)
    // Keep the Trip Planner source: the new view's "New Search" and wallet link depend on it.
    router.replace(`/miles/results?region=${encodeURIComponent(region.id)}&view=new${wizardFlow ? '&source=trip&direct=1' : tripMode ? '&source=trip' : ''}`)
  }, [openNewViewWhenReady, profile, region, router, wizardFlow, tripMode])

  const runSimulation = useCallback(async (nextProfile: PersonalizedProfile, requested: Airline[], replace: boolean, showResultsWhenReady = false, keepTargetScreenVisible = false) => {
    if (!region) return
    controllersRef.current.forEach(controller => controller.abort())
    const requestId = ++requestIdRef.current
    const startedAt = Date.now()
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
    // The Miles Goal repository shares a database client.  Running Emirates
    // and Etihad together can make that client drop one of the two reads, so
    // resolve the small airline set in order and keep the target page reliable.
    const settled: PromiseSettledResult<MilesGoalSimulationResponse>[] = []
    for (const [index, airline] of requested.entries()) {
      try {
        const response = tripMode && tripRequestRef.current
          ? await simulateTripCustomize({
            ...tripRequestRef.current,
            destination_region: region.id,
            airline,
            use_existing_only: tripExistingOnlyRef.current,
            toggle_state: toggles[airline],
          }, { signal: controllers[index].signal })
          : await simulateMilesGoal({
            destination_region: region.id,
            airline,
            salary_aed: nextProfile.salary_aed,
            spend: nextProfile.spend,
            current_usable_miles: airline === 'emirates' ? nextProfile.skywards_miles : nextProfile.etihad_guest_miles,
            merchant_prefs: nextProfile.merchant_prefs,
            toggle_state: toggles[airline],
          }, { signal: controllers[index].signal })
        settled.push({ status: 'fulfilled', value: response })
      } catch (reason) {
        settled.push({ status: 'rejected', reason })
      }
    }
    if (requestId !== requestIdRef.current) return

    if (keepTargetScreenVisible) {
      const remaining = MIN_TARGET_LOADING_MS - (Date.now() - startedAt)
      if (remaining > 0) await waitFor(remaining)
    }
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
      if (showResultsWhenReady) {
        const rankingScope: AirlineScope = requested.length === 1 ? requested[0] : 'best'
        const initialResponses = Object.fromEntries(Object.entries(succeeded).map(([airline, response]) => {
          if (!response) return []
          const catalog = withTravellerTarget(response.interaction_catalog, travellers.adults + travellers.children, tripType === 'return' ? 2 : 1)
          const state = toggles[airline as Airline] ?? catalog.toggle_defaults
          return [airline, { ...response, interaction_catalog: catalog, resolved_view: resolveCatalog(catalog, state) }]
        })) as Partial<Record<Airline, MilesGoalSimulationResponse>>
        setLockedCardOrder(Object.fromEntries(STRATEGY_IDS.map(strategy => [strategy, buildDisplayCards(initialResponses, rankingScope, strategy).map(card => card.earnn_card_id)])) as Partial<Record<StrategyId, string[]>>)
        setJourneyStep('results')
        setOpenNewViewWhenReady(true)
      }
      setAnnouncement('Your personal miles plan is ready.')
      if (requested.length === 1) setAirlineScope(requested[0])
      else setAirlineScope('best')
    }
  }, [region, toggles, travellers, tripType, tripMode])

  const submitProfile = useCallback((nextProfile: PersonalizedProfile) => {
    const requested: Airline[] = nextProfile.airline_preference === 'none'
      ? supportedAirlines
      : supportedAirlines.includes(nextProfile.airline_preference) ? [nextProfile.airline_preference] : supportedAirlines
    void runSimulation(nextProfile, requested, true, true)
  }, [runSimulation, supportedAirlines])
  const closeDrawer = useCallback(() => {
    if (journeyStep === 'personalize') setJourneyStep(returnStep)
  }, [journeyStep, returnStep])

  useEffect(() => {
    if (!region || initializedRegionRef.current === region.id) return
    initializedRegionRef.current = region.id
    const stored = readMilesGoalSession()
    if (stored?.region_id === region.id && stored.profile && Object.keys(stored.responses).length) {
      const storedLockedOrder = stored.locked_card_order ?? Object.fromEntries(STRATEGY_IDS.map(strategy => [strategy, buildDisplayCards(stored.responses, stored.airline_scope, strategy).map(card => card.earnn_card_id)])) as Partial<Record<StrategyId, string[]>>
      if (!stored.locked_card_order) writeMilesGoalSession({ ...stored, locked_card_order: storedLockedOrder })
      if (tripMode) {
        tripRequestRef.current = readTripRequest()
        setTripBankCodes(tripRequestRef.current?.banks_held ?? [])
        tripExistingOnlyRef.current = readExistingOnly()
        setTripExistingOnly(tripExistingOnlyRef.current)
      }
      setProfile(stored.profile)
      setResponses(stored.responses)
      setToggles(stored.toggles)
      setLockedCardOrder(storedLockedOrder)
      setAirlineScope(stored.airline_scope)
      setFocused(stored.focused_strategy)
      setTravellers(stored.travellers ?? DEFAULT_TRAVELLERS)
      setTripType(stored.trip_type ?? DEFAULT_TRIP_TYPE)
      setExistingCardBanks(stored.existing_card_banks ?? [])
      setJourneyStep(stored.mode === 'personalized' ? 'results' : 'reveal')
      return
    }
    setResponses({})
    setToggles({})
    setLockedCardOrder({})
    setErrors({})
    setExistingCardBanks([])
    setJourneyStep('reveal')
    const tripRequest = tripMode ? readTripRequest() : null
    if (tripRequest) {
      // Arriving from Trip Planner: class, travellers and one-way come from the chosen trip.
      tripRequestRef.current = tripRequest
      setTripBankCodes(tripRequest.banks_held ?? [])
      tripExistingOnlyRef.current = readExistingOnly() && tripRequest.existing_card_ids.length > 0
      setTripExistingOnly(tripExistingOnlyRef.current)
      const count = (key: string) => Math.max(0, Math.min(9, Number(searchParams.get(key)) || 0))
      setTravellers(searchParams.has('adults')
        ? { adults: Math.max(1, count('adults')), children: count('children'), infants: count('infants') }
        : TRIP_PARTY_TRAVELLERS[searchParams.get('party') ?? ''] ?? DEFAULT_TRAVELLERS)
      setTripType(searchParams.get('trip') === 'return' ? 'return' : 'one_way')
      setFocused(TRIP_CABIN_STRATEGY[searchParams.get('cabin') ?? ''] ?? 'smartest') // from Trip Planner the upgrade option is the default
      void runSimulation(tripProfile(tripRequest), tripAirlines, true, false, true)
      return
    }
    setTravellers(DEFAULT_TRAVELLERS)
    setTripType(DEFAULT_TRIP_TYPE)
    setFocused('dream')
    void runSimulation(starterProfile(), supportedAirlines, true, false, true)
  }, [region, runSimulation, supportedAirlines, tripAirlines, tripMode, searchParams])

  const changeToggle = useCallback((airline: Airline, state: ToggleState) => {
    setToggles(current => ({ ...current, [airline]: state }))
    setAnnouncement('Miles timelines updated using your selected assumptions.')
  }, [])
  const changeExistingCardBanks = useCallback((nextBanks: string[]) => {
    const previous = new Set(existingCardBanks)
    const selected = new Set(nextBanks)
    const affectedBanks = new Set([...previous, ...selected])
    setExistingCardBanks(nextBanks)
    setToggles(current => {
      const next = { ...current }
      for (const airline of AIRLINES) {
        const response = responses[airline]
        if (!response) continue
        const state = current[airline] ?? cloneDefaultToggle(response)
        const newToBankByBank = { ...state.new_to_bank_by_bank }
        for (const bankCode of affectedBanks) {
          if (selected.has(bankCode)) newToBankByBank[bankCode] = false
          else delete newToBankByBank[bankCode]
        }
        next[airline] = { ...state, new_to_bank_by_bank: newToBankByBank }
      }
      return next
    })
    setAnnouncement('Recommendations refreshed using your existing-card banks.')
  }, [existingCardBanks, responses])

  const startOver = () => {
    controllersRef.current.forEach(controller => controller.abort())
    clearMilesGoalSession()
    // Trip Planner's Customize flow: "New Search" returns to its first step (the region map).
    router.push(wizardFlow ? '/trip-planner/results?customize=1' : '/miles')
  }

  if (!region) return <div className={styles.invalid}><i className="ti ti-map-off" /><h1>Choose a supported destination</h1><p>This route is not part of the current Miles Goal coverage.</p><Link className="btn-primary" href="/miles">View destinations</Link></div>

  const unfilteredDisplayCards = withLockedDisplayOrder(buildDisplayCards(effectiveResponses, airlineScope, focused), lockedCardOrder[focused])
  const displayCards = bankFilter === 'all'
    ? unfilteredDisplayCards
    : unfilteredDisplayCards.filter(card => card.bank_code === bankFilter)
  const filterCards = Object.values(effectiveResponses).flatMap(response => response.interaction_catalog.cards)
  const bankOptions = [...new Map(filterCards.map(card => [
    card.bank_code,
    { value: card.bank_code, label: `${card.bank_name} (${card.bank_code})` },
  ] as const)).values()].sort((a, b) => a.label.localeCompare(b.label))
  const available = { emirates: !!responses.emirates, etihad: !!responses.etihad }
  const partial = available.emirates !== available.etihad
  const totalSpend = profile ? Object.values(profile.spend).reduce((sum, value) => sum + value, 0) : 0
  const selectedCandidate = rankedCandidates(effectiveResponses, airlineScope, focused)[0] ?? null
  const selectedResponse = selectedCandidate
    ? effectiveResponses[selectedCandidate.airline]
    : responsesForScope(effectiveResponses, airlineScope)[0]?.[1]
  const selectedStrategy = selectedResponse?.interaction_catalog.strategies.find(strategy => strategy.strategy_id === focused) ?? null
  const strategyDefinitions = new Map((selectedResponse?.interaction_catalog.strategies ?? []).map(strategy => [strategy.strategy_id, strategy]))
  const displayedTargetMiles = selectedCandidate?.target_at_goal_miles ?? selectedStrategy?.original_target_miles ?? 0
  const maximumCashPrice = Math.max(0, ...(Object.values(effectiveResponses).map(response => (
    response.interaction_catalog.strategies.find(strategy => strategy.strategy_id === focused)?.cash_price_aed ?? 0
  ))))
  const travellerCount = travellers.adults + travellers.children
  const tripLegs = tripType === 'return' ? 2 : 1
  const tripLabel = tripType === 'return' ? 'return ticket' : 'one-way ticket'
  const journeyDestination = region.label
  // Trip mode has already calculated from the Trip Planner inputs, so "Build My Plan" goes straight to the result.
  const showTripResults = () => {
    const scope: AirlineScope = tripAirlines.length === 1 ? tripAirlines[0] : 'best'
    setLockedCardOrder(Object.fromEntries(STRATEGY_IDS.map(strategy => [strategy, buildDisplayCards(effectiveResponses, scope, strategy).map(card => card.earnn_card_id)])) as Partial<Record<StrategyId, string[]>>)
    setAirlineScope(scope)
    setJourneyStep('results')
    setOpenNewViewWhenReady(true)
  }
  const changeTripExisting = (useExistingOnly: boolean, existingCardIds: string[]) => {
    if (!tripRequestRef.current || !profile) return
    tripRequestRef.current = { ...tripRequestRef.current, existing_card_ids: existingCardIds }
    tripExistingOnlyRef.current = useExistingOnly && existingCardIds.length > 0
    setTripExistingOnly(tripExistingOnlyRef.current)
    void runSimulation(profile, tripMode ? tripAirlines : supportedAirlines, true)
  }
  const openPersonalization = (from: Exclude<JourneyStep, 'personalize'>) => {
    if (tripMode) return showTripResults()
    setReturnStep(from)
    setJourneyStep('personalize')
  }
  const openAssumptionEditor = () => setEditStep('strategy')
  const saveAssumptions = () => {
    setEditStep(null)
    setAnnouncement('Your target miles have been updated using these trip assumptions.')
  }
  const adjustTraveller = (kind: keyof Travellers, delta: number) => {
    setTravellers(current => {
      const minimum = kind === 'adults' ? 1 : 0
      return { ...current, [kind]: Math.max(minimum, Math.min(9, current[kind] + delta)) }
    })
  }

  // Wizard hand-off: keep the holding screen up from the first frame until the result opens.
  if (wizardFlow && journeyStep === 'reveal' && !Object.keys(effectiveResponses).length && !Object.keys(errors).length) return <main className={loadingOverlay.screen}><MilesLoadingState destination={region.label} /></main>
  if (loading && journeyStep === 'personalize') return <main className={loadingOverlay.screen}><MilesLoadingState destination={region.label} /></main>
  if (loading && journeyStep === 'reveal' && !Object.keys(effectiveResponses).length) return wizardFlow ? <main className={loadingOverlay.screen}><MilesLoadingState destination={region.label} /></main> : <main className={loadingOverlay.targetScreen}><MilesLoadingState destination={region.label} variant="target" /></main>

  return <div className={`${styles.page} ${journeyStep !== 'results' ? `${love.page} ${journey.page}` : ''}`}>
    <div className={styles.announcement} aria-live="polite">{announcement}</div>

    {Object.keys(errors).length > 0 && <section className={styles.partial} role="status"><i className="ti ti-alert-triangle" /><div><strong>{Object.keys(effectiveResponses).length ? 'Some airline results are unavailable' : 'We could not build the plan yet'}</strong>{supportedAirlines.filter(airline => errors[airline]).map(airline => <p key={airline}>{airlineLabel(airline)}: {errors[airline]} {profile && <button onClick={() => void runSimulation(profile, [airline], false)}>Retry</button>}</p>)}</div></section>}

    {(journeyStep !== 'results' || Object.keys(effectiveResponses).length > 0) && (journeyStep === 'results' ? <>
      <div className={resultTopBar.bar}><button type="button" onClick={startOver}><i className="ti ti-search" /> New Search</button>{fromWallet && <Link className={resultTopBar.walletBack} href="/analyse/result"><i className="ti ti-arrow-left" /> Back to Smart wallet result</Link>}<Link href={`/miles/results?region=${encodeURIComponent(region.id)}&view=new${wizardFlow ? '&source=trip&direct=1' : ''}`}>View 2.0</Link></div>
      <div className={`${styles.newResultHeading} ${love.resultsHeading}`}><div><span>FASTEST CARDS</span><h2>Here’s your fastest route.</h2></div><button type="button" className={filterButton.button} onClick={() => setFiltersOpen(true)}><i className="ti ti-adjustments-horizontal" /> All filters</button></div>
      {displayCards.length ? <section className={styles.summaryCards}>{displayCards.map(card => <MilesResultSummaryCard key={card.earnn_card_id} card={card} focused={focused} destinationLabel={region.label} monthlySpend={totalSpend} responses={effectiveResponses} toggles={toggles} onToggleChange={changeToggle} onCardNameClick={setDetailCardId} />)}</section> : <section className={styles.empty}><i className="ti ti-plane-off" /><h2>No route reaches this goal within 36 months</h2><p>Try another strategy, airline, or update your spending profile.</p></section>}
    </> : journeyStep === 'personalize' ? <section className={journey.shell} aria-label="Personalize your miles plan">
      <div className={journey.progress}><button type="button" onClick={closeDrawer}><i className="ti ti-arrow-left" /> Back</button></div>
      <MilesCustomizeDrawer open embedded onClose={closeDrawer} onSubmit={submitProfile} initial={returnStep === 'results' ? profile : null} submitting={loading} availableAirlines={supportedAirlines} />
    </section> : <div className={editStep ? journey.editorBackdrop : undefined}><section className={`${journey.shell} ${editStep ? journey.editorDialog : ''}`} aria-live="polite">
      <div className={journey.progress}>{editStep ? <><span>EDIT TRIP</span><strong>{editStep === 'strategy' ? 'How do you want to fly?' : 'Who is flying?'}</strong><button type="button" onClick={() => setEditStep(null)} aria-label="Close trip editor"><i className="ti ti-x" /></button></> : <><span>YOUR FLIGHT PLAN</span><strong>UAE to {journeyDestination} · {STRATEGY_COPY[focused].label}</strong>{!wizardFlow && <button type="button" onClick={openAssumptionEditor}><i className="ti ti-pencil" /> Edit assumptions</button>}</>}</div>

      {editStep === 'strategy' && <section className={`${styles.strategySection} ${love.strategySection} ${density.section} ${journey.strategyStep}`} aria-label="How do you want to fly">
        <h2 className={journey.strategyPrompt}>How do you want to fly?</h2>
        <div className={`${styles.strategyCards} ${love.strategyGrid}`}>{(Object.keys(STRATEGY_COPY) as StrategyId[]).map(strategyId => {
          const strategy = strategyDefinitions.get(strategyId)
          return <button key={strategyId} type="button" className={`${styles.strategyCard} ${love.strategyCard} ${density.card} ${journey.strategyCard} ${focused === strategyId ? `${styles.strategySelected} ${love.strategySelected} ${density.selected}` : ''} ${strategyId === 'easiest' ? density.economyVisual : strategyId === 'dream' ? density.dreamNeutral : density.smartestVisual}`} aria-pressed={focused === strategyId} onClick={() => setFocused(strategyId)}>{focused === strategyId && <i className={`${density.selectedTick} ti ti-check`} aria-hidden="true" />}<span><i className={`ti ti-${strategyId === 'easiest' ? 'plane' : strategyId === 'dream' ? 'sparkles' : 'trending-up'}`} /> {STRATEGY_COPY[strategyId].eyebrow}{strategyId === 'dream' && ' ✨'}</span><strong>{strategyId === 'easiest' ? 'Fly more for less' : strategyId === 'dream' ? 'Fly Business Class' : 'Upgrade to Business'}</strong><b>{strategyId === 'easiest' ? 'Economy' : strategyId === 'dream' ? 'The dream, paid with miles.' : 'Use miles where they matter most.'}</b><p>{strategyId === 'easiest' ? <>Stretch your miles across <em>more travellers or more trips.</em></> : strategyId === 'dream' ? <>Turn your everyday spending into the <em>Business Class experience.</em></> : <>Pay for your ticket and use miles <em>only for the Business Class upgrade.</em></>}</p><div className={`${journey.strategyEstimate} ${strategyId !== 'smartest' ? journey.strategyEstimateLight : ''} ${strategyId === 'easiest' ? journey.economyEstimate : ''}`}><span>~ {formatAed(strategy?.associated_cash_aed ?? 0)}</span><i aria-hidden="true">+</i><span>~ {formatNumber(strategy?.original_target_miles ?? 0)} miles</span><small className={journey.ticketSaving}>Saving per ticket: <b>{formatAed(Math.max(0, (strategy?.cash_price_aed ?? 0) - (strategy?.associated_cash_aed ?? 0)))}</b></small></div></button>
        })}</div>
        <div className={journey.stepAction}><button className="btn-primary" type="button" onClick={() => setEditStep('travellers')}>Next <i className="ti ti-arrow-right" /></button></div>
      </section>}

      {editStep === 'travellers' && <section className={journey.compactTravellerStep} aria-label="Travellers and trip direction">
        <div className={journey.tripTypeToggle} role="radiogroup" aria-label="Ticket direction"><button type="button" role="radio" aria-checked={tripType === 'one_way'} className={tripType === 'one_way' ? journey.tripTypeSelected : ''} onClick={() => setTripType('one_way')}>One way</button><button type="button" role="radio" aria-checked={tripType === 'return'} className={tripType === 'return' ? journey.tripTypeSelected : ''} onClick={() => setTripType('return')}>Return</button></div>
        <div className={journey.inlineTravellers}>{(['adults', 'children', 'infants'] as (keyof Travellers)[]).map(kind => <div key={kind}><div className={journey.travellerLabel}><span>{kind[0].toUpperCase() + kind.slice(1)}</span><small>{kind === 'adults' ? 'Age 12+' : kind === 'children' ? 'Age 2–11' : 'Under 2'}</small></div><div className={journey.counter}><button type="button" aria-label={`Remove ${kind}`} disabled={travellers[kind] === (kind === 'adults' ? 1 : 0)} onClick={() => adjustTraveller(kind, -1)}>−</button><strong>{travellers[kind]}</strong><button type="button" aria-label={`Add ${kind}`} disabled={travellers[kind] === 9} onClick={() => adjustTraveller(kind, 1)}>+</button></div></div>)}</div>
        <div className={journey.stepAction}><button type="button" onClick={() => setEditStep('strategy')}>Back</button><button className="btn-primary" type="button" onClick={saveAssumptions}>Update target <i className="ti ti-check" /></button></div>
      </section>}

      {!editStep && selectedStrategy && <section className={journey.centeredStep} aria-label="Flight target">
        <h2 className={journey.revealHeading}>Your trip, unlocked</h2>
        <p className={journey.tripSummary}>Target miles for <strong>UAE to {journeyDestination}</strong> · <strong>{travellerCount} {travellerCount === 1 ? 'person' : 'people'}</strong> · <strong>{STRATEGY_COPY[focused].label}</strong> · <strong>{tripLabel}</strong>{!wizardFlow && <> <button type="button" onClick={openAssumptionEditor} aria-label="Edit trip assumptions"><i className="ti ti-pencil" /> Edit</button></>}</p>
        <div className={journey.valueReveal}><div><span>PAY CASH</span><strong className={journey.strike}>{formatAed(maximumCashPrice * travellerCount * tripLegs)}</strong><small>Typical ticket cost</small></div><span className={journey.or}>OR</span><div className={journey.milesOption}><span>UNLOCK WITH MILES <i className="ti ti-sparkles" /></span><strong>{formatNumber(displayedTargetMiles)} <small>miles</small></strong><small>+ airline taxes &amp; charges</small></div></div>
        <div className={journey.goalCallout}><i className="ti ti-sparkles" /><p>Earnn will help you unlock <strong>{formatNumber(displayedTargetMiles)} miles</strong> for this {tripLabel}.</p></div>
        <div className={journey.timelineCallout}><i className="ti ti-clock-hour-4" /><p>{wizardFlow ? 'You would be able to reach this goal in' : 'UAE residents could reach this goal in'} <strong>{selectedCandidate ? timelineBand(selectedCandidate.months_to_goal).replace(/^(As little as |Around )/, '') : 'a personalized timeline'}</strong></p></div>
        {tripMode && !wizardFlow && tripBankCodes && <CustomizeExistingToggle bankCodes={tripBankCodes} value={tripExistingOnly} onChange={changeTripExisting} />}
        <button className="btn-primary" onClick={() => openPersonalization('reveal')}>{wizardFlow ? 'Show my plan' : 'Build My Plan'} <i className="ti ti-arrow-right" /></button>
      </section>}
    </section></div>)}

    {loading && Object.keys(effectiveResponses).length > 0 && <div className={styles.updating} role="status"><span /><strong>Updating {loadingAirlines.map(airlineLabel).join(' and ')} plan…</strong></div>}
    <MilesDisclosure />
    <MilesResultFilters open={filtersOpen} onClose={() => setFiltersOpen(false)} bank={bankFilter} onBankChange={setBankFilter} banks={bankOptions} airlineScope={airlineScope} onAirlineScopeChange={setAirlineScope} available={available} existingCardBanks={existingCardBanks} onExistingCardBanksChange={changeExistingCardBanks} />
    {detailCardId && <CardDetailPopup cardId={detailCardId} onClose={() => setDetailCardId(null)} />}
  </div>
}

function MilesResultsContent() {
  const searchParams = useSearchParams()
  const view = searchParams.get('view')
  const [storedMode, setStoredMode] = useState<'generic' | 'personalized' | 'none' | null>(null)
  useEffect(() => { setStoredMode(readMilesGoalSession()?.mode ?? 'none') }, [view])
  if (view !== 'current') return <MilesResultPreview />
  if (!view) {
    if (!storedMode) return null
    if (storedMode !== 'generic') return <MilesResultPreview />
  }
  return <ViewOneResultsContent />
}

export default function MilesResultsPage() {
  return <Suspense fallback={<div className={styles.page}><MilesLoadingState destination="your destination" /></div>}><MilesResultsContent /></Suspense>
}
