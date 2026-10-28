import type { CatalogueCard } from '@/lib/life-moments/api'
import { patchProfile, readProfile } from '@/lib/profile/storage'

// The cards a visitor says they own live in the shared profile (browser storage on this device), so My Benefits, the
// Big Spend Planner and the Trip Planner all read the same list.
const OLD_SESSION_KEY = 'earnn_my_benefits_cards_v1'

const valid = (value: unknown): CatalogueCard[] =>
  Array.isArray(value) ? value.filter((card): card is CatalogueCard => !!card && typeof card.earnn_card_id === 'string' && typeof card.card_name === 'string') : []

export function loadSessionCards(): CatalogueCard[] {
  const saved = readProfile()?.owned_cards
  if (saved) return valid(saved)
  // One-time move of cards picked before the shared profile held them (they lived in this tab's session storage).
  try {
    const old = valid(JSON.parse(window.sessionStorage.getItem(OLD_SESSION_KEY) ?? '[]'))
    window.sessionStorage.removeItem(OLD_SESSION_KEY)
    if (old.length) patchProfile({ owned_cards: old })
    return old
  } catch {
    return []
  }
}

export function saveSessionCards(cards: CatalogueCard[]): void {
  patchProfile({ owned_cards: cards })
}
