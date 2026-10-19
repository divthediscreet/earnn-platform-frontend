'use client'

// "Only my existing cards" pop-up (spec v4 §4.A). It is now the shared two-pane card screen: the user's banks on the left,
// the chosen bank's cards (pictures and names) on the right. This wrapper only loads each bank's cards and keeps the
// Trip Planner's contract: `picks` is { <bank>: firstCardId, '<bank>#<n>': further cards }.
// A card that earns no miles is tagged in the list, and at least one miles card is needed to confirm.
import { useEffect, useState } from 'react'
import CardPickerScreen from '@/components/cards/CardPickerScreen'
import { getBankCards, type BankCard, type BankOption } from '@/lib/trip-planner/api'

interface Props {
  banks: BankOption[]
  picks: Record<string, string>
  onConfirm: (picks: Record<string, string>) => void
  onCancel: () => void
  /** Label of the confirm button (default "Use these cards"). */
  confirmLabel?: string
  /** Heading and sub-heading; the defaults are the Trip Planner wording. */
  title?: string
  subtitle?: string
  /** Trip Planner only: tag cards that earn no miles and require a miles card to confirm. Other screens pass false. */
  showMiles?: boolean
  /** Each bank's cards, when the caller already has them (keyed by bank code). Skips the per-bank requests. */
  preloadedCards?: Record<string, BankCard[]>
}

export default function ExistingCardsDialog({
  banks, picks, onConfirm, onCancel, confirmLabel = 'Use these cards',
  title = 'Which cards do you already have?', subtitle = 'Choose a bank, then tick the cards you hold.', showMiles = true, preloadedCards,
}: Props) {
  const [loaded, setLoaded] = useState<Record<string, BankCard[]>>({})
  const [error, setError] = useState('')

  useEffect(() => {
    if (preloadedCards) return // the caller already has every bank's cards, so there is nothing to wait for
    let current = true
    Promise.all(banks.map(bank => getBankCards(bank.bank_code).then(response => [bank.bank_code, response.cards] as const)))
      .then(entries => current && setLoaded(Object.fromEntries(entries)))
      .catch(reason => current && setError(reason instanceof Error ? reason.message : 'We could not load your banks’ cards.'))
    return () => { current = false }
  }, [banks, preloadedCards])

  return <CardPickerScreen
    banks={banks}
    cardsByBank={preloadedCards ?? loaded}
    picks={picks}
    onConfirm={onConfirm}
    onCancel={onCancel}
    title={title}
    subtitle={subtitle}
    confirmLabel={confirmLabel}
    showMiles={showMiles}
    error={error}
  />
}
