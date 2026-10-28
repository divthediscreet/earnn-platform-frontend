// Big Spend Planner hand-off. The monthly spend, salary and payments live only in the shared profile
// (lib/profile/storage.ts); the plan below is built from it every time. Only the chosen path is page flow.
import { readProfile } from '@/lib/profile/storage'
import type { BulkSpendMilesRequest } from './api'

const PATH_KEY = 'earnn_bulk_path'

/** Which kind of card the user chose to see: a miles card or a cashback (AED) card. */
export type BulkPath = 'miles' | 'aed'

/** The regular monthly spend the planner uses: the single total typed here, else the sum of the saved categories. */
export function bulkMonthlySpend(profile: ReturnType<typeof readProfile>): number {
  const total = Number(profile?.monthly_total)
  if (total > 0) return total
  return Object.values(profile?.spend ?? {}).reduce((sum, value) => sum + (Number(value) || 0), 0)
}

/** The plan for what the shared profile holds now, or null while salary or any spend is missing. */
export function readBulkRequest(): BulkSpendMilesRequest | null {
  const profile = readProfile()
  if (!profile) return null
  const payments = (profile.payments ?? []).filter(row => Number(row.amount_aed) > 0 && row.due_months?.length > 0)
  const monthly = bulkMonthlySpend(profile)
  const salary = Number(profile.salary)
  if (!(salary > 0) || (monthly <= 0 && !payments.length)) return null
  return { monthly_spend_aed: monthly, salary_aed: salary, scheduled_payments: payments }
}

export function readBulkPath(): BulkPath {
  try { return window.sessionStorage.getItem(PATH_KEY) === 'aed' ? 'aed' : 'miles' } catch { return 'miles' }
}

export function saveBulkPath(path: BulkPath) {
  try { window.sessionStorage.setItem(PATH_KEY, path) } catch { /* the flow still works for this page view */ }
}
