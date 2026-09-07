'use client'

import type { AirlineScope } from '@/lib/miles-goal/contracts'
import styles from './MilesResultFilters.module.css'
import override from './MilesResultFiltersOverride.module.css'

export interface MilesBankOption {
  value: string
  label: string
}

export default function MilesResultFilters({
  open,
  onClose,
  bank,
  onBankChange,
  banks,
  airlineScope,
  onAirlineScopeChange,
  available,
}: {
  open: boolean
  onClose: () => void
  bank: string
  onBankChange: (value: string) => void
  banks: MilesBankOption[]
  airlineScope: AirlineScope
  onAirlineScopeChange: (value: AirlineScope) => void
  available: { emirates: boolean; etihad: boolean }
}) {
  if (!open) return null

  return <div className={styles.backdrop} role="dialog" aria-modal="true" aria-label="Miles plan filters" onMouseDown={onClose}>
    <div className={styles.modal} onMouseDown={event => event.stopPropagation()}>
      <div className={styles.header}>
        <div><span>REFINE RESULTS</span><h2>All filters</h2></div>
        <button type="button" onClick={onClose} aria-label="Close filters">×</button>
      </div>
      <div className={`${styles.fields} ${override.fields}`}>
        <label>
          <span>Bank</span>
          <select value={bank} onChange={event => onBankChange(event.target.value)}>
            <option value="all">All banks</option>
            {banks.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <fieldset>
          <legend>Airline</legend>
          <div className={styles.airlineOptions}>
            <button type="button" aria-pressed={airlineScope === 'best'} onClick={() => onAirlineScopeChange('best')}>Best overall</button>
            <button type="button" aria-pressed={airlineScope === 'emirates'} disabled={!available.emirates} onClick={() => onAirlineScopeChange('emirates')}>Emirates</button>
            <button type="button" aria-pressed={airlineScope === 'etihad'} disabled={!available.etihad} onClick={() => onAirlineScopeChange('etihad')}>Etihad</button>
          </div>
        </fieldset>
      </div>
      <div className={styles.actions}>
        <button type="button" onClick={() => { onBankChange('all'); onAirlineScopeChange('best') }}>Reset</button>
        <button type="button" onClick={onClose}>Apply filters</button>
      </div>
    </div>
  </div>
}
