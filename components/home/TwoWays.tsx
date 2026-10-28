import Link from 'next/link'
import { FindVisual, WalletVisual } from '@/components/explore/PathVisuals'
import styles from './TwoWays.module.css'

// "Two ways to start" on the home page: the same two options and animated pictures as the old Explore Credit Cards page, kept short.
const WAYS = [
  {
    key: 'find',
    recommended: true,
    icon: 'ti-sparkles',
    title: 'Recommend the Best Cards for Me',
    text: 'Let Earnn find the right cards based on your spending.',
    cta: 'Recommend for me',
    href: '/find-my-best-cards',
  },
  {
    key: 'build',
    recommended: false,
    icon: 'ti-adjustments-horizontal',
    title: 'Choose & Test Cards Myself',
    text: 'Pick any UAE credit cards, mix and match, and see how much you can earn.',
    cta: 'Test cards myself',
    href: '/simulate-all-uae-cards',
  },
] as const

export default function TwoWays() {
  return (
    <section className={styles.band} aria-labelledby="two-ways">
    <div className={styles.wrap}>
      <div className={styles.head}>
        <p className={styles.eyebrow}>Start here</p>
        <h2 id="two-ways">Two ways to start</h2>
        <p>Let Earnn recommend the right cards for you, or choose and test cards yourself.</p>
      </div>
      <div className={styles.grid}>
        {WAYS.map(way => (
          <article key={way.key} className={`${styles.card} ${way.recommended ? styles.rec : ''}`}>
            {way.recommended && <span className={styles.crown}><i className="ti ti-crown" aria-hidden /> Recommended</span>}
            <div className={styles.top}>
              <span className={styles.icon}><i className={`ti ${way.icon}`} aria-hidden /></span>
              <div>
                <h3>{way.title}</h3>
                <p>{way.text}</p>
              </div>
            </div>
            {way.key === 'find' ? <FindVisual /> : <WalletVisual />}
            <Link href={way.href} className={way.recommended ? styles.btnGold : styles.btnBlue}>{way.cta} <i className="ti ti-arrow-right" aria-hidden /></Link>
          </article>
        ))}
      </div>
    </div>
    </section>
  )
}
