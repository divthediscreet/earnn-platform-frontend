'use client'

import type { LifeMomentGroup } from '@/lib/life-moments/api'
import { DEFAULT_CATEGORY_ICON, TRAVEL_CATEGORIES, type TravelCategory } from '@/lib/life-moments/categories'
import styles from './TravelPerks.module.css'

/** The "All" tile's value in `activeGroup` (My Next Trip's snapshot of every benefit on every card). */
export const ALL_BENEFITS = '__all__'

type Props = { groups: LifeMomentGroup[]; activeGroup: string | null; onSelect: (displayGroup: string) => void; categories?: TravelCategory[]; showAll?: boolean }

// Only groups the selected cards actually offer are shown, in the backend's order; `categories` supplies their icons.
export default function TravelCategoryTiles({ groups, activeGroup, onSelect, categories = TRAVEL_CATEGORIES, showAll = false }: Props) {
  const iconFor = (name: string) => categories.find(category => category.name === name)?.icon ?? DEFAULT_CATEGORY_ICON

  const cardIds = new Set(groups.flatMap(group => group.cards.map(card => card.earnn_card_id)))
  const benefitCount = groups.reduce((sum, group) => sum + group.cards.reduce((n, card) => n + card.benefits.length, 0), 0)

  return <div className={styles.tiles} role="tablist" aria-label="Travel benefit categories">
    {showAll && <button type="button" role="tab" aria-selected={activeGroup === ALL_BENEFITS} aria-controls="travel-benefit-panel"
      className={`${styles.tile} ${activeGroup === ALL_BENEFITS ? styles.tileActive : ''}`} onClick={() => onSelect(ALL_BENEFITS)}>
      <span className={styles.tileIcon}><i className="ti ti-layout-grid" aria-hidden="true" /></span>
      <span className={styles.tileName}>All benefits</span>
      <span className={styles.tileCount}>{benefitCount} across {cardIds.size} card{cardIds.size === 1 ? '' : 's'}</span>
    </button>}
    {groups.map(group => {
      const count = group.cards.length
      const active = activeGroup === group.display_group
      return <button
        key={group.display_group}
        type="button"
        role="tab"
        aria-selected={active}
        aria-controls="travel-benefit-panel"
        className={`${styles.tile} ${active ? styles.tileActive : ''}`}
        onClick={() => onSelect(group.display_group)}
      >
        <span className={styles.tileIcon}><i className={`ti ${iconFor(group.display_group)}`} aria-hidden="true" /></span>
        <span className={styles.tileName}>{group.display_group}</span>
        <span className={styles.tileCount}>{count} card{count === 1 ? '' : 's'}</span>
      </button>
    })}
  </div>
}
