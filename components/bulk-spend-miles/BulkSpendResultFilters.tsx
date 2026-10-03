'use client'

import { useState } from 'react'
import { AIRLINE_GROUPS, type AirlineGroup } from '@/lib/bulk-spend-miles/airline-reach'
import styles from './BulkSpendResultFilters.module.css'

export type BulkResultSort = 'combined' | 'bulk_only' | 'bulk_plus_regular'

// Uses /public/airlines/{emirates,etihad}.svg when present; otherwise a brand-coloured badge.
function AirlineIcon({ code }: { code: AirlineGroup }) {
  const [missing, setMissing] = useState(false)
  /* eslint-disable @next/next/no-img-element */
  if (code === 'flexible') return missing
    ? <span className={styles.airlineIcon} aria-hidden="true"><i className={styles.dotRed} /><i className={styles.dotGold} /></span>
    : <span className={`${styles.logoWrap} ${styles.logoPair}`}><img src="/airlines/emirates.svg" alt="Emirates" onError={() => setMissing(true)} /><img src="/airlines/etihad.svg" alt="Etihad" onError={() => setMissing(true)} /></span>
  // A plain <img> is needed here: onError tells us the optional logo file is absent.
  if (!missing) return <span className={styles.logoWrap}><img src={`/airlines/${code}.svg`} alt={code === 'emirates' ? 'Emirates' : 'Etihad'} onError={() => setMissing(true)} /></span>
  return <span className={`${styles.airlineIcon} ${code === 'emirates' ? styles.badgeEmirates : styles.badgeEtihad}`} aria-hidden="true"><i className="ti ti-plane" /></span>
}

export default function BulkSpendResultFilters({ open, onClose, banks, selectedBanks, onSelectedBanksChange, includeNewCard, onIncludeNewCardChange, sort, onSortChange, showAirlines, airlinesReady, selectedAirlines, onSelectedAirlinesChange }: {
  open: boolean
  onClose: () => void
  banks: string[]
  selectedBanks: string[]
  onSelectedBanksChange: (banks: string[]) => void
  includeNewCard: boolean
  onIncludeNewCardChange: (value: boolean) => void
  sort: BulkResultSort
  onSortChange: (value: BulkResultSort) => void
  /** The airline filter only applies to the miles view. */
  showAirlines: boolean
  airlinesReady: boolean
  selectedAirlines: AirlineGroup[]
  onSelectedAirlinesChange: (airlines: AirlineGroup[]) => void
}) {
  if (!open) return null
  const selected = new Set(selectedBanks)
  const toggleAirline = (code: AirlineGroup) => onSelectedAirlinesChange(selectedAirlines.includes(code) ? selectedAirlines.filter(item => item !== code) : [...selectedAirlines, code])
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
        {showAirlines && <fieldset aria-label="Filter results by airline programme"><legend>Airline programme</legend>
          <div className={styles.airlineOptions}>{AIRLINE_GROUPS.map(group => <button key={group.code} type="button" disabled={!airlinesReady} aria-pressed={selectedAirlines.includes(group.code)} onClick={() => toggleAirline(group.code)}><AirlineIcon code={group.code} /><strong>{group.label}</strong><small>{group.hint}</small></button>)}</div>
          {!airlinesReady && <p className={styles.airlineNote}>Loading card programmes…</p>}
        </fieldset>}
        <section className={styles.newCard}><div><strong>Want to apply for a new card?</strong><small>Include qualifying welcome bonuses in the comparison.</small></div><button type="button" className={includeNewCard ? styles.switchOn : styles.switchOff} role="switch" aria-checked={includeNewCard} onClick={() => onIncludeNewCardChange(!includeNewCard)}><span /></button></section>
        <fieldset><legend>Rank cards by</legend><div className={styles.sortOptions}>{includeNewCard && <button type="button" aria-pressed={sort === 'combined'} onClick={() => onSortChange('combined')}>Combined accumulation</button>}<button type="button" aria-pressed={sort === 'bulk_only'} onClick={() => onSortChange('bulk_only')}>Bulk categories only</button><button type="button" aria-pressed={sort === 'bulk_plus_regular'} onClick={() => onSortChange('bulk_plus_regular')}>Bulk + normal spend</button></div></fieldset>
      </div>
      <div className={styles.actions}><button type="button" onClick={() => { onSelectedBanksChange([]); onSelectedAirlinesChange([]); onIncludeNewCardChange(true); onSortChange('combined') }}>Reset</button><button type="button" onClick={onClose}>Apply filters</button></div>
    </div>
  </div>
}
