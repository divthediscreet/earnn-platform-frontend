'use client'

import CardNameLink from '@/components/CardNameLink'
import type { LifeMomentGroup } from '@/lib/life-moments/api'
import { DEFAULT_CATEGORY_ICON, type TravelCategory } from '@/lib/life-moments/categories'
import { formatFrequency } from '@/lib/life-moments/format'
import CardThumb from './CardThumb'
import styles from './TravelSnapshot.module.css'

// "All" view of My Next Trip: every benefit on the user's cards in one grid. One row per card, one column per benefit
// category (only categories at least one card offers). A box says in a few words what that card gives; tapping it opens
// that category's full details, so the category tiles above stay the way to filter.
export default function TravelSnapshot({ groups, categories, ownedCount, onPick }: { groups: LifeMomentGroup[]; categories: TravelCategory[]; ownedCount: number; onPick: (displayGroup: string) => void }) {
  const iconFor = (name: string) => categories.find(category => category.name === name)?.icon ?? DEFAULT_CATEGORY_ICON

  // card -> its benefits per category, in the order the cards first appear
  type Row = { id: string; name: string; byGroup: Map<string, LifeMomentGroup['cards'][number]['benefits']>; total: number }
  const cards: Row[] = []
  for (const group of groups) {
    for (const card of group.cards) {
      let row = cards.find(item => item.id === card.earnn_card_id)
      if (!row) { row = { id: card.earnn_card_id, name: card.card_name, byGroup: new Map(), total: 0 }; cards.push(row) }
      row.byGroup.set(group.display_group, card.benefits)
      row.total += card.benefits.length
    }
  }
  const totalBenefits = cards.reduce((sum, card) => sum + card.total, 0)

  return <section className={styles.snapshot} aria-label="All benefits across your cards">
    <header className={styles.head}>
      <h2>All your travel benefits at a glance</h2>
      <p>{totalBenefits} {totalBenefits === 1 ? 'benefit' : 'benefits'} across {cards.length < ownedCount ? `${cards.length} of your ${ownedCount} cards` : `your ${cards.length} ${cards.length === 1 ? 'card' : 'cards'}`}, in {groups.length} {groups.length === 1 ? 'category' : 'categories'}. Tap a box to see the details.</p>
    </header>
    <div className={styles.scroll}>
      <table className={styles.grid}>
        <thead>
          <tr>
            <th scope="col" className={styles.cardCol}>Your cards</th>
            {groups.map(group => <th key={group.display_group} scope="col">
              <button type="button" className={styles.colButton} onClick={() => onPick(group.display_group)} title={`See ${group.display_group} in detail`}>
                <i className={`ti ${iconFor(group.display_group)}`} aria-hidden="true" />
                <span>{group.display_group}</span>
              </button>
            </th>)}
          </tr>
        </thead>
        <tbody>
          {cards.map(card => <tr key={card.id}>
            <th scope="row" className={styles.cardCol}>
              <span className={styles.cardCell}>
                <CardThumb cardId={card.id} />
                <span className={styles.cardName}><CardNameLink cardId={card.id}>{card.name}</CardNameLink></span>
              </span>
            </th>
            {groups.map(group => {
              const benefits = card.byGroup.get(group.display_group)
              if (!benefits?.length) return <td key={group.display_group}><span className={styles.none} aria-label="Not offered">–</span></td>
              // "Other" holds unrelated benefits, so one benefit's figure says nothing about the rest: it only points to the details
              const other = /^other/i.test(group.display_group)
              const detail = other ? 'See details' : formatFrequency(benefits[0]) ?? 'Included'
              return <td key={group.display_group}>
                <button type="button" className={styles.has} onClick={() => onPick(group.display_group)}
                  title={benefits.map(benefit => benefit.benefit_name).filter(Boolean).join(' · ') || group.display_group}>
                  <i className="ti ti-check" aria-hidden="true" />
                  <span>{detail}{!other && benefits.length > 1 ? <em> +{benefits.length - 1}</em> : null}</span>
                </button>
              </td>
            })}
          </tr>)}
        </tbody>
      </table>
    </div>
  </section>
}
