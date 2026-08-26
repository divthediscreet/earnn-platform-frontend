import type { ConditionalRewardEvent, EventDisplay } from '@/lib/miles-goal/contracts'
import { formatAed, formatMiles, formatMonths } from '@/lib/miles-goal/format'
import styles from './MilesDetails.module.css'

export default function MilesOpportunityCard({ event, display, active, currentMonths, alternativeMonths, onToggle }: {
  event: ConditionalRewardEvent
  display?: EventDisplay
  active: boolean
  currentMonths: number | null
  alternativeMonths: number | null
  onToggle: (enabled: boolean) => void
}) {
  const effect = event.effect_type === 'target_reduce' ? `${event.effect_value}% fewer target miles`
    : event.effect_type === 'cost_reduce' ? `${formatAed(event.effect_value)} fee reduction`
      : `${formatMiles(event.effect_value)} reward`
  return <article className={styles.opportunity}>
    <div className={styles.opportunityTop}><div><span>{display?.mechanic?.replaceAll('_', ' ') ?? 'Reward opportunity'}</span><h4>{display?.title || effect}</h4></div><button type="button" role="switch" aria-checked={active} onClick={() => onToggle(!active)} className={active ? styles.switchOn : ''}><span /></button></div>
    <p>{effect}{display?.extra_monthly_spend_aed ? ` · Spend ${formatAed(display.extra_monthly_spend_aed)} more per month to unlock.` : ''}</p>
    <div className={styles.feasibility}><span><i style={{ width: `${Math.round(event.feasibility_ratio * 100)}%` }} /></span><small>{Math.round(event.feasibility_ratio * 100)}% of buffered spend condition</small></div>
    {(currentMonths || alternativeMonths) && <div className={styles.delta}><span>{formatMonths(currentMonths)}</span><i className="ti ti-arrow-right" /><strong>{formatMonths(alternativeMonths)}</strong></div>}
    {(display?.conditions || display?.expiry) && <details><summary>Conditions</summary><p>{display.conditions}{display.expiry ? ` Offer expiry: ${display.expiry}.` : ''}</p></details>}
  </article>
}
