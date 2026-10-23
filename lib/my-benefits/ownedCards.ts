import type { CatalogueCard } from '@/lib/life-moments/api'
import { setCards } from './cardsSlice'
import { loadSessionCards, saveSessionCards } from './sessionCards'
import { store } from './store'

// Pages outside /my-benefits (the Big Spend Planner results) share the same "cards I own" list, so a card
// picked in either place is remembered in the other for the rest of the browser tab.
export const loadOwnedCards = (): CatalogueCard[] => loadSessionCards()

export function saveOwnedCards(cards: CatalogueCard[]): void {
  saveSessionCards(cards)
  store.dispatch(setCards(cards))
}

/** Banks are matched by name, ignoring case and spacing, because result cards carry the bank name only. */
export const bankKey = (bankName: string): string => bankName.trim().toLowerCase()
