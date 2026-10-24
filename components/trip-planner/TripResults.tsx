'use client'

// Trip Planner results page body: hero, 3-step strip, then one tray of trips (the recommended one first, wearing a crown) with region filters.
// Presentation only: every trip, cabin and time comes from the Trip Planner response, in the order the server sent it.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import type { TripItem } from '@/lib/trip-planner/api'
import { PARTY_ICON, tripArt } from '@/lib/trip-planner/format'
import styles from './TripResults.module.css'

/* eslint-disable @next/next/no-img-element */

type Filter = { key: string, label: string, icon: string, regions: string[] | null }

// "Popular" shows everything; the other chips match a trip when any of its regions is listed.
const FILTERS: Filter[] = [
  { key: 'popular', label: 'Popular', icon: 'ti-star-filled', regions: null },
  { key: 'europe', label: 'Europe', icon: 'ti-world', regions: ['europe', 'uk_ireland'] },
  { key: 'asia', label: 'Asia', icon: 'ti-building-pagoda', regions: ['southeast_asia', 'china_east_asia', 'japan_korea', 'indian_subcontinent', 'philippines', 'russia_central_asia'] },
  { key: 'usa', label: 'Americas', icon: 'ti-map-2', regions: ['north_america', 'south_america'] },
  { key: 'me', label: 'Middle East', icon: 'ti-building', regions: ['middle_east', 'north_africa'] },
  { key: 'more', label: 'More Regions', icon: 'ti-dots', regions: ['australia_new_zealand', 'sub_saharan_africa', 'indian_ocean_islands'] },
]

const STEPS = [
  { icon: 'ti-map-pin', title: 'Choose or customize a destination', text: 'Tell us where you want to go, your cabin and travellers.' },
  { icon: 'ti-chart-bar', title: 'See your fastest route', text: 'We show you how soon you could get there based on your spending.' },
  { icon: 'ti-ticket', title: 'Unlock miles or upgrades', text: 'Follow your personalized plan and turn your spending into travel.' },
] as const

const timeText = (trip: TripItem) => trip.ready_now ? 'Fly now' : `Fly in ${trip.months} month${trip.months === 1 ? '' : 's'}`
const travellersText = (trip: TripItem) => trip.party === 'family4' ? 'Family of 4' : `${trip.travellers} ${trip.travellers === 1 ? 'person' : 'people'}`

function Photo({ trip }: { trip: TripItem }) {
  const art = tripArt(trip.destination_names)
  return art ? <img src={art.image} alt="" loading="lazy" /> : null
}

/** Destination name only, kept short for display: the first place before an "or" ("Egypt or the Middle East" -> "Egypt", "London or Europe" -> "London"). */
function placeName(trip: TripItem) {
  const first = trip.destination_names[0] ?? ''
  return first.split(/\s+or\s+/i)[0].replace(/^the\s+/i, '').replace(/\s+and\s+.*$/i, '').trim()
}

function TripTile({ trip, onOpen }: { trip: TripItem, onOpen: (trip: TripItem) => void }) {
  return <div className={styles.tileWrap}>
    {trip.is_hero && <span className={styles.crown} role="img" aria-label="Recommended for you" title="Recommended for you"><i className="ti ti-crown" aria-hidden="true" /></span>}
    <button type="button" className={styles.tile} onClick={() => onOpen(trip)} aria-label={`Open: ${placeName(trip)}`}>
      <span className={styles.tilePhoto}><Photo trip={trip} /><span className={styles.fromUae}>UAE to</span>{trip.cabin !== 'economy' && <span className={styles.bizBadge}><i className="ti ti-armchair" aria-hidden="true" /> Business class</span>}</span>
      <span className={styles.tileBody}>
        <strong className={styles.routeName}>{placeName(trip)}</strong>
        <span className={styles.tileFacts}>
          <span><i className={`ti ${PARTY_ICON[trip.party]}`} aria-hidden="true" /> {travellersText(trip)}</span>
          <span><i className="ti ti-clock" aria-hidden="true" /> {timeText(trip)}</span>
        </span>
        <span className={styles.goWrap}><small>Show</small><i className="ti ti-arrow-right" aria-hidden="true" /></span>
      </span>
    </button>
  </div>
}

/** One row of trips: four and a half tiles are visible, the arrows step through the rest. */
function Tray({ trips, onOpen }: { trips: TripItem[], onOpen: (trip: TripItem) => void }) {
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
  const step = (direction: 1 | -1) => track.current?.scrollBy({ left: direction * track.current.clientWidth * 0.8, behavior: 'smooth' })
  return <div className={styles.tray}>
    <div className={styles.track} ref={track} onScroll={measure}>{trips.map(trip => <TripTile key={trip.trip_id} trip={trip} onOpen={onOpen} />)}</div>
    {edge.left && <button type="button" className={`${styles.arrow} ${styles.arrowLeft}`} onClick={() => step(-1)} aria-label="Show earlier trips"><i className="ti ti-chevron-left" aria-hidden="true" /></button>}
    {edge.right && <button type="button" className={`${styles.arrow} ${styles.arrowRight}`} onClick={() => step(1)} aria-label="Show more trips"><i className="ti ti-chevron-right" aria-hidden="true" /></button>}
  </div>
}

export default function TripResults({ trips, onOpen, onCustomize, toolbar }: { trips: TripItem[], onOpen: (trip: TripItem) => void, onCustomize: () => void, toolbar?: ReactNode }) {
  const [filter, setFilter] = useState('popular')
  const [showAll, setShowAll] = useState(false)
  // The server's order is kept: the recommended trip first (it wears the crown), then the rest in the order they were picked.
  const matches = (chip: Filter) => chip.regions === null ? trips : trips.filter(trip => trip.region_keys.some(key => chip.regions!.includes(key)))
  const chips = FILTERS.filter(chip => chip.regions === null || matches(chip).length > 0)
  const active = chips.find(chip => chip.key === filter) ?? chips[0]
  const list = matches(active)
  if (!trips.length) return null

  return <>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1>Business Class, <em>Closer Than You Think.</em></h1>
        <p>See where your everyday spending could take you — and the smartest way to get there.</p>
        <div className={styles.heroCtas}>
          <button type="button" className={styles.primary} onClick={onCustomize}><i className="ti ti-plane-departure" aria-hidden="true" /> Customize My Dream Trip <i className="ti ti-arrow-right" aria-hidden="true" /></button>
          <button type="button" className={styles.ghost} onClick={() => document.getElementById('other-trips')?.scrollIntoView({ behavior: 'smooth' })}>See Possibilities <i className="ti ti-arrow-down" aria-hidden="true" /></button>
        </div>
      </div>
    </section>

    <section className={styles.stepsWrap} aria-label="How it works">
      <p className={styles.stepsHead}>HOW IT WORKS · 3 SIMPLE STEPS</p>
      <ol className={styles.steps}>
        {STEPS.map((step, index) => <li key={step.title}>
          <span className={styles.num}>{index + 1}</span>
          <div><b>{step.title}</b><small>{step.text}</small></div>
        </li>)}
      </ol>
    </section>

    {toolbar && <div className={styles.toolbar}>{toolbar}</div>}

    <section className={styles.others} id="other-trips">
      <div className={styles.othersHead}>
        <div>
          <h2>Few Possibilities where you could fly</h2>
          <p className={styles.othersSub}>These are just samples — you can always <button type="button" className={styles.customizeLink} onClick={onCustomize}>customize</button> your own trip.</p>
        </div>
      </div>
      <div className={styles.filterRow}>
        <div className={styles.filters} role="tablist" aria-label="Filter by region">
          {chips.map(chip => <button key={chip.key} type="button" role="tab" aria-selected={chip.key === active.key} className={chip.key === active.key ? styles.chipOn : ''} onClick={() => { setFilter(chip.key); setShowAll(false) }}><i className={`ti ${chip.icon}`} aria-hidden="true" /> {chip.label}</button>)}
        </div>
  {list.length > 1 && <button type="button" className={styles.viewAll} onClick={() => setShowAll(value => !value)}>{showAll ? 'Show fewer' : 'View all destinations'} <i className={`ti ${showAll ? 'ti-chevron-up' : 'ti-arrow-right'}`} aria-hidden="true" /></button>}
      </div>
      {showAll
        ? <div className={styles.gridAll}>{list.map(trip => <TripTile key={trip.trip_id} trip={trip} onOpen={onOpen} />)}</div>
        : <Tray key={active.key} trips={list} onOpen={onOpen} />}
    </section>
  </>
}
