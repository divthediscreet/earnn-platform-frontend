import type { CardInteractionModel, ReachedCandidate } from '@/lib/miles-goal/contracts'
import type { EventDisplay } from '@/lib/miles-goal/contracts'
import { formatMiles } from '@/lib/miles-goal/format'
import styles from './MilesDetails.module.css'

export default function MilesTimeline({ candidate, card, displays }: { candidate: ReachedCandidate; card: CardInteractionModel; displays: Record<string, EventDisplay> }) {
  const trajectory = card.base_trajectories.find(item => item.trajectory_id === candidate.selected_trajectory_id)
  const items = candidate.event_unlocks.flatMap(unlock => {
    const event = card.conditional_events.find(item => item.event_id === unlock.event_id)
    if (!event) return []
    return unlock.unlock_months.filter(month => month <= candidate.months_to_goal).map(month => ({ month, event, display: displays[event.event_id] }))
  }).sort((a, b) => a.month - b.month)
  return <div className={styles.timeline}>
    <div><span>Now</span><p>Start with <strong>{formatMiles(trajectory?.monthly_base_target_miles ?? 0)}</strong> per month in base earning.</p></div>
    {items.map((item, index) => <div key={`${item.event.event_id}-${item.month}-${index}`}><span>Month {item.month}</span><p>{item.event.effect_type === 'target_reduce' ? `${item.event.effect_value}% target discount unlocks` : item.event.effect_type === 'cost_reduce' ? 'Card fee reduction unlocks' : `${formatMiles(item.event.effect_value)} added`} {item.display?.title ? `· ${item.display.title}` : ''}</p></div>)}
    <div className={styles.goal}><span>Month {candidate.months_to_goal}</span><p><strong>Flight goal reached</strong> with {formatMiles(candidate.total_miles_at_goal)}.</p></div>
  </div>
}
