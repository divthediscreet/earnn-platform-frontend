'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import AirlineScopeSwitch from '@/components/miles-goal/AirlineScopeSwitch'
import MilesCardTile from '@/components/miles-goal/MilesCardTile'
import MilesCustomizeDrawer from '@/components/miles-goal/MilesCustomizeDrawer'
import MilesDisclosure from '@/components/miles-goal/MilesDisclosure'
import MilesLoadingState from '@/components/miles-goal/MilesLoadingState'
import MilesResultSummaryCard from '@/components/miles-goal/MilesResultSummaryCard'
import MilesResultFilters from '@/components/miles-goal/MilesResultFilters'
import StrategyFocusTabs from '@/components/miles-goal/StrategyFocusTabs'
import { simulateMilesGoal } from '@/lib/miles-goal/api'
import type {
  Airline, AirlineScope, MilesGoalSimulationResponse, PersonalizedProfile,
  StrategyId, ToggleState,
} from '@/lib/miles-goal/contracts'
import { DEFAULT_TOGGLE_STATE } from '@/lib/miles-goal/contracts'
import { airlineLabel, formatAed, formatMiles } from '@/lib/miles-goal/format'
import { getMilesRegion } from '@/lib/miles-goal/regions'
import { resolveCatalog } from '@/lib/miles-goal/resolver'
import { buildDisplayCards } from '@/lib/miles-goal/selectors'
import { rankedCandidates } from '@/lib/miles-goal/merge-airlines'
import { clearMilesGoalSession, readMilesGoalSession, writeMilesGoalSession } from '@/lib/miles-goal/storage'
import { emptySpendProfile } from '@/lib/spend-categories'
import styles from './MilesResults.module.css'
import love from './LoveableMilesResult.module.css'
import heading from './HeroHeadingOverride.module.css'
import density from './StrategyDensity.module.css'
import filterButton from './ResultsFilterButton.module.css'
import planBar from './StrategyPlanBar.module.css'
import heroLift from './HeroLift.module.css'
import planCompact from './StrategyPlanBarCompact.module.css'

const AIRLINES: Airline[] = ['emirates', 'etihad']
const STRATEGY_COPY: Record<StrategyId, { eyebrow: string; label: string; outcome: string }> = {
  easiest: { eyebrow: 'EASIEST', label: 'Economy', outcome: 'Economy flight' },
  dream: { eyebrow: 'DREAM', label: 'Business Class', outcome: 'Business Class' },
  smartest: { eyebrow: 'SMARTEST', label: 'Upgrade to Business', outcome: 'Business Class upgrade' },
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

function MilesResultsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const region = getMilesRegion(searchParams.get('region'))
  const isLegacyView = searchParams.get('view') === 'legacy'
  const [profile, setProfile] = useState<PersonalizedProfile | null>(null)
  const [responses, setResponses] = useState<Partial<Record<Airline, MilesGoalSimulationResponse>>>({})
  const [toggles, setToggles] = useState<Partial<Record<Airline, ToggleState>>>({})
  const [airlineScope, setAirlineScope] = useState<AirlineScope>('best')
  const [focused, setFocused] = useState<StrategyId>('dream')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [bankFilter, setBankFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [loadingAirlines, setLoadingAirlines] = useState<Airline[]>([])
  const [errors, setErrors] = useState<Partial<Record<Airline, string>>>({})
  const [announcement, setAnnouncement] = useState('')
  const requestIdRef = useRef(0)
  const controllersRef = useRef<AbortController[]>([])
  const initializedRegionRef = useRef<string | null>(null)

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

  useEffect(() => {
    if (!region || initializedRegionRef.current === region.id) return
    initializedRegionRef.current = region.id
    const stored = readMilesGoalSession()
    if (stored?.region_id === region.id && stored.profile && Object.keys(stored.responses).length) {
      setProfile(stored.profile)
      setResponses(stored.responses)
      setToggles(stored.toggles)
      setAirlineScope(stored.airline_scope)
      setFocused(stored.focused_strategy)
      return
    }
    setResponses({})
    setToggles({})
    setErrors({})
    const initialProfile = starterProfile()
    setProfile(initialProfile)
    void runSimulation(initialProfile, AIRLINES, true)
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

  const unfilteredDisplayCards = buildDisplayCards(effectiveResponses, airlineScope, focused)
  const displayCards = bankFilter === 'all'
    ? unfilteredDisplayCards
    : unfilteredDisplayCards.filter(card => card.bank_code === bankFilter)
  const filterCards = Object.values(effectiveResponses).flatMap(response => response.interaction_catalog.cards)
  const cardBankById = new Map(filterCards.map(card => [card.earnn_card_id, card.bank_code]))
  const bankOptions = [...new Map(filterCards.map(card => [
    card.bank_code,
    { value: card.bank_code, label: `${card.bank_name} (${card.bank_code})` },
  ] as const)).values()].sort((a, b) => a.label.localeCompare(b.label))
  const strategyCards = (['easiest', 'dream', 'smartest'] as StrategyId[]).map(strategyId => ({
    strategyId,
    candidate: rankedCandidates(effectiveResponses, airlineScope, strategyId).find(candidate => bankFilter === 'all' || cardBankById.get(candidate.earnn_card_id) === bankFilter) ?? null,
  }))
  const available = { emirates: !!responses.emirates, etihad: !!responses.etihad }
  const partial = available.emirates !== available.etihad
  const totalSpend = profile ? Object.values(profile.spend).reduce((sum, value) => sum + value, 0) : 0
  const origins = [...new Set((Object.values(effectiveResponses) as MilesGoalSimulationResponse[]).map(response => response.route.origin))]
  const legacyHref = `/miles/results?region=${encodeURIComponent(region.id)}&view=legacy`
  const newHref = `/miles/results?region=${encodeURIComponent(region.id)}`

  return <div className={`${styles.page} ${!isLegacyView ? love.page : ''}`}>
    <div className={styles.announcement} aria-live="polite">{announcement}</div>
    {isLegacyView ? <header className={styles.hero}>
      <div><span className={styles.kicker}>YOUR MILES GOAL</span><h1>{profile ? 'Your personal plan is ready' : `Plan your flight to ${region.label} ✈`}</h1><p>{profile ? `Based on ${formatAed(totalSpend)} monthly spending` : 'Add salary and spending to calculate eligible card routes without inventing your profile.'}</p>{origins.length > 0 && <small>{region.label} estimate based on {origins.join(' / ')} → {region.label} redemption routes.</small>}</div>
      <div className={styles.heroActions}><button className="btn-primary" onClick={() => setDrawerOpen(true)}>{profile ? 'Update my plan' : 'Personalize my plan'} <i className="ti ti-adjustments-horizontal" /></button><Link className={styles.viewSwitch} href={newHref}>View new result</Link><button className={styles.startOver} onClick={startOver}>Start over</button></div>
    </header> : <header className={`${styles.newHero} ${region.id === 'america' ? love.destinationAmerica : love.destinationGeneric} ${love.hero} ${heroLift.hero}`}>
      <div className={`${styles.newHeroCopy} ${love.heroCopy} ${heading.heroCopy}`}><span className={`${styles.newKicker} ${love.kicker}`}>YOUR EARNN FLIGHT PLAN TO {region.label.toUpperCase()}</span><h1 className={`${heading.heading} ${heading.walletHeading}`}>Your next Business Class flight<br />may already be in your<br /><em className={heading.walletWord}>wallet.</em></h1><p className={`${styles.heroIntroduction} ${love.heroIntroduction}`}>Earnn shows you how to turn your everyday spending into your next flight.</p></div>
    </header>}

    {Object.keys(errors).length > 0 && <section className={styles.partial} role="status"><i className="ti ti-alert-triangle" /><div><strong>{Object.keys(effectiveResponses).length ? 'Some airline results are unavailable' : 'We could not build the plan yet'}</strong>{AIRLINES.filter(airline => errors[airline]).map(airline => <p key={airline}>{airlineLabel(airline)}: {errors[airline]} {profile && <button onClick={() => void runSimulation(profile, [airline], false)}>Retry</button>}</p>)}</div></section>}

    {!profile && !loading && <section className={styles.profileGate}><div><i className="ti ti-lock-open" /></div><span>PERSONALIZED, NOT FABRICATED</span><h2>Add your salary and monthly spending</h2><p>Card eligibility depends on salary, so Earnn will not assume one for you. Your inputs stay in this browser session.</p><button className="btn-primary" onClick={() => setDrawerOpen(true)}>Build my plan <i className="ti ti-arrow-right" /></button></section>}
    {loading && !Object.keys(effectiveResponses).length && <MilesLoadingState destination={region.label} />}

    {Object.keys(effectiveResponses).length > 0 && (isLegacyView ? <>
      <section className={styles.controls} aria-label="Miles plan controls">
        <div><span>AIRLINE VIEW</span><AirlineScopeSwitch value={airlineScope} onChange={setAirlineScope} available={available} partial={partial} /></div>
        <div><span>RANK CARDS FOR</span><StrategyFocusTabs value={focused} onChange={setFocused} /></div>
      </section>

      <div className={styles.resultHeading}><div><span>FASTEST OPTIONS</span><h2>{focused === 'easiest' ? 'Economy — Easiest' : focused === 'dream' ? 'Business — Dream' : 'Upgrade — Smartest'}</h2></div><p>{displayCards.length} card{displayCards.length === 1 ? '' : 's'} reach this goal within 36 months using the selected assumptions.</p></div>
      {displayCards.length ? <section className={styles.cards}>{displayCards.map(card => <MilesCardTile key={card.earnn_card_id} card={card} monthlySpend={totalSpend} responses={effectiveResponses} toggles={toggles} onToggleChange={changeToggle} />)}</section> : <section className={styles.empty}><i className="ti ti-plane-off" /><h2>No route reaches this goal within 36 months</h2><p>Try another strategy, airline, or update your spending profile.</p></section>}
    </> : <>
      <section className={`${styles.strategySection} ${love.strategySection} ${density.section}`} aria-label="Choose your flight goal"><div className={`${styles.sectionIntro} ${love.strategyIntro} ${density.intro}`}><div><span>THREE WAYS TO GET THERE</span><h2>Pick the trip you actually want.</h2></div></div><div className={`${styles.strategyCards} ${love.strategyGrid}`}>{strategyCards.map(({ strategyId, candidate }) => <button key={strategyId} type="button" className={`${styles.strategyCard} ${love.strategyCard} ${density.card} ${focused === strategyId ? `${styles.strategySelected} ${love.strategySelected} ${density.selected}` : ''} ${strategyId === 'easiest' ? density.economyVisual : strategyId === 'dream' ? density.dreamNeutral : density.smartestVisual}`} aria-pressed={focused === strategyId} onClick={() => setFocused(strategyId)}>{focused === strategyId && <i className={`${density.selectedTick} ti ti-check`} aria-hidden="true" />}<span><i className={`ti ti-${strategyId === 'easiest' ? 'plane' : strategyId === 'dream' ? 'sparkles' : 'trending-up'}`} /> {STRATEGY_COPY[strategyId].eyebrow}</span><strong>{STRATEGY_COPY[strategyId].label}</strong><p>{strategyId === 'easiest' ? 'The quickest way to be on a plane.' : strategyId === 'dream' ? 'The Business Class flight you daydream about.' : 'Buy Premium Economy, then upgrade to Business.'}</p>{candidate ? <div><div className={density.milesTarget}><span>MILES TO GOAL</span><b>{formatMiles(candidate.target_at_goal_miles)}</b></div><div className={density.timelineTarget}><span>MILES GOAL IN</span><b>{candidate.months_to_goal} {candidate.months_to_goal === 1 ? 'month' : 'months'}</b></div></div> : <small>Not available within 36 months</small>}</button>)}</div></section>
      <section className={`${planBar.bar} ${planCompact.bar}`}><span className={`${planBar.message} ${planCompact.message}`}>Estimated plan for AED 10,000 monthly spending and AED 30,000 monthly salary</span><button className="btn-primary" onClick={() => setDrawerOpen(true)}>Use My Spending <i className="ti ti-adjustments-horizontal" /></button><Link className={`${planBar.legacy} ${planCompact.legacy}`} href={legacyHref}>View legacy result</Link></section>
      <div className={`${styles.newResultHeading} ${love.resultsHeading}`}><div><span>FASTEST CARDS</span><h2>Start with the card that gets you there sooner.</h2></div><button type="button" className={filterButton.button} onClick={() => setFiltersOpen(true)}><i className="ti ti-adjustments-horizontal" /> All filters</button></div>
      {displayCards.length ? <section className={styles.summaryCards}>{displayCards.map(card => <MilesResultSummaryCard key={card.earnn_card_id} card={card} focused={focused} monthlySpend={totalSpend} responses={effectiveResponses} toggles={toggles} onToggleChange={changeToggle} />)}</section> : <section className={styles.empty}><i className="ti ti-plane-off" /><h2>No route reaches this goal within 36 months</h2><p>Try another strategy, airline, or update your spending profile.</p></section>}
      <section className={`${styles.personalize} ${love.personalize}`}><div><span>MAKE IT YOURS</span><h2>Want a plan based on your actual spending?</h2><p>Tell Earnn a little more about you and we&apos;ll recalculate your timeline.</p></div><div className={styles.personalizeValues}><span>Monthly salary <b>{formatAed(profile?.salary_aed || 30000)}</b></span><span>Monthly spending <b>{formatAed(totalSpend || 10000)}</b></span></div><button className="btn-primary" onClick={() => setDrawerOpen(true)}>Update my plan <i className="ti ti-arrow-right" /></button></section>
    </>)}

    {loading && Object.keys(effectiveResponses).length > 0 && <div className={styles.updating} role="status"><span /><strong>Updating {loadingAirlines.map(airlineLabel).join(' and ')} plan…</strong></div>}
    <MilesDisclosure />
    <MilesResultFilters open={filtersOpen} onClose={() => setFiltersOpen(false)} bank={bankFilter} onBankChange={setBankFilter} banks={bankOptions} airlineScope={airlineScope} onAirlineScopeChange={setAirlineScope} available={available} />
    {drawerOpen && <MilesCustomizeDrawer open onClose={closeDrawer} onSubmit={submitProfile} initial={profile} submitting={loading} />}
  </div>
}

export default function MilesResultsPage() {
  return <Suspense fallback={<div className={styles.page}><MilesLoadingState destination="your destination" /></div>}><MilesResultsContent /></Suspense>
}
