import { ART } from '@/components/bulk-spend-miles/BulkResultView'
import type { Airline, Cabin, Party, TripItem } from './api'

/** "ready now" / "~8 months" (founder wording, spec v4 §4.B). */
export function monthsPhrase(trip: Pick<TripItem, 'months' | 'ready_now'>): string {
  if (trip.ready_now) return 'ready now'
  return `~${trip.months} month${trip.months === 1 ? '' : 's'}`
}

/** Timing text on a trip: "Ready now", "In ~8 months", or for the stretch trip "Worth the wait · ~14 months". */
export function tripTimeLabel(trip: Pick<TripItem, 'months' | 'ready_now' | 'slot'>): string {
  if (trip.ready_now) return 'Ready now'
  const months = `~${trip.months} month${trip.months === 1 ? '' : 's'}`
  return trip.slot === 'stretch' ? `Worth the wait · ${months}` : `In ${months}`
}

export const AIRLINE_LABEL: Record<Airline, string> = { emirates: 'Emirates Skywards', etihad: 'Etihad Guest' }

export const PARTY_LABEL: Record<Party, string> = { single: 'Single', couple: 'Couple', family4: 'Family' }
export const PARTY_ICON: Record<Party, string> = { single: 'ti-user', couple: 'ti-heart', family4: 'ti-users-group' }

const DRAWN_ART: [string, string][] = [
  ['Southeast Asia', 'southeast_asia'], ['Japan', 'japan_korea'], ['China', 'china_east_asia'], ['Middle East', 'middle_east'],
  ['Philippines', 'philippines'], ['Sub-Saharan', 'sub_saharan_africa'], ['Russia', 'russia_central_asia'], ['South America', 'south_america'],
]

/** Destination photo for a trip (the first destination that has one); null falls back to a plain gradient. */
export function tripArt(names: string[]): { city: string, image: string, key: string } | null {
  for (const name of names) {
    if (name.startsWith('London')) return { ...ART.london, key: 'london' }
    if (name.startsWith('New York')) return { ...ART.manhattan, key: 'new_york' }
    if (name.startsWith('Sydney')) return { ...ART.sydney, key: 'sydney' }
    if (name.includes('Maldives')) return { ...ART.maldives, key: 'maldives' }
    if (name === 'Egypt') return { ...ART.egypt, key: 'egypt' }
    if (name === 'India') return { ...ART.india, key: 'india' }
    // Landmark photos (Wikimedia Commons, see CREDITS.md) for destinations without an Unsplash photo (public/trip-planner/destinations).
    const drawn = DRAWN_ART.find(([prefix]) => name.includes(prefix))
    if (drawn) return { city: name, image: `/trip-planner/destinations/${drawn[1]}.jpg`, key: drawn[1] }
  }
  return null
}

export const formatMiles = (miles: number) => `${Math.round(miles).toLocaleString('en-US')} miles`

/**
 * Business-class cabin backgrounds, shown only in the opened trip's detail view for Business and Business-upgrade trips.
 * All Trip Planner images live under public/trip-planner/destinations/ (photos for the results page here, cabin scenes in business-class/).
 * Destinations without a file (middle_east, philippines, russia_central_asia) use the window-frame fallback; so do economy trips.
 */
const BUSINESS_CLASS_IMAGE: Record<string, string> = {
  new_york: 'new-york', london: 'london', sydney: 'sydney', maldives: 'maldives', egypt: 'egypt', india: 'india',
  southeast_asia: 'southeast-asia', japan_korea: 'japan', china_east_asia: 'china', sub_saharan_africa: 'africa', south_america: 'brazil',
}
export const cabinImage = (key: string): string | null =>
  BUSINESS_CLASS_IMAGE[key] ? `/trip-planner/destinations/business-class/${BUSINESS_CLASS_IMAGE[key]}.webp` : null

export const CABIN_LABEL: Record<Cabin, string> = { economy: 'Economy Class', business: 'Business Class', upgrade: 'Business Class upgrade' }

/** Card timing: "Ready now" or "~8 months". */
export function shortTime(trip: Pick<TripItem, 'months' | 'ready_now'>): string {
  return trip.ready_now ? 'Ready now' : `~${trip.months} month${trip.months === 1 ? '' : 's'}`
}

/** The first place in a destination label: "New York and North America" -> "New York", "the Maldives and Indian Ocean" -> "Maldives". */
export function shortPlace(label: string | undefined): string {
  return (label ?? '').replace(/^the\s+/i, '').split(/\s+(?:and|or)\s+/i)[0].trim()
}
