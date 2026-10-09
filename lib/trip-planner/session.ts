// Hand-off between the Trip Planner form and its results page (same sessionStorage pattern as Max Miles).
import type { BulkPaymentSchedule } from '@/lib/bulk-spend-miles/api'
import type { TripItem, TripPlannerRequest, TripPlannerResponse } from './api'

const FORM_KEY = 'earnn_trip_form'
const REQUEST_KEY = 'earnn_trip_request'
const EXISTING_ONLY_KEY = 'earnn_trip_existing_only'

export type BankMode = 'skipped' | 'none' | 'banks'

export interface TripFormState {
  spend: Record<string, string>
  salary: string
  payments: BulkPaymentSchedule[]
  bankMode: BankMode
  banks: string[]
  skywards: string
  etihad: string
  /** bank code -> chosen card id, from the "only my existing cards" pop-up */
  existingPicks: Record<string, string>
}

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

export const readTripForm = () => read<TripFormState>(FORM_KEY)
export const readTripRequest = () => read<TripPlannerRequest>(REQUEST_KEY)

export function saveTripSubmission(form: TripFormState, request: TripPlannerRequest) {
  write(FORM_KEY, form)
  write(REQUEST_KEY, request)
}

/** The results page updates the pop-up picks without touching the rest of the request. */
export function saveExistingPicks(picks: Record<string, string>) {
  const form = readTripForm()
  if (form) write(FORM_KEY, { ...form, existingPicks: picks })
  const request = readTripRequest()
  if (request) write(REQUEST_KEY, { ...request, existing_card_ids: Object.values(picks).filter(Boolean) })
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
