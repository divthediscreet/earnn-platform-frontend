'use client'

// The shared two-pane card screen (banks on the left, the bank's cards on the right) for My Benefits.
// Not tied to miles, so every card counts. Confirming returns the chosen catalogue cards, grouped by bank.
// The banks and each bank's cards are derived from the one card list (see lib/life-moments/catalogue.ts), which is
// loaded in advance, so the screen opens without waiting on separate requests.
import { useEffect, useMemo, useState } from 'react'
import CardPickerScreen from '@/components/cards/CardPickerScreen'
import type { CatalogueCard } from '@/lib/life-moments/api'
import { loadCatalogue } from '@/lib/life-moments/catalogue'
import type { BankCard, BankOption } from '@/lib/trip-planner/api'

type Props = {
  /** Cards already chosen; they are ticked when editing. */
  current: CatalogueCard[]
  onConfirm: (cards: CatalogueCard[]) => void
  onCancel: () => void
  /** Skip choosing cards and go straight to the best cards in the category. */
  onSkip?: () => void
}

const upper = (code: string) => code.trim().toUpperCase()

// The screen keeps picks as { BANK: firstCardId, 'BANK#1': secondCardId, ... }.
const picksFromCards = (cards: CatalogueCard[]): Record<string, string> => {
  const counts: Record<string, number> = {}
  const picks: Record<string, string> = {}
  for (const card of cards) {
    const bank = upper(card.bank_code)
    const index = counts[bank] ?? 0
    counts[bank] = index + 1
    picks[index === 0 ? bank : `${bank}#${index}`] = card.earnn_card_id
  }
  return picks
}

export default function CardSelectionFlow({ current, onConfirm, onCancel, onSkip }: Props) {
  const [catalogue, setCatalogue] = useState<CatalogueCard[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    loadCatalogue()
      .then(cards => { if (active) setCatalogue(cards) })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'We could not load the banks.') })
    return () => { active = false }
  }, [])

  const { banks, cardsByBank } = useMemo(() => {
    const names = new Map<string, string>()
    const byBank: Record<string, BankCard[]> = {}
    for (const card of catalogue) {
      const code = upper(card.bank_code)
      names.set(code, card.bank_name)
      ;(byBank[code] ??= []).push({ earnn_card_id: card.earnn_card_id, card_name: card.card_name, is_miles_card: false, reward_program_type: '' })
    }
    const list: BankOption[] = [...names].map(([bank_code, bank_name]) => ({ bank_code, bank_name })).sort((a, b) => a.bank_name.localeCompare(b.bank_name))
    return { banks: list, cardsByBank: byBank }
  }, [catalogue])

  // Picks are rebuilt only once the bank list is known, so the screen starts with the right bank and ticks.
  if (!banks.length) return <CardPickerScreen key="loading" banks={[]} cardsByBank={{}} picks={{}} error={error} onConfirm={() => undefined} onCancel={onCancel} />

  const confirmCards = (picks: Record<string, string>) => {
    const byId = new Map(catalogue.map(card => [card.earnn_card_id, card]))
    const chosen = Object.values(picks).map(id => byId.get(id)).filter((card): card is CatalogueCard => !!card)
    if (chosen.length) onConfirm(chosen)
  }

  return <CardPickerScreen
    key="ready"
    banks={banks}
    cardsByBank={cardsByBank}
    picks={picksFromCards(current)}
    title="Which cards do you have?"
    subtitle="Choose a bank, then tick the cards you own. We’ll show their benefits."
    confirmLabel="Show my benefits"
    onConfirm={confirmCards}
    onCancel={onCancel}
    skip={onSkip && { labelNone: 'Show all best cards', labelSome: 'Ignore my cards and show me all best cards of this category', onSkip }}
  />
}
