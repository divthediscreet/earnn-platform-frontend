'use client'

// Trip Planner results page body: hero, 3-step strip, the recommended trip, then other possible trips with region filters.
// Presentation only: every trip, cabin and time comes from the Trip Planner response, in the order the server sent it.
import { useMemo, useState, type ReactNode } from 'react'
import type { TripItem } from '@/lib/trip-planner/api'
import { PARTY_ICON, cabinImage, tripArt } from '@/lib/trip-planner/format'
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

/** Destination name only (no cabin): "Egypt or the Middle East", "London or Europe", "India". */
function placeName(trip: TripItem) {
  const clean = (name: string) => name.replace(/^the\s+/i, '').replace(/\s+and\s+.*$/i, '').trim()
  const names = trip.destination_names
  return names.length <= 2 ? names.map(clean).join(' or ') : clean(names[0])
}

function blurb() {
  return 'Within reach based on what you spend each month.'
}

function Featured({ trip, onOpen }: { trip: TripItem, onOpen: (trip: TripItem) => void }) {
  const facts: [string, string, string][] = [
    ['ti-armchair', 'Class', trip.cabin === 'economy' ? 'Economy' : 'Business'],
    ['ti-clock', 'Time to fly', timeText(trip)],
    [PARTY_ICON[trip.party], 'Travellers', travellersText(trip)],
  ]
  // Business and upgrade trips get the cabin scene for the destination (the country seen from the window) across the whole card,
  // with the text on its dark left side; destinations without such a scene keep the photo-beside-text layout.
  const art = tripArt(trip.destination_names)
  const scene = trip.cabin !== 'economy' && art ? cabinImage(art.key) : null
  return <section className={`${styles.featured} ${scene ? styles.featuredScene : ''}`} style={scene ? { backgroundImage: `url(${scene})` } : undefined} aria-label="Recommended for you">
    <span className={styles.recBadge}><i className="ti ti-star-filled" aria-hidden="true" /> Recommended for you</span>
    {!scene && <div className={styles.featPhoto}><Photo trip={trip} /></div>}
    <div className={styles.featBody}>
      <div className={styles.featTop}>
        {trip.cabin === 'upgrade' && <span className={styles.valueTag}><i className="ti ti-diamond" aria-hidden="true" /> Best value route</span>}
      </div>
      <h2>{placeName(trip)}</h2>
      <p>{blurb()}</p>
      <ul className={styles.facts}>{facts.map(([icon, label, value]) => <li key={label}><i className={`ti ${icon}`} aria-hidden="true" /><span><small>{label}</small><b>{value}</b></span></li>)}</ul>
      <button type="button" className={styles.featGo} onClick={() => onOpen(trip)}>See how to get there <i className="ti ti-arrow-right" aria-hidden="true" /></button>
    </div>
  </section>
}

function TripTile({ trip, onOpen }: { trip: TripItem, onOpen: (trip: TripItem) => void }) {
  return <button type="button" className={styles.tile} onClick={() => onOpen(trip)} aria-label={`Open: ${placeName(trip)}`}>
    <span className={styles.tilePhoto}><Photo trip={trip} />{trip.cabin !== 'economy' && <span className={styles.bizBadge}><i className="ti ti-armchair" aria-hidden="true" /> Business</span>}</span>
    <span className={styles.tileBody}>
      <strong>{placeName(trip)}</strong>
      <span className={styles.tileFacts}>
        <span><i className={`ti ${PARTY_ICON[trip.party]}`} aria-hidden="true" /> {travellersText(trip)}</span>
        <span><i className="ti ti-clock" aria-hidden="true" /> {timeText(trip)}</span>
      </span>
      <i className={`ti ti-arrow-right ${styles.go}`} aria-hidden="true" />
    </span>
  </button>
}

export default function TripResults({ trips, onOpen, onCustomize, toolbar }: { trips: TripItem[], onOpen: (trip: TripItem) => void, onCustomize: () => void, toolbar?: ReactNode }) {
  const [filter, setFilter] = useState('popular')
  const [showAll, setShowAll] = useState(false)
  const top = trips.find(trip => trip.is_hero) ?? trips[0]
  // The server's order is kept: normal trips by score first, "Worth the wait" trips last.
  const others = useMemo(() => [...trips.filter(trip => trip.slot !== 'stretch'), ...trips.filter(trip => trip.slot === 'stretch')].filter(trip => trip !== top), [trips, top])
  const matches = (chip: Filter) => chip.regions === null ? others : others.filter(trip => trip.region_keys.some(key => chip.regions!.includes(key)))
  const chips = FILTERS.filter(chip => chip.regions === null || matches(chip).length > 0)
  const active = chips.find(chip => chip.key === filter) ?? chips[0]
  const list = matches(active)
  const shown = showAll ? list : list.slice(0, 4)
  if (!top) return null

  return <>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <h1>Business Class, <em>Closer Than You Think.</em></h1>
        <p>See where your everyday spending could take you — and the smartest way to get there.</p>
        <div className={styles.heroCtas}>
          <button type="button" className={styles.primary} onClick={onCustomize}><i className="ti ti-plane-departure" aria-hidden="true" /> Customize My Dream Trip <i className="ti ti-arrow-right" aria-hidden="true" /></button>
          <button type="button" className={styles.ghost} onClick={() => document.getElementById('other-trips')?.scrollIntoView({ behavior: 'smooth' })}>See Possibilities <i className="ti ti-arrow-right" aria-hidden="true" /></button>
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

    <Featured trip={top} onOpen={onOpen} />

    {others.length > 0 && <section className={styles.others} id="other-trips">
      <div className={styles.othersHead}>
        <h2>Other possible trips based on your spending</h2>
        {list.length > 4 && <button type="button" className={styles.viewAll} onClick={() => setShowAll(value => !value)}>{showAll ? 'Show fewer' : 'View all destinations'} <i className="ti ti-arrow-right" aria-hidden="true" /></button>}
      </div>
      <div className={styles.filters} role="tablist" aria-label="Filter by region">
        {chips.map(chip => <button key={chip.key} type="button" role="tab" aria-selected={chip.key === active.key} className={chip.key === active.key ? styles.chipOn : ''} onClick={() => { setFilter(chip.key); setShowAll(false) }}><i className={`ti ${chip.icon}`} aria-hidden="true" /> {chip.label}</button>)}
      </div>
      <div className={styles.grid}>{shown.map(trip => <TripTile key={trip.trip_id} trip={trip} onOpen={onOpen} />)}</div>
    </section>}
  </>
}
