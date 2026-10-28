'use client'

// Trip Planner results page: spending -> one example trip -> explore your own destination -> more destinations.
// Presentation only: every trip, cabin, card and time comes from the Trip Planner response, in the order the server sent it.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { TripItem, TripPlannerRequest } from '@/lib/trip-planner/api'
import { saveSelectedTrip, saveTripAlternatives } from '@/lib/trip-planner/session'
import { CABIN_LABEL, PARTY_ICON, tripArt } from '@/lib/trip-planner/format'
import { topicName } from '@/components/bulk-spend-miles/BulkResultView'
import TripExplorer from './TripExplorer'
import TripHeroFlow from './TripHeroFlow'
import styles from './TripResults.module.css'

/* eslint-disable @next/next/no-img-element */

const travellersText = (trip: TripItem) => trip.party === 'family4' ? 'Family of 4' : `${trip.travellers} ${trip.travellers === 1 ? 'person' : 'people'}`
const aed = (value: number) => `AED ${Math.round(value).toLocaleString('en-US')}`

/** Destination name only, kept short for display: the first place before an "or" ("Egypt or the Middle East" -> "Egypt"). */
function placeName(trip: TripItem) {
  const first = trip.destination_names[0] ?? ''
  return first.split(/\s+or\s+/i)[0].replace(/^the\s+/i, '').replace(/\s+and\s+.*$/i, '').trim()
}

/** A number that counts up to its value when it first appears (no motion when the visitor prefers reduced motion). */
function CountUp({ value, format = (n: number) => Math.round(n).toLocaleString('en-US') }: { value: number, format?: (n: number) => string }) {
  const [shown, setShown] = useState(value)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1300)
      setShown(value * (1 - Math.pow(1 - t, 3)))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <>{format(shown)}</>
}

function Photo({ trip }: { trip: TripItem }) {
  const art = tripArt(trip.destination_names)
  return art ? <img src={art.image} alt="" loading="lazy" /> : null
}

export default function TripResults({ trips, bestMiles, request, useExisting, topLink, refine, notice, onEdit }: {
  trips: TripItem[], bestMiles: Record<string, Record<string, number>>, request: TripPlannerRequest, useExisting: boolean, topLink?: ReactNode, refine?: ReactNode, notice?: ReactNode, onEdit: () => void
}) {
  const router = useRouter()
  const rail = useRef<HTMLDivElement>(null)
  const slide = (direction: 1 | -1) => rail.current?.scrollBy({ left: direction * rail.current.clientWidth * 0.8, behavior: 'smooth' })
  const [breakupOpen, setBreakupOpen] = useState(false)
  if (!trips.length) return null

  const example = trips.find(trip => trip.is_hero) ?? trips[0]
  const others = trips.filter(trip => trip !== example)
  // The same scoring that picks the example ranks every destination; the next twelve fill the row.
  const listed = others.slice(0, 12)
  // The hero names two different places: the example and the best trip to a place that is not the example's.
  const heroPlaces = [example, ...others.filter(trip => placeName(trip) !== placeName(example))].slice(0, 2)
  const monthly = Object.values(request.regular_spend).reduce((sum, value) => sum + value, 0)
  const bigPayments = request.scheduled_payments.filter(payment => payment.amount_aed > 0 && payment.due_months.length > 0)
  const bigTotal = bigPayments.reduce((sum, payment) => sum + payment.amount_aed * payment.due_months.length, 0)
  const yearly = monthly * 12 + bigTotal
  // The most miles the best single card could earn in a year, for whichever airline gives the most.
  const maxMiles = Math.max(0, ...Object.values(bestMiles).map(item => item['12'] ?? 0))
  const open = (trip: TripItem) => {
    saveSelectedTrip(trip)
    saveTripAlternatives([])
    router.push('/trip-planner/trip')
  }

  return <>
    {topLink}
    <TripHeroFlow
      yearly={yearly}
      miles={maxMiles}
      destinations={heroPlaces.map(trip => ({ place: placeName(trip), image: tripArt(trip.destination_names)?.image ?? null, months: trip.months, cabin: trip.cabin === 'economy' ? 'Economy' : 'Business' }))}
      onBreakup={() => setBreakupOpen(true)}
      onChoose={() => document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
    />

    {refine && <div className={styles.refineBar}>
      <div className={styles.refineStory}>
        <b>Make Your Miles Estimate More Accurate</b>
        <p><i className="ti ti-gift" aria-hidden="true" /> Welcome bonuses can unlock thousands of extra miles, but they’re usually only available on new cards. Tell us which cards you already have so we can calculate the miles you could actually earn.</p>
      </div>
      <div className={styles.refineActions}>{refine}</div>
    </div>}

    <TripExplorer example={example} request={request} useExisting={useExisting} notice={notice} onOpenExample={() => open(example)} />

    {listed.length > 0 && <section className={styles.more} aria-labelledby="more-title">
      <div className={styles.moreHead}>
        <div><h2 id="more-title">More destinations you could consider</h2><p className={styles.sub}>Based on your spending, here are a few more possibilities. Use the options above to see your preferred destination.</p></div>
        {listed.length > 4 && <div className={styles.railArrows}><button type="button" onClick={() => slide(-1)} aria-label="Show earlier destinations"><i className="ti ti-chevron-left" aria-hidden="true" /></button><button type="button" onClick={() => slide(1)} aria-label="Show more destinations"><i className="ti ti-chevron-right" aria-hidden="true" /></button></div>}
      </div>
      <div className={styles.rail} ref={rail}>
        {listed.map(trip => <button key={trip.trip_id} type="button" className={styles.tile} onClick={() => open(trip)} aria-label={`Open: ${placeName(trip)}`}>
          <span className={styles.tilePhoto}><Photo trip={trip} /></span>
          <span className={styles.tileBody}>
            <strong>{placeName(trip)}</strong>
            <span className={styles.row}><i className="ti ti-armchair" aria-hidden="true" /> {CABIN_LABEL[trip.cabin]}</span>
            <span className={styles.row}><i className="ti ti-clock" aria-hidden="true" /> {trip.ready_now ? 'Fly now' : `From ${trip.months} month${trip.months === 1 ? '' : 's'}`}</span>
            <span className={`${styles.row} ${styles.rowLast}`}><i className={`ti ${PARTY_ICON[trip.party]}`} aria-hidden="true" /> {travellersText(trip)}<i className={`ti ti-arrow-right ${styles.go}`} aria-hidden="true" /></span>
          </span>
        </button>)}
      </div>
    </section>}

    {breakupOpen && <div className={styles.modalBack} role="dialog" aria-modal="true" aria-label="Your yearly spending" onClick={() => setBreakupOpen(false)}>
      <div className={styles.modal} onClick={event => event.stopPropagation()}>
        <div className={styles.modalHead}><h3>How your yearly spending adds up</h3><button type="button" onClick={() => setBreakupOpen(false)} aria-label="Close"><i className="ti ti-x" /></button></div>
        <div className={styles.modalBlock}>
          <p className={styles.sum}><span>Regular monthly spending × 12</span><b>{aed(monthly)} × 12 = {aed(monthly * 12)}</b></p>
          <ul>{Object.entries(request.regular_spend).filter(([, value]) => value > 0).map(([key, value]) => <li key={key}><span>{topicName(key)}</span><b>{aed(value)} / month</b></li>)}</ul>
        </div>
        <div className={styles.modalBlock}>
          <p className={styles.sum}><span>Big payments</span><b>{aed(bigTotal)}</b></p>
          {bigPayments.length
            ? <ul>{bigPayments.map((payment, index) => <li key={`${payment.topic_code}-${index}`}><span>{topicName(payment.topic_code)}</span><b>{aed(payment.amount_aed)} × {payment.due_months.length} = {aed(payment.amount_aed * payment.due_months.length)}</b></li>)}</ul>
            : <p className={styles.none}>No big payments added.</p>}
        </div>
        <p className={`${styles.sum} ${styles.total}`}><span>Yearly spending</span><b>{aed(yearly)}</b></p>
        <button type="button" className={styles.editLink} onClick={() => { setBreakupOpen(false); onEdit() }}><i className="ti ti-pencil" aria-hidden="true" /> Edit my spending</button>
      </div>
    </div>}
  </>
}
