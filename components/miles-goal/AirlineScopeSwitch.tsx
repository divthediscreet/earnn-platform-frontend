import type { AirlineScope } from '@/lib/miles-goal/contracts'
import styles from './SegmentedControls.module.css'

export default function AirlineScopeSwitch({ value, onChange, available, partial }: {
  value: AirlineScope
  onChange: (value: AirlineScope) => void
  available: { emirates: boolean; etihad: boolean }
  partial: boolean
}) {
  const options: { id: AirlineScope; label: string; disabled?: boolean }[] = [
    { id: 'best', label: partial ? 'Best overall · Partial' : 'Best overall', disabled: !available.emirates && !available.etihad },
    { id: 'emirates', label: 'Emirates', disabled: !available.emirates },
    { id: 'etihad', label: 'Etihad', disabled: !available.etihad },
  ]
  return <div className={styles.segmented} aria-label="Airline scope">{options.map(option => (
    <button key={option.id} type="button" aria-pressed={value === option.id} disabled={option.disabled} onClick={() => onChange(option.id)}>{option.label}</button>
  ))}</div>
}
