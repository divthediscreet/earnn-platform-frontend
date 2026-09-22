'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Airline, AirlineScope, MilesGoalSimulationResponse, StrategyId, ToggleState } from '@/lib/miles-goal/contracts'
import { getMilesRegion } from '@/lib/miles-goal/regions'
import { resolveCatalog, withTravellerTarget } from '@/lib/miles-goal/resolver'
import { buildDisplayCards, STRATEGY_IDS, withLockedDisplayOrder } from '@/lib/miles-goal/selectors'
import { clearMilesGoalSession, readMilesGoalSession, writeMilesGoalSession } from '@/lib/miles-goal/storage'
import type { MilesGoalSession } from '@/lib/miles-goal/storage'
import MilesShowcaseCard from './MilesShowcaseCard'
import MilesResultFilters from './MilesResultFilters'
import CardDetailPopup from '@/components/CardDetailPopup'
import styles from '@/app/miles/results/preview/PreviewResults.module.css'

type Travellers = { adults: number; children: number; infants: number }
type EditorStep = 'strategy' | 'travellers' | null

const STRATEGY_COPY: Record<StrategyId, { title: string; description: string; bestFor: string }> = {
  easiest: { title: 'Fly Economy: Fly Frequently', description: 'Pay Economy class ticket using miles.', bestFor: 'For short-distance flights, frequent travellers, or big families.' },
  dream: { title: 'Business Class', description: 'The full business-class journey using miles.', bestFor: 'For travellers using miles for the full Business Class journey.' },
  smartest: { title: 'Fly Smart: Fly Faster', description: 'Purchase Economy class ticket and upgrade to Business class using miles.', bestFor: 'For aspiring families who want to fly Business Class.' },
}

function cloneToggle(toggle: ToggleState): ToggleState {
  return { ...toggle, new_to_bank_by_bank: { ...toggle.new_to_bank_by_bank }, new_to_bank_by_card: { ...toggle.new_to_bank_by_card }, event_overrides: { ...toggle.event_overrides } }
}

export default function MilesResultPreview() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const region = getMilesRegion(searchParams.get('region'))
  const [session, setSession] = useState<MilesGoalSession | null>(null)
  const [toggles, setToggles] = useState<Partial<Record<Airline, ToggleState>>>({})
  const [detailCardId, setDetailCardId] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [bankFilter, setBankFilter] = useState('all')
  const [existingCardBanks, setExistingCardBanks] = useState<string[]>([])
  const [editorStep, setEditorStep] = useState<EditorStep>(null)
  const [draftStrategy, setDraftStrategy] = useState<StrategyId>('smartest')
  const [draftTravellers, setDraftTravellers] = useState<Travellers>({ adults: 1, children: 0, infants: 0 })
  const [draftTripType, setDraftTripType] = useState<'one_way' | 'return'>('return')

  useEffect(() => {
    const stored = readMilesGoalSession()
    if (!stored || !region || stored.region_id !== region.id || stored.mode !== 'personalized') return
    const lockedCardOrder = stored.locked_card_order ?? Object.fromEntries(STRATEGY_IDS.map(strategy => [strategy, buildDisplayCards(stored.responses, stored.airline_scope, strategy).map(card => card.earnn_card_id)]))
    const nextSession = stored.locked_card_order ? stored : { ...stored, locked_card_order: lockedCardOrder }
    if (!stored.locked_card_order) writeMilesGoalSession(nextSession)
    setSession(nextSession)
    setToggles(stored.toggles)
    setExistingCardBanks(stored.existing_card_banks ?? [])
  }, [region])

  const responses = useMemo(() => {
    if (!session) return {}
    const travellerCount = (session.travellers?.adults ?? 1) + (session.travellers?.children ?? 0)
    const tripLegs = session.trip_type === 'return' ? 2 : 1
    return Object.fromEntries(Object.entries(session.responses).flatMap(([airline, response]) => {
      if (!response) return []
      const catalog = withTravellerTarget(response.interaction_catalog, travellerCount, tripLegs)
      const state = toggles[airline as Airline] ?? catalog.toggle_defaults
      return [[airline, { ...response, interaction_catalog: catalog, resolved_view: resolveCatalog(catalog, state) }]]
    })) as Partial<Record<Airline, MilesGoalSimulationResponse>>
  }, [session, toggles])
  const cards = session ? withLockedDisplayOrder(buildDisplayCards(responses, session.airline_scope, session.focused_strategy), session.locked_card_order?.[session.focused_strategy]) : []
  const bankOptions = useMemo(() => [...new Map(cards.map(card => [card.bank_code, { value: card.bank_code, label: card.bank_name }])).values()].sort((left, right) => left.label.localeCompare(right.label)), [cards])
  const filteredCards = bankFilter === 'all' ? cards : cards.filter(card => card.bank_code === bankFilter)
  const available = { emirates: Boolean(responses.emirates), etihad: Boolean(responses.etihad) }
  const monthlySpend = session?.profile ? Object.values(session.profile.spend).reduce((total, amount) => total + amount, 0) : 0
  const updateToggle = (airline: Airline, state: ToggleState) => {
    setToggles(current => {
      const next = { ...current, [airline]: state }
      if (session) writeMilesGoalSession({ ...session, toggles: next })
      return next
    })
  }
  const updateAirlineScope = (airlineScope: AirlineScope) => {
    if (!session) return
    const next = { ...session, airline_scope: airlineScope }
    setSession(next)
    writeMilesGoalSession({ ...next, toggles })
  }
  const changeExistingCardBanks = (nextBanks: string[]) => {
    if (!session) return
    const previous = new Set(existingCardBanks)
    const selected = new Set(nextBanks)
    const affectedBanks = new Set([...previous, ...selected])
    const nextToggles: Partial<Record<Airline, ToggleState>> = { ...toggles }
    for (const airline of ['emirates', 'etihad'] as Airline[]) {
      const response = session.responses[airline]
      if (!response) continue
      const state = cloneToggle(toggles[airline] ?? response.interaction_catalog.toggle_defaults)
      for (const bankCode of affectedBanks) {
        if (selected.has(bankCode)) state.new_to_bank_by_bank[bankCode] = false
        else delete state.new_to_bank_by_bank[bankCode]
      }
      nextToggles[airline] = state
    }
    setExistingCardBanks(nextBanks)
    setToggles(nextToggles)
    const nextSession = { ...session, existing_card_banks: nextBanks }
    setSession(nextSession)
    writeMilesGoalSession({ ...nextSession, toggles: nextToggles })
  }
  const openStrategyEditor = () => {
    if (!session) return
    setDraftStrategy(session.focused_strategy === 'dream' ? 'smartest' : 'easiest')
    setDraftTravellers(session.travellers ?? { adults: 1, children: 0, infants: 0 })
    setDraftTripType(session.trip_type ?? 'return')
    setEditorStep('strategy')
  }
  const adjustTraveller = (kind: keyof Travellers, delta: number) => setDraftTravellers(current => {
    const minimum = kind === 'adults' ? 1 : 0
    return { ...current, [kind]: Math.min(9, Math.max(minimum, current[kind] + delta)) }
  })
  const applyStrategy = () => {
    if (!session) return
    const next = { ...session, focused_strategy: draftStrategy, travellers: draftTravellers, trip_type: draftTripType }
    setSession(next)
    writeMilesGoalSession({ ...next, toggles })
    setEditorStep(null)
  }
  const useRecoveryStrategy = (strategy: StrategyId) => {
    if (!session) return
    const next = { ...session, focused_strategy: strategy }
    setSession(next)
    writeMilesGoalSession({ ...next, toggles })
  }
  const tryOneWay = () => {
    if (!session) return
    const next = { ...session, trip_type: 'one_way' as const }
    setSession(next)
    writeMilesGoalSession({ ...next, toggles })
  }
  const fasterStrategyOptions: StrategyId[] = session?.focused_strategy === 'dream'
    ? ['easiest', 'smartest']
    : ['easiest']

  if (!region || !session) return <main className={styles.page}><section className={styles.empty}><h1>No personalised plan available</h1><p>Build a Miles plan first, then return here to preview the alternate card design.</p><Link className="btn-primary" href="/miles">Start a new search</Link></section></main>

  return <main className={styles.page}><div className={styles.shell}>
    <header className={styles.top}><div><span className={styles.label}>YOUR PERSONALISED PLAN</span><h1>Here’s your fastest route.</h1></div><nav className={styles.switches} aria-label="Result layouts"><button type="button" className={styles.filterAction} onClick={() => setFiltersOpen(true)}><i className="ti ti-adjustments-horizontal" /> Filter</button><button type="button" onClick={() => { clearMilesGoalSession(); router.push('/miles') }}><i className="ti ti-search" /> New Search</button><Link href={`/miles/results?region=${encodeURIComponent(region.id)}&view=current`}>View 1.0</Link></nav></header>
    <section className={styles.cards}>{cards.length ? <>{filteredCards.map(card => <MilesShowcaseCard key={card.earnn_card_id} card={card} focused={session.focused_strategy} responses={responses} toggles={toggles} onToggleChange={updateToggle} monthlySpend={monthlySpend} onCardNameClick={setDetailCardId} onChangeStrategy={openStrategyEditor} />)}{!filteredCards.length && <p className={styles.noCards}>No cards match your selected bank filter.</p>}</> : session.focused_strategy === 'easiest' ? <section className={styles.empty}><h2>An Economy trip within 36 months is not available with these assumptions.</h2><p>Start a new search for another destination, or try a one-way ticket to reduce the miles needed.</p><div className={styles.recoveryActions}><button type="button" className={styles.primaryAction} onClick={() => { clearMilesGoalSession(); router.push('/miles') }}>Try a new destination <i className="ti ti-search" /></button>{session.trip_type !== 'one_way' && <button type="button" className={styles.backAction} onClick={tryOneWay}>Try one-way ticket <i className="ti ti-arrow-right" /></button>}</div></section> : <section className={`${styles.empty} ${styles.strategyRecovery}`}><h2>{session.focused_strategy === 'dream' ? 'Flying Business Class entirely with miles may take a little longer.' : 'This Business Class upgrade is difficult to reach within 36 months.'}</h2><p>Try a different way to fly and see the fastest route available for your current profile.</p><div className={styles.strategyOptions}>{fasterStrategyOptions.map(strategy => <button key={strategy} type="button" onClick={() => useRecoveryStrategy(strategy)}><span>{strategy === 'smartest' ? 'SMART STRATEGY' : 'ECONOMY ONLY'}</span><strong>{STRATEGY_COPY[strategy].title}</strong><small>{STRATEGY_COPY[strategy].description}</small><small className={styles.strategyBest}><b>Best for:</b> {STRATEGY_COPY[strategy].bestFor}</small></button>)}</div></section>}</section>
  </div>
  <MilesResultFilters open={filtersOpen} onClose={() => setFiltersOpen(false)} bank={bankFilter} onBankChange={setBankFilter} banks={bankOptions} airlineScope={session.airline_scope} onAirlineScopeChange={updateAirlineScope} available={available} existingCardBanks={existingCardBanks} onExistingCardBanksChange={changeExistingCardBanks} />
  {editorStep && <div className={styles.editorBackdrop} role="dialog" aria-modal="true" aria-label="Change flight strategy"><section className={styles.editorDialog}>
    <div className={styles.editorHeader}><div><span>FLY EARLIER</span><h2>{editorStep === 'strategy' ? 'Choose a faster way to fly' : 'Who is travelling?'}</h2></div><button type="button" onClick={() => setEditorStep(null)} aria-label="Close">×</button></div>
    {editorStep === 'strategy' ? <><div className={styles.strategyOptions}>{fasterStrategyOptions.map(strategy => <button key={strategy} type="button" className={draftStrategy === strategy ? styles.strategySelected : ''} aria-pressed={draftStrategy === strategy} onClick={() => setDraftStrategy(strategy)}><span>{strategy === 'smartest' ? 'SMART STRATEGY' : 'ECONOMY ONLY'}</span><strong>{STRATEGY_COPY[strategy].title}</strong><small>{STRATEGY_COPY[strategy].description}</small><small className={styles.strategyBest}><b>Best for:</b> {STRATEGY_COPY[strategy].bestFor}</small>{draftStrategy === strategy && <i className="ti ti-check" />}</button>)}</div><div className={styles.editorActions}><button type="button" className={styles.primaryAction} onClick={() => setEditorStep('travellers')}>Next <i className="ti ti-arrow-right" /></button></div></> : <><div className={styles.tripToggle} role="radiogroup" aria-label="Ticket direction"><button type="button" role="radio" aria-checked={draftTripType === 'one_way'} className={draftTripType === 'one_way' ? styles.tripSelected : ''} onClick={() => setDraftTripType('one_way')}>One way</button><button type="button" role="radio" aria-checked={draftTripType === 'return'} className={draftTripType === 'return' ? styles.tripSelected : ''} onClick={() => setDraftTripType('return')}>Return</button></div><div className={styles.travellerOptions}>{(['adults', 'children', 'infants'] as (keyof Travellers)[]).map(kind => <div key={kind}><span>{kind[0].toUpperCase() + kind.slice(1)}<small>{kind === 'adults' ? 'Age 12+' : kind === 'children' ? 'Age 2–11' : 'Under 2'}</small></span><div><button type="button" disabled={draftTravellers[kind] === (kind === 'adults' ? 1 : 0)} onClick={() => adjustTraveller(kind, -1)}>−</button><strong>{draftTravellers[kind]}</strong><button type="button" disabled={draftTravellers[kind] === 9} onClick={() => adjustTraveller(kind, 1)}>+</button></div></div>)}</div><div className={styles.editorActions}><button type="button" className={styles.backAction} onClick={() => setEditorStep('strategy')}>Back</button><button type="button" className={styles.primaryAction} onClick={applyStrategy}>Recalculate plan <i className="ti ti-check" /></button></div></>}
  </section></div>}
  {detailCardId && <CardDetailPopup cardId={detailCardId} onClose={() => setDetailCardId(null)} />}</main>
}
