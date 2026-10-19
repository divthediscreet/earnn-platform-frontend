import Image from 'next/image'
import styles from './MyBenefitsHero.module.css'

// The My Benefits banner: a single picture (movies, fitness, shopping, memberships, protection, a card) with a small
// aeroplane flying across the open space at the top left. On wide screens the picture carries its own headline; on
// phones it is cropped to the photo and the same words are set as real text over it so they stay readable.
const HEADLINE = 'More benefits in your wallet.'
const SUBLINE = 'From movies and fitness to shopping, memberships and protection — discover what your cards already offer.'

export default function MyBenefitsHero() {
  return <div className={styles.frame}>
    <section className={styles.hero} aria-labelledby="my-benefits-title">
      <h1 id="my-benefits-title" className={styles.srOnly}>{HEADLINE} {SUBLINE}</h1>
      <Image className={styles.photo} src="/images/heroes/MyBenefits.webp" alt="" width={1266} height={407} sizes="(max-width: 760px) 100vw, 1112px" priority unoptimized />

      <div className={styles.mobileText} aria-hidden="true">
        <span>MY BENEFITS</span>
        <strong>More <em>benefits</em> in your wallet.</strong>
        <p>{SUBLINE}</p>
      </div>

      <div className={styles.flight} aria-hidden="true">
        <svg className={styles.trail} viewBox="0 0 220 70" fill="none">
          <path d="M2 62 C 50 58, 110 44, 196 14" stroke="#8fa6d6" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 9" />
        </svg>
        <svg className={styles.plane} viewBox="0 0 24 24">
          <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
        </svg>
      </div>
    </section>
  </div>
}
