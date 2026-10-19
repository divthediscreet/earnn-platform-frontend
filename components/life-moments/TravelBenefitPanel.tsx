'use client'

import CardNameLink from '@/components/CardNameLink'
import type { LifeMomentGroup } from '@/lib/life-moments/api'
import { BenefitList } from './BenefitItems'
import CardThumb from './CardThumb'
import styles from './ResultCards.module.css'

export default function TravelBenefitPanel({ group, icon }: { group: LifeMomentGroup; icon: string }) {
  const count = group.cards.length

  return <section id="travel-benefit-panel" role="tabpanel" className={styles.panel} aria-live="polite">
    <header className={styles.sectionHead}>
      <span className={styles.sectionIcon}><i className={`ti ${icon}`} aria-hidden="true" /></span>
      <div className={styles.sectionTitle}>
        <h2>{group.display_group}</h2>
        <p>{count} of your cards offer this benefit.</p>
      </div>
      <span className={styles.countPill}>{count} {count === 1 ? 'card' : 'cards'}</span>
    </header>
    <ul className={styles.cardGrid}>
      {group.cards.map(card => <li key={card.earnn_card_id} className={styles.resultCard}>
        <div className={styles.cardTop}>
          <CardThumb cardId={card.earnn_card_id} />
          <h3><CardNameLink cardId={card.earnn_card_id}>{card.card_name}</CardNameLink></h3>
        </div>
        <BenefitList benefits={card.benefits} cardName={card.card_name} />
      </li>)}
    </ul>
  </section>
}
