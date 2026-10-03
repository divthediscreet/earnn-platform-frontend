'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BulkSpendAedResponse, BulkSpendMilesRequest, BulkSpendMilesResponse } from '@/lib/bulk-spend-miles/api'
import { simulateBulkSpendAed, simulateBulkSpendMiles } from '@/lib/bulk-spend-miles/api'
import { consumeBulkOutcomeFlag, readBulkRequest } from '@/lib/bulk-spend-miles/session'
import { fetchCards } from '@/lib/api'
import { airlineGroupForCurrency, type AirlineGroup } from '@/lib/bulk-spend-miles/airline-reach'
import BulkSpendResultFilters, { type BulkResultSort } from '@/components/bulk-spend-miles/BulkSpendResultFilters'
import BulkResultView, { aedPlan, formatAed, milesPlan, planMetric, travelPotentialForMiles } from '@/components/bulk-spend-miles/BulkResultView'
import MilesLoadingState from '@/components/miles-goal/MilesLoadingState'
import styles from '../page.module.css'
import resultStyles from '../result-controls.module.css'
import tileStyles from '../travel-result-tile.module.css'
import loadingStyles from '../BulkSpendLoading.module.css'
import outcomeStyles from '../BulkSpendOutcome.module.css'
import pageStyles from './results-page.module.css'

export default function BulkSpendResultsPage() {
  const router = useRouter()
  const [request, setRequest] = useState<BulkSpendMilesRequest | null>(null)
  const [result, setResult] = useState<BulkSpendMilesResponse | null>(null)
  const [aedResult, setAedResult] = useState<BulkSpendAedResponse | null>(null)
  const [resultTab, setResultTab] = useState<'miles' | 'aed'>('miles')
  const [aedLoading, setAedLoading] = useState(false)
  const [aedError, setAedError] = useState('')
  const [error, setError] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedBanks, setSelectedBanks] = useState<string[]>([])
  const [includeNewCard, setIncludeNewCard] = useState(true)
  const [resultSort, setResultSort] = useState<BulkResultSort>('combined')
  const [showOutcome, setShowOutcome] = useState(false)
  const [selectedAirlines, setSelectedAirlines] = useState<AirlineGroup[]>([])
  const [cardAirlines, setCardAirlines] = useState<Record<string, AirlineGroup | null> | null>(null)

  const editPlan = () => router.push('/bulk-spend-miles')

  // The plan to show comes from the form (saved in sessionStorage). Without one, send the user back to the form.
  useEffect(() => {
    const saved = readBulkRequest()
    if (!saved) {
      router.replace('/bulk-spend-miles')
      return
    }
    // sessionStorage only exists after hydration, so the saved plan is read in an effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRequest(saved)
  }, [router])

  useEffect(() => {
    if (!request) return
    let current = true
    simulateBulkSpendMiles(request)
      .then(response => {
        if (!current) return
        setResult(response)
        if (consumeBulkOutcomeFlag()) setShowOutcome(true)
      })
      .catch(reason => current && setError(reason instanceof Error ? reason.message : 'We could not calculate your miles plan right now.'))
    return () => { current = false }
  }, [request])

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

  const showAedResults = async () => {
    setResultTab('aed')
    if (aedResult || !request || aedLoading) return
    setAedLoading(true)
    setAedError('')
    try {
      setAedResult(await simulateBulkSpendAed(request))
    } catch (reason) {
      setAedError(reason instanceof Error ? reason.message : 'We could not calculate your AED rewards right now.')
    } finally {
      setAedLoading(false)
    }
  }

  const onIncludeNewCardChange = (value: boolean) => {
    setIncludeNewCard(value)
    if (!value && resultSort === 'combined') setResultSort('bulk_plus_regular')
  }

  const bankOptions = useMemo(() => Array.from(new Set([
    ...(result?.cards ?? []).map(card => card.bank_name),
    ...(aedResult?.cards ?? []).map(card => card.bank_name),
  ])).sort((a, b) => a.localeCompare(b)), [result, aedResult])

  const passesFilters = (id: string, bank: string, airlineFilter: boolean) =>
    (!selectedBanks.length || selectedBanks.includes(bank))
    && (!airlineFilter || !selectedAirlines.length || (cardAirlines !== null && selectedAirlines.includes(cardAirlines[id] as AirlineGroup)))

  // The backend's own total drives the default order; the user's chosen view only re-orders explicitly.
  const milesPlans = useMemo(() => {
    if (!result) return []
    return result.cards
      .filter(card => passesFilters(card.earnn_card_id, card.bank_name, true))
      .map(card => milesPlan(card, includeNewCard))
      .sort((left, right) => planMetric(right, resultSort) - planMetric(left, resultSort) || left.name.localeCompare(right.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, resultSort, selectedBanks, selectedAirlines, cardAirlines, includeNewCard])

  const aedPlans = useMemo(() => {
    if (!aedResult) return []
    return aedResult.cards
      .filter(card => passesFilters(card.earnn_card_id, card.bank_name, false))
      .map(card => aedPlan(card, includeNewCard))
      .sort((left, right) => planMetric(right, resultSort) - planMetric(left, resultSort) || left.name.localeCompare(right.name))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aedResult, resultSort, selectedBanks, includeNewCard])

  if (error) {
    return <div className={styles.page}><main className={pageStyles.errorWrap}>
      <p className={styles.error}><i className="ti ti-alert-circle" /> {error}</p>
      <button type="button" className="btn-primary" onClick={editPlan}><i className="ti ti-arrow-left" /> Edit my plan</button>
    </main></div>
  }

  if (!request || !result) {
    return <main className={loadingStyles.screen}><MilesLoadingState destination="your best reward" headline="Turning your expenses into a deal…" supportingText="Comparing every eligible card, reward rate, spending tier and welcome bonus." /></main>
  }

  const activeFilterCount = (resultTab === 'miles' ? selectedAirlines.length : 0) + selectedBanks.length
  const filterButton = <button type="button" className={resultStyles.filterButton} onClick={() => setFiltersOpen(true)}><i className="ti ti-adjustments-horizontal" /> Filter & sort</button>

  return <div className={styles.page}>
    <div className={pageStyles.band}>
      <button type="button" className={pageStyles.back} onClick={editPlan}><i className="ti ti-arrow-left" /> Edit my plan</button>
      <span className={pageStyles.bandTitle}>Your big-expense plan</span>
    </div>

    <main className={pageStyles.content}>
      <section id="bulk-results" className={styles.results}>
        <div className={styles.resultHeading}><div><h2>You’re spending it anyway. Make it count.</h2><p>Earnn finds the smartest way to pay and helps you get more back.</p></div><div className={`${styles.totalSpend} ${tileStyles.planSpend}`}><strong>{formatAed(result.monthly_projection.reduce((total, month) => total + month.total_spend_aed, 0))}</strong><small>planned over the next 12 months</small></div></div>
        <div className={resultStyles.controls}>
          <div className={resultStyles.tabs}>
            <button type="button" onClick={() => setResultTab('miles')} className={resultTab === 'miles' ? resultStyles.active : ''}>Miles view</button>
            <button type="button" onClick={showAedResults} className={resultTab === 'aed' ? resultStyles.active : ''}>AED rewards view</button>
          </div>
          <button type="button" className={resultStyles.filterButton} onClick={() => setFiltersOpen(true)}><i className="ti ti-adjustments-horizontal" /> Filter & sort{activeFilterCount > 0 ? ` · ${activeFilterCount}` : ''}</button>
        </div>
        {resultTab === 'miles' ? (
          !milesPlans.length ? <div className={styles.empty}><i className="ti ti-plane-off" /><h3>No cards match these filters.</h3><p>Clear the bank or airline filter to see all eligible cards.</p>{filterButton}</div>
            : <BulkResultView key={`miles-${includeNewCard}-${resultSort}`} unit="miles" plans={milesPlans} sort={resultSort} includeNewCard={includeNewCard} projection={result.monthly_projection} onOpenFilters={() => setFiltersOpen(true)} activeFilters={selectedAirlines.length + selectedBanks.length} />
        ) : aedLoading ? <div className={styles.empty}><i className="ti ti-loader-2" /><h3>Calculating AED rewards…</h3><p>Applying the same spend caps, bonuses and first-year fees.</p></div>
          : aedError ? <p className={styles.error}>{aedError}</p>
          : aedResult ? (
            !aedPlans.length ? <div className={styles.empty}><i className="ti ti-cash-off" /><h3>No cards match this bank filter.</h3><p>Clear the bank filter to see all eligible cards.</p>{filterButton}</div>
              : <BulkResultView key={`aed-${includeNewCard}-${resultSort}`} unit="aed" plans={aedPlans} sort={resultSort} includeNewCard={includeNewCard} projection={aedResult.monthly_projection} onOpenFilters={() => setFiltersOpen(true)} activeFilters={selectedBanks.length} />
          ) : null}
        <BulkSpendResultFilters open={filtersOpen} onClose={() => setFiltersOpen(false)} banks={bankOptions} selectedBanks={selectedBanks} onSelectedBanksChange={setSelectedBanks} includeNewCard={includeNewCard} onIncludeNewCardChange={onIncludeNewCardChange} sort={resultSort} onSortChange={setResultSort} showAirlines={resultTab === 'miles'} airlinesReady={cardAirlines !== null} selectedAirlines={selectedAirlines} onSelectedAirlinesChange={setSelectedAirlines} />
      </section>
      {showOutcome && <BulkSpendOutcome result={result} onContinue={() => setShowOutcome(false)} />}
    </main>
  </div>
}

function BulkSpendOutcome({ result, onContinue }: { result: BulkSpendMilesResponse, onContinue: () => void }) {
  // A hook, not a summary: the numbers are in the hero. Only the cabin and headline change with the plan.
  const topCard = result.cards[0]
  const guaranteed = topCard ? milesPlan(topCard, true).total : 0
  const business = travelPotentialForMiles(guaranteed).startsWith('Business')
  // Each banner is a finished image (headline and airline logos are part of it); only the button is live.
  const banner = business
    ? { src: '/miles-goal/banner-business-v3.webp', ratio: '1024 / 493', alt: 'Turn your expenses into a world of luxury. Fly Business with Emirates or Etihad.' }
    : { src: '/miles-goal/banner-economy.png', ratio: '1024 / 377', alt: 'Your expense could get you a flight ticket. Fly with Emirates or Etihad.' }
  /* eslint-disable @next/next/no-img-element */
  return <div className={outcomeStyles.overlay} role="dialog" aria-modal="true" aria-label={banner.alt}>
    <section className={`${outcomeStyles.dialog} ${outcomeStyles.banner}`} style={{ aspectRatio: banner.ratio }}>
      <img src={banner.src} alt={banner.alt} />
      <button type="button" className="btn-primary" onClick={onContinue}>Show me how <i className="ti ti-arrow-right" /></button>
    </section>
  </div>
}
