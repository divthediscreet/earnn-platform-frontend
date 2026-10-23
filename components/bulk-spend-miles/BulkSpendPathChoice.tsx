import type { BulkPath } from '@/lib/bulk-spend-miles/session'
import styles from './BulkSpendPathChoice.module.css'

/** Shown after "Get the Most from My Expenses": two boxes, one per card type; the user picks the result they want to see. */
export default function BulkSpendPathChoice({ onChoose, onClose }: { onChoose: (path: BulkPath) => void, onClose: () => void }) {
  return <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Choose a miles card or a cashback card" onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <div className={styles.wrap}>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>
      <section className={`${styles.box} ${styles.miles}`}>
        <span className={styles.badge}><i className="ti ti-sparkles" /> Earnn Advice</span>
        <p>To make the best use of your spend, Earnn will turn your spend into flight tickets.</p>
        <button type="button" className={styles.milesButton} onClick={() => onChoose('miles')}><i className="ti ti-plane" /> Show me flight options</button>
      </section>
      <section className={`${styles.box} ${styles.cashback}`}>
        <p>I am okay with getting less, but keep it simple.</p>
        <button type="button" className={styles.cashButton} onClick={() => onChoose('aed')}><b aria-hidden="true">AED</b> Cashback</button>
      </section>
    </div>
  </div>
}
