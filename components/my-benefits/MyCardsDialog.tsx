'use client'

// "My cards" pop-up: the cards chosen so far, each removable with a cross, and an "Add cards" button that opens the shared
// bank-and-cards screen with the current cards ticked. Nothing changes on the page until Done; closing discards edits.
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import CardThumb from '@/components/life-moments/CardThumb'
import styles from '@/components/life-moments/MyCards.module.css'
import type { CatalogueCard } from '@/lib/life-moments/api'
import CardSelectionFlow from './CardSelectionFlow'

type Props = {
  cards: CatalogueCard[]
  onSave: (cards: CatalogueCard[]) => void
  onClose: () => void
  /** Passed on to the add screen so "show all best cards" is available there too. */
  onSkip?: () => void
}

export default function MyCardsDialog({ cards, onSave, onClose, onSkip }: Props) {
  const [draft, setDraft] = useState<CatalogueCard[]>(cards)
  const [adding, setAdding] = useState(false)

  // The page behind must not scroll, and Escape closes this pop-up (the add screen handles its own Escape).
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])
  useEffect(() => {
    if (adding) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [adding, onClose])

  const remove = (id: string) => setDraft(current => current.filter(card => card.earnn_card_id !== id))
  const changed = draft.length !== cards.length || draft.some((card, index) => card.earnn_card_id !== cards[index]?.earnn_card_id)

  return <>
    {createPortal(<div className={styles.overlay} role="dialog" aria-modal="true" aria-label="My cards" onClick={onClose}>
      <section className={styles.dialog} onClick={event => event.stopPropagation()}>
        <header className={styles.head}>
          <div><h2>My cards</h2><p>{draft.length} {draft.length === 1 ? 'card' : 'cards'} selected</p></div>
          <button type="button" className={styles.close} aria-label="Close" onClick={onClose}><i className="ti ti-x" aria-hidden="true" /></button>
        </header>
        <ul className={styles.list}>
          {draft.map(card => <li key={card.earnn_card_id}>
            <CardThumb cardId={card.earnn_card_id} />
            <span className={styles.cardText}><strong>{card.card_name}</strong><small>{card.bank_name}</small></span>
            <button type="button" className={styles.remove} aria-label={`Remove ${card.card_name}`} onClick={() => remove(card.earnn_card_id)}><i className="ti ti-x" aria-hidden="true" /></button>
          </li>)}
          {!draft.length && <li className={styles.emptyRow}>No cards selected. Add at least one to see your benefits.</li>}
        </ul>
        <footer className={styles.foot}>
          <button type="button" className={styles.addButton} onClick={() => setAdding(true)}><i className={`ti ${draft.length ? 'ti-pencil' : 'ti-plus'}`} aria-hidden="true" /> {draft.length ? 'Edit cards' : 'Add cards'}</button>
          <button type="button" className={styles.done} disabled={!draft.length} onClick={() => (changed ? onSave(draft) : onClose())}>Done</button>
        </footer>
      </section>
    </div>, document.body)}
    {adding && <CardSelectionFlow current={draft} onConfirm={next => { setDraft(next); setAdding(false) }} onCancel={() => setAdding(false)} onSkip={onSkip} />}
  </>
}
