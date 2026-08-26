import type { MilesRegion } from '@/lib/miles-goal/regions'
import styles from './RegionCardList.module.css'

export default function RegionCardList({ regions, onSelect }: { regions: MilesRegion[]; onSelect: (region: MilesRegion) => void }) {
  return <div className={styles.grid}>{regions.map((region, index) => (
    <button key={region.id} onClick={() => onSelect(region)} className={styles.card}>
      <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
      <span><strong>{region.label}</strong><small>View miles possibilities</small></span>
      <i className="ti ti-arrow-up-right" aria-hidden="true" />
    </button>
  ))}</div>
}
