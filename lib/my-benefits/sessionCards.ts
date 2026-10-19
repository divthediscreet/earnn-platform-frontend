import type { CatalogueCard } from '@/lib/life-moments/api'

// sessionStorage lasts only until the browser tab is closed. Cards are never sent anywhere or written to localStorage.
const KEY = 'earnn_my_benefits_cards_v1'

export function loadSessionCards(): CatalogueCard[] {
  try {
    const parsed: unknown = JSON.parse(window.sessionStorage.getItem(KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((card): card is CatalogueCard => !!card && typeof card.earnn_card_id === 'string' && typeof card.card_name === 'string')
  } catch {
    return []
  }
}

export function saveSessionCards(cards: CatalogueCard[]): void {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(cards))
  } catch { /* storage unavailable: the cards simply last for this page view */ }
}
