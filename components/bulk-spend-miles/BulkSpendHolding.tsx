import type { BulkPath } from '@/lib/bulk-spend-miles/session'
import styles from './BulkSpendHolding.module.css'

/** Held for a few seconds while the plan is worked out: the message sits above a small journey (spend, welcome
 *  bonus, reward) that loops gently. No percentage is shown because the backend does not report progress. */
export default function BulkSpendHolding({ path }: { path: BulkPath }) {
  const miles = path === 'miles'
  return <main className={styles.screen}><div className={styles.card} role="status" aria-live="polite">
    <span className={styles.kicker}>EARNN IS ON IT</span>
    <h1>{miles ? 'Checking welcome bonuses to fly you sooner...' : 'Checking welcome bonuses to get you more back sooner...'}</h1>
    <p>A new card’s welcome bonus could take you further.</p>
    <div className={styles.journey} aria-hidden="true">
      <span className={styles.track}><i className={styles.dot} /></span>
      <span className={`${styles.node} ${styles.spend}`}><b>AED</b><small>Your spending</small></span>
      <span className={`${styles.node} ${styles.bonus}`}><i className="ti ti-gift" /><small>Welcome bonus</small></span>
      <span className={`${styles.node} ${styles.reward}`}><i className={`ti ${miles ? 'ti-plane' : 'ti-cash'}`} /><small>{miles ? 'Your next flight' : 'Your cashback'}</small></span>
    </div>
    <p className={styles.note}>Don’t want a new card? You can turn bonuses off later.</p>
  </div></main>
}
