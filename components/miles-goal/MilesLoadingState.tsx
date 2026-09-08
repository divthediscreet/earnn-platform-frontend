import styles from './MilesLoadingState.module.css'

export default function MilesLoadingState({ destination, variant = 'result' }: { destination: string; variant?: 'target' | 'result' }) {
  const targetCalculation = variant === 'target'
  return <div className={styles.loading} role="status" aria-live="polite">
    {targetCalculation
      ? <div className={`${styles.sky} ${styles.flightSky}`} aria-hidden="true"><span className={styles.flightPath} /><i className="ti ti-plane" /></div>
      : <div className={`${styles.sky} ${styles.targetSky}`} aria-hidden="true"><span className={styles.glow} /><img className={styles.realGlobe} src="/miles-goal/realistic-globe.png" alt="" /></div>}
    <strong>{targetCalculation ? `Setting your miles goal for ${destination}…` : `Finding your fastest way to ${destination}…`}</strong>
    <span>{targetCalculation ? 'Checking flight rewards and airline miles for your selected trip.' : 'Comparing miles, welcome rewards, fee routes and flight targets.'}</span>
  </div>
}
