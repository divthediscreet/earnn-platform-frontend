'use client'

import { useState } from 'react'
import Image from 'next/image'
import { getCardImageUrl } from '@/lib/api'
import type { Airline, MilesGoalSimulationResponse, StrategyId, ToggleState } from '@/lib/miles-goal/contracts'
import type { MilesDisplayCard } from '@/lib/miles-goal/selectors'
import { airlineLabel, feeRouteLabel, formatAed, formatMiles, formatMonths } from '@/lib/miles-goal/format'
import MilesCardDetails from './MilesCardDetails'
import styles from './MilesCardTile.module.css'

const strategyLabels: Record<StrategyId, string> = { easiest: 'Easiest · Economy', dream: 'Dream · Business', smartest: 'Smartest · Upgrade' }

export default function MilesCardTile({ card, focused, responses, toggles, onToggleChange }: {
  card: MilesDisplayCard
  focused: StrategyId
  responses: Partial<Record<Airline, MilesGoalSimulationResponse>>
  toggles: Partial<Record<Airline, ToggleState>>
  onToggleChange: (airline: Airline, state: ToggleState) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const winner = card.strategy[focused]
  const winnerCard = winner ? card.catalogs[winner.airline] : undefined
  const winnerResponse = winner ? responses[winner.airline] : undefined
  const strongest = winner?.active_event_ids[0]
  const eventDisplay = strongest ? winnerResponse?.interaction_catalog.event_display_catalog[strongest] : undefined
  return <article className={`${styles.tile} ${card.focused_rank === 1 ? styles.top : ''}`}>
    <div className={styles.header}>
      <span className={styles.rank}>#{card.focused_rank}</span>
      <Image width={108} height={66} unoptimized src={getCardImageUrl(card.earnn_card_id)} onError={event => { event.currentTarget.src = '/card-dummy.svg' }} alt={`${card.card_name} credit card`} />
      <div className={styles.identity}><span>{card.bank_name}</span><h2>{card.card_name}</h2>{card.focused_rank === 1 && <small><i className="ti ti-sparkles" /> Fastest for {strategyLabels[focused]}</small>}</div>
      {winner && <div className={styles.headline}><small>GOAL IN</small><strong>{winner.months_to_goal}</strong><span>months</span></div>}
    </div>
    <div className={styles.strategies}>{(['easiest', 'dream', 'smartest'] as StrategyId[]).map(strategy => {
      const result = card.strategy[strategy]
      return <div key={strategy} className={strategy === focused ? styles.focused : ''}>
        <span>{strategyLabels[strategy]}</span>
        {result ? <><strong>{formatMonths(result.months_to_goal)}</strong><small><b>{airlineLabel(result.airline)}</b> · {formatMiles(result.target_at_goal_miles)}</small><small>{feeRouteLabel(result.fee_route)}</small><small>Airline cash: {formatAed(result.associated_cash_aed)}</small></> : <><strong>—</strong><small>No result within 36 months</small></>}
      </div>
    })}</div>
    <div className={styles.footer}>
      <div>{eventDisplay ? <><i className="ti ti-bolt" /><span><strong>{eventDisplay.title || 'Reward boost included'}</strong><small>{winner?.active_event_ids.length} active reward condition{winner?.active_event_ids.length === 1 ? '' : 's'}</small></span></> : <><i className="ti ti-route" /><span><strong>Base earning route</strong><small>See the month-by-month plan</small></span></>}</div>
      <button onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>{expanded ? 'Hide plan' : 'Explore plan'} <i className={`ti ti-chevron-${expanded ? 'up' : 'down'}`} /></button>
    </div>
    {expanded && winnerCard && <MilesCardDetails card={card} focused={focused} responses={responses} toggles={toggles} onToggleChange={onToggleChange} />}
  </article>
}
