import type { ReactNode } from 'react'
import styles from './BulkRefineOptions.module.css'

export type RefineMode = 'new' | 'own'

/** "Want to refine your options?": open to a new card (welcome bonuses count) or use only the cards the user already owns. */
export default function BulkRefineOptions({ mode, onSelect, cardCount, onEditCards, unit, action }: {
  mode: RefineMode
  onSelect: (mode: RefineMode) => void
  cardCount: number
  onEditCards: () => void
  unit: 'miles' | 'aed'
  /** Sits at the right end of the same row as the two choices (the Filter & sort button). */
  action?: ReactNode
}) {
  return <div className={styles.refine}>
    <div className={styles.head}>
      <strong>{unit === 'miles' ? 'Want to refine your flight options?' : 'Want to refine your cashback options?'}</strong>
      {cardCount > 0 && <button type="button" className={styles.edit} onClick={onEditCards}><i className="ti ti-credit-card" aria-hidden="true" /> My cards · {cardCount} <u>Edit</u></button>}
    </div>
    <div className={styles.row}>
    <div className={styles.choices} role="group" aria-label="Refine your options">
      <button type="button" className={`${styles.choice} ${mode === 'new' ? styles.active : ''}`} aria-pressed={mode === 'new'} onClick={() => onSelect('new')}>
        <i className="ti ti-gift" aria-hidden="true" />
        <span><b>I can apply for a new card</b><small>Unlock eligible welcome bonuses</small></span>
      </button>
      <button type="button" className={`${styles.choice} ${mode === 'own' ? styles.active : ''}`} aria-pressed={mode === 'own'} onClick={() => onSelect('own')}>
        <i className="ti ti-wallet" aria-hidden="true" />
        <span><b>Use only cards I have</b><small>No new card needed</small></span>
      </button>
    </div>
    {action && <div className={styles.action}>{action}</div>}
    </div>
  </div>
}
