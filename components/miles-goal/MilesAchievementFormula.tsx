import { Fragment } from 'react'
import type { CardInteractionModel, ConditionalRewardEvent, EventDisplay, ReachedCandidate } from '@/lib/miles-goal/contracts'
import { formatAed, formatMiles, formatNumber } from '@/lib/miles-goal/format'
import styles from './MilesAchievementFormula.module.css'

type FormulaItem = { amount: number; label: string; detail?: string }

function eventLabel(event: ConditionalRewardEvent, display: EventDisplay | undefined): string {
  const labels: Record<string, string> = {
    joining_bonus: 'Joining bonus',
    spend_bonus: 'Spend bonus',
    restricted_spend_bonus: 'Restricted spend bonus',
    balance_transfer_bonus: 'Balance transfer bonus',
    spend_acceleration: 'Spend acceleration bonus',
    annual_benefit_acceleration: 'Annual miles bonus',
  }
  const mechanic = display?.mechanic?.trim().toLowerCase()
  return labels[mechanic || ''] || display?.title || 'Card bonus'
}

export default function MilesAchievementFormula({ candidate, card, displays, currentUsableMiles, rewardCurrency, monthlySpend }: {
  candidate: ReachedCandidate
  card: CardInteractionModel
  displays: Record<string, EventDisplay>
  currentUsableMiles: number
  rewardCurrency: 'skywards_miles' | 'etihad_guest_miles'
  monthlySpend: number
}) {
  const trajectory = card.base_trajectories.find(item => item.trajectory_id === candidate.selected_trajectory_id)
  const baseMiles = trajectory?.cumulative_base_miles_by_month[candidate.months_to_goal - 1] ?? 0
  const monthlyBaseMiles = candidate.months_to_goal > 0 ? baseMiles / candidate.months_to_goal : 0
  const bonusItems = candidate.event_unlocks.flatMap(unlock => {
    const event = card.conditional_events.find(item => item.event_id === unlock.event_id)
    if (!event || event.effect_type !== 'miles_add') return []
    const occurrences = unlock.unlock_months.filter(month => month <= candidate.months_to_goal).length
    const amount = event.effect_value * (event.quantity_per_period ?? 1) * occurrences
    return amount > 0 ? [{ amount, label: eventLabel(event, displays[event.event_id]) }] : []
  })
  const startingLabel = rewardCurrency === 'skywards_miles' ? 'Existing Skywards miles' : 'Existing Etihad Guest miles'
  const items: FormulaItem[] = [
    ...(currentUsableMiles > 0 ? [{ amount: currentUsableMiles, label: startingLabel }] : []),
    ...(baseMiles > 0 ? [{
      amount: baseMiles,
      label: `From your ${formatAed(monthlySpend)} monthly spend`,
      detail: `${formatNumber(monthlyBaseMiles)} miles/mo × ${candidate.months_to_goal}`,
    }] : []),
    ...bonusItems,
  ]
  const aboveTarget = Math.max(0, candidate.total_miles_at_goal - candidate.target_at_goal_miles)
  const progress = Math.min(100, (candidate.total_miles_at_goal / Math.max(candidate.target_at_goal_miles, 1)) * 100)
  const discountedTarget = candidate.target_at_goal_miles < candidate.original_target_miles

  return <div className={styles.formula} aria-label={`Miles calculation reaching your goal in ${candidate.months_to_goal} months`}>
    <div className={styles.scroller}><div className={styles.equation}>
      {items.map((item, index) => <Fragment key={`${item.label}-${index}`}>{index > 0 && <span className={styles.operator} aria-hidden="true">+</span>}<div className={styles.item}><strong>{formatNumber(item.amount)}</strong><span className={item.detail ? styles.spendingLabel : undefined}>{item.label}</span>{item.detail && <small>{item.detail}</small>}</div></Fragment>)}
      <span className={styles.equals} aria-hidden="true">=</span>
      <div className={styles.total}><strong>{formatMiles(candidate.total_miles_at_goal)}</strong><span>✦ Goal reached in month {candidate.months_to_goal}</span></div>
    </div></div>
    <div className={styles.target}><div className={styles.track}><i style={{ width: `${progress}%` }} /></div><div><span>Target: {formatMiles(candidate.target_at_goal_miles)}{discountedTarget ? ' after your miles discount' : ''}</span><strong>{aboveTarget > 0 ? `${formatMiles(aboveTarget)} above target` : 'Goal reached'}</strong></div></div>
  </div>
}
