'use client'

import { useEffect, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import { loadCatalogue } from '@/lib/life-moments/catalogue'
import { hydrate } from '@/lib/my-benefits/cardsSlice'
import { loadSessionCards, saveSessionCards } from '@/lib/my-benefits/sessionCards'
import { store } from '@/lib/my-benefits/store'

// Wraps every /my-benefits page: restores the session's cards on mount, then mirrors changes back to sessionStorage.
export default function BenefitsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (!store.getState().selectedCards.hydrated) store.dispatch(hydrate(loadSessionCards()))
    void loadCatalogue().catch(() => undefined) // warm the bank and card list so the pickers open at once; a failure is retried when they open
    let last = store.getState().selectedCards.cards
    return store.subscribe(() => {
      const next = store.getState().selectedCards.cards
      if (next !== last) {
        last = next
        saveSessionCards(next)
      }
    })
  }, [])
  return <Provider store={store}>{children}</Provider>
}
