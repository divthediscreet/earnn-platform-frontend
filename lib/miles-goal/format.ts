export const formatNumber = (value: number, maximumFractionDigits = 0) => new Intl.NumberFormat('en-AE', {
  maximumFractionDigits,
}).format(value)

export const formatAed = (value: number) => `AED ${formatNumber(value)}`
export const formatMiles = (value: number) => `${formatNumber(value)} miles`
export const formatMonths = (value: number | null | undefined) => value ? `${value} ${value === 1 ? 'month' : 'months'}` : '—'

export function feeRouteLabel(route: string): string {
  return route === 'monthly_fee_acceleration' ? 'Express miles monthly route' : 'Standard annual fee route'
}

export function airlineLabel(airline: string): string {
  return airline === 'emirates' ? 'Emirates' : 'Etihad'
}
