'use client'

/* eslint-disable @next/next/no-img-element */

// Trip Planner results, one screen: four dropdowns (where, how many people, class, airline) above one trip tile and a "Show me how" button.
// The trip is the existing Customize engine (/api/trip-planner/customize) fetched once per destination and airline; people and class are then
// worked out in the browser with the same resolver the Miles Goal result uses, so only a new destination or airline shows the calculating blur.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { getCardImageUrl } from '@/lib/api'
import { ART } from '@/components/bulk-spend-miles/BulkResultView'
import { simulateTripCustomize, type TripItem, type TripPlannerRequest } from '@/lib/trip-planner/api'
import type { Airline, AirlineScope, MilesGoalSimulationResponse, StrategyId } from '@/lib/miles-goal/contracts'
import { airlineLabel } from '@/lib/miles-goal/format'
import { AIRLINE_LABEL, CABIN_LABEL, PARTY_ICON, tripArt } from '@/lib/trip-planner/format'
import { rankedCandidates } from '@/lib/miles-goal/merge-airlines'
import { getMilesRegion, supportedMilesAirlines, type MilesRegionId } from '@/lib/miles-goal/regions'
import { resolveCatalog, withTravellerTarget } from '@/lib/miles-goal/resolver'
import WorldRegionMap from '@/components/miles-goal/WorldRegionMap'
import { saveSelectedTrip, saveTripAlternatives, type TripAlternative } from '@/lib/trip-planner/session'
import journey from '@/app/miles/results/MilesJourney.module.css'
import local from './TripCustomizeWizard.module.css'
import styles from './TripExplorer.module.css'
import card from './TripResults.module.css'

const CLASSES: { id: StrategyId, cabin: 'economy' | 'business' | 'upgrade', label: string }[] = [
  { id: 'smartest', cabin: 'upgrade', label: 'Business class upgrade' },
  { id: 'dream', cabin: 'business', label: 'Business class' },
  { id: 'easiest', cabin: 'economy', label: 'Economy' },
]
const PEOPLE = [1, 2, 3, 4, 5, 6]
const PARTY_PEOPLE: Record<string, number> = { single: 1, couple: 2, family4: 4 }

const REGION_PHOTO: Record<MilesRegionId, string> = {
  uk_ireland: ART.london.image, europe: ART.london.image, north_america: ART.manhattan.image, australia_new_zealand: ART.sydney.image,
  indian_ocean_islands: ART.maldives.image, north_africa: ART.egypt.image, indian_subcontinent: ART.india.image,
  southeast_asia: '/trip-planner/destinations/southeast_asia.jpg', japan_korea: '/trip-planner/destinations/japan_korea.jpg',
  china_east_asia: '/trip-planner/destinations/china_east_asia.jpg', middle_east: '/trip-planner/destinations/middle_east.jpg',
  philippines: '/trip-planner/destinations/philippines.jpg', sub_saharan_africa: '/trip-planner/destinations/sub_saharan_africa.jpg',
  russia_central_asia: '/trip-planner/destinations/russia_central_asia.jpg', south_america: '/trip-planner/destinations/south_america.jpg',
}

// Photo names the trip page knows (tripArt) for regions whose own name has no picture.
const ART_NAME: Partial<Record<MilesRegionId, string>> = {
  uk_ireland: 'London or Europe', europe: 'London or Europe', north_america: 'New York', australia_new_zealand: 'Sydney',
  indian_ocean_islands: 'The Maldives', north_africa: 'Egypt', indian_subcontinent: 'India',
}
const STORE = 'earnn_trip_explorer'


/** Destination name only, kept short for display: the first place before an "or" ("Egypt or the Middle East" -> "Egypt"). */
const placeName = (trip: TripItem) => (trip.destination_names[0] ?? '').split(/\s+or\s+/i)[0].replace(/^the\s+/i, '').replace(/\s+and\s+.*$/i, '').trim()
const CABIN_STRATEGY: Record<TripItem['cabin'], StrategyId> = { economy: 'easiest', business: 'dream', upgrade: 'smartest' }

// The hero sample: it starts as the engine's own example trip and, as the user changes destination, people, class or airline, the same
// card is recalculated in place.
export default function TripExplorer({ example, request, useExisting, notice, onOpenExample }: { example: TripItem, request: TripPlannerRequest, useExisting: boolean, notice?: ReactNode, onOpenExample: () => void }) {
  const router = useRouter()
  const top = example
  const firstRegion = top?.region_keys.find(key => getMilesRegion(key)) ?? 'europe'
  // Coming back from the trip page keeps the choices made here; otherwise the top trip is the starting point.
  // The choices belong to the spending they were made for: a new search starts again from the engine's example.
  const requestKey = JSON.stringify(request)
  const [saved] = useState<{ regionId?: string, people?: number, strategy?: string, airline?: string }>(() => {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORE) ?? '{}')
      return stored.requestKey === requestKey ? stored : {}
    } catch { return {} }
  })
  const [regionId, setRegionId] = useState<MilesRegionId>(getMilesRegion(saved.regionId ?? null)?.id ?? getMilesRegion(firstRegion)?.id ?? 'europe')
  const [people, setPeople] = useState(PEOPLE.includes(saved.people ?? 0) ? saved.people! : PARTY_PEOPLE[top?.party ?? 'single'] ?? 1)
  const [strategy, setStrategy] = useState<StrategyId>(CLASSES.some(item => item.id === saved.strategy) ? saved.strategy as StrategyId : CABIN_STRATEGY[top.cabin])
  const [airline, setAirline] = useState<Airline | 'any'>(saved.airline === 'emirates' || saved.airline === 'etihad' ? saved.airline : 'any')
  // The example is shown as it came from the engine until the user changes something (or comes back from the trip page with a choice).
  const [submitted, setSubmitted] = useState(() => !!getMilesRegion(saved.regionId ?? null))
  const [mapOpen, setMapOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [previewRegionId, setPreviewRegionId] = useState<MilesRegionId | null>(null)
  useEffect(() => {
    if (!submitted) return
    try { sessionStorage.setItem(STORE, JSON.stringify({ requestKey, regionId, people, strategy, airline })) } catch { /* storage is a convenience */ }
  }, [submitted, requestKey, regionId, people, strategy, airline])
  const [responses, setResponses] = useState<Partial<Record<Airline, MilesGoalSimulationResponse>>>({})
  const [loading, setLoading] = useState(submitted)
  const [error, setError] = useState('')
  const cache = useRef(new Map<string, MilesGoalSimulationResponse>())

  const region = getMilesRegion(regionId)!
  const supported = useMemo(() => [...supportedMilesAirlines(region)], [region])
  const airlines = useMemo<Airline[]>(() => airline !== 'any' && supported.includes(airline) ? [airline] : supported, [airline, supported])
  const existingKey = useExisting ? request.existing_card_ids.join(',') : ''

  // One engine call per destination and airline (kept for the session); everything else is worked out below without a call.
  useEffect(() => {
    if (!submitted) return
    let current = true
    const controller = new AbortController()
    const run = async () => {
      setLoading(true)
      setError('')
      try {
        const next: Partial<Record<Airline, MilesGoalSimulationResponse>> = {}
        for (const code of airlines) {   // one after the other: the engine shares one database client
          const key = `${regionId}|${code}|${existingKey}`
          let response = cache.current.get(key)
          if (!response) {
            response = await simulateTripCustomize({ ...request, destination_region: regionId, airline: code, use_existing_only: useExisting }, { signal: controller.signal })
            cache.current.set(key, response)
          }
          next[code] = response
        }
        if (current) setResponses(next)
      } catch (reason) {
        if (current && !(reason instanceof DOMException && reason.name === 'AbortError')) setError(reason instanceof Error ? reason.message : 'We could not calculate this trip right now.')
      } finally {
        if (current) setLoading(false)
      }
    }
    void run()
    return () => { current = false; controller.abort() }
  }, [submitted, regionId, airlines, request, useExisting, existingKey])

  const scope: AirlineScope = airlines.length === 1 ? airlines[0] : 'best'
  const best = useMemo(() => {
    const resolved: Partial<Record<Airline, MilesGoalSimulationResponse>> = {}
    for (const [code, response] of Object.entries(responses) as [Airline, MilesGoalSimulationResponse][]) {
      const catalog = withTravellerTarget(response.interaction_catalog, people, 1)
      resolved[code] = { ...response, interaction_catalog: catalog, resolved_view: resolveCatalog(catalog, catalog.toggle_defaults) }
    }
    const byClass = Object.fromEntries(CLASSES.map(({ id }) => [id, rankedCandidates(resolved, scope, id)[0] ?? null])) as Record<StrategyId, ReturnType<typeof rankedCandidates>[number] | null>
    const pick = byClass[strategy]
    const cardName = pick ? resolved[pick.airline]?.interaction_catalog.cards.find(card => card.earnn_card_id === pick.earnn_card_id)?.card_name ?? null : null
    const card = pick ? resolved[pick.airline]?.interaction_catalog.cards.find(item => item.earnn_card_id === pick.earnn_card_id) ?? null : null
    const alternatives: TripAlternative[] = []
    const seen = new Set<string>()
    for (const candidate of rankedCandidates(resolved, scope, strategy)) {
      const key = `${candidate.earnn_card_id}|${candidate.airline}`
      const info = resolved[candidate.airline]?.interaction_catalog.cards.find(item => item.earnn_card_id === candidate.earnn_card_id)
      if (seen.has(key) || !info || alternatives.length >= 24) continue
      seen.add(key)
      alternatives.push({ earnn_card_id: info.earnn_card_id, card_name: info.card_name, bank_code: info.bank_code, bank_name: info.bank_name, airline: candidate.airline, months: candidate.months_to_goal, miles_needed: candidate.original_target_miles, annual_fee_aed: candidate.annual_fee_from_year2_aed })
    }
    return { byClass, pick, cardName, card, alternatives }
  }, [responses, people, scope, strategy])

  const className = CLASSES.find(item => item.id === strategy)!
  const alternative = CLASSES.find(item => item.id !== strategy && best.byClass[item.id])
  // "Show me how" opens the trip page: the one full card plan with alternatives below it, built from this selection.
  const showHow = () => {
    const { pick, card } = best
    if (!pick || !card) return
    const names = [region.label, ...(ART_NAME[regionId] ? [ART_NAME[regionId]!] : [])]
    const trip: TripItem = {
      trip_id: `${regionId}-${people}-${className.cabin}`,
      hook: `${className.label} to ${region.label}`,
      destination_names: names,
      cabin: className.cabin,
      party: people === 1 ? 'single' : people === 2 ? 'couple' : 'family4',
      travellers: people,
      miles_needed: pick.original_target_miles,
      months: pick.months_to_goal,
      ready_now: pick.months_to_goal <= 0,
      slot: 'normal',
      is_hero: false,
      score: 0,
      airline: pick.airline,
      top_card: { earnn_card_id: card.earnn_card_id, card_name: card.card_name, bank_code: card.bank_code, bank_name: card.bank_name, miles_when_reached: pick.total_miles_at_goal },
      how: null,
      region_keys: [regionId],
    }
    saveSelectedTrip(trip)
    saveTripAlternatives(best.alternatives)
    router.push('/trip-planner/trip')
  }

  const dynamic = submitted
  const photo = dynamic ? REGION_PHOTO[regionId] : tripArt(example.destination_names)?.image ?? REGION_PHOTO[regionId]
  const name = dynamic ? region.label : placeName(example)
  const cabin = dynamic ? className.cabin : example.cabin
  const months = dynamic ? best.pick?.months_to_goal ?? 0 : example.months
  const ready = dynamic ? months <= 0 : example.ready_now
  const partyIcon = PARTY_ICON[dynamic ? (people === 1 ? 'single' : people === 2 ? 'couple' : 'family4') : example.party]
  const peopleText = dynamic ? `${people} ${people === 1 ? 'person' : 'people'}` : example.party === 'family4' ? 'Family of 4' : `${example.travellers} ${example.travellers === 1 ? 'person' : 'people'}`
  const airlineName = dynamic ? best.pick && AIRLINE_LABEL[best.pick.airline].split(' ')[0] : example.airline && AIRLINE_LABEL[example.airline].split(' ')[0]
  const cardName = dynamic ? best.cardName : example.top_card?.card_name
  const showCard = !dynamic || !!best.pick
  const change = <T,>(set: (value: T) => void) => (value: T) => { set(value); setSubmitted(true) }

  // The card behind the trip and what it earns by then. For the engine's own example the welcome bonus is known; once the user changes
  // something the total is shown on its own.
  const cardId = dynamic ? best.card?.earnn_card_id : example.top_card?.earnn_card_id
  const totalMiles = dynamic ? best.pick?.total_miles_at_goal ?? 0 : example.top_card?.miles_when_reached ?? example.miles_needed
  const welcomeMiles = dynamic ? 0 : example.how?.welcome_miles ?? 0
  const spendMiles = Math.max(0, totalMiles - welcomeMiles)
  const roundMiles = (value: number) => Math.round(value / 1000) * 1000
  const targetMiles = dynamic ? best.pick?.original_target_miles ?? 0 : example.miles_needed
  const fine = `${useExisting ? 'Estimated time to earn the miles with your own cards.' : 'Estimated time to earn the miles, including the welcome bonus.'} Actual upgrade seats depend on airline availability.`

  return <section className={card.example} id="explore" aria-labelledby="example-title">
    <div className={styles.xWrap}>
      <div className={styles.xHead}>
        <div className={styles.xTitle}>
          <h2 id="example-title">Here’s one trip you could take</h2>
          <p>This is just one example based on your spending. Choose a different destination to see more possibilities.</p>
        </div>
        <div className={styles.xTools}>
          <button type="button" className={styles.xDest} onClick={() => setMapOpen(true)} aria-label={`Choose your Location. Now: ${name}`}>
            <i className="ti ti-map-pin" aria-hidden="true" />
            <span><small>Choose your Location</small><b>{name}</b></span>
            <i className="ti ti-chevron-down" aria-hidden="true" />
          </button>
          <button type="button" className={styles.xMore} onClick={() => setMoreOpen(open => !open)} aria-expanded={moreOpen}>
            <i className="ti ti-adjustments-horizontal" aria-hidden="true" /> More options <i className={`ti ${moreOpen ? 'ti-chevron-up' : 'ti-chevron-down'}`} aria-hidden="true" />
          </button>
        </div>
      </div>
      {moreOpen && <div className={styles.xPanel}>
        <label><span><i className="ti ti-users" aria-hidden="true" /> People</span>
          <select value={people} onChange={event => change(setPeople)(Number(event.target.value))}>{PEOPLE.map(count => <option key={count} value={count}>{count} {count === 1 ? 'adult' : 'adults'}</option>)}</select></label>
        <label><span><i className="ti ti-armchair" aria-hidden="true" /> Class</span>
          <select value={strategy} onChange={event => change(setStrategy)(event.target.value as StrategyId)}>{CLASSES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        <label><span><i className="ti ti-plane" aria-hidden="true" /> Airline <small>(optional)</small></span>
          <select value={airline} onChange={event => change(setAirline)(event.target.value as Airline | 'any')}><option value="any">No preference</option>{supported.map(code => <option key={code} value={code}>{airlineLabel(code)}</option>)}</select></label>
      </div>}
      {notice}

      <div className={styles.cardWrap}>
        <article className={styles.xCard}>
          <div className={styles.xPhoto}>
            <img src={photo} alt="" />
            <span className={styles.xBadge}><i className="ti ti-sparkles" aria-hidden="true" /> {dynamic ? 'YOUR TRIP' : 'EXAMPLE TRIP'}</span>
            <span className={styles.xName}><i className="ti ti-map-pin-filled" aria-hidden="true" /><span><small>UAE to</small><strong>{name}</strong></span></span>
          </div>
          <div className={styles.xBody}>
            {error
              ? <div className={styles.message} role="alert"><i className="ti ti-alert-circle" aria-hidden="true" /><b>We could not calculate this trip.</b><p>{error}</p></div>
              : showCard
                ? <>
                  <small className={styles.xEarliest}>Earliest you could fly</small>
                  <b className={styles.xWhen}>{ready ? 'You could fly now' : `In about ${months} month${months === 1 ? '' : 's'}`} <i className="ti ti-info-circle" title={fine} aria-label={fine} /></b>
                  <ul className={styles.xChips}>
                    <li><i className={`ti ${partyIcon}`} aria-hidden="true" /> {peopleText}</li>
                    <li><i className="ti ti-armchair" aria-hidden="true" /> {dynamic ? className.label : CABIN_LABEL[example.cabin]}</li>
                    {airlineName && <li><i className="ti ti-plane" aria-hidden="true" /> {airlineName}</li>}
                    {targetMiles > 0 && <li className={styles.xTargetChip}><i className="ti ti-target-arrow" aria-hidden="true" /> Target ~ {roundMiles(targetMiles).toLocaleString('en-US')} miles</li>}
                  </ul>
                  {cardName && <div className={styles.xRec}>
                    <small>Recommended card</small>
                    <div className={styles.xRecRow}>
                      {cardId && <img className={styles.xCardImg} src={getCardImageUrl(cardId)} alt="" onError={event => { event.currentTarget.src = '/card-dummy.svg' }} />}
                      <div className={styles.xRecText}>
                        <b>{cardName}</b>
                        {totalMiles > 0 && <div className={styles.xSum}>
                          {welcomeMiles > 0
                            ? <><span><b>~ {roundMiles(welcomeMiles).toLocaleString('en-US')}</b>welcome bonus</span><i>+</i><span><b>{roundMiles(spendMiles).toLocaleString('en-US')}</b>from your spending</span><i>=</i></>
                            : null}
                          <span><b>~ {roundMiles(totalMiles).toLocaleString('en-US')}</b>miles/points</span>
                        </div>}
                        <button type="button" className={styles.xHow} onClick={dynamic ? showHow : onOpenExample}>Show me how <i className="ti ti-arrow-right" aria-hidden="true" /></button>
                      </div>
                    </div>
                  </div>}
                </>
                : !loading && <div className={styles.message}>
                  <i className="ti ti-plane-off" aria-hidden="true" />
                  <b>There is no possibility for this trip yet.</b>
                  <p>{people > 1 ? 'Try fewer people' : 'Try another destination'}{alternative ? <> or <button type="button" onClick={() => setStrategy(alternative.id)}>switch to {alternative.label}</button></> : ''}.</p>
                </div>}
          </div>
        </article>
        {loading && <div className={styles.loading} role="status" aria-live="polite"><span className={styles.spinner} aria-hidden="true" /><b>Calculating your trip to {region.label}…</b><small>Checking every eligible card against your spending.</small></div>}
      </div>
    </div>
    {mapOpen && <div className={`${journey.editorBackdrop} ${local.backdrop}`} role="dialog" aria-modal="true" aria-label="Pick your destination" onClick={() => setMapOpen(false)}>
      <section className={`${journey.shell} ${journey.editorDialog} ${local.dialog} ${local.mapStep}`} onClick={event => event.stopPropagation()}>
        <div className={journey.progress}><span>PICK YOUR DESTINATION</span><button type="button" onClick={() => setMapOpen(false)} aria-label="Close"><i className="ti ti-x" /></button></div>
        <div className={local.mapWrap}><WorldRegionMap selectedRegionId={regionId} previewRegionId={previewRegionId} onPreview={setPreviewRegionId} onSelect={next => { setRegionId(next.id); setSubmitted(true); setAirline('any'); setMapOpen(false) }} /></div>
        <h2 className={local.mapHeading}>Where do you want to fly?</h2>
        <div className={`${journey.stepAction} ${local.actions}`}><span className={local.flyingFrom}><i className="ti ti-plane-departure" aria-hidden="true" /> Flying from UAE</span></div>
      </section>
    </div>}
  </section>
}
