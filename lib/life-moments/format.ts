import type { LifeMomentBenefit } from './api'

export const PERIOD_LABELS: Record<string, string> = {
  annual: '/ year', year: '/ year', monthly: '/ month', month: '/ month',
  quarterly: '/ quarter', quarter: '/ quarter', per_transaction: 'per transaction', one_time: 'one-time',
}

export function formatPeriod(value?: string): string {
  if (!value?.trim()) return ''
  return PERIOD_LABELS[value.trim().toLowerCase()] ?? value
}

// Only the minimum-spend label uses these phrases ("Minimum spend AED 5,000 in that month"); frequency keeps "/ month" etc.
const MIN_SPEND_PERIOD_PHRASES: Record<string, string> = {
  annual: 'in that year', year: 'in that year', monthly: 'in that month', month: 'in that month',
  quarterly: 'in that quarter', quarter: 'in that quarter', per_transaction: 'per transaction', one_time: 'one-time',
}

function formatMinimumSpendPeriod(value?: string): string {
  if (!value?.trim()) return ''
  return MIN_SPEND_PERIOD_PHRASES[value.trim().toLowerCase()] ?? value
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat('en-AE', { maximumFractionDigits: 2 }).format(value)
}

export function formatFrequency(benefit: LifeMomentBenefit): string | null {
  const quantity = benefit.quantity_per_period
  if (quantity === undefined || quantity === null) return null
  if (quantity === 999999) return 'Unlimited'
  const period = formatPeriod(benefit.quantity_period)
  return `${quantity}${period ? ` ${period}` : ''}`
}

export function formatMinimumSpend(benefit: LifeMomentBenefit): string | null {
  if (benefit.requires_min_spend_on_card !== true) return null
  const amount = benefit.min_spend_aed_on_card
  if (amount === undefined || amount === null) return 'Minimum spend applies — see conditions.'
  const period = formatMinimumSpendPeriod(benefit.min_spend_period)
  return `Minimum spend AED ${formatAmount(amount)}${period ? ` ${period}` : ''}`
}

export function formatGuestNote(benefit: LifeMomentBenefit): string | null {
  return benefit.applicable_to === 'primary_cardholder_plus_1_guest' ? '+1 guest' : null
}
