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

// ── Rewards Scoring (Module 2) ────────────────────────────────────────────────
export async function scoreCards(spend: Record<string, number>) {
  const res = await fetch(`${API_BASE}/api/rewards/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spend),
  })
  if (!res.ok) throw new Error(`Scoring failed: ${res.statusText}`)
  return res.json()
}

export async function getOptimalWallet(spend: Record<string, number>) {
  const res = await fetch(`${API_BASE}/api/rewards/wallet`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(spend),
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

// ── Chatbot (Module 1) ────────────────────────────────────────────────────────
export async function sendChatMessage(message: string) {
  const res = await fetch(`${API_BASE}/api/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  })
  if (!res.ok) throw new Error(`Chat failed: ${res.statusText}`)
  return res.json()
}
