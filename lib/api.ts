// lib/api.ts — earnn.money backend API client
// All calls go to the Railway backend

const API_BASE = ''  // empty = relative URLs, proxied via next.config.ts rewrites to Railway

// ── Statement Upload (Module 3) ───────────────────────────────────────────────
export async function uploadStatement(file: File, password?: string) {
  const form = new FormData()
  form.append('file', file)
  if (password) form.append('password', password)

  const res = await fetch(`${API_BASE}/api/statements/upload`, { method: 'POST', body: form })
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
  return res.json()
}

// ── Backend warm-up ping (Option C) ──────────────────────────────────────────
export function pingBackend() {
  fetch(`${API_BASE}/api/cards?limit=1`).catch(() => {})
}

// ── Rewards Scoring (Module 2) ────────────────────────────────────────────────
export async function scoreCards(
  spend: Record<string, number>,
  merchantPrefs?: Record<string, string[]>,
  userSalary?: number,
) {
  const body: Record<string, any> = { ...spend }
  if (merchantPrefs) body.merchant_prefs = merchantPrefs
  if (userSalary && userSalary > 0) body.user_salary = userSalary
  const res = await fetch(`${API_BASE}/api/rewards/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Scoring failed: ${res.statusText}`)
  return res.json()
}

export async function getOptimalWallet(spend: Record<string, number>, userSalary?: number) {
  const body: Record<string, any> = { ...spend }
  if (userSalary && userSalary > 0) body.user_salary = userSalary
  const res = await fetch(`${API_BASE}/api/rewards/wallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Wallet failed: ${res.statusText}`)
  return res.json()
}

// ── Card Catalogue (Module 4) ─────────────────────────────────────────────────
export async function fetchCards(params?: {
  bank?: string
  network?: string
  free_only?: boolean
  sort_by?: string
  search?: string
  limit?: number
}) {
  const q = new URLSearchParams()
  if (params?.bank)      q.set('bank', params.bank)
  if (params?.network)   q.set('network', params.network)
  if (params?.free_only) q.set('free_only', 'true')
  if (params?.sort_by)   q.set('sort_by', params.sort_by)
  if (params?.search)    q.set('search', params.search)
  if (params?.limit)     q.set('limit', String(params.limit))
  const url = `${API_BASE}/api/cards${q.toString() ? '?' + q.toString() : ''}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Cards fetch failed: ${res.statusText}`)
  return res.json()
}

// Search cards by name/bank — used by the "Add card manually" picker
export async function searchCards(query: string) {
  if (!query.trim()) return { cards: [], count: 0 }
  return fetchCards({ search: query.trim(), limit: 20 })
}

export async function fetchCardDetail(cardId: string) {
  const res = await fetch(`${API_BASE}/api/cards/${cardId}`)
  if (!res.ok) throw new Error(`Card detail failed: ${res.statusText}`)
  return res.json()
}

// Gated card image — served via backend endpoint, not a public static path
export function getCardImageUrl(earnnCardId: string) {
  return `${API_BASE}/api/cards/image/${earnnCardId}`
}

// ── Chatbot (Module 1) ────────────────────────────────────────────────────────
export interface ChatMessage { role: 'user' | 'assistant'; content: string }

export interface MerchantQuery {
  merchant:  string
  category:  string
  spend_aed: number | null
}

export interface BenefitsWanted {
  lounge_access:       boolean | null
  golf:                boolean | null
  cinema:              boolean | null
  airport_transfer:    boolean | null
  travel_insurance:    boolean | null
  dining_discount:     boolean | null
  welcome_bonus:       boolean | null
  purchase_protection: boolean | null
}

export interface SessionProfile {
  // Identity & eligibility
  salary_aed:              number | null
  employment_type:         'employee' | 'freelancer' | 'student' | 'retired' | null
  is_expat:                boolean | null
  is_new_to_uae:           boolean | null
  is_islamic:              boolean | null
  // Preferences
  preferred_reward_type:   'cashback' | 'miles' | 'points' | null
  preferred_miles_program: string | null
  preferred_banks:         string[]
  preferred_network:       string | null
  wants_free_for_life:     boolean | null
  wants_premium:           boolean | null
  wants_no_annual_fee:     boolean | null
  willing_salary_transfer: boolean | null
  // Spend
  spend:                   Record<string, number>
  // Merchants
  merchants:               string[]
  merchant_queries:        MerchantQuery[]
  // Benefits
  benefits_wanted:         BenefitsWanted
  // Existing cards
  existing_cards:          string[]
  // Query context
  last_categories:             string[]
  last_granular_categories:    string[]
  last_excluded_granular:      string[]
  last_merchants:              string[]
  last_question_type:          string | null
  last_intent:                 Record<string, unknown>
  // Pagination
  shown_card_ids:              string[]
  show_more_count:             number
}

export interface DiscoveryHint {
  type:      'aggregator' | 'mall'
  merchant:  string
  apps?:     string[]
  category:  string
  message:   string
}

export async function sendChatMessage(
  message:         string,
  history:         ChatMessage[] = [],
  session_profile: Partial<SessionProfile> = {},
  session_id:      string = '',
) {
  const res = await fetch(`${API_BASE}/api/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history, session_profile, session_id, client_source: 'frontend' }),
  })
  if (!res.ok) throw new Error(`Chat failed: ${res.statusText}`)
  return res.json() as Promise<{
    answer:          string
    intent:          Record<string, unknown>
    cards_found:     number
    extracted_facts: Record<string, unknown>
    decision:        Record<string, unknown>
    discovery_hints: DiscoveryHint[]
    session_id:      string
    turn_number:     number
  }>
}

export async function rateResponse(
  session_id:  string,
  turn_number: number,
  rating:      1 | -1,
) {
  const res = await fetch(`${API_BASE}/api/chat/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id, turn_number, rating }),
  })
  if (!res.ok) throw new Error(`Rate failed: ${res.statusText}`)
  return res.json()
}
