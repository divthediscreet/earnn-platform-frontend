import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { CatalogueCard } from '@/lib/life-moments/api'

// The cards a visitor says they own, shared by every My Benefits page so they are picked once per session.
export type SelectedCardsState = { cards: CatalogueCard[]; hydrated: boolean }

const initialState: SelectedCardsState = { cards: [], hydrated: false }

const cardsSlice = createSlice({
  name: 'selectedCards',
  initialState,
  reducers: {
    hydrate(state, action: PayloadAction<CatalogueCard[]>) {
      state.cards = action.payload
      state.hydrated = true
    },
    setCards(state, action: PayloadAction<CatalogueCard[]>) {
      state.cards = action.payload
    },
  },
})

export const { hydrate, setCards } = cardsSlice.actions
export default cardsSlice.reducer
