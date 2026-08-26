import styles from './MilesLoadingState.module.css'

export default function MilesLoadingState({ destination }: { destination: string }) {
  return <div className={styles.loading} role="status" aria-live="polite">
    <div className={styles.sky} aria-hidden="true"><span className={styles.route} /><i className="ti ti-plane" /></div>
    <strong>Finding your fastest way to {destination}…</strong>
    <span>Comparing miles, welcome rewards, fee routes and flight targets.</span>
  </div>
}
