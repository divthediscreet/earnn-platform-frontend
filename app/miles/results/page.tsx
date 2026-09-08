'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MilesCustomizeDrawer from '@/components/miles-goal/MilesCustomizeDrawer'
import MilesDisclosure from '@/components/miles-goal/MilesDisclosure'
import MilesLoadingState from '@/components/miles-goal/MilesLoadingState'
import MilesResultPreview from '@/components/miles-goal/MilesResultPreview'
import MilesResultSummaryCard from '@/components/miles-goal/MilesResultSummaryCard'
import MilesResultFilters from '@/components/miles-goal/MilesResultFilters'
import { simulateMilesGoal } from '@/lib/miles-goal/api'
import type {
  Airline, AirlineScope, MilesGoalSimulationResponse, PersonalizedProfile,
  StrategyId, ToggleState,
} from '@/lib/miles-goal/contracts'
import { DEFAULT_TOGGLE_STATE } from '@/lib/miles-goal/contracts'
import { airlineLabel, formatAed, formatNumber } from '@/lib/miles-goal/format'
import { getMilesRegion } from '@/lib/miles-goal/regions'
import { resolveCatalog, withTravellerTarget } from '@/lib/miles-goal/resolver'
import { buildDisplayCards, STRATEGY_IDS, withLockedDisplayOrder } from '@/lib/miles-goal/selectors'
import { rankedCandidates } from '@/lib/miles-goal/merge-airlines'
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

type JourneyStep = 'strategy' | 'reveal' | 'personalize' | 'results'
type Travellers = { adults: number; children: number; infants: number }

const DEFAULT_TRAVELLERS: Travellers = { adults: 1, children: 0, infants: 0 }

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

function ViewOneResultsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const region = getMilesRegion(searchParams.get('region'))
  const [profile, setProfile] = useState<PersonalizedProfile | null>(null)
  const [responses, setResponses] = useState<Partial<Record<Airline, MilesGoalSimulationResponse>>>({})
  const [toggles, setToggles] = useState<Partial<Record<Airline, ToggleState>>>({})
  const [lockedCardOrder, setLockedCardOrder] = useState<Partial<Record<StrategyId, string[]>>>({})
  const [airlineScope, setAirlineScope] = useState<AirlineScope>('best')
  const [focused, setFocused] = useState<StrategyId>('dream')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [bankFilter, setBankFilter] = useState('all')
  const [journeyStep, setJourneyStep] = useState<JourneyStep>('strategy')
  const [returnStep, setReturnStep] = useState<Exclude<JourneyStep, 'personalize'>>('reveal')
  const [travellers, setTravellers] = useState<Travellers>(DEFAULT_TRAVELLERS)
  const [loading, setLoading] = useState(false)
  const [loadingAirlines, setLoadingAirlines] = useState<Airline[]>([])
  const [errors, setErrors] = useState<Partial<Record<Airline, string>>>({})
  const [announcement, setAnnouncement] = useState('')
  const [openNewViewWhenReady, setOpenNewViewWhenReady] = useState(false)
  const requestIdRef = useRef(0)
  const controllersRef = useRef<AbortController[]>([])
  const initializedRegionRef = useRef<string | null>(null)

  useEffect(() => () => controllersRef.current.forEach(controller => controller.abort()), [])

  const effectiveResponses = useMemo(() => {
    const next: Partial<Record<Airline, MilesGoalSimulationResponse>> = {}
    for (const airline of AIRLINES) {
      const response = responses[airline]
      if (!response) continue
      const catalog = withTravellerTarget(response.interaction_catalog, travellers.adults + travellers.children)
      const state = toggles[airline] ?? catalog.toggle_defaults
      next[airline] = { ...response, interaction_catalog: catalog, resolved_view: resolveCatalog(catalog, state) }
    }
    return next
  }, [responses, toggles, travellers])

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
      profile,
      responses,
      toggles,
      locked_card_order: lockedCardOrder,
      saved_at: Date.now(),
      expires_at: Date.now() + 30 * 60 * 1000,
    })
  }, [region, profile, responses, toggles, lockedCardOrder, airlineScope, focused, journeyStep, returnStep, travellers])

  useEffect(() => {
    if (!openNewViewWhenReady || !region || !profile) return
    setOpenNewViewWhenReady(false)
    router.replace(`/miles/results?region=${encodeURIComponent(region.id)}&view=new`)
  }, [openNewViewWhenReady, profile, region, router])

  const runSimulation = useCallback(async (nextProfile: PersonalizedProfile, requested: Airline[], replace: boolean, showResultsWhenReady = false) => {
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
      if (showResultsWhenReady) {
        const rankingScope: AirlineScope = requested.length === 1 ? requested[0] : 'best'
        const initialResponses = Object.fromEntries(Object.entries(succeeded).map(([airline, response]) => {
          if (!response) return []
          const catalog = withTravellerTarget(response.interaction_catalog, travellers.adults + travellers.children)
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
  }, [region, toggles])

  const submitProfile = useCallback((nextProfile: PersonalizedProfile) => {
    const requested: Airline[] = nextProfile.airline_preference === 'none' ? AIRLINES : [nextProfile.airline_preference]
    void runSimulation(nextProfile, requested, true, true)
  }, [runSimulation])
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
      setProfile(stored.profile)
      setResponses(stored.responses)
      setToggles(stored.toggles)
      setLockedCardOrder(storedLockedOrder)
      setAirlineScope(stored.airline_scope)
      setFocused(stored.focused_strategy)
      setTravellers(stored.travellers ?? DEFAULT_TRAVELLERS)
      setJourneyStep(stored.mode === 'personalized' ? 'results' : stored.journey_step === 'travellers' ? 'strategy' : stored.journey_step === 'timeline' ? 'reveal' : stored.journey_step ?? 'strategy')
      return
    }
    setResponses({})
    setToggles({})
    setLockedCardOrder({})
    setErrors({})
    setTravellers(DEFAULT_TRAVELLERS)
    setJourneyStep('strategy')
  }, [region, runSimulation])

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
  const selectedResponse = selectedCandidate ? effectiveResponses[selectedCandidate.airline] : undefined
  const selectedStrategy = selectedResponse?.interaction_catalog.strategies.find(strategy => strategy.strategy_id === focused) ?? null
  const maximumCashPrice = Math.max(0, ...(Object.values(effectiveResponses).map(response => (
    response.interaction_catalog.strategies.find(strategy => strategy.strategy_id === focused)?.cash_price_aed ?? 0
  ))))
  const travellerCount = travellers.adults + travellers.children
  const journeyDestination = region.label
  const openPersonalization = (from: Exclude<JourneyStep, 'personalize'>) => {
    setReturnStep(from)
    setJourneyStep('personalize')
  }
  const seeWhatItTakes = () => {
    if (selectedCandidate) {
      setJourneyStep('reveal')
      return
    }
    void runSimulation(starterProfile(), AIRLINES, true).then(() => setJourneyStep('reveal'))
  }
  const adjustTraveller = (kind: keyof Travellers, delta: number) => {
    setTravellers(current => {
      const minimum = kind === 'adults' ? 1 : 0
      return { ...current, [kind]: Math.max(minimum, Math.min(9, current[kind] + delta)) }
    })
  }

  if (loading && journeyStep === 'personalize') return <main className={loadingOverlay.screen}><MilesLoadingState destination={region.label} /></main>
  if (loading && journeyStep === 'strategy') return <main className={loadingOverlay.targetScreen}><MilesLoadingState destination={region.label} variant="target" /></main>

  return <div className={`${styles.page} ${journeyStep !== 'results' ? `${love.page} ${journey.page}` : ''}`}>
    <div className={styles.announcement} aria-live="polite">{announcement}</div>

    {Object.keys(errors).length > 0 && <section className={styles.partial} role="status"><i className="ti ti-alert-triangle" /><div><strong>{Object.keys(effectiveResponses).length ? 'Some airline results are unavailable' : 'We could not build the plan yet'}</strong>{AIRLINES.filter(airline => errors[airline]).map(airline => <p key={airline}>{airlineLabel(airline)}: {errors[airline]} {profile && <button onClick={() => void runSimulation(profile, [airline], false)}>Retry</button>}</p>)}</div></section>}

    {(journeyStep !== 'results' || Object.keys(effectiveResponses).length > 0) && (journeyStep === 'results' ? <>
      <div className={resultTopBar.bar}><button type="button" onClick={startOver}><i className="ti ti-search" /> New Search</button><Link href={`/miles/results?region=${encodeURIComponent(region.id)}&view=new`}>View 2.0</Link></div>
      <div className={`${styles.newResultHeading} ${love.resultsHeading}`}><div><span>FASTEST CARDS</span><h2>Here’s your fastest route.</h2></div><button type="button" className={filterButton.button} onClick={() => setFiltersOpen(true)}><i className="ti ti-adjustments-horizontal" /> All filters</button></div>
      {displayCards.length ? <section className={styles.summaryCards}>{displayCards.map(card => <MilesResultSummaryCard key={card.earnn_card_id} card={card} focused={focused} destinationLabel={region.label} monthlySpend={totalSpend} responses={effectiveResponses} toggles={toggles} onToggleChange={changeToggle} />)}</section> : <section className={styles.empty}><i className="ti ti-plane-off" /><h2>No route reaches this goal within 36 months</h2><p>Try another strategy, airline, or update your spending profile.</p></section>}
    </> : journeyStep === 'personalize' ? <section className={journey.shell} aria-label="Personalize your miles plan">
      <div className={journey.progress}><button type="button" onClick={closeDrawer}><i className="ti ti-arrow-left" /> Back</button></div>
      <MilesCustomizeDrawer open embedded onClose={closeDrawer} onSubmit={submitProfile} initial={returnStep === 'results' ? profile : null} submitting={loading} />
    </section> : <section className={journey.shell} aria-live="polite">
      <div className={`${journey.progress} ${journeyStep === 'strategy' ? journey.strategyProgress : ''}`}>{journeyStep === 'strategy' ? <button type="button" onClick={() => router.push('/miles')}><i className="ti ti-arrow-left" /> Back</button> : <><span>YOUR FLIGHT PLAN</span><strong>{journeyDestination} · {STRATEGY_COPY[focused].label}</strong><button type="button" onClick={() => setJourneyStep(journeyStep === 'reveal' ? 'strategy' : 'reveal')}><i className="ti ti-arrow-left" /> Back</button></>}</div>

      {journeyStep === 'strategy' && <section className={`${styles.strategySection} ${love.strategySection} ${density.section} ${journey.strategyStep}`} aria-label="How do you want to fly">
        <h2 className={journey.strategyPrompt}>How do you want to fly?</h2>
        <div className={`${styles.strategyCards} ${love.strategyGrid}`}>{(Object.keys(STRATEGY_COPY) as StrategyId[]).map(strategyId => <button key={strategyId} type="button" className={`${styles.strategyCard} ${love.strategyCard} ${density.card} ${journey.strategyCard} ${focused === strategyId ? `${styles.strategySelected} ${love.strategySelected} ${density.selected}` : ''} ${strategyId === 'easiest' ? density.economyVisual : strategyId === 'dream' ? density.dreamNeutral : density.smartestVisual}`} aria-pressed={focused === strategyId} onClick={() => setFocused(strategyId)}>{focused === strategyId && <i className={`${density.selectedTick} ti ti-check`} aria-hidden="true" />}<span><i className={`ti ti-${strategyId === 'easiest' ? 'plane' : strategyId === 'dream' ? 'sparkles' : 'trending-up'}`} /> {STRATEGY_COPY[strategyId].eyebrow}{strategyId === 'dream' && ' ✨'}</span><strong>{strategyId === 'easiest' ? 'Fly more for less' : strategyId === 'dream' ? 'Fly Business Class' : 'Upgrade to Business'}</strong><b>{strategyId === 'easiest' ? 'Economy' : strategyId === 'dream' ? 'The dream, paid with miles.' : 'Use miles where they matter most.'}</b><p>{strategyId === 'easiest' ? <>Stretch your miles across <em>more travellers or more trips.</em></> : strategyId === 'dream' ? <>Turn your everyday spending into the <em>Business Class experience.</em></> : <>Pay for your ticket and use miles <em>only for the Business Class upgrade.</em></>}</p></button>)}</div>
        <section className={journey.travellerBlock} aria-label="Who is flying"><h3>Who is flying?</h3><div className={journey.inlineTravellers}>{(['adults', 'children', 'infants'] as (keyof Travellers)[]).map(kind => <div key={kind}><div className={journey.travellerLabel}><span>{kind[0].toUpperCase() + kind.slice(1)}</span><small>{kind === 'adults' ? 'Age 12+' : kind === 'children' ? 'Age 2–11' : 'Under 2'}</small></div><div className={journey.counter}><button type="button" aria-label={`Remove ${kind}`} disabled={travellers[kind] === (kind === 'adults' ? 1 : 0)} onClick={() => adjustTraveller(kind, -1)}>−</button><strong>{travellers[kind]}</strong><button type="button" aria-label={`Add ${kind}`} disabled={travellers[kind] === 9} onClick={() => adjustTraveller(kind, 1)}>+</button></div></div>)}</div></section>
        <div className={journey.stepAction}><button className="btn-primary" disabled={loading} onClick={seeWhatItTakes}>See What It Takes <i className="ti ti-arrow-right" /></button></div>
      </section>}

      {journeyStep === 'reveal' && selectedStrategy && <section className={journey.centeredStep} aria-label="Dream and value reveal">
        <h2 className={journey.revealHeading}>Your trip, unlocked</h2>
        <div className={journey.valueReveal}><div><span>PAY CASH</span><strong className={journey.strike}>{formatAed(maximumCashPrice * travellerCount)}</strong><small>Typical ticket cost</small></div><span className={journey.or}>OR</span><div className={journey.milesOption}><span>UNLOCK WITH MILES <i className="ti ti-sparkles" /></span><strong>{formatNumber(selectedStrategy.original_target_miles)} <small>miles</small></strong><small>+ airline taxes &amp; charges</small></div></div>
        <div className={journey.goalCallout}><i className="ti ti-sparkles" /><p>Don&apos;t spend <strong>{formatAed(maximumCashPrice * travellerCount)}</strong> buying tickets. Earnn will help you unlock <strong>{formatNumber(selectedStrategy.original_target_miles)} miles.</strong></p></div>
        <div className={journey.timelineCallout}><i className="ti ti-clock-hour-4" /><p>UAE residents could reach this goal in <strong>{selectedCandidate ? timelineBand(selectedCandidate.months_to_goal).replace(/^(As little as |Around )/, '') : 'a personalized timeline'}</strong></p></div>
        <button className="btn-primary" onClick={() => openPersonalization('reveal')}>Build My Plan <i className="ti ti-arrow-right" /></button>
      </section>}
    </section>)}

    {loading && Object.keys(effectiveResponses).length > 0 && <div className={styles.updating} role="status"><span /><strong>Updating {loadingAirlines.map(airlineLabel).join(' and ')} plan…</strong></div>}
    <MilesDisclosure />
    <MilesResultFilters open={filtersOpen} onClose={() => setFiltersOpen(false)} bank={bankFilter} onBankChange={setBankFilter} banks={bankOptions} airlineScope={airlineScope} onAirlineScopeChange={setAirlineScope} available={available} />
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
