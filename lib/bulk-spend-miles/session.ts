// Hand-off between the Max Miles form and its results page (same pattern as Analyze's sessionStorage
// result): the form saves what the user typed, the results page re-runs the simulation from the saved
// request, and "Edit my plan" returns to the form with every input restored.
import type { BulkPaymentSchedule, BulkSpendMilesRequest } from './api'

const FORM_KEY = 'earnn_bulk_form'
const REQUEST_KEY = 'earnn_bulk_request'
const PATH_KEY = 'earnn_bulk_path'

/** Which kind of card the user chose to see: a miles card or a cashback (AED) card. */
export type BulkPath = 'miles' | 'aed'

export interface BulkFormState {
  monthlySpend: string
  salary: string
  payments: BulkPaymentSchedule[]
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

export const readBulkForm = () => read<BulkFormState>(FORM_KEY)
export const readBulkRequest = () => read<BulkSpendMilesRequest>(REQUEST_KEY)

export const readBulkPath = (): BulkPath => read<BulkPath>(PATH_KEY) === 'aed' ? 'aed' : 'miles'

/** Called once the user has picked a path: keep the inputs for editing and the request for the results page. */
export function saveBulkSubmission(form: BulkFormState, request: BulkSpendMilesRequest, path: BulkPath) {
  write(FORM_KEY, form)
  write(REQUEST_KEY, request)
  write(PATH_KEY, path)
}
