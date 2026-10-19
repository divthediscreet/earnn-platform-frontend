'use client'

import type { LifeMomentGroup } from '@/lib/life-moments/api'
import { DEFAULT_CATEGORY_ICON, TRAVEL_CATEGORIES, type TravelCategory } from '@/lib/life-moments/categories'
import styles from './TravelPerks.module.css'

type Props = { groups: LifeMomentGroup[]; activeGroup: string | null; onSelect: (displayGroup: string) => void; categories?: TravelCategory[] }

// Only groups the selected cards actually offer are shown, in the backend's order; `categories` supplies their icons.
export default function TravelCategoryTiles({ groups, activeGroup, onSelect, categories = TRAVEL_CATEGORIES }: Props) {
  const iconFor = (name: string) => categories.find(category => category.name === name)?.icon ?? DEFAULT_CATEGORY_ICON

  return <div className={styles.tiles} role="tablist" aria-label="Travel benefit categories">
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
