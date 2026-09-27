import Image from 'next/image'
import styles from './MilesLoadingState.module.css'

export default function MilesLoadingState({ destination, variant = 'result', headline, supportingText }: { destination: string; variant?: 'target' | 'result'; headline?: string; supportingText?: string }) {
  const targetCalculation = variant === 'target'
  if (targetCalculation) return <div className={`${styles.loading} ${styles.targetLoading}`} role="status" aria-live="polite">
    <div className={`${styles.sky} ${styles.flightSky}`} aria-hidden="true"><span className={styles.flightPath} /><i className="ti ti-plane" /></div>
    <strong>Optimizing for Business Class Ticket</strong>
    <p className={styles.intro}>Pay full using miles · <b>Minimum cash, but longer wait</b></p>
    <div className={styles.options} aria-label="Ways to use your miles">
      <div className={`${styles.option} ${styles.recommended}`}><i className="ti ti-trending-up" /><span><b>Fly Smart: Fly Faster</b><small>Purchase an Economy Class ticket and upgrade to Business using miles.</small></span></div>
      <div className={styles.option}><i className="ti ti-plane" /><span><b>Fly Economy: Fly Frequently</b><small>Pay for Economy Class tickets using miles.</small></span></div>
    </div>
    <span className={styles.calculating}>You can switch your option at the next stage.</span>
  </div>

  return <div className={styles.loading} role="status" aria-live="polite">
    <div className={`${styles.sky} ${styles.targetSky}`} aria-hidden="true"><span className={styles.glow} /><Image className={styles.realGlobe} src="/miles-goal/realistic-globe.png" alt="" width={112} height={112} priority /></div>
    <strong>{headline ?? `Finding your fastest way to ${destination}…`}</strong>
    <span>{supportingText ?? 'Comparing miles, welcome rewards, fee routes and flight targets.'}</span>
  </div>
}
