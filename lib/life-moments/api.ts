const API_BASE = ''

export type CatalogueCard = {
  earnn_card_id: string
  card_name: string
  bank_name: string
  bank_code: string
}

export type LifeMomentBenefit = {
  benefit_rule_id: string
  benefit_name?: string
  featured_display_message?: string
  quantity_per_period?: number
  quantity_period?: string
  requires_min_spend_on_card?: boolean
  min_spend_aed_on_card?: number
  min_spend_period?: string
  applicable_to?: string
  benefit_description?: string
  conditions?: string
  additional_info?: string
  [key: string]: unknown
}

export type LifeMomentCard = { earnn_card_id: string; card_name: string; benefits: LifeMomentBenefit[] }
export type LifeMomentGroup = { display_group: string; sort_order: number; cards: LifeMomentCard[] }
export type LifeMomentResponse = { moment_id: string; moment_title: string; intro: string; groups: LifeMomentGroup[] }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, init)
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = payload && typeof payload === 'object' ? (payload as { detail?: string }).detail : null
    throw new Error(detail || 'We could not load your travel benefits.')
  }
  return payload as T
}

export const fetchLifeMomentCatalogue = () => request<{ cards: CatalogueCard[] }>('/api/life-moments/cards')

export const fetchLifeMoment = (momentId: string, cardIds: string[]) => request<LifeMomentResponse>(
  `/api/life-moments/${encodeURIComponent(momentId)}`,
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ card_ids: cardIds }) },
)

export type SuggestedCard = {
  earnn_card_id: string
  card_name: string
  bank_name: string
  network: string | null
  variant: string | null
  network_score: number | null
  earnn_score: number | null
  min_salary_aed: number | null
  groups: { display_group: string; sort_order: number; benefits: LifeMomentBenefit[] }[]
}

export type BankOption = { bank_name: string; count: number }

export type DiscoverResponse = { moment_id: string; total: number; banks: BankOption[]; offset: number; limit: number; cards: SuggestedCard[] }

/** Cards the user does not own that have benefits in this moment, best variant score first. */
export const discoverCards = (momentId: string, body: { owned_card_ids: string[]; min_salary?: number; limit?: number; offset?: number; bank_names?: string[] }) =>
  request<DiscoverResponse>(
    `/api/life-moments/${encodeURIComponent(momentId)}/discover`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  )

/** Every benefit on the given cards, grouped like the My Benefits pages; anything without a group of its own is under "Others". */
export const fetchAllBenefits = (cardIds: string[]) => request<LifeMomentResponse>(
  '/api/life-moments/all',
  { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ card_ids: cardIds }) },
)
