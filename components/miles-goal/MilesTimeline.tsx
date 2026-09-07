import type { CardInteractionModel, ConditionalRewardEvent, EventDisplay, ReachedCandidate } from '@/lib/miles-goal/contracts'
import { formatAed, formatMiles } from '@/lib/miles-goal/format'
import styles from './MilesTimeline.module.css'

type MonthEvent = { event: ConditionalRewardEvent; display?: EventDisplay }
type TimelineSegment =
  | { kind: 'normal'; start: number; end: number; monthlyMiles: number }
  | { kind: 'milestone'; month: number; monthlyMiles: number; events: MonthEvent[] }

const EPSILON = 0.01

function eventText({ event, display }: MonthEvent) {
  const labels: Record<string, string> = {
    joining_bonus: 'Joining Bonus',
    spend_bonus: 'Spend Bonus',
    restricted_spend_bonus: 'Restricted Spend Bonus',
    balance_transfer_bonus: 'Balance Transfer Bonus',
    joining_fee_reversal: 'Joining Fee Reversal',
    spend_acceleration: 'Spend Acceleration Bonus',
    annual_benefit_acceleration: 'Annual Miles Bonus',
    miles_discount_voucher: 'Miles Discount Voucher',
  }
  const rawTitle = display?.title || event.source_ref || 'Card reward'
  const title = labels[rawTitle.trim().toLowerCase()] || rawTitle.replaceAll('_', ' ')
  const quantity = event.quantity_per_period || 1
  if (event.effect_type === 'target_reduce') return `${title}: ${event.effect_value}% fewer miles needed`
  if (event.effect_type === 'cost_reduce') return `${title}: ${formatAed(event.effect_value * quantity)} fee reduction`
  return `${title}: +${formatMiles(event.effect_value * quantity)}`
}

function normalLabel(segment: Extract<TimelineSegment, { kind: 'normal' }>) {
  const months = segment.end - segment.start + 1
  if (months === 1) return `${formatMiles(segment.monthlyMiles)} from your monthly spend`
  return `${formatMiles(segment.monthlyMiles)} × ${months} = ${formatMiles(segment.monthlyMiles * months)}`
}

export default function MilesTimeline({ candidate, card, displays }: {
  candidate: ReachedCandidate
  card: CardInteractionModel
  displays: Record<string, EventDisplay>
}) {
  const trajectory = card.base_trajectories.find(item => item.trajectory_id === candidate.selected_trajectory_id)
  const eventsByMonth = new Map<number, MonthEvent[]>()

  for (const unlock of candidate.event_unlocks) {
    const event = card.conditional_events.find(item => item.event_id === unlock.event_id)
    if (!event) continue
    for (const month of unlock.unlock_months) {
      if (month > candidate.months_to_goal) continue
      const current = eventsByMonth.get(month) || []
      current.push({ event, display: displays[event.event_id] })
      eventsByMonth.set(month, current)
    }
  }

  const monthlyMiles = (month: number) => {
    const cumulative = trajectory?.cumulative_base_miles_by_month || []
    return Math.max(0, (cumulative[month - 1] || 0) - (month > 1 ? cumulative[month - 2] || 0 : 0))
  }

  const segments: TimelineSegment[] = []
  let normalStart: number | null = null
  let normalMonthlyMiles = 0
  const flushNormal = (end: number) => {
    if (normalStart === null) return
    segments.push({ kind: 'normal', start: normalStart, end, monthlyMiles: normalMonthlyMiles })
    normalStart = null
  }

  for (let month = 1; month <= candidate.months_to_goal; month += 1) {
    const events = eventsByMonth.get(month)
    const baseMiles = monthlyMiles(month)
    if (events?.length) {
      flushNormal(month - 1)
      segments.push({ kind: 'milestone', month, monthlyMiles: baseMiles, events })
    } else if (normalStart === null) {
      normalStart = month
      normalMonthlyMiles = baseMiles
    } else if (Math.abs(normalMonthlyMiles - baseMiles) > EPSILON) {
      flushNormal(month - 1)
      normalStart = month
      normalMonthlyMiles = baseMiles
    }
  }
  flushNormal(candidate.months_to_goal)

  return (
    <div className={styles.scroller} aria-label={`Achievement timeline over ${candidate.months_to_goal} months`}>
      <ol className={styles.timeline}>
        {segments.map((segment, index) => segment.kind === 'normal' ? (
          <li className={`${styles.node} ${styles.normal}`} key={`normal-${segment.start}-${segment.end}`}>
            <span className={styles.dot} aria-hidden="true" />
            <p className={styles.month}>{segment.start === segment.end ? `MONTH ${segment.start}` : `MONTHS ${segment.start}–${segment.end}`}</p>
            <p className={styles.title}>Everyday miles</p>
            <p className={styles.detail}>{normalLabel(segment)}</p>
          </li>
        ) : (
          <li className={`${styles.node} ${styles.milestone}`} key={`milestone-${segment.month}-${index}`}>
            <span className={styles.dot} aria-hidden="true" />
            <p className={styles.month}>MONTH {segment.month}</p>
            <p className={styles.title}>Miles from spending</p>
            <p className={styles.detail}>{formatMiles(segment.monthlyMiles)}</p>
            <ul className={styles.eventList}>
              {segment.events.map(item => <li key={item.event.event_id}>{eventText(item)}</li>)}
            </ul>
          </li>
        ))}
        <li className={`${styles.node} ${styles.goal}`}>
          <span className={styles.dot} aria-hidden="true" />
          <p className={styles.month}>MONTH {candidate.months_to_goal}</p>
          <p className={styles.title}>Flight goal reached</p>
          <p className={styles.detail}>{formatMiles(candidate.total_miles_at_goal)} earned towards a {formatMiles(candidate.target_at_goal_miles)} goal.</p>
        </li>
      </ol>
    </div>
  )
}
