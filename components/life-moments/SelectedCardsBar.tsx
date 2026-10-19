'use client'

import { useState } from 'react'
import { getCardImageUrl } from '@/lib/api'
import type { CatalogueCard } from '@/lib/life-moments/api'
import styles from './MyCards.module.css'

type Props = { cards: CatalogueCard[]; onOpen: () => void }

function MiniCard({ id }: { id: string }) {
  const [failed, setFailed] = useState(false)
  // eslint-disable-next-line @next/next/no-img-element
  return failed ? <span className={styles.miniFallback}><i className="ti ti-credit-card" aria-hidden="true" /></span> : <img className={styles.mini} src={getCardImageUrl(id)} alt="" loading="lazy" onError={() => setFailed(true)} />
}

// One compact button instead of a row of chips: a few card pictures stacked, the count, and "view or change" behind it.
export default function SelectedCardsBar({ cards, onOpen }: Props) {
  return <div className={styles.bar}>
    <button type="button" className={styles.myCardsButton} onClick={onOpen} aria-haspopup="dialog">
      <span className={styles.stack} aria-hidden="true">{cards.slice(0, 3).map(card => <MiniCard key={card.earnn_card_id} id={card.earnn_card_id} />)}</span>
      <span className={styles.label}><strong>My cards</strong><small>{cards.length} {cards.length === 1 ? 'card' : 'cards'} selected</small></span>
      <i className="ti ti-chevron-right" aria-hidden="true" />
    </button>
  </div>
}
