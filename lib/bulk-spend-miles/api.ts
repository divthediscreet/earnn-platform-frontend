const API_BASE = ''

export interface BulkSpendTopic {
  topic_code: string
  topic_label: string
  granular_categories: string[]
}

export interface BulkSpendTopicCatalogResponse {
  topics: BulkSpendTopic[]
}

export interface BulkPaymentSchedule {
  topic_code: string
  amount_aed: number
  due_months: number[]
}

export interface BulkSpendMilesRequest {
  monthly_spend_aed: number
  salary_aed?: number
  scheduled_payments: BulkPaymentSchedule[]
}

export interface ProjectionMonth {
  month_number: number
  calendar_month: number
  label: string
  recurring_miscellaneous_aed: number
  scheduled_by_category_aed: Record<string, number>
  total_spend_aed: number
}

export interface SpendRewardBreakdown {
  category: string
  label: string
  spend_aed: number
  months_count: number
  earned_value: number
  payment_conditions: string[]
}

export interface WelcomeBonusResult {
  title: string
  status: 'guaranteed' | 'potential'
  generic_miles: number
  additional_cash_aed: number
  counts_towards_ranking: boolean
  target_spend_aed?: number | null
  deadline_month?: number | null
  achieved_month?: number | null
  detail: string
}

export interface BenefitOpportunity {
  title: string
  benefit_category: string
  status: 'guaranteed' | 'potential'
  generic_miles: number
  unlock_month?: number | null
  detail: string
}

export interface BulkSpendMilesCard {
  rank: number
  earnn_card_id: string
  card_name: string
  bank_code: string
  bank_name: string
  monthly_base_miles: number[]
  spend_miles_12_months: number
  guaranteed_welcome_miles: number
  guaranteed_benefit_miles: number
  total_guaranteed_miles: number
  spend_reward_breakdown: SpendRewardBreakdown[]
  welcome_bonuses: WelcomeBonusResult[]
  benefit_opportunities: BenefitOpportunity[]
}

export interface BulkSpendMilesResponse {
  calculation_version: 'bulk_spend_miles_v1'
  comparison_currency: 'generic_miles'
  conversion_method: string
  assumptions: Record<string, unknown>
  monthly_projection: ProjectionMonth[]
  cards: BulkSpendMilesCard[]
  exclusions: string[]
}

export interface AedWelcomeBonusResult {
  title: string
  status: 'guaranteed' | 'potential'
  reward_aed: number
  counts_towards_ranking: boolean
  target_spend_aed?: number | null
  deadline_month?: number | null
  achieved_month?: number | null
  detail: string
}

export interface AedBenefitOpportunity {
  title: string
  benefit_category: string
  status: 'guaranteed' | 'potential'
  reward_aed: number
  counts_towards_ranking: boolean
  unlock_month?: number | null
  detail: string
}

export interface BulkSpendAedCard {
  rank: number
  earnn_card_id: string
  card_name: string
  bank_code: string
  bank_name: string
  monthly_base_rewards_aed: number[]
  spend_rewards_12_months_aed: number
  selected_welcome_rewards_aed: number
  selected_benefit_rewards_aed: number
  first_year_fee_aed: number
  net_rewards_12_months_aed: number
  spend_reward_breakdown: SpendRewardBreakdown[]
  welcome_bonuses: AedWelcomeBonusResult[]
  benefit_opportunities: AedBenefitOpportunity[]
}

export interface BulkSpendAedResponse {
  calculation_version: 'bulk_spend_aed_v1'
  comparison_currency: 'AED'
  assumptions: Record<string, unknown>
  monthly_projection: ProjectionMonth[]
  cards: BulkSpendAedCard[]
}

export async function getBulkSpendTopics(): Promise<BulkSpendTopicCatalogResponse> {
  const response = await fetch(`${API_BASE}/api/bulk-spend-miles/topics`)
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload && typeof payload === 'object' ? (payload as { detail?: { message?: string } }).detail : null
    throw new Error(detail?.message || 'We could not load the available payment topics right now.')
  }
  return payload as BulkSpendTopicCatalogResponse
}

export async function simulateBulkSpendMiles(request: BulkSpendMilesRequest): Promise<BulkSpendMilesResponse> {
  const response = await fetch(`${API_BASE}/api/bulk-spend-miles/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload && typeof payload === 'object' ? (payload as { detail?: { message?: string } }).detail : null
    throw new Error(detail?.message || 'We could not calculate your miles plan right now.')
  }
  return payload as BulkSpendMilesResponse
}

export async function simulateBulkSpendAed(request: BulkSpendMilesRequest): Promise<BulkSpendAedResponse> {
  const response = await fetch(`${API_BASE}/api/bulk-spend-miles/simulate-aed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload && typeof payload === 'object' ? (payload as { detail?: { message?: string } }).detail : null
    throw new Error(detail?.message || 'We could not calculate your AED rewards right now.')
  }
  return payload as BulkSpendAedResponse
}
