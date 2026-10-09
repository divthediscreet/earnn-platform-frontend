'use client'

// "Customize My Trip" as a small step-by-step pop-up on the Trip Planner results page:
//   1 where to fly (the Miles Goal world map)  ->  2 how to fly (the Miles Goal cabin cards)  ->
//   3 who is flying, airline and one way / return  ->  4 anything else (only when there is something to ask).
// Nothing is calculated here.  The last step sends the user to the existing Miles Goal result page (source=trip), which shows its
// rotating-globe holding screen, runs the Trip Planner engine with every Miles Goal fallback, and then shows the result unchanged.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import WorldRegionMap from '@/components/miles-goal/WorldRegionMap'
import TripCardChoice from '@/components/trip-planner/TripCardChoice'
import { simulateTripCustomize } from '@/lib/trip-planner/api'
import type { TripPlannerRequest } from '@/lib/trip-planner/api'
import type { Airline, StrategyId } from '@/lib/miles-goal/contracts'
import { formatAed, formatNumber } from '@/lib/miles-goal/format'
import { AIRLINE_LOGO } from '@/lib/trip-planner/bank-logos'
import { airlineLabel } from '@/lib/miles-goal/format'
import { supportedMilesAirlines, type MilesRegion, type MilesRegionId } from '@/lib/miles-goal/regions'
import { clearMilesGoalSession } from '@/lib/miles-goal/storage'
import styles from '@/app/miles/results/MilesResults.module.css'
import love from '@/app/miles/results/LoveableMilesResult.module.css'
import density from '@/app/miles/results/StrategyDensity.module.css'
import journey from '@/app/miles/results/MilesJourney.module.css'
import local from './TripCustomizeWizard.module.css'

type Travellers = { adults: number; children: number; infants: number }
type StrategyEstimate = { cash: number, miles: number, saving: number }

const STRATEGIES: { id: StrategyId, cabin: 'economy' | 'business' | 'upgrade', eyebrow: string }[] = [
  { id: 'easiest', cabin: 'economy', eyebrow: 'GO SOONER' },
  { id: 'dream', cabin: 'business', eyebrow: 'DREAM BIG' },
  { id: 'smartest', cabin: 'upgrade', eyebrow: 'SMART VALUE' },
]
const STEP_TITLE = ['Choose where do you want to fly?', 'How do you want to fly?', 'Who is flying?', 'One more thing'] as const

/**
 * The "Earnn's pick" badge on the Upgrade card.  The card clips its own content and grows when it is selected or hovered, so the
 * badge lives outside it and is re-aligned to the card's real top-right corner (transform included) while the card animates.
 */
function PickBadge({ selected, children }: { selected: boolean, children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null)
  const badge = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const place = () => {
      const card = wrap.current?.querySelector('button')
      const tag = badge.current
      if (!card || !tag || !wrap.current) return
      const outer = wrap.current.getBoundingClientRect()
      const inner = card.getBoundingClientRect()
      tag.style.top = `${inner.top - outer.top - 15}px`
      tag.style.right = `${outer.right - inner.right + 16}px`
    }
    place()
    let frame = 0
    const until = performance.now() + 700   // follow the card while its transition runs
    const follow = () => { place(); if (performance.now() < until) frame = requestAnimationFrame(follow) }
    frame = requestAnimationFrame(follow)
    const card = wrap.current?.querySelector('button')
    card?.addEventListener('mouseenter', follow)
    card?.addEventListener('mouseleave', follow)
    window.addEventListener('resize', place)
    return () => { cancelAnimationFrame(frame); card?.removeEventListener('mouseenter', follow); card?.removeEventListener('mouseleave', follow); window.removeEventListener('resize', place) }
  }, [selected])
  return <div ref={wrap} className={local.pickWrap}>{children}<span ref={badge} className={local.pick}><i className="ti ti-crown" aria-hidden="true" /> Earnn’s pick</span></div>
}

export default function TripCustomizeWizard({ request, bankCodes, onClose }: { request: TripPlannerRequest, bankCodes: string[], onClose: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [region, setRegion] = useState<MilesRegion | null>(null)
  const [previewRegionId, setPreviewRegionId] = useState<MilesRegionId | null>(null)
  const [strategy, setStrategy] = useState<StrategyId>('dream')
  const [travellers, setTravellers] = useState<Travellers>({ adults: 1, children: 0, infants: 0 })
  const [tripType, setTripType] = useState<'one_way' | 'return'>('return')
  const [airline, setAirline] = useState<Airline | 'any'>('any')
  const [estimates, setEstimates] = useState<Partial<Record<StrategyId, StrategyEstimate>>>({})
  const abort = useRef<AbortController | null>(null)

  const airlines = useMemo(() => region ? [...supportedMilesAirlines(region)] : [], [region])
  // Step 4 only exists when there is something to ask: the cards the user already holds.
  const hasFourthStep = bankCodes.length > 0
  const lastStep = hasFourthStep ? 3 : 2

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); abort.current?.abort() }
  }, [onClose])

  // The cabin cards show the same "~ AED + ~ miles" estimates as the Miles Goal editor: fetched for the chosen region while the user picks.
  const chooseRegion = (next: MilesRegion) => {
    setRegion(next)
    setEstimates({})
    setAirline('any')
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    const first = supportedMilesAirlines(next)[0]
    simulateTripCustomize({ ...request, destination_region: next.id, airline: first, use_existing_only: false }, { signal: controller.signal })
      .then(response => setEstimates(Object.fromEntries(response.interaction_catalog.strategies.map(item => [item.strategy_id, {
        cash: item.associated_cash_aed, miles: item.original_target_miles, saving: Math.max(0, item.cash_price_aed - item.associated_cash_aed),
      }])) as Partial<Record<StrategyId, StrategyEstimate>>))
      .catch(() => undefined)   // the estimates are a courtesy; the cards work without them
    setStep(1)
  }

  const adjust = (kind: keyof Travellers, delta: number) => setTravellers(current => ({ ...current, [kind]: Math.max(kind === 'adults' ? 1 : 0, Math.min(9, current[kind] + delta)) }))

  const finish = () => {
    if (!region) return
    clearMilesGoalSession()
    const cabin = STRATEGIES.find(item => item.id === strategy)?.cabin ?? 'business'
    const params = new URLSearchParams({
      region: region.id, view: 'current', source: 'trip', direct: '1', cabin,
      adults: String(travellers.adults), children: String(travellers.children), infants: String(travellers.infants), trip: tripType,
    })
    if (airline !== 'any') params.set('airline', airline)
    router.push(`/miles/results?${params.toString()}`)
  }

  const next = () => (step >= lastStep ? finish() : setStep(step + 1))

  return <div className={`${journey.editorBackdrop} ${local.backdrop}`} role="dialog" aria-modal="true" aria-label="Customize my trip" onClick={onClose}>
    <section className={`${journey.shell} ${journey.editorDialog} ${local.dialog} ${step === 0 ? local.mapStep : ''}`} onClick={event => event.stopPropagation()}>
      <div className={journey.progress}>
        <span>CUSTOMIZE MY TRIP · {step + 1} OF {lastStep + 1}</span>
        {step > 0 && <strong>{STEP_TITLE[step]}</strong>}
        <button type="button" onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>
      </div>

      {step === 0 && <section aria-label="Where do you want to fly">
        <div className={local.mapWrap}><WorldRegionMap selectedRegionId={region?.id ?? null} previewRegionId={previewRegionId} onPreview={setPreviewRegionId} onSelect={chooseRegion} /></div>
        <h2 className={local.mapHeading}>{STEP_TITLE[0]}</h2>
      </section>}

      {step === 1 && <section className={`${styles.strategySection} ${love.strategySection} ${density.section} ${journey.strategyStep}`} aria-label="How do you want to fly">
        <h2 className={journey.strategyPrompt}>How do you want to fly?</h2>
        <div className={`${styles.strategyCards} ${love.strategyGrid}`}>{STRATEGIES.map(({ id, eyebrow }) => {
          const estimate = estimates[id]
          const card = <button key={id} type="button" className={`${styles.strategyCard} ${love.strategyCard} ${density.card} ${journey.strategyCard} ${strategy === id ? `${styles.strategySelected} ${love.strategySelected} ${density.selected}` : ''} ${id === 'easiest' ? density.economyVisual : id === 'dream' ? density.dreamNeutral : density.smartestVisual}`} aria-pressed={strategy === id} onClick={() => setStrategy(id)}>
            {strategy === id && <i className={`${density.selectedTick} ti ti-check`} aria-hidden="true" />}
            <span><i className={`ti ti-${id === 'easiest' ? 'plane' : id === 'dream' ? 'sparkles' : 'trending-up'}`} /> {eyebrow}{id === 'dream' && ' ✨'}</span>
            <strong>{id === 'easiest' ? 'Fly Economy' : id === 'dream' ? 'Fly Business Class' : 'Upgrade to Business'}</strong>
            <b className={local.bestFor}>Best for: {id === 'easiest' ? 'Families & sooner trips' : id === 'dream' ? 'The full luxury experience' : 'Getting Business for fewer miles'}</b>
            <p>{id === 'easiest' ? <>Stretch your miles across <em>more travellers or earlier trips.</em></> : id === 'dream' ? <>Use your miles to pay for <em>the full <span className={local.blueWord}>Business Class</span> ticket.</em></> : <>Buy Economy/Flex with cash, then use miles <em>where they matter most.</em></>}</p>
            <div className={`${journey.strategyEstimate} ${id !== 'smartest' ? journey.strategyEstimateLight : ''} ${id === 'easiest' ? journey.economyEstimate : ''}`}>
              <span>~ {estimate ? formatAed(estimate.cash) : '…'}</span><i aria-hidden="true">+</i><span>~ {estimate ? formatNumber(estimate.miles) : '…'} miles</span>
              <small className={journey.ticketSaving}>Saving per ticket: <b>{estimate ? formatAed(estimate.saving) : '…'}</b></small>
            </div>
          </button>
          // The Smartest strategy carries Earnn's pick badge, straddling the card's top-right edge (outside the card, which clips its own content).
          return id === 'smartest'
            ? <PickBadge key={id} selected={strategy === id}>{card}</PickBadge>
            : card
        })}</div>
      </section>}

      {step === 2 && <section className={`${journey.compactTravellerStep} ${local.whoStep}`} aria-label="Travellers, airline and trip direction">
        <div className={journey.tripTypeToggle} role="radiogroup" aria-label="Ticket direction">
          <button type="button" role="radio" aria-checked={tripType === 'one_way'} className={tripType === 'one_way' ? journey.tripTypeSelected : ''} onClick={() => setTripType('one_way')}>One way</button>
          <button type="button" role="radio" aria-checked={tripType === 'return'} className={tripType === 'return' ? journey.tripTypeSelected : ''} onClick={() => setTripType('return')}>Return</button>
        </div>
        <div className={`${journey.inlineTravellers} ${local.travellerCards}`}>{(['adults', 'children', 'infants'] as (keyof Travellers)[]).map(kind => <div key={kind}>
          <i className={`ti ${kind === 'adults' ? 'ti-user' : kind === 'children' ? 'ti-mood-kid' : 'ti-baby-carriage'} ${local.travellerIcon}`} aria-hidden="true" />
          <div className={journey.travellerLabel}><span>{kind[0].toUpperCase() + kind.slice(1)}</span><small>{kind === 'adults' ? 'Age 12+' : kind === 'children' ? 'Age 2–11' : 'Under 2'}</small></div>
          <div className={journey.counter}>
            <button type="button" aria-label={`Remove ${kind}`} disabled={travellers[kind] === (kind === 'adults' ? 1 : 0)} onClick={() => adjust(kind, -1)}>−</button>
            <strong>{travellers[kind]}</strong>
            <button type="button" aria-label={`Add ${kind}`} disabled={travellers[kind] === 9} onClick={() => adjust(kind, 1)}>+</button>
          </div>
        </div>)}</div>
        {airlines.length > 1 && <div className={local.airlineBlock}>
          <span className={local.airlineLabel}>Airline preference <small>(optional)</small></span>
          <div className={local.airlineCards} role="radiogroup" aria-label="Airline preference">
            {(['any', ...airlines] as const).map(value => <button key={value} type="button" role="radio" aria-checked={airline === value} className={airline === value ? local.airlineOn : ''} onClick={() => setAirline(value)}><span className={local.radioDot} aria-hidden="true" />{value !== 'any' && AIRLINE_LOGO[value as keyof typeof AIRLINE_LOGO] && <img src={AIRLINE_LOGO[value as keyof typeof AIRLINE_LOGO]} alt="" />}<span>{value === 'any' ? 'No preference' : airlineLabel(value)}</span></button>)}
          </div>
        </div>}
      </section>}

      {step === 3 && <TripCardChoice bankCodes={bankCodes} onDone={finish} />}

      <div className={`${journey.stepAction} ${local.actions}`}>
        {step > 0 ? <button type="button" className={step === 3 ? local.smallBack : undefined} onClick={() => setStep(step - 1)}>{step === 3 && <i className="ti ti-arrow-left" />} Back</button> : <span />}
        {step > 0 && step !== 3 && <button className="btn-primary" type="button" onClick={next}>{step >= lastStep ? <>Show my plan <i className="ti ti-arrow-right" /></> : <>Next <i className="ti ti-arrow-right" /></>}</button>}
      </div>
    </section>
  </div>
}
