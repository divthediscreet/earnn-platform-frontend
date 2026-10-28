// Trip Planner hand-offs. The user's spending, salary, big payments and owned cards live only in the shared profile
// (lib/profile/storage.ts); the request below is built from it every time, so no planner keeps its own copy.
// What stays in session storage here is page flow only: which route the user took, the open trip, and the last answer.
import { patchProfile, readProfile } from '@/lib/profile/storage'
import { catalogueSnapshot, loadCatalogue } from '@/lib/life-moments/catalogue'
import type { CatalogueCard } from '@/lib/life-moments/api'
import type { BulkPaymentSchedule } from '@/lib/bulk-spend-miles/api'
import type { TripItem, TripPlannerRequest, TripPlannerResponse } from './api'

const EXISTING_ONLY_KEY = 'earnn_trip_existing_only'

function read<T>(key: string): T | null {
  try {
    const raw = window.sessionStorage.getItem(key)
    return raw ? JSON.parse(raw) as T : null
  } catch {
    return null
  }
}

function write(key: string, value: unknown) {
  try { window.sessionStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable: the flow still works for this page view */ }
}

/** Payments that are complete enough to plan with (an amount and at least one month). */
export const validPayments = (payments: BulkPaymentSchedule[] | undefined) =>
  (payments ?? []).filter(row => Number(row.amount_aed) > 0 && row.due_months?.length > 0)

/** The Trip Planner request for what the shared profile holds now, or null while salary or any spend is missing. */
export function readTripRequest(): TripPlannerRequest | null {
  const profile = readProfile()
  if (!profile) return null
  const regular = Object.fromEntries(Object.entries(profile.spend ?? {}).map(([key, value]) => [key, Number(value)]).filter(([, value]) => Number(value) > 0)) as Record<string, number>
  const payments = validPayments(profile.payments)
  const salary = Number(profile.salary)
  if (!(salary > 0) || (!Object.keys(regular).length && !payments.length)) return null
  return {
    salary_aed: salary,
    regular_spend: regular,
    scheduled_payments: payments,
    banks_held: null,
    skywards_balance: 0,
    etihad_balance: 0,
    existing_card_ids: (profile.owned_cards ?? []).map(card => card.earnn_card_id).filter(Boolean),
  }
}

/** The cards the user already holds in the card picker's shape: { <bank>: firstCardId, '<bank>#<n>': further cards }. */
export function readOwnedPicks(): Record<string, string> {
  const picks: Record<string, string> = {}
  const seen: Record<string, number> = {}
  for (const card of readProfile()?.owned_cards ?? []) {
    const bank = card.bank_code
    seen[bank] = (seen[bank] ?? 0) + 1
    picks[seen[bank] === 1 ? bank : `${bank}#${seen[bank]}`] = card.earnn_card_id
  }
  return picks
}

/**
 * The card picker updates the shared card list; the next request picks the change up.
 * `coveredBanks` = the banks the picker showed: cards of every other bank are kept as they are. Only an explicit
 * choice in a picker changes the owned cards; nothing else (such as a wallet being simulated) ever calls this.
 */
export function saveExistingPicks(picks: Record<string, string>, coveredBanks?: string[]) {
  const picked = (catalogue: CatalogueCard[] | null) => Object.entries(picks).filter(([, id]) => id).map(([key, id]): CatalogueCard =>
    catalogue?.find(card => card.earnn_card_id === id) ?? { earnn_card_id: id, card_name: id, bank_name: '', bank_code: key.split('#')[0] })
  const kept = coveredBanks ? (readProfile()?.owned_cards ?? []).filter(card => !coveredBanks.includes(card.bank_code)) : []
  patchProfile({ owned_cards: [...kept, ...picked(catalogueSnapshot())] })
  // names for any card the catalogue had not loaded yet
  if (!catalogueSnapshot()) {
    void loadCatalogue().then(catalogue => patchProfile({
      owned_cards: (readProfile()?.owned_cards ?? []).map(card => catalogue.find(known => known.earnn_card_id === card.earnn_card_id) ?? card),
    })).catch(() => undefined)
  }
}

const FROM_WALLET_KEY = 'earnn_trip_from_wallet'

/** Whether this Trip Planner session was opened from the Smart Wallet result (that result page is where "Back" returns to). */
export function readFromWallet(): boolean {
  try { return window.sessionStorage.getItem(FROM_WALLET_KEY) === '1' } catch { return false }
}

export function saveFromWallet(value: boolean) {
  try {
    if (value) window.sessionStorage.setItem(FROM_WALLET_KEY, '1')
    else window.sessionStorage.removeItem(FROM_WALLET_KEY)
  } catch { /* ignore */ }
}

/** The "only my existing cards" switch, carried from the results page into Customize and back. */
export function readExistingOnly(): boolean {
  try { return window.sessionStorage.getItem(EXISTING_ONLY_KEY) === '1' } catch { return false }
}

export function saveExistingOnly(value: boolean) {
  try { window.sessionStorage.setItem(EXISTING_ONLY_KEY, value ? '1' : '0') } catch { /* ignore */ }
}

// The opened trip lives on its own page, so the results page hands it over here and keeps its answer for the way back.
const TRIP_KEY = 'earnn_trip_selected'
const RESULT_KEY = 'earnn_trip_result'
const SCROLL_KEY = 'earnn_trip_results_scroll'

export const saveSelectedTrip = (trip: TripItem) => write(TRIP_KEY, trip)
export const readSelectedTrip = () => read<TripItem>(TRIP_KEY)

/** Another card that reaches the same trip, listed at the bottom of the trip page ("Want another option?"). */
export interface TripAlternative {
  earnn_card_id: string
  card_name: string
  bank_code: string
  bank_name: string
  airline: TripItem['airline']
  months: number
  miles_needed: number
  annual_fee_aed: number
}
const ALTERNATIVES_KEY = 'earnn_trip_alternatives'
export const saveTripAlternatives = (items: TripAlternative[]) => write(ALTERNATIVES_KEY, items)
export const readTripAlternatives = () => read<TripAlternative[]>(ALTERNATIVES_KEY) ?? []

/** The last Trip Planner answer, kept so "Back to results" shows the same page at once instead of recalculating. */
export const saveTripResult = (request: TripPlannerRequest, result: TripPlannerResponse) => write(RESULT_KEY, { key: JSON.stringify(request), result })
export function readTripResult(request: TripPlannerRequest): TripPlannerResponse | null {
  const saved = read<{ key: string, result: TripPlannerResponse }>(RESULT_KEY)
  return saved && saved.key === JSON.stringify(request) ? saved.result : null
}

export const saveResultsScroll = (y: number) => write(SCROLL_KEY, y)
export function takeResultsScroll(): number {
  const y = read<number>(SCROLL_KEY) ?? 0
  try { window.sessionStorage.removeItem(SCROLL_KEY) } catch { /* ignore */ }
  return y
}
