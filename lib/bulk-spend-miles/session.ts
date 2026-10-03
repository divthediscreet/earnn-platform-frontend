// Hand-off between the Max Miles form and its results page (same pattern as Analyze's sessionStorage
// result): the form saves what the user typed, the results page re-runs the simulation from the saved
// request, and "Edit my plan" returns to the form with every input restored.
import type { BulkPaymentSchedule, BulkSpendMilesRequest } from './api'

const FORM_KEY = 'earnn_bulk_form'
const REQUEST_KEY = 'earnn_bulk_request'
const OUTCOME_KEY = 'earnn_bulk_outcome_pending'

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

/** Called on submit: keep the inputs for editing, the request for the results page, and show the outcome popup once. */
export function saveBulkSubmission(form: BulkFormState, request: BulkSpendMilesRequest) {
  write(FORM_KEY, form)
  write(REQUEST_KEY, request)
  try { window.sessionStorage.setItem(OUTCOME_KEY, '1') } catch { /* ignore */ }
}

/** True once per submission; reading it clears it so a refresh does not replay the popup. */
export function consumeBulkOutcomeFlag() {
  try {
    const pending = window.sessionStorage.getItem(OUTCOME_KEY) === '1'
    window.sessionStorage.removeItem(OUTCOME_KEY)
    return pending
  } catch {
    return false
  }
}
