/* eslint-disable @next/next/no-img-element */
// The two animated pictures used for the two ways to start: in the home page's "Two ways to start".
import WalletTray from './WalletTray'
import styles from './explore.module.css'

const STACK = ['/images/home/stack-1.webp', '/images/home/stack-2.webp', '/images/home/stack-3.webp'] as const

/** "Recommend the Best Cards for Me": three cards, each lifting the total. */
export function FindVisual() {
  return (
    <div className={`${styles.pathVisual} ${styles.vA}`} aria-hidden>
      {STACK.map(src => <img key={src} src={src} alt="" width={112} height={70} loading="lazy" />)}
      <span className={styles.gain}>+ AED 1,240</span>
      <span className={styles.gain}>+ AED 980</span>
      <span className={styles.gain}>+ AED 760</span>
      <span className={styles.total}>Example<b>Best 3 cards</b></span>
    </div>
  )
}

/** "Choose & Test Cards Myself": cards slide into a one-row tray and the reward counter rises. */
export function WalletVisual() {
  return <div className={`${styles.pathVisual} ${styles.vB}`} aria-hidden><WalletTray /></div>
}
