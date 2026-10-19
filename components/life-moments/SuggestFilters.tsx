'use client'

import { useEffect, useState } from 'react'
import type { BankOption } from '@/lib/life-moments/api'
import styles from './ResultCards.module.css'

type Props = {
  open: boolean
  banks: BankOption[]
  selected: string[]
  onApply: (banks: string[]) => void
  onClose: () => void
}

// The same "REFINE RESULTS / Filters" dialog pattern used on the other result pages. Bank is the only filter.
// The dialog is mounted only while open, so it always starts from the banks that are currently applied.
export default function SuggestFilters({ open, banks, selected, onApply, onClose }: Props) {
  if (!open) return null
  return <FiltersDialog banks={banks} selected={selected} onApply={onApply} onClose={onClose} />
}

function FiltersDialog({ banks, selected, onApply, onClose }: Omit<Props, 'open'>) {
  const [draft, setDraft] = useState<string[]>(selected)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const toggle = (bank: string) => setDraft(current => current.includes(bank) ? current.filter(item => item !== bank) : [...current, bank])

  return <div className={styles.filterBackdrop} role="dialog" aria-modal="true" aria-label="Filter suggested cards by bank" onMouseDown={onClose}>
    <div className={styles.filterModal} onMouseDown={event => event.stopPropagation()}>
      <div className={styles.filterHeader}>
        <div><span>REFINE RESULTS</span><h2>Filters</h2></div>
        <button type="button" onClick={onClose} aria-label="Close filters">×</button>
      </div>
      <fieldset className={styles.filterFields}>
        <legend className={styles.filterLabel}>Bank <small>{draft.length ? `${draft.length} selected` : 'All banks'}</small></legend>
        <div className={styles.bankList}>
          {banks.map(bank => <label key={bank.bank_name} className={draft.includes(bank.bank_name) ? styles.bankOn : ''}>
            <input type="checkbox" checked={draft.includes(bank.bank_name)} onChange={() => toggle(bank.bank_name)} />
            <span>{bank.bank_name}</span>
            <small>{bank.count}</small>
          </label>)}
          {banks.length === 0 && <p className={styles.filterNote}>No banks to choose from yet.</p>}
        </div>
      </fieldset>
      <div className={styles.filterActions}>
        <button type="button" onClick={() => setDraft([])}>Reset</button>
        <button type="button" onClick={() => onApply(draft)}>Apply filters</button>
      </div>
    </div>
  </div>
}
