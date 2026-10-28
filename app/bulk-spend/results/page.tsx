'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BulkSpendAedResponse, BulkSpendMilesRequest, BulkSpendMilesResponse } from '@/lib/bulk-spend-miles/api'
import { simulateBulkSpendAed, simulateBulkSpendMiles } from '@/lib/bulk-spend-miles/api'
import { readBulkPath, readBulkRequest, type BulkPath } from '@/lib/bulk-spend-miles/session'
import { fetchCards } from '@/lib/api'
import { airlineGroupForCurrency, type AirlineGroup } from '@/lib/bulk-spend-miles/airline-reach'
import BulkSpendResultFilters, { type BulkResultSort } from '@/components/bulk-spend-miles/BulkSpendResultFilters'
import BulkResultView, { aedPlan, formatAed, milesPlan, planMetric, travelPotentialForMiles } from '@/components/bulk-spend-miles/BulkResultView'
import BulkSpendHolding from '@/components/bulk-spend-miles/BulkSpendHolding'
import BulkRefineOptions, { type RefineMode } from '@/components/bulk-spend-miles/BulkRefineOptions'
import CardSelectionFlow from '@/components/my-benefits/CardSelectionFlow'
import type { CatalogueCard } from '@/lib/life-moments/api'
import { bankKey, loadOwnedCards, saveOwnedCards } from '@/lib/my-benefits/ownedCards'
import styles from '../page.module.css'
import resultStyles from '../result-controls.module.css'
import pageStyles from './results-page.module.css'

const HOLD_SECONDS = 6

export default function BulkSpendResultsPage() {
  const router = useRouter()
  const [request, setRequest] = useState<BulkSpendMilesRequest | null>(null)
  const [result, setResult] = useState<BulkSpendMilesResponse | null>(null)
  const [aedResult, setAedResult] = useState<BulkSpendAedResponse | null>(null)
  // The user picked miles or cashback before arriving: only that path is calculated and shown.
  const [resultTab, setResultTab] = useState<BulkPath>('miles')
  const [holdDone, setHoldDone] = useState(false)
  const [firstLoaded, setFirstLoaded] = useState(false)
  const [error, setError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedBanks, setSelectedBanks] = useState<string[]>([])
  const [includeNewCard, setIncludeNewCard] = useState(true)
  const [resultSort, setResultSort] = useState<BulkResultSort>('combined')
  const [selectedAirlines, setSelectedAirlines] = useState<AirlineGroup[]>([])
  const [cardAirlines, setCardAirlines] = useState<Record<string, AirlineGroup | null> | null>(null)
  // Refine: "new" keeps welcome bonuses but leaves out every bank the user already banks with;
  // "own" shows only the cards the user already has, without welcome bonuses.
  const [mode, setMode] = useState<RefineMode>('new')
  const [myCards, setMyCards] = useState<CatalogueCard[]>([])
  const [pickerFor, setPickerFor] = useState<RefineMode | null>(null)
  const [chosenPath, setChosenPath] = useState<BulkPath>('miles')

  const ownedIds = useMemo(() => new Set(myCards.map(card => card.earnn_card_id)), [myCards])
  const ownedBanks = useMemo(() => new Set(myCards.map(card => bankKey(card.bank_name))), [myCards])

  const editPlan = () => router.push('/bulk-spend')

  // The plan to show comes from the form (saved in sessionStorage). Without one, send the user back to the form.
  useEffect(() => {
    const saved = readBulkRequest()
    if (!saved) {
      router.replace('/bulk-spend')
      return
    }
    // sessionStorage only exists after hydration, so the saved plan is read in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRequest(saved)
    setResultTab(readBulkPath())
    setChosenPath(readBulkPath())
    setMyCards(loadOwnedCards())
  }, [router])

  // Whatever the calculation speed, the welcome-bonus screen stays for at least this long.
  useEffect(() => {
    const timer = setTimeout(() => setHoldDone(true), HOLD_SECONDS * 1000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!request) return
    let current = true
    if (resultTab === 'miles') {
      simulateBulkSpendMiles(request)
        .then(response => {
          if (!current) return
          setResult(response)
          setFirstLoaded(true)
        })
        .catch(reason => current && setError(reason instanceof Error ? reason.message : 'We could not calculate your miles plan right now.'))
    } else {
      // In "use only cards I have", ask for exactly those cards so points cards (e.g. noon) are not left out of cashback.
      const ownedList = mode === 'own' ? Array.from(ownedIds) : undefined
      // Drop the previous cashback list so a stale one is never shown for the new set of cards.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAedResult(null)
      simulateBulkSpendAed(ownedList?.length ? { ...request, owned_card_ids: ownedList } : request)
        .then(response => { if (!current) return; setAedResult(response); setFirstLoaded(true) })
        .catch(reason => current && setError(reason instanceof Error ? reason.message : 'We could not calculate your cashback right now.'))
    }
    return () => { current = false }
  }, [request, resultTab, mode, ownedIds])

  // The simulate response has no reward currency, so join it from the card catalogue for the airline filter.
  useEffect(() => {
    let current = true
    fetchCards({ limit: 200 })
      .then((response: { cards?: { earnn_card_id: string, reward_currency_name: string | null }[] }) => {
        if (!current) return
        setCardAirlines(Object.fromEntries((response.cards ?? []).map(card => [card.earnn_card_id, airlineGroupForCurrency(card.reward_currency_name)])))
      })
      .catch(() => current && setCardAirlines(null))
    return () => { current = false }
  }, [])

  const onIncludeNewCardChange = (value: boolean) => {
    setIncludeNewCard(value)
    if (!value && resultSort === 'combined') setResultSort('bulk_plus_regular')
  }


  const applyMode = (next: RefineMode) => {
    setMode(next)
    onIncludeNewCardChange(next === 'new')
    // Back to "new card": return to the kind of card the user first asked for (miles or cashback).
    if (next === 'new') setResultTab(chosenPath)
  }
  const selectMode = (next: RefineMode) => {
    if (!myCards.length) setPickerFor(next)
    else applyMode(next)
  }
  const confirmCards = (cards: CatalogueCard[]) => {
    saveOwnedCards(cards)
    setMyCards(cards)
    if (pickerFor) applyMode(pickerFor)
    setPickerFor(null)
  }

  const bankOptions = useMemo(() => Array.from(new Set([
    ...(result?.cards ?? []).map(card => card.bank_name),
    ...(aedResult?.cards ?? []).map(card => card.bank_name),
  ])).sort((a, b) => a.localeCompare(b)), [result, aedResult])

  const passesFilters = (id: string, bank: string, airlineFilter: boolean) =>
    (mode === 'own' ? ownedIds.has(id) : !ownedBanks.has(bankKey(bank)))
    && (!selectedBanks.length || selectedBanks.includes(bank))
    && (!airlineFilter || !selectedAirlines.length || (cardAirlines !== null && selectedAirlines.includes(cardAirlines[id] as AirlineGroup)))

  // The backend's own total drives the default order; the user's chosen view only re-orders explicitly.
  const milesPlans = useMemo(() => {
    if (!result) return []
    return result.cards
      .filter(card => passesFilters(card.earnn_card_id, card.bank_name, true))
      .map(card => milesPlan(card, includeNewCard))
      .sort((left, right) => planMetric(right, resultSort) - planMetric(left, resultSort) || left.name.localeCompare(right.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, resultSort, selectedBanks, selectedAirlines, cardAirlines, includeNewCard, mode, ownedIds, ownedBanks])

  const aedPlans = useMemo(() => {
    if (!aedResult) return []
    return aedResult.cards
      .filter(card => passesFilters(card.earnn_card_id, card.bank_name, false))
      .map(card => aedPlan(card, includeNewCard))
      .sort((left, right) => planMetric(right, resultSort) - planMetric(left, resultSort) || left.name.localeCompare(right.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aedResult, resultSort, selectedBanks, includeNewCard, mode, ownedIds, ownedBanks])

  if (error) {
    return <div className={styles.page}><main className={pageStyles.errorWrap}>
      <p className={styles.error}><i className="ti ti-alert-circle" /> {error}</p>
      <button type="button" className="btn-primary" onClick={editPlan}><i className="ti ti-arrow-left" /> Edit my plan</button>
    </main></div>
  }

  const projection = (resultTab === 'miles' ? result : aedResult)?.monthly_projection
  // The welcome-bonus screen is only for the first calculation; later switches (e.g. to cashback) recalculate quietly.
  if (!request || !holdDone || !firstLoaded) {
    return <BulkSpendHolding path={resultTab} />
  }
  if (!projection) {
    return <div className={styles.page}><main className={pageStyles.content}>
      <div className={`${styles.empty} ${pageStyles.calculating}`} role="status" aria-live="polite"><span className={pageStyles.spinner} aria-hidden="true" /><h3>Updating your results…</h3><p>Working out the rewards for your cards.</p></div>
    </main></div>
  }

  const plannedSpend = formatAed(projection.reduce((total, month) => total + month.total_spend_aed, 0))
  // Miles view only: when the best card could get a business class flight or upgrade, say so up front.
  const luxury = resultTab === 'miles' && travelPotentialForMiles(milesPlans[0]?.total ?? 0).startsWith('Business')
  const activeFilterCount = (resultTab === 'miles' ? selectedAirlines.length : 0) + selectedBanks.length
  const filterButton = <button type="button" className={resultStyles.filterButton} onClick={() => setFiltersOpen(true)}><i className="ti ti-adjustments-horizontal" /> Filter & sort</button>

  return <div className={styles.page}>
    <div className={pageStyles.band}>
      <button type="button" className={pageStyles.back} onClick={editPlan}><i className="ti ti-arrow-left" /> Edit my plan</button>
      <span className={pageStyles.bandTitle}>Your big-expense plan</span>
    </div>

    <main className={pageStyles.content}>
      <section id="bulk-results" className={styles.results}>
        <div className={`${styles.resultHeading} ${luxury ? pageStyles.luxury : ''}`}><div>{luxury
          ? <><h2><i className="ti ti-sparkles" /> Welcome to the world of luxury.</h2><p>You spend <b>{plannedSpend}</b> in a year. You deserve <b>business class</b> travel. Earnn finds you the smartest way.</p></>
          : <><h2>You’re spending it anyway. Make your {plannedSpend} spending per year count.</h2><p>Earnn finds the smartest way to pay and helps you get more back.</p></>}</div></div>
        <div className={`${resultStyles.controls} ${pageStyles.refineRow}`}>
          <BulkRefineOptions mode={mode} onSelect={selectMode} cardCount={myCards.length} onEditCards={() => setPickerFor(mode)} unit={resultTab} action={<button type="button" className={resultStyles.filterButton} onClick={() => setFiltersOpen(true)}><i className="ti ti-adjustments-horizontal" /> Filter & sort{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}</button>} />
        </div>
        {resultTab === 'miles' ? (
          !milesPlans.length && mode === 'own' && !result?.cards.some(card => ownedIds.has(card.earnn_card_id)) ? <div className={styles.empty}><i className="ti ti-plane-off" /><h3>You don’t have a miles card.</h3><p>Do you want to check cashback on the cards you have, or better, apply for a new card?</p><div className={pageStyles.emptyActions}><button type="button" className="btn-primary" onClick={() => setResultTab('aed')}>Show cashback on cards I have</button><button type="button" className="btn-secondary" onClick={() => applyMode('new')}>Apply for a new card</button></div></div>
          : !milesPlans.length ? <div className={styles.empty}><i className="ti ti-plane-off" /><h3>No cards match these filters.</h3><p>Clear the bank or airline filter to see all eligible cards.</p>{filterButton}</div>
            : <BulkResultView key={`miles-${includeNewCard}-${resultSort}`} unit="miles" plans={milesPlans} sort={resultSort} includeNewCard={includeNewCard} projection={projection} onOpenFilters={() => setFiltersOpen(true)} activeFilters={selectedAirlines.length + selectedBanks.length} />
        ) : aedResult ? (
            !aedPlans.length && mode === 'own' && !aedResult.cards.some(card => ownedIds.has(card.earnn_card_id)) ? <div className={styles.empty}><i className="ti ti-cash-off" /><h3>None of your cards could be shown.</h3><p>They may not suit your salary or spending. You can apply for a new card instead.</p><div className={pageStyles.emptyActions}><button type="button" className="btn-primary" onClick={() => applyMode('new')}>Apply for a new card</button></div></div>
            : !aedPlans.length ? <div className={styles.empty}><i className="ti ti-cash-off" /><h3>No cards match this bank filter.</h3><p>Clear the bank filter to see all eligible cards.</p>{filterButton}</div>
              : <BulkResultView key={`aed-${includeNewCard}-${resultSort}`} unit="aed" plans={aedPlans} sort={resultSort} includeNewCard={includeNewCard} projection={projection} onOpenFilters={() => setFiltersOpen(true)} activeFilters={selectedBanks.length} />
          ) : null}
        <BulkSpendResultFilters open={filtersOpen} onClose={() => setFiltersOpen(false)} banks={bankOptions} selectedBanks={selectedBanks} onSelectedBanksChange={setSelectedBanks} includeNewCard={includeNewCard} sort={resultSort} onSortChange={setResultSort} showAirlines={resultTab === 'miles'} airlinesReady={cardAirlines !== null} selectedAirlines={selectedAirlines} onSelectedAirlinesChange={setSelectedAirlines} />
      </section>
    </main>
    {pickerFor && <CardSelectionFlow current={myCards} onConfirm={confirmCards} onCancel={() => setPickerFor(null)} subtitle="Choose a bank, then tick the cards you own." confirmLabel="Update my options" />}
  </div>
}
