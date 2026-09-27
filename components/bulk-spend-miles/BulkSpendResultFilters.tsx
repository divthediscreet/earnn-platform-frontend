'use client'

import styles from './BulkSpendResultFilters.module.css'

export type BulkResultSort = 'combined' | 'bulk_only' | 'bulk_plus_regular'

export default function BulkSpendResultFilters({ open, onClose, banks, selectedBanks, onSelectedBanksChange, includeNewCard, onIncludeNewCardChange, sort, onSortChange }: {
  open: boolean
  onClose: () => void
  banks: string[]
  selectedBanks: string[]
  onSelectedBanksChange: (banks: string[]) => void
  includeNewCard: boolean
  onIncludeNewCardChange: (value: boolean) => void
  sort: BulkResultSort
  onSortChange: (value: BulkResultSort) => void
}) {
  if (!open) return null
  const selected = new Set(selectedBanks)
  const toggleBank = (bank: string) => {
    const next = new Set(selectedBanks)
    if (next.has(bank)) next.delete(bank)
    else next.add(bank)
    onSelectedBanksChange([...next])
  }

  return <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Bulk spend result filters" onMouseDown={onClose}>
    <div className={styles.modal} onMouseDown={event => event.stopPropagation()}>
      <div className={styles.header}><div><span>REFINE RESULTS</span><h2>All filters</h2></div><button type="button" onClick={onClose} aria-label="Close filters">×</button></div>
      <div className={styles.fields}>
        <section className={styles.bankField} aria-label="Filter results by bank"><details><summary>Bank <small>{selectedBanks.length ? `${selectedBanks.length} selected` : 'All banks'}</small></summary><div className={styles.bankList}>{banks.map(bank => <label key={bank}><input type="checkbox" checked={selected.has(bank)} onChange={() => toggleBank(bank)} /><span>{bank}</span></label>)}</div></details></section>
        <section className={styles.newCard}><div><strong>Want to apply for a new card?</strong><small>Include qualifying welcome bonuses in the comparison.</small></div><button type="button" className={includeNewCard ? styles.switchOn : styles.switchOff} role="switch" aria-checked={includeNewCard} onClick={() => onIncludeNewCardChange(!includeNewCard)}><span /></button></section>
        <fieldset><legend>Rank cards by</legend><div className={styles.sortOptions}>{includeNewCard && <button type="button" aria-pressed={sort === 'combined'} onClick={() => onSortChange('combined')}>Combined accumulation</button>}<button type="button" aria-pressed={sort === 'bulk_only'} onClick={() => onSortChange('bulk_only')}>Bulk categories only</button><button type="button" aria-pressed={sort === 'bulk_plus_regular'} onClick={() => onSortChange('bulk_plus_regular')}>Bulk + normal spend</button></div></fieldset>
      </div>
      <div className={styles.actions}><button type="button" onClick={() => { onSelectedBanksChange([]); onIncludeNewCardChange(true); onSortChange('combined') }}>Reset</button><button type="button" onClick={onClose}>Apply filters</button></div>
    </div>
  </div>
}
