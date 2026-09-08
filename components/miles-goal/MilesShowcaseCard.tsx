'use client'

import Image from 'next/image'
import { useState } from 'react'
import { getCardImageUrl } from '@/lib/api'
import type { Airline, MilesGoalSimulationResponse, StrategyId, ToggleState } from '@/lib/miles-goal/contracts'
import type { MilesDisplayCard } from '@/lib/miles-goal/selectors'
import { activeEvents } from '@/lib/miles-goal/resolver'
import { formatAed, formatNumber } from '@/lib/miles-goal/format'
import MilesCardDetails from './MilesCardDetails'
import styles from './MilesShowcaseCard.module.css'

function feeText(card: NonNullable<MilesDisplayCard['catalogs'][Airline]>) {
  if (card.free_for_life) return 'Free for life'
  const firstFee = card.annual_fee_year1_aed ?? card.annual_fee_from_year2_aed
  if (card.annual_fee_year1_free) return `First year free · then ${formatAed(card.annual_fee_from_year2_aed)} / year`
  if (firstFee !== card.annual_fee_from_year2_aed) return `${formatAed(firstFee)} first year · then ${formatAed(card.annual_fee_from_year2_aed)} / year`
  return `${formatAed(card.annual_fee_from_year2_aed)} / year`
}

export default function MilesShowcaseCard({ card, focused, responses, toggles, onToggleChange, monthlySpend, onCardNameClick }: {
  card: MilesDisplayCard
  focused: StrategyId
  responses: Partial<Record<Airline, MilesGoalSimulationResponse>>
  toggles: Partial<Record<Airline, ToggleState>>
  onToggleChange: (airline: Airline, state: ToggleState) => void
  monthlySpend: number
  onCardNameClick: (cardId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const winner = card.strategy[focused]
  const source = winner ? responses[winner.airline] : undefined
  const catalogCard = winner ? card.catalogs[winner.airline] : undefined
  const state = winner && source ? toggles[winner.airline] ?? source.interaction_catalog.toggle_defaults : undefined
  const trajectory = catalogCard && winner ? catalogCard.base_trajectories.find(item => item.trajectory_id === winner.selected_trajectory_id) : undefined
  const active = catalogCard && winner && state ? activeEvents(catalogCard, winner.fee_route, state) : []

  if (!winner || !source || !catalogCard || !state) return null

  const monthlyMiles = (trajectory?.monthly_base_target_miles ?? 0) + (trajectory?.monthly_fee_uplift_target_miles ?? 0)
  const cumulativeBonusMiles = active
    .filter(event => event.effect_type === 'miles_add' && event.effect_value > 0)
    .reduce((total, event) => {
      const unlocks = winner.event_unlocks.find(item => item.event_id === event.event_id)?.unlock_months ?? []
      const earnedByGoal = unlocks.filter(month => month <= winner.months_to_goal).length
      return total + earnedByGoal * event.effect_value * (event.quantity_per_period ?? 1)
    }, 0)

  return <article className={`${styles.card} ${card.focused_rank === 1 ? styles.first : ''}`}>
    <span className={styles.badge}><i className="ti ti-sparkles" /> #{card.focused_rank} {card.focused_rank === 1 ? 'FASTEST ROUTE' : 'FASTEST OPTION'}</span>
    <span className={styles.fee}>Fee: {feeText(catalogCard)}</span>
    <div className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.bank}>{card.bank_name}</p>
        <h2><button type="button" className={styles.cardName} onClick={() => onCardNameClick(card.earnn_card_id)}>{card.card_name}</button></h2>
        <p className={styles.timeline}><strong>{winner.months_to_goal}</strong><span>{winner.months_to_goal === 1 ? 'month' : 'months'} to your<br />{focused === 'dream' ? 'Business Class Ticket' : focused === 'easiest' ? 'Economy Ticket' : 'Business Upgrade Ticket'}</span></p>
      </div>
      <Image className={styles.cardImage} width={240} height={150} unoptimized src={getCardImageUrl(card.earnn_card_id)} onError={event => { event.currentTarget.src = '/card-dummy.svg' }} alt={`${card.card_name} credit card`} />
      <div className={styles.metrics}>
        <div><strong>{formatNumber(winner.target_at_goal_miles)}</strong><span>miles needed</span></div>
        <div><strong>{formatNumber(monthlyMiles)}</strong><span>miles/month from spending</span></div>
        <div><strong>{formatNumber(cumulativeBonusMiles)}</strong><span>bonus miles available</span></div>
      </div>
      <button type="button" className={styles.expand} onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>Show me how <i className={`ti ti-chevron-${expanded ? 'up' : 'down'}`} /></button>
    </div>
    {expanded && <MilesCardDetails card={card} focused={focused} responses={responses} toggles={toggles} onToggleChange={onToggleChange} monthlySpend={monthlySpend} />}
  </article>
}
