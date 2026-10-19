'use client'

import { useState } from 'react'
import styles from './ResultCards.module.css'

// The card's picture from the backend image route, with a neutral card icon if there is none.
export default function CardThumb({ cardId }: { cardId: string }) {
  const [failed, setFailed] = useState(false)
  if (failed) return <span className={styles.thumbFallback} aria-hidden="true"><i className="ti ti-credit-card" /></span>
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={styles.thumb} src={`/api/cards/image/${encodeURIComponent(cardId)}`} alt="" loading="lazy" onError={() => setFailed(true)} />
}
