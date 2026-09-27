'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import type { BulkPaymentSchedule, BulkSpendAedCard, BulkSpendAedResponse, BulkSpendMilesCard, BulkSpendMilesRequest, BulkSpendMilesResponse, BulkSpendTopic, SpendRewardBreakdown } from '@/lib/bulk-spend-miles/api'
import { getBulkSpendTopics, simulateBulkSpendAed, simulateBulkSpendMiles } from '@/lib/bulk-spend-miles/api'
import { getCardImageUrl } from '@/lib/api'
import BulkSpendResultFilters, { type BulkResultSort } from '@/components/bulk-spend-miles/BulkSpendResultFilters'
import MilesLoadingState from '@/components/miles-goal/MilesLoadingState'
import styles from './page.module.css'
import resultStyles from './result-controls.module.css'
import tileStyles from './travel-result-tile.module.css'
import formStyles from './compact-spend-form.module.css'
import loadingStyles from './BulkSpendLoading.module.css'

const MONTHS = [
  ['Jan', 1], ['Feb', 2], ['Mar', 3], ['Apr', 4], ['May', 5], ['Jun', 6],
  ['Jul', 7], ['Aug', 8], ['Sep', 9], ['Oct', 10], ['Nov', 11], ['Dec', 12],
] as const

const formatMiles = (value: number) => `${Math.round(value).toLocaleString()} miles`
const formatAed = (value: number) => `AED ${Math.round(value).toLocaleString()}`

const MILES_TRAVEL_POTENTIALS = [
  [159_000, '🗽 Business Class flight to New York'],
  [120_000, '🌎 Business Class flight to New York or Sydney'],
  [106_000, '🇦🇺 Business Class flight to Sydney'],
  [81_000, '🌎 Business Class upgrade to New York or Sydney'],
  [60_000, '🇬🇧 Business Class flight to London or Europe'],
  [50_000, '🏝️ Business Class flight to the Maldives'],
  [45_000, '🇬🇧 Business Class upgrade to London or Europe'],
  [30_000, '✨ Business Class flight to Egypt'],
  [22_000, '💺 Business Class upgrade to India or Egypt'],
  [20_000, '🇬🇧 Economy flight to London or Europe'],
  [10_000, '✈️ Economy flight to India or Egypt'],
] as const

function travelPotentialForMiles(miles: number) {
  return MILES_TRAVEL_POTENTIALS.find(([minimumMiles]) => miles >= minimumMiles)?.[1]
    ?? MILES_TRAVEL_POTENTIALS[MILES_TRAVEL_POTENTIALS.length - 1][1]
}

function travelArtworkForMiles(miles: number) {
  if (miles >= 120_000) return { city: 'New York or Sydney', image: 'https://images.unsplash.com/photo-1522083165195-3424ed129620?auto=format&fit=crop&w=1200&q=82' }
  if (miles >= 60_000) return { city: 'London or Europe', image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=82' }
  if (miles >= 50_000) return { city: 'The Maldives', image: 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=82' }
  if (miles >= 30_000) return { city: 'Egypt', image: 'https://images.unsplash.com/photo-1568322445389-f64ac2515020?auto=format&fit=crop&w=1200&q=82' }
  return { city: 'India or Egypt', image: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?auto=format&fit=crop&w=1200&q=82' }
}

function blankRow(topics: BulkSpendTopic[]): BulkPaymentSchedule {
  return { topic_code: topics[0]?.topic_code ?? '', amount_aed: 0, due_months: [] }
}

function bulkReward(entries: SpendRewardBreakdown[]) {
  return entries.filter(entry => entry.category !== 'recurring').reduce((total, entry) => total + entry.earned_value, 0)
}

function combinedMilesAccumulation(card: BulkSpendMilesCard) {
  return card.spend_miles_12_months + card.guaranteed_welcome_miles
}

function combinedAedAccumulation(card: BulkSpendAedCard) {
  return card.spend_rewards_12_months_aed + card.selected_welcome_rewards_aed - card.first_year_fee_aed
}

function resultSortLabel(sort: BulkResultSort, unit: 'miles' | 'AED') {
  if (sort === 'bulk_only') return 'bulk-category rewards'
  if (sort === 'bulk_plus_regular') return 'bulk + normal-spend rewards'
  return `combined ${unit} accumulation`
}

export default function BulkSpendMilesPage() {
  const [monthlySpend, setMonthlySpend] = useState('8000')
  const [salary, setSalary] = useState('')
  const [topics, setTopics] = useState<BulkSpendTopic[]>([])
  const [topicsLoading, setTopicsLoading] = useState(true)
  const [payments, setPayments] = useState<BulkPaymentSchedule[]>([blankRow([])])
  const [result, setResult] = useState<BulkSpendMilesResponse | null>(null)
  const [aedResult, setAedResult] = useState<BulkSpendAedResponse | null>(null)
  const [lastRequest, setLastRequest] = useState<BulkSpendMilesRequest | null>(null)
  const [resultTab, setResultTab] = useState<'miles' | 'aed'>('miles')
  const [aedLoading, setAedLoading] = useState(false)
  const [aedError, setAedError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedCard, setExpandedCard] = useState<string | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [selectedBanks, setSelectedBanks] = useState<string[]>([])
  const [includeNewCard, setIncludeNewCard] = useState(true)
  const [resultSort, setResultSort] = useState<BulkResultSort>('combined')

  useEffect(() => {
    let current = true
    getBulkSpendTopics()
      .then(response => {
        if (!current) return
        setTopics(response.topics)
        setPayments(rows => rows.map(row => row.topic_code ? row : { ...row, topic_code: response.topics[0]?.topic_code ?? '' }))
      })
      .catch(reason => current && setError(reason instanceof Error ? reason.message : 'We could not load payment topics right now.'))
      .finally(() => current && setTopicsLoading(false))
    return () => { current = false }
  }, [])

  const updatePayment = (index: number, update: Partial<BulkPaymentSchedule>) => {
    setPayments(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...update } : row))
  }
  const toggleMonth = (index: number, month: number) => {
    const row = payments[index]
    updatePayment(index, { due_months: row.due_months.includes(month) ? row.due_months.filter(value => value !== month) : [...row.due_months, month].sort((a, b) => a - b) })
  }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    const validRows = payments.filter(row => Number(row.amount_aed) > 0 && row.due_months.length > 0)
    if (validRows.some(row => !row.topic_code)) {
      setError('Choose a category for every scheduled payment.')
      return
    }
    if (Number(monthlySpend) <= 0 && !validRows.length) {
      setError('Enter your regular monthly spend or at least one scheduled payment.')
      return
    }
    if (Number(salary) <= 0) {
      setError('Enter your monthly salary to see cards you are eligible for.')
      return
    }
    if (payments.some(row => (Number(row.amount_aed) > 0 && !row.due_months.length) || (Number(row.amount_aed) <= 0 && row.due_months.length))) {
      setError('Each scheduled payment needs both an amount and at least one due month.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const request = { monthly_spend_aed: Number(monthlySpend) || 0, salary_aed: Number(salary), scheduled_payments: validRows }
      const response = await simulateBulkSpendMiles(request)
      setResult(response)
      setLastRequest(request)
      setAedResult(null)
      setAedError('')
      setResultTab('miles')
      setExpandedCard(null)
      setSelectedBanks([])
      setIncludeNewCard(true)
      setResultSort('combined')
      requestAnimationFrame(() => document.getElementById('bulk-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not calculate your miles plan right now.')
    } finally {
      setLoading(false)
    }
  }

  const showAedResults = async () => {
    setResultTab('aed')
    if (aedResult || !lastRequest || aedLoading) return
    setAedLoading(true)
    setAedError('')
    try {
      setAedResult(await simulateBulkSpendAed(lastRequest))
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

  const visibleMilesCards = useMemo(() => {
    if (!result) return []
    const score = (card: BulkSpendMilesCard) => resultSort === 'bulk_only' ? bulkReward(card.spend_reward_breakdown) : resultSort === 'bulk_plus_regular' ? card.spend_miles_12_months : combinedMilesAccumulation(card)
    return result.cards.filter(card => !selectedBanks.length || selectedBanks.includes(card.bank_name)).sort((left, right) => score(right) - score(left) || left.card_name.localeCompare(right.card_name))
  }, [result, resultSort, selectedBanks])

  const visibleAedCards = useMemo(() => {
    if (!aedResult) return []
    const score = (card: BulkSpendAedCard) => resultSort === 'bulk_only' ? bulkReward(card.spend_reward_breakdown) : resultSort === 'bulk_plus_regular' ? card.spend_rewards_12_months_aed : combinedAedAccumulation(card)
    return aedResult.cards.filter(card => !selectedBanks.length || selectedBanks.includes(card.bank_name)).sort((left, right) => score(right) - score(left) || left.card_name.localeCompare(right.card_name))
  }, [aedResult, resultSort, selectedBanks])

  if (loading) return <main className={loadingStyles.screen}><MilesLoadingState destination="your best reward" headline="Turning your expenses into a deal…" supportingText="Comparing every eligible card, reward rate, spending tier and welcome bonus." /></main>

  return <div className={styles.page}>
    <section className={styles.hero}>
      <div><span className={styles.kicker}>MAXIMISE A BIG PAYMENT</span><h1>Big expenses. Big rewards.</h1><p>Earnn will turn your upcoming big payments into rewards worth getting excited about.</p></div>
      <aside><i className="ti ti-sparkles" /><span>Spending you already planned can unlock more value.</span></aside>
    </section>

    <main className={styles.content}>
      <form className={styles.formCard} onSubmit={submit}>
        <div className={styles.formHeading}><div><span>YOUR BIG-EXPENSE PLAN</span><h2>What big payments are coming up?</h2><p className={formStyles.formIntro}>Add the payments you already expect to make. We will find the card that makes them work harder for you.</p></div></div>
        <section className={formStyles.expensesPanel}>
          <div className={formStyles.expensePanelHead}><h3>Upcoming big expenses</h3><p>Choose the category, amount and every month when the same payment is due.</p></div>
          <div className={formStyles.schedules}>{payments.map((payment, index) => <div className={formStyles.expenseRow} key={`${index}-${payment.topic_code}`}>
            <label><span>Category</span><select value={payment.topic_code} disabled={topicsLoading || !topics.length} onChange={event => updatePayment(index, { topic_code: event.target.value })}><option value="">{topicsLoading ? 'Loading categories…' : 'Choose a category'}</option>{topics.map(topic => <option key={topic.topic_code} value={topic.topic_code}>{topic.topic_label}</option>)}</select></label>
            <label><span>Amount due</span><div className={formStyles.amountInput}><b>AED</b><input inputMode="decimal" type="number" min="0" step="100" value={payment.amount_aed || ''} onChange={event => updatePayment(index, { amount_aed: Number(event.target.value) || 0 })} placeholder="10,000" /></div></label>
            <fieldset><legend>Due in</legend><div className={formStyles.months}>{MONTHS.map(([name, value]) => <label key={value} className={payment.due_months.includes(value) ? formStyles.selectedMonth : ''}><input type="checkbox" checked={payment.due_months.includes(value)} onChange={() => toggleMonth(index, value)} /><span>{name}</span></label>)}</div></fieldset>
            <button type="button" className={formStyles.remove} onClick={() => setPayments(current => current.length === 1 ? [blankRow(topics)] : current.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove scheduled payment"><i className="ti ti-trash" /></button>
          </div>)}</div>
          <button type="button" className={formStyles.addExpense} disabled={topicsLoading || !topics.length} onClick={() => setPayments(current => [...current, blankRow(topics)])}><i className="ti ti-plus" /> Add another expense</button>
        </section>
        <div className={formStyles.profileGrid}>
          <label className={formStyles.monthlyInput}><span><strong>Regular monthly living spend</strong><small>Before we plan, please tell us generally how much you spend monthly on your living.</small></span><div><b>AED</b><input inputMode="decimal" type="number" min="0" step="100" value={monthlySpend} onChange={event => setMonthlySpend(event.target.value)} placeholder="8,000" /></div></label>
          <label className={formStyles.salaryInput}><span><strong>Monthly salary</strong></span><div><b>AED</b><input inputMode="decimal" type="number" min="0" step="100" required value={salary} onChange={event => setSalary(event.target.value)} placeholder="Eligible cards only" /></div></label>
        </div>
        {error && <p className={styles.error}><i className="ti ti-alert-circle" /> {error}</p>}
        <footer className={formStyles.submitFooter}><button className="btn-primary" disabled={loading} type="submit">{loading ? 'Calculating all cards…' : 'Turn My Expense into Deal'} <i className={`ti ${loading ? 'ti-loader-2' : 'ti-arrow-right'}`} /></button></footer>
      </form>

      {result && <section id="bulk-results" className={styles.results}>
        <div className={styles.resultHeading}><div><h2>You’re spending it anyway. Make it count.</h2><p>Earnn finds the smartest way to pay and helps you get more back.</p></div><div className={`${styles.totalSpend} ${tileStyles.planSpend}`}><strong>{formatAed(result.monthly_projection.reduce((total, month) => total + month.total_spend_aed, 0))}</strong><small>planned over the next 12 months</small></div></div>
        <div className={resultStyles.controls}>
          <div className={resultStyles.tabs}>
            <button type="button" onClick={() => setResultTab('miles')} className={resultTab === 'miles' ? resultStyles.active : ''}>Miles view</button>
            <button type="button" onClick={showAedResults} className={resultTab === 'aed' ? resultStyles.active : ''}>AED rewards view</button>
          </div>
          <button type="button" className={resultStyles.filterButton} onClick={() => setFiltersOpen(true)}><i className="ti ti-adjustments-horizontal" /> Filter & sort</button>
        </div>
        {resultTab === 'miles' ? <>
          <div className={styles.method}><i className="ti ti-arrows-exchange" /><p>{result.conversion_method} Ranking: {resultSortLabel(resultSort, 'miles')}.</p></div>
          {!visibleMilesCards.length ? <div className={styles.empty}><i className="ti ti-plane-off" /><h3>No cards match this bank filter.</h3><p>Clear the bank filter to see all eligible cards.</p></div> : <div className={styles.cardList}>{visibleMilesCards.map((card, index) => <CardResult key={card.earnn_card_id} card={card} displayRank={index + 1} includeNewCard={includeNewCard} expanded={expandedCard === card.earnn_card_id} onToggle={() => setExpandedCard(current => current === card.earnn_card_id ? null : card.earnn_card_id)} />)}</div>}
          {!!result.exclusions.length && <details className={styles.exclusions}><summary>{result.exclusions.length} conversion data note{result.exclusions.length === 1 ? '' : 's'}</summary><p>Rewards without either an Emirates or Etihad conversion path are treated as zero generic miles.</p><ul>{result.exclusions.slice(0, 15).map(note => <li key={note}>{note}</li>)}</ul></details>}
        </> : aedLoading ? <div className={styles.empty}><i className="ti ti-loader-2" /><h3>Calculating AED rewards…</h3><p>Applying the same spend caps, bonuses and first-year fees.</p></div> : aedError ? <p className={styles.error}>{aedError}</p> : aedResult ? <>
          <div className={styles.method}><i className="ti ti-cash" /><p>Ranking: {resultSortLabel(resultSort, 'AED')}. Combined AED includes qualifying welcome bonuses and deducts the first-year fee.</p></div>
          {!visibleAedCards.length ? <div className={styles.empty}><i className="ti ti-cash-off" /><h3>No cards match this bank filter.</h3><p>Clear the bank filter to see all eligible cards.</p></div> : <div className={styles.cardList}>{visibleAedCards.map((card, index) => <AedCardResult key={card.earnn_card_id} card={card} displayRank={index + 1} includeNewCard={includeNewCard} expanded={expandedCard === card.earnn_card_id} onToggle={() => setExpandedCard(current => current === card.earnn_card_id ? null : card.earnn_card_id)} />)}</div>}
        </> : null}
        <BulkSpendResultFilters open={filtersOpen} onClose={() => setFiltersOpen(false)} banks={bankOptions} selectedBanks={selectedBanks} onSelectedBanksChange={setSelectedBanks} includeNewCard={includeNewCard} onIncludeNewCardChange={onIncludeNewCardChange} sort={resultSort} onSortChange={setResultSort} />
      </section>}
    </main>
  </div>
}

function CardResult({ card, displayRank, includeNewCard, expanded, onToggle }: { card: BulkSpendMilesCard, displayRank: number, includeNewCard: boolean, expanded: boolean, onToggle: () => void }) {
  const combinedMiles = combinedMilesAccumulation(card)
  const visibleMiles = includeNewCard ? combinedMiles : card.spend_miles_12_months
  const travelPotential = travelPotentialForMiles(visibleMiles)
  const travelArtwork = travelArtworkForMiles(visibleMiles)
  return <article className={`${styles.card} ${expanded ? styles.cardExpanded : ''}`}>
    <div className={tileStyles.cardSummary}>
      <div className={tileStyles.cardIdentity}>
        <span className={tileStyles.rank}>#{displayRank}</span>
        <div className={tileStyles.cardImage}><Image src={getCardImageUrl(card.earnn_card_id)} alt="" width={92} height={57} unoptimized /></div>
      </div>
      <div className={tileStyles.cardNarrative}>
        <div className={tileStyles.cardName}><strong>{card.card_name}</strong><small>{card.bank_name}</small></div>
        <div className={tileStyles.milesOpportunity}>
          <small>Opportunity to earn</small>
          <strong>{formatMiles(visibleMiles)}</strong>
        </div>
      </div>
      <div className={tileStyles.travelMoment} style={{ backgroundImage: `linear-gradient(90deg, rgba(7, 27, 67, .82), rgba(7, 27, 67, .14)), url(${travelArtwork.image})` }}>
        <button type="button" className={tileStyles.showHow} onClick={onToggle} aria-expanded={expanded}>{expanded ? 'Hide details' : 'Show me details'} <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-arrow-right'}`} /></button>
        <span><i className="ti ti-world" /> Your miles could unlock</span>
        <strong>{travelPotential.replace(/^[^ ]+ /, '')}</strong>
      </div>
    </div>
    {expanded && <div className={styles.cardDetail}>
      <SpendRewardDetails entries={card.spend_reward_breakdown} valueFormatter={formatMiles} heading="Base miles by spend type" />
      {includeNewCard && <ResultGroup title="Welcome bonus" guaranteedTitle="Guaranteed bonus" empty="No welcome bonus is recorded for this card." items={card.welcome_bonuses} />}
      <ResultGroup title="Benefits" guaranteedTitle="Guaranteed benefit" empty="No qualifying benefit is recorded for this card." items={card.benefit_opportunities} />
    </div>}
  </article>
}

function AedCardResult({ card, displayRank, includeNewCard, expanded, onToggle }: { card: BulkSpendAedCard, displayRank: number, includeNewCard: boolean, expanded: boolean, onToggle: () => void }) {
  const combinedAed = combinedAedAccumulation(card)
  const visibleAed = includeNewCard ? combinedAed : card.spend_rewards_12_months_aed
  return <article className={`${styles.card} ${expanded ? styles.cardExpanded : ''}`}>
    <div className={tileStyles.cardSummary}>
      <div className={tileStyles.cardIdentity}>
        <span className={tileStyles.rank}>#{displayRank}</span>
        <div className={tileStyles.cardImage}><Image src={getCardImageUrl(card.earnn_card_id)} alt="" width={92} height={57} unoptimized /></div>
      </div>
      <div className={tileStyles.cardNarrative}>
        <div className={tileStyles.cardName}><strong>{card.card_name}</strong><small>{card.bank_name}</small></div>
        <div className={tileStyles.milesOpportunity}>
          <small>Total AED reward</small>
          <strong>{formatAed(visibleAed)}</strong>
        </div>
      </div>
      <div className={tileStyles.travelMoment} style={{ backgroundImage: 'linear-gradient(90deg, rgba(7, 27, 67, .82), rgba(7, 27, 67, .14)), url(https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=82)' }}>
        <button type="button" className={tileStyles.showHow} onClick={onToggle} aria-expanded={expanded}>{expanded ? 'Hide details' : 'Show me details'} <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-arrow-right'}`} /></button>
        <span><i className="ti ti-wallet" /> Reward value in 12 months</span>
        <strong>Make planned spending work harder.</strong>
      </div>
    </div>
    {expanded && <div className={styles.cardDetail}>
      <SpendRewardDetails entries={card.spend_reward_breakdown} valueFormatter={formatAed} heading="Base rewards by spend type" />
      <p className={styles.noItems} style={{ marginTop: 14 }}>First-year card fee deducted: <strong>{formatAed(card.first_year_fee_aed)}</strong></p>
      {includeNewCard && <AedResultGroup title="Welcome bonus" guaranteedTitle="Selected welcome reward" empty="No AED welcome bonus is recorded for this card." items={card.welcome_bonuses} />}
      <AedResultGroup title="Benefits" guaranteedTitle="Selected benefit reward" empty="No qualifying AED-value benefit is recorded for this card." items={card.benefit_opportunities} />
    </div>}
  </article>
}

function SpendRewardDetails({ entries, valueFormatter, heading }: { entries: SpendRewardBreakdown[], valueFormatter: (value: number) => string, heading: string }) {
  return <div className={styles.monthlyMiles}><h3>{heading}</h3><div style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}>{entries.map(entry => {
    const amountPerMonth = entry.months_count > 0 ? entry.spend_aed / entry.months_count : entry.spend_aed
    const periodLabel = entry.months_count === 1 ? 'month' : 'months'
    const spendLabel = entry.category === 'recurring'
      ? `${formatAed(amountPerMonth)} per month × ${entry.months_count} ${periodLabel}`
      : `${formatAed(amountPerMonth)} × ${entry.months_count} ${periodLabel}`
    return <span key={entry.category} style={{ padding: '10px 12px', textAlign: 'left' }}><small>{entry.label} · {spendLabel}</small><b>{valueFormatter(entry.earned_value)}</b>{entry.payment_conditions?.map(condition => <em key={condition} style={{ display: 'block', marginTop: 5, color: '#526b91', fontSize: 10, fontStyle: 'normal', fontWeight: 600, lineHeight: 1.35 }}>Condition: {condition}</em>)}</span>
  })}</div></div>
}

function AedResultGroup({ title, guaranteedTitle, empty, items }: { title: string, guaranteedTitle: string, empty: string, items: Array<{ title: string, status: string, reward_aed: number, counts_towards_ranking: boolean, detail: string }> }) {
  const selected = items.filter(item => item.counts_towards_ranking)
  const potential = items.filter(item => !item.counts_towards_ranking)
  return <section className={styles.resultGroup}><h3>{title}</h3>{items.length ? <>
    {selected.length > 0 && <AedResultItems title={guaranteedTitle} items={selected} />}
    {potential.length > 0 && <AedResultItems title="Potential opportunity" items={potential} />}
  </> : <p className={styles.noItems}>{empty}</p>}</section>
}

function AedResultItems({ title, items }: { title: string, items: Array<{ title: string, reward_aed: number, detail: string }> }) {
  return <div><h4>{title}</h4><div className={styles.events}>{items.map((item, index) => <div key={`${item.title}-${index}`} style={{ gridTemplateColumns: 'minmax(150px, 1fr) auto' }}><strong>{item.title}</strong>{item.reward_aed > 0 ? <b>{formatAed(item.reward_aed)}</b> : null}<p style={{ gridColumn: '1 / -1' }}>{item.detail}</p></div>)}</div></div>
}

function ResultGroup({ title, guaranteedTitle, empty, items }: { title: string, guaranteedTitle: string, empty: string, items: Array<{ title: string, status: string, generic_miles: number, additional_cash_aed?: number, counts_towards_ranking?: boolean, detail: string }> }) {
  const alternatives = items.filter(item => item.counts_towards_ranking === false && item.detail.includes('Only one offer in this set applies.'))
  const guaranteed = items.filter(item => item.status === 'guaranteed' && !alternatives.includes(item))
  const potential = items.filter(item => item.status === 'potential' && !alternatives.includes(item))
  return <section className={styles.resultGroup}><h3>{title}</h3>{items.length ? <>
    {guaranteed.length > 0 && <ResultItems title={guaranteedTitle} items={guaranteed} />}
    {potential.length > 0 && <ResultItems title="Potential opportunity" items={potential} />}
    {alternatives.length > 0 && <ResultItems title="Alternative offer — only one applies" items={alternatives} />}
  </> : <p className={styles.noItems}>{empty}</p>}</section>
}

function ResultItems({ title, items }: { title: string, items: Array<{ title: string, status: string, generic_miles: number, additional_cash_aed?: number, counts_towards_ranking?: boolean, detail: string }> }) {
  return <div><h4>{title}</h4><div className={styles.events}>{items.map((item, index) => <div key={`${item.title}-${index}`} style={{ gridTemplateColumns: 'minmax(150px, 1fr) auto' }}><strong>{item.title}</strong>{item.generic_miles > 0 ? <b>{formatMiles(item.generic_miles)}</b> : (item.additional_cash_aed || 0) > 0 ? <b>{formatAed(item.additional_cash_aed || 0)} cash</b> : null}<p style={{ gridColumn: '1 / -1' }}>{item.detail}</p></div>)}</div></div>
}
