'use client'

// Trip results as a discovery page: an intro hero with postcards of the user's own selected trips, a clean grid of destination
// cards, an optional "Worth the wait" strip and the Customize call to action; plus the trip detail pop-up.
// The first view never shows the airline, a card, or how the miles are earned (spec v4 §4.B).
// Presentation only: every trip, label and time comes from the Trip Planner response, in the order the server sent it.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getCardImageUrl } from '@/lib/api'
import { getTripPlan } from '@/lib/trip-planner/api'
import type { TripItem, TripPlannerRequest, TripPlanResponse } from '@/lib/trip-planner/api'
import { Opportunities, milesPlan, topicName } from '@/components/bulk-spend-miles/BulkResultView'
import plan from '@/components/bulk-spend-miles/BulkResultView.module.css'
import { TripWhyThisCard, summariseSpend } from './TripPlanSections'
import { AIRLINE_LABEL, cabinImage, CABIN_LABEL, formatMiles, monthsPhrase, PARTY_ICON, PARTY_LABEL, shortPlace, shortTime, tripArt } from '@/lib/trip-planner/format'
import styles from './TripShowcase.module.css'
import CardNameLink from '@/components/CardNameLink'

/* eslint-disable @next/next/no-img-element */

function Photo({ trip }: { trip: TripItem }) {
  const art = tripArt(trip.destination_names)
  return art ? <img src={art.image} alt="" loading="lazy" /> : null
}

/** Up to three different destinations from the selected trips (the Top Pick first), for the postcard collage. */
function postcardTrips(trips: TripItem[]): TripItem[] {
  const seen = new Set<string>()
  const picks: TripItem[] = []
  for (const trip of [...trips.filter(item => item.slot !== 'stretch'), ...trips.filter(item => item.slot === 'stretch')]) {
    const key = tripArt(trip.destination_names)?.key
    if (!key || seen.has(key)) continue
    seen.add(key)
    picks.push(trip)
    if (picks.length === 3) break
  }
  return picks
}

function IntroHero({ trips }: { trips: TripItem[] }) {
  const cards = postcardTrips(trips)
  return <section className={styles.intro}>
    <div className={styles.introCopy}>
      <span className={styles.introKicker}>YOUR SPENDING CAN TAKE YOU PLACES</span>
      <h2>Turn your everyday<br />spend into <em>extraordinary</em><br /><em>getaways</em></h2>
      <p>Based on your spending and the miles you can earn.</p>
      <ul className={styles.cues}>
        <li><i className="ti ti-map-pin" aria-hidden="true" /><div><strong>Real destinations</strong><small>You can actually reach</small></div></li>
        <li><i className="ti ti-calendar-time" aria-hidden="true" /><div><strong>Personalized timeline</strong><small>Based on your spending</small></div></li>
        <li><i className="ti ti-armchair" aria-hidden="true" /><div><strong>Business, upgrades &amp; more</strong><small>Luxury experiences</small></div></li>
      </ul>
    </div>
    <div className={styles.postcards} aria-hidden="true">
      <span className={styles.cloud} />
      <svg className={styles.flightPath} viewBox="0 0 300 90" fill="none"><path d="M4 84 C 70 80, 150 18, 262 28" stroke="#dbe8ff" strokeWidth="1.6" strokeDasharray="3 5" strokeLinecap="round" /></svg>
      <i className={`ti ti-plane ${styles.flightPlane}`} />
      {cards.map((trip, index) => <figure key={trip.trip_id} className={`${styles.postcard} ${styles[`postcard${index}`]}`}><Photo trip={trip} /></figure>)}
      {cards.map((trip, index) => <span key={`pill${trip.trip_id}`} className={`${styles.pill} ${styles[`pill${index}`]}`}>
        <i className="ti ti-map-pin-filled" /><span><b>{shortPlace(trip.destination_names[0])}</b><small>{shortTime(trip)}</small></span>
      </span>)}
    </div>
  </section>
}

function DestinationCard({ trip, onOpen }: { trip: TripItem, onOpen: (trip: TripItem) => void }) {
  return <button type="button" className={styles.destCard} onClick={() => onOpen(trip)} aria-label={`Open: ${trip.hook}`}>
    <span className={styles.destPhoto}><Photo trip={trip} />{trip.is_hero && <span className={styles.topPick}><i className="ti ti-star-filled" /> TOP PICK</span>}</span>
    <span className={styles.destBody}>
      <strong>{trip.hook}</strong>
      <small>{CABIN_LABEL[trip.cabin]}</small>
      <span className={styles.destMeta}>
        <span><i className="ti ti-clock" /> {shortTime(trip)}</span>
        <span><i className={`ti ${PARTY_ICON[trip.party]}`} /> {PARTY_LABEL[trip.party]}</span>
        <i className={`ti ti-arrow-right ${styles.destGo}`} aria-hidden="true" />
      </span>
    </span>
  </button>
}

/** Four cards per row; any more scroll sideways inside the same row, with arrows to step through them. */
function DestinationRow({ trips, onOpen }: { trips: TripItem[], onOpen: (trip: TripItem) => void }) {
  const track = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ left: false, right: false })
  const measure = useCallback(() => {
    const el = track.current
    if (el) setEdge({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 })
  }, [])
  useEffect(() => {
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure, trips.length])
  const step = (direction: 1 | -1) => {
    const el = track.current
    if (el) el.scrollBy({ left: direction * el.clientWidth, behavior: 'smooth' })
  }
  return <div className={styles.destRow}>
    <div className={styles.destTrack} ref={track} onScroll={measure}>{trips.map(trip => <DestinationCard key={trip.trip_id} trip={trip} onOpen={onOpen} />)}</div>
    {edge.left && <button type="button" className={`${styles.rowArrow} ${styles.rowArrowLeft}`} onClick={() => step(-1)} aria-label="Show earlier destinations"><i className="ti ti-chevron-left" /></button>}
    {edge.right && <button type="button" className={`${styles.rowArrow} ${styles.rowArrowRight}`} onClick={() => step(1)} aria-label="Show more destinations"><i className="ti ti-chevron-right" /></button>}
  </div>
}

export default function TripShowcase({ trips, onOpen }: { trips: TripItem[], onOpen: (trip: TripItem) => void }) {
  if (!trips.length) return null
  // The server decides the order: the Top Pick first, the other normal trips by score, "Worth the wait" trips last.
  const normal = trips.filter(trip => trip.slot !== 'stretch')
  const waiting = trips.filter(trip => trip.slot === 'stretch')
  return <>
    <IntroHero trips={trips} />
    {normal.length > 0 && <section className={styles.discover}>
      <h3>More places your spending could take you</h3>
      <p>Personalized possibilities based on your spending.</p>
      <DestinationRow trips={normal} onOpen={onOpen} />
    </section>}
    {waiting.length > 0 && <section className={styles.waitStrip}>
      <span className={styles.waitKicker}>WORTH THE WAIT</span>
      <div className={styles.waitList}>{waiting.map(trip => <button type="button" key={trip.trip_id} className={styles.waitItem} onClick={() => onOpen(trip)} aria-label={`Open: ${trip.hook}`}>
        <span className={styles.waitThumb}><Photo trip={trip} /></span>
        <span className={styles.waitText}><strong>{trip.hook}</strong><small>{shortTime(trip)}</small></span>
        <i className="ti ti-arrow-right" aria-hidden="true" />
      </button>)}</div>
    </section>}
  </>
}

/** "Want a trip of your own?": the road into Customize My Trip. */
export function CustomizeCta({ onClick }: { onClick: () => void }) {
  return <section className={styles.cta}>
    <svg className={styles.ctaArt} viewBox="0 0 520 160" fill="none" aria-hidden="true">
      <path d="M20 130 C 140 150, 250 20, 500 36" stroke="#9db6e6" strokeWidth="1.6" strokeDasharray="4 6" />
      <circle cx="250" cy="82" r="5" stroke="#9db6e6" strokeWidth="1.6" />
    </svg>
    <i className={`ti ti-plane-tilt ${styles.ctaPlane}`} aria-hidden="true" />
    <i className={`ti ti-luggage ${styles.ctaBag}`} aria-hidden="true" />
    <div className={styles.ctaCopy}><h3>Want a trip of your own?</h3><p>Choose a destination, cabin and travellers, and see exactly which card gets you there and how fast.</p></div>
    <button type="button" className={styles.ctaButton} onClick={onClick}>Customize My Trip <i className="ti ti-arrow-right" /></button>
  </section>
}

/**
 * "How is this even possible": the one card that gets this trip, shown with the same three sections as the Max Miles result
 * (Why this card / Your payment plan / Don't leave this behind).  The sections are the Max Miles components themselves, fed by
 * /api/trip-planner/plan, which runs the Bulk Spend engine for this card and airline.
 */
export function TripDetail({ trip, request, existingOnly, onBack }: { trip: TripItem, request: TripPlannerRequest, existingOnly: boolean, onBack: () => void }) {
  const art = tripArt(trip.destination_names)
  const [result, setResult] = useState<TripPlanResponse | null>(null)
  const [error, setError] = useState('')
  const cabinSrc = art ? cabinImage(art.key) : null  // business-class scene for this destination, when one exists
  const [cabinFailed, setCabinFailed] = useState(false)
  const premium = trip.cabin !== 'economy'
  const toIdx = trip.hook.lastIndexOf(' to ')
  const heading = toIdx > 0 ? [trip.hook.slice(0, toIdx), trip.hook.slice(toIdx + 4)] : [trip.hook, '']
  const card = trip.top_card
  // A bank the user already holds, and the "only my existing cards" view, give no new-customer welcome bonus.
  const includeWelcome = !existingOnly && !!card && !(request.banks_held ?? []).includes(card.bank_code.toUpperCase())

  // The page mounts afresh for every trip, so result and error start empty.
  useEffect(() => {
    if (!card) return
    const controller = new AbortController()
    getTripPlan({ ...request, earnn_card_id: card.earnn_card_id, airline: trip.airline, include_welcome: includeWelcome }, controller.signal)
      .then(setResult)
      .catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'We could not load the plan for this card right now.') })
    return () => controller.abort()
  }, [card, request, trip.airline, includeWelcome])
  const cardPlan = useMemo(() => result && milesPlan(result.card, result.include_welcome), [result])
  const labelFor = useMemo(() => (code: string) => result?.topic_labels[code] && code.startsWith('reg_') ? result.topic_labels[code] : topicName(code), [result])
  const summary = useMemo(() => result && summariseSpend(result.card.spend_reward_breakdown, result.monthly_projection, request, labelFor), [result, request, labelFor])
  const items = cardPlan ? [...cardPlan.welcomeItems, ...cardPlan.benefitItems] : []

  return <div className={styles.detailPage}>
    <section className={styles.detail} aria-label={trip.hook}>
      <button type="button" className={styles.backLink} onClick={onBack}><i className="ti ti-arrow-left" /> Back to results</button>
      <header className={`${styles.cabinHero} ${premium ? styles.cabinPremium : ''}`}>
        <div className={styles.cabinArt} aria-hidden="true">
          {premium && cabinSrc && !cabinFailed && <img className={styles.cabinPhoto} src={cabinSrc} alt="" onError={() => setCabinFailed(true)} />}
          {premium && art && (!cabinSrc || cabinFailed) && <div className={styles.windowFrame}><img src={art.image} alt="" /></div>}
          {!premium && art && <img className={styles.cabinPhoto} src={art.image} alt="" />}
        </div>
        <div className={styles.cabinCopy}>
          <span className={styles.cabinKicker}>YOUR TRIP</span>
          <h2>{heading[0]}{heading[1] && <> to <em>{heading[1]}</em></>}</h2>
          <ul className={styles.cabinMeta}>
            <li><i className="ti ti-map-pin" aria-hidden="true" /><div><strong>{trip.destination_names.join(' · ')}</strong></div></li>
            <li><i className="ti ti-plane" aria-hidden="true" /><div><strong>{AIRLINE_LABEL[trip.airline]}</strong><small>{formatMiles(trip.miles_needed)} required</small></div></li>
          </ul>
          <div className={styles.flyIn}><i className="ti ti-plane-departure" aria-hidden="true" /><div><small>You could be flying in</small><strong>{trip.ready_now ? 'Ready now' : monthsPhrase(trip)}</strong></div></div>
        </div>
      </header>
      <div className={styles.detailBody}>
        {card
          ? <div className={styles.routeCard}>
            <span className={styles.routeKicker}><i className="ti ti-bolt" aria-hidden="true" /> YOUR FASTEST ROUTE</span>
            <div className={styles.routeMain}>
              <img src={getCardImageUrl(card.earnn_card_id)} alt="" onError={event => { event.currentTarget.src = '/card-dummy.svg' }} />
              <div className={styles.routeName}><strong><CardNameLink cardId={card.earnn_card_id} mode="miles">{card.card_name}</CardNameLink></strong><span>{card.bank_name}</span>
                <p><b><i className="ti ti-plane" aria-hidden="true" /> Earns {AIRLINE_LABEL[trip.airline]}</b>{result && result.include_welcome && result.card.guaranteed_welcome_miles > 0 && <b><i className="ti ti-gift" aria-hidden="true" /> Welcome bonus included</b>}</p></div>
              <div className={styles.routeEarn}><small>Earns you in 12 months</small><strong>{cardPlan ? formatMiles(cardPlan.total) : '…'}</strong>
                <span>{trip.ready_now ? 'Enough for this trip now' : trip.months > 12 ? `Reaches this trip in ${monthsPhrase(trip)}` : `Enough for this trip in ${monthsPhrase(trip)}`}</span></div>
            </div>
          </div>
          : <div className={styles.topCard}><i className="ti ti-circle-check" style={{ fontSize: 28, color: '#00a67e' }} /><div><small>YOU ALREADY HAVE ENOUGH MILES</small><strong>No new card needed</strong><span>Your current balance covers this trip.</span></div></div>}
        {card && !result && !error && <p className={styles.planStatus} role="status"><i className="ti ti-loader-2" /> Building the plan for this card…</p>}
        {error && <p className={styles.planStatus} role="alert"><i className="ti ti-alert-circle" /> {error}</p>}
        {result && cardPlan && summary && <div className={plan.view} style={{ marginTop: 0 }}>
          {trip.months > 12 && <p className={styles.planStatus}><i className="ti ti-info-circle" /> This trip is reached in ~{trip.months} months. The plan below covers the first 12.</p>}
          <TripWhyThisCard plan={cardPlan} summary={summary} includeNewCard={result.include_welcome} projection={result.monthly_projection} request={request} />
          <Opportunities plan={cardPlan} unit="miles" items={items.filter(item => item.kind === 'potential')} alternatives={items.filter(item => item.kind === 'alternative')} />
          <small className={styles.planNote}>{result.assumption}</small>
        </div>}
      </div>
    </section>
  </div>
}
