import styles from './MilesDisclosure.module.css'

export default function MilesDisclosure({ compact = false }: { compact?: boolean }) {
  return <aside className={`${styles.disclosure} ${compact ? styles.compact : ''}`}>
    <i className="ti ti-info-circle" aria-hidden="true" />
    <p><strong>A clear estimate, not a promise.</strong> Award bookings can still include taxes, airline charges, cash co-payments and card fees. Card eligibility and published terms apply.</p>
  </aside>
}
