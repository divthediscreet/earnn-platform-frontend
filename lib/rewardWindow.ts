// Builds the popup's "Rewards" window from fact_reward_rules rows (card detail `reward_rows`).
// Columns: High (earn_type accelerated) | Low (penalized) | International (EU/UK + other), footer: All other (base).
// Labels come straight from category_display_message, so editing it in the backend changes the display.

export type RewardRow = {
  category_display_message?: string | null
  category_normalised?: string | null
  earn_type?: string | null
  reward_currency_name?: string | null
  reward_program_type?: string | null
  aed_value_per_aed_spent?: number | null
  miles_earned_per_aed_spent?: number | null
  min_monthly_spend_aed_on_card?: number | null
  is_tier_level_capped?: boolean | null
  max_earning_per_tier_in_aed?: number | null
  cap_period?: string | null
  aed_to_miles_conversion_ratio?: number | null
}

export type RewardItem = { label: string; rate: string; currency: string; group: string; tierMin: number; sortRate: number; cap?: string }
export type RewardWindow = { isMiles: boolean; high: RewardItem[]; low: RewardItem[]; intlEu: RewardItem[]; intlOther: RewardItem[]; base: RewardItem[]; currencies: string[] }

const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
const clean = (text: string) => capitalise(text.replace(/_/g, ' ').replace(/\s+/g, ' ').trim())
const num = (value: number) => String(Number(value.toFixed(2)))
// "…– Monthly spend AED 3,000–7,999" tiers of the same category share a group.
const TIER_SUFFIX = /\s*[–—-]\s*monthly spend.*$/i

const item0Currency = (row: RewardRow) => clean(String(row.reward_currency_name ?? ''))

// "Cap: AED 300/mo" (cashback/points) or "Cap: 2,727 mi/mo" (miles view: AED cap / AED-per-mile ratio, as in Analyze).
const tierCap = (row: RewardRow, miles: boolean, ratio: number | null) => {
  const aed = row.max_earning_per_tier_in_aed
  if (!row.is_tier_level_capped || !aed) return undefined
  const value = miles && ratio ? aed / ratio : aed
  const period = row.cap_period === 'monthly' ? '/mo' : row.cap_period ? `/${row.cap_period}` : ''
  return `Cap: ${miles && ratio ? '' : 'AED '}${new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 }).format(value)}${miles && ratio ? ' mi' : ''}${period}`
}

// Miles view = every AED rate and cap divided by the card's AED-per-mile ratio (same rule as the Analyze simulator).
export function buildRewardWindow(rows: RewardRow[], view: { miles?: boolean; ratio?: number | null } = {}): RewardWindow {
  const ratio = view.ratio && view.ratio > 0 ? view.ratio : null
  const miles = !!view.miles && ratio !== null
  const result: RewardWindow = { isMiles: miles, high: [], low: [], intlEu: [], intlOther: [], base: [], currencies: [] }

  for (const row of rows) {
    const aedRate = row.aed_value_per_aed_spent
    const raw = aedRate === null || aedRate === undefined ? aedRate : (miles && ratio ? aedRate / ratio : aedRate)
    if (raw === null || raw === undefined || !Number.isFinite(raw)) continue
    const tokens = String(row.category_normalised ?? '').split('|').map(token => token.trim()).filter(Boolean)
    const message = String(row.category_display_message ?? '').trim() || tokens[0] || 'Spend'
    const label = clean(message)
    if (item0Currency(row) && !result.currencies.includes(item0Currency(row))) result.currencies.push(item0Currency(row))
    const percent = raw * 100 // cashback/points: % of spend; miles: miles per AED 100
    const item: RewardItem = {
      label,
      rate: result.isMiles ? `${num(percent)} mi` : `${num(percent)}%`,
      currency: clean(String(row.reward_currency_name ?? '')),
      group: label.replace(TIER_SUFFIX, ''),
      tierMin: row.min_monthly_spend_aed_on_card ?? 0,
      sortRate: percent,
      cap: tierCap(row, miles, ratio),
    }

    // International box: only the category code decides, whatever the earn type.
    //   EU/UK            = category has int_eu_uk     or international
    //   Other than EU/UK = category has int_non_eu_uk or international
    const eu = tokens.includes('international') || tokens.includes('int_eu_uk')
    const other = tokens.includes('international') || tokens.includes('int_non_eu_uk')
    if (eu) result.intlEu.push(item)
    if (other) result.intlOther.push(item)

    // High / Low / Base: by earn type (a row that is an international rate is not repeated under High or Low).
    if (row.earn_type === 'base') result.base.push(item)
    else if (!eu && !other) {
      if (row.earn_type === 'accelerated') result.high.push(item)
      else if (row.earn_type === 'penalized') result.low.push(item)
    }
  }

  for (const key of ['high', 'low', 'intlEu', 'intlOther', 'base'] as const) result[key] = orderItems(result[key])
  return result
}

// Categories by best rate first; inside a category, tiers in increasing min_monthly_spend order.
function orderItems(items: RewardItem[]): RewardItem[] {
  const seen = new Set<string>()
  const unique = items.filter(item => { const key = `${item.label}|${item.rate}|${item.tierMin}`; if (seen.has(key)) return false; seen.add(key); return true })
  const groupBest = new Map<string, number>()
  unique.forEach(item => groupBest.set(item.group, Math.max(groupBest.get(item.group) ?? -Infinity, item.sortRate)))
  return unique.sort((a, b) => (groupBest.get(b.group)! - groupBest.get(a.group)!) || a.group.localeCompare(b.group) || a.tierMin - b.tierMin)
}

export const hasRewards = (window: RewardWindow) => window.high.length + window.low.length + window.intlEu.length + window.intlOther.length + window.base.length > 0
