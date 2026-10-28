'use client'

// Bottom of the trip page, as on the Max Miles result: "Not the right fit?" with Filter & sort, then "Want another option?" with the
// other cards that reach the same trip. "See this plan" swaps the whole page to that card.
import { useEffect, useMemo, useRef, useState } from 'react'
import { getCardImageUrl } from '@/lib/api'
import CardNameLink from '@/components/CardNameLink'
import { AIRLINE_LABEL } from '@/lib/trip-planner/format'
import type { Airline } from '@/lib/trip-planner/api'
import type { TripAlternative } from '@/lib/trip-planner/session'
import plan from '@/components/bulk-spend-miles/BulkResultView.module.css'
import styles from './TripAlternatives.module.css'

/* eslint-disable @next/next/no-img-element */

type Sort = 'fastest' | 'fee'

const monthsText = (months: number) => months <= 0 ? 'Fly now' : `Fly in ${months} month${months === 1 ? '' : 's'}`

function AltTile({ item, months, onPick }: { item: TripAlternative, months: number, onPick: (alternative: TripAlternative) => void }) {
  const difference = item.months - months
  return <article data-tile className={plan.tile}>
    <div className={plan.tileTop}>
      <img className={styles.cardImg} src={getCardImageUrl(item.earnn_card_id)} alt="" width={64} height={40} onError={event => { event.currentTarget.src = '/card-dummy.svg' }} />
      <span className={plan.tileName}><strong><CardNameLink cardId={item.earnn_card_id} mode="miles">{item.card_name}</CardNameLink></strong><small>{item.bank_name}</small></span>
    </div>
    <b className={plan.tileValue}>{monthsText(item.months)}</b>
    <small className={plan.tileDiff}>{difference > 0 ? `${difference} month${difference === 1 ? '' : 's'} later than Earnn's pick` : difference < 0 ? `${-difference} month${difference === -1 ? '' : 's'} sooner than Earnn's pick` : "Same time as Earnn's pick"}</small>
    <p className={plan.tileReason}>Earns {AIRLINE_LABEL[item.airline]}{item.annual_fee_aed > 0 ? ` · annual fee AED ${Math.round(item.annual_fee_aed).toLocaleString('en-US')}` : ' · no annual fee'}</p>
    <button type="button" onClick={() => onPick(item)}>See this plan</button>
  </article>
}

export default function TripAlternatives({ current, months, alternatives, onPick }: {
  current: { cardId: string, airline: Airline }
  months: number
  alternatives: TripAlternative[]
  onPick: (alternative: TripAlternative) => void
}) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [banks, setBanks] = useState<string[]>([])
  const [airline, setAirline] = useState<Airline | 'any'>('any')
  const [sort, setSort] = useState<Sort>('fastest')
  const track = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })

  const others = useMemo(() => alternatives.filter(item => !(item.earnn_card_id === current.cardId && item.airline === current.airline)), [alternatives, current])
  const bankList = useMemo(() => [...new Map(others.map(item => [item.bank_code, item.bank_name])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [others])
  const airlineList = useMemo(() => [...new Set(others.map(item => item.airline))], [others])
  const shown = useMemo(() => others
    .filter(item => (!banks.length || banks.includes(item.bank_code)) && (airline === 'any' || item.airline === airline))
    .sort((a, b) => sort === 'fee' ? a.annual_fee_aed - b.annual_fee_aed || a.months - b.months : a.months - b.months || a.annual_fee_aed - b.annual_fee_aed), [others, banks, airline, sort])
  const activeFilters = banks.length + (airline === 'any' ? 0 : 1) + (sort === 'fastest' ? 0 : 1)

  useEffect(() => {
    const element = track.current
    if (!element) return
    const sync = () => setEdge({ start: element.scrollLeft <= 2, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2 })
    sync()
    element.addEventListener('scroll', sync, { passive: true })
    window.addEventListener('resize', sync)
    return () => { element.removeEventListener('scroll', sync); window.removeEventListener('resize', sync) }
  }, [shown.length])

  const step = (direction: 1 | -1) => {
    const element = track.current
    const tile = element?.querySelector<HTMLElement>('[data-tile]')
    if (element && tile) element.scrollBy({ left: direction * (tile.getBoundingClientRect().width + 14), behavior: 'smooth' })
  }

  if (!others.length) return null
  return <>
    <div className={`${plan.filterBar} ${styles.bar}`}>
      <span>Not the right fit? Narrow the cards by bank, airline or how they are ranked.</span>
      <button type="button" className={plan.filterButton} onClick={() => setOpen(true)}><i className="ti ti-adjustments-horizontal" /> Filter &amp; sort{activeFilters > 0 ? ` · ${activeFilters}` : ''}</button>
    </div>

    {showAll
      ? <section className={`${plan.section} ${plan.tinted}`} aria-labelledby="all-title">
        <header className={`${plan.sectionHead} ${plan.carouselHead}`}>
          <div><span>ALL CARDS</span><h3 id="all-title">All {shown.length} {shown.length === 1 ? 'card' : 'cards'}</h3></div>
          <button type="button" className={plan.allToggle} onClick={() => setShowAll(false)}>Back to top options <span aria-hidden="true">↑</span></button>
        </header>
        {shown.length === 0
          ? <p className={styles.none}>No cards match these filters. <button type="button" onClick={() => { setBanks([]); setAirline('any'); setSort('fastest') }}>Clear filters</button></p>
          : <ol className={plan.allList}>{shown.map((item, index) => <li key={`${item.earnn_card_id}-${item.airline}`}>
            <span className={plan.allRank}>#{index + 1}</span>
            <img className={styles.cardImg} src={getCardImageUrl(item.earnn_card_id)} alt="" width={56} height={35} onError={event => { event.currentTarget.src = '/card-dummy.svg' }} />
            <span className={plan.allName}><strong><CardNameLink cardId={item.earnn_card_id} mode="miles">{item.card_name}</CardNameLink></strong><small>{item.bank_name} · Earns {AIRLINE_LABEL[item.airline]}</small></span>
            <b>{monthsText(item.months)}</b>
            <button type="button" onClick={() => { setShowAll(false); onPick(item) }}>See this plan</button>
          </li>)}</ol>}
      </section>
      : <section className={`${plan.section} ${plan.tinted}`} aria-labelledby="alt-title">
      <header className={`${plan.sectionHead} ${plan.carouselHead}`}>
        <div><span>OTHER GOOD OPTIONS</span><h3 id="alt-title">Want another option?</h3></div>
        <div className={plan.arrows}>
          <button type="button" onClick={() => step(-1)} disabled={edge.start} aria-label="Previous cards">←</button>
          <button type="button" onClick={() => step(1)} disabled={edge.end} aria-label="Next cards">→</button>
        </div>
      </header>
      {shown.length === 0
        ? <p className={styles.none}>No cards match these filters. <button type="button" onClick={() => { setBanks([]); setAirline('any'); setSort('fastest') }}>Clear filters</button></p>
        : <div className={plan.trackWrap}>
          <div className={plan.track} ref={track} tabIndex={0} aria-label="Alternative cards">
            {shown.map(item => <AltTile key={`${item.earnn_card_id}-${item.airline}`} item={item} months={months} onPick={onPick} />)}
          </div>
        </div>}
      {shown.length > 1 && <div className={plan.allCards}>
        <button type="button" className={plan.allToggle} onClick={() => setShowAll(true)}>See all {shown.length} cards <span aria-hidden="true">→</span></button>
      </div>}
    </section>}

    {open && <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Filter and sort" onClick={() => setOpen(false)}>
      <div className={styles.panel} onClick={event => event.stopPropagation()}>
        <div className={styles.panelHead}><h3>Filter &amp; sort</h3><button type="button" onClick={() => setOpen(false)} aria-label="Close"><i className="ti ti-x" /></button></div>
        <fieldset><legend>Sort by</legend>
          <label><input type="radio" name="sort" checked={sort === 'fastest'} onChange={() => setSort('fastest')} /> Fastest to the trip</label>
          <label><input type="radio" name="sort" checked={sort === 'fee'} onChange={() => setSort('fee')} /> Lowest annual fee</label>
        </fieldset>
        {airlineList.length > 1 && <fieldset><legend>Airline</legend>
          <label><input type="radio" name="airline" checked={airline === 'any'} onChange={() => setAirline('any')} /> No preference</label>
          {airlineList.map(code => <label key={code}><input type="radio" name="airline" checked={airline === code} onChange={() => setAirline(code)} /> {AIRLINE_LABEL[code]}</label>)}
        </fieldset>}
        <fieldset><legend>Bank</legend>
          <div className={styles.banks}>{bankList.map(([code, name]) => <label key={code}><input type="checkbox" checked={banks.includes(code)} onChange={() => setBanks(current => current.includes(code) ? current.filter(item => item !== code) : [...current, code])} /> {name}</label>)}</div>
        </fieldset>
        <div className={styles.panelFoot}>
          <button type="button" onClick={() => { setBanks([]); setAirline('any'); setSort('fastest') }}>Clear</button>
          <button type="button" className="btn-primary" onClick={() => setOpen(false)}>Show {shown.length} {shown.length === 1 ? 'card' : 'cards'}</button>
        </div>
      </div>
    </div>}
  </>
}
