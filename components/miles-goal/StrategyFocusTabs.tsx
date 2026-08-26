import type { StrategyId } from '@/lib/miles-goal/contracts'
import styles from './SegmentedControls.module.css'

const options: { id: StrategyId; label: string; sub: string }[] = [
  { id: 'easiest', label: 'Economy', sub: 'Easiest' },
  { id: 'dream', label: 'Business', sub: 'Dream' },
  { id: 'smartest', label: 'Upgrade', sub: 'Smartest' },
]

export default function StrategyFocusTabs({ value, onChange }: { value: StrategyId; onChange: (value: StrategyId) => void }) {
  return <div className={`${styles.segmented} ${styles.strategy}`} aria-label="Miles strategy">{options.map(option => (
    <button key={option.id} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)}><span>{option.label}</span><small>{option.sub}</small></button>
  ))}</div>
}
