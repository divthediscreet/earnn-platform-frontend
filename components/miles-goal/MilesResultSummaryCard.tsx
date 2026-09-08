'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getCardImageUrl } from '@/lib/api'
import type { Airline, MilesGoalSimulationResponse, StrategyId, ToggleState } from '@/lib/miles-goal/contracts'
import type { MilesDisplayCard } from '@/lib/miles-goal/selectors'
import { activeEvents } from '@/lib/miles-goal/resolver'
import { formatAed, formatMiles, formatNumber } from '@/lib/miles-goal/format'
import MilesCardDetails from './MilesCardDetails'
import styles from './MilesResultSummaryCard.module.css'
import storyStyles from './MilesResultStoryRedesign.module.css'
import unitStyles from './MilesResultStoryUnits.module.css'
import layoutStyles from './MilesResultStoryLayout.module.css'
import insightStyles from './MilesResultStoryInsight.module.css'
import timelineStyles from './MilesResultTimeline.module.css'

function feeText(card: NonNullable<MilesDisplayCard['catalogs'][Airline]>) {
  if (card.free_for_life) return 'Free for life'
  const firstFee = card.annual_fee_year1_aed ?? card.annual_fee_from_year2_aed
  if (card.annual_fee_year1_free) return `First year free · then ${formatAed(card.annual_fee_from_year2_aed)} / year`
  if (firstFee !== card.annual_fee_from_year2_aed) return `${formatAed(firstFee)} first year · then ${formatAed(card.annual_fee_from_year2_aed)} / year`
  return `${formatAed(card.annual_fee_from_year2_aed)} / year`
}

function targetDescription(strategy: StrategyId, destinationLabel: string) {
  if (strategy === 'easiest') return `Economy to ${destinationLabel}`
  if (strategy === 'dream') return `Business Class to ${destinationLabel}`
  return `Premium Economy upgrade to ${destinationLabel}`
}

export default function MilesResultSummaryCard({ card, focused, destinationLabel, monthlySpend, responses, toggles, onToggleChange }: {
  card: MilesDisplayCard
  focused: StrategyId
  destinationLabel: string
  monthlySpend: number
  responses: Partial<Record<Airline, MilesGoalSimulationResponse>>
  toggles: Partial<Record<Airline, ToggleState>>
  onToggleChange: (airline: Airline, state: ToggleState) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const winner = card.strategy[focused]
  const source = winner ? responses[winner.airline] : undefined
  const catalogCard = winner ? card.catalogs[winner.airline] : undefined
  const state = winner && source ? toggles[winner.airline] ?? source.interaction_catalog.toggle_defaults : undefined
  const trajectory = catalogCard && winner ? catalogCard.base_trajectories.find(item => item.trajectory_id === winner.selected_trajectory_id) : undefined
  const active = catalogCard && winner && state ? activeEvents(catalogCard, winner.fee_route, state) : []
  const bonusEvents = active.filter(event => event.effect_type === 'miles_add' && event.effect_value > 0)

  if (!winner || !source || !catalogCard || !state) return null

  const monthlyMiles = (trajectory?.monthly_base_target_miles ?? 0) + (trajectory?.monthly_fee_uplift_target_miles ?? 0)
  const boostMiles = bonusEvents.reduce((total, event) => total + event.effect_value, 0)
  const strategyDefinition = source.interaction_catalog.strategies.find(item => item.strategy_id === focused)
  const joiningBonusMiles = bonusEvents
    .filter(event => event.event_id.startsWith('joining_bonus:'))
    .reduce((total, event) => total + event.effect_value, 0)
  const joiningCoveragePct = winner.target_at_goal_miles > 0
    ? Math.round((joiningBonusMiles / winner.target_at_goal_miles) * 100)
    : 0
  const voucher = active.find(event => event.effect_type === 'target_reduce')
  const balanceTransfer = active.find(event => event.toggle_key === 'balance_transfer' && event.effect_type === 'miles_add')
  const annualBonus = active.find(event => source.interaction_catalog.event_display_catalog[event.event_id]?.mechanic === 'annual_benefit_acceleration')
  const incrementalCardFee = winner.fee_route === 'monthly_fee_acceleration'
    ? (trajectory?.monthly_fee_aed ?? 0) * winner.months_to_goal
    : catalogCard.annual_fee_from_year2_aed * (winner.months_to_goal / 12)
  // Service mapping: economy = eco cash fare - redemption cash; dream = business cash fare - redemption cash;
  // smartest = business cash fare - Deluxe/Flex cash fare. The selected fee route is then deducted below.
  const cashPriceOfTargetCabin = strategyDefinition?.cash_price_aed ?? 0
  const unavoidableTicketCash = winner.associated_cash_aed
  const estimatedSaving = cashPriceOfTargetCabin - unavoidableTicketCash - incrementalCardFee
  const savingText = estimatedSaving >= 200
    ? `Estimated saving of ${formatAed(estimatedSaving)} versus paying cash.`
    : null
  const reasonMessages: string[] = []
  if (joiningBonusMiles > 0) {
    reasonMessages.push(joiningCoveragePct > 90
      ? 'Its joining bonus covers most of your miles requirement.'
      : `Its joining bonus covers ${joiningCoveragePct}% of your miles requirement.`)
  }
  if (trajectory?.monthly_fee_uplift_target_miles) {
    reasonMessages.push('Instead of a yearly fee, pay monthly to get extra miles every month.')
  }
  if (balanceTransfer) {
    reasonMessages.push(balanceTransfer.threshold_aed
      ? `Transfer ${formatAed(balanceTransfer.threshold_aed)} to unlock ${formatNumber(balanceTransfer.effect_value)} bonus miles.`
      : `Complete a balance transfer to unlock ${formatNumber(balanceTransfer.effect_value)} bonus miles.`)
  }
  if (voucher) {
    const periodLabels: Record<string, string> = { monthly: '1 month', quarterly: '3 months', semi_annual: '6 months', annual: '12 months' }
    const period = voucher.period ? periodLabels[voucher.period] : null
    reasonMessages.push(voucher.threshold_aed
      ? `Spend ${formatAed(voucher.threshold_aed)}${period ? ` in ${period}` : ''} to get a ${formatNumber(voucher.effect_value)}% miles discount voucher.`
      : `Get a ${formatNumber(voucher.effect_value)}% miles discount voucher.`)
  }
  const hasPrimaryRouteReason = reasonMessages.length > 0
  if (annualBonus) {
    const annualTitle = source.interaction_catalog.event_display_catalog[annualBonus.event_id]?.title
    reasonMessages.push(annualTitle
      ? `Its ${annualTitle.toLowerCase()} boosts your plan.`
      : 'Its annual miles benefit boosts your plan.')
  }
  if (!hasPrimaryRouteReason) reasonMessages.push(`Your monthly spending earns ${formatNumber(monthlyMiles)} miles.`)
  const whyMessages = [...(savingText ? [savingText] : []), ...reasonMessages].slice(0, 3)
  return <article className={`${styles.card} ${card.focused_rank === 1 ? styles.featured : ''}`}>
    <div className={styles.topline}><span>#{card.focused_rank} {card.focused_rank === 1 ? 'FASTEST TO YOUR GOAL' : 'FASTEST OPTION'}</span><span>Fee: {feeText(catalogCard)}</span></div>
    <div className={`${styles.main} ${timelineStyles.main}`}>
      <Image width={122} height={75} unoptimized src={getCardImageUrl(card.earnn_card_id)} onError={event => { event.currentTarget.src = '/card-dummy.svg' }} alt={`${card.card_name} credit card`} />
      <div className={styles.identity}><small>{card.bank_name}</small><h2>{card.card_name}</h2><p>{card.focused_rank === 1 ? 'The fastest eligible route under your current assumptions.' : 'A strong eligible route for your selected flight goal.'}</p></div>
      <div className={`${styles.goal} ${timelineStyles.goal}`}><small>ESTIMATED TIMELINE</small><strong>{winner.months_to_goal}</strong><span>{winner.months_to_goal === 1 ? 'month' : 'months'} to goal</span></div>
    </div>

    <div className={`${styles.story} ${storyStyles.story} ${layoutStyles.story}`}>
      <div className={`${storyStyles.panel} ${storyStyles.target}`}><span><i className="ti ti-target-arrow" /> YOUR TARGET</span><strong>{formatNumber(winner.target_at_goal_miles)}<span className={unitStyles.unit}>miles</span></strong><small>{targetDescription(focused, destinationLabel)}</small></div>
      <div className={`${storyStyles.panel} ${storyStyles.boost}`}><span><i className="ti ti-gift" /> YOUR BOOST</span><strong className={boostMiles > 0 ? undefined : insightStyles.noBoost}>{boostMiles > 0 ? <><span className={unitStyles.prefix}>Up to</span>{formatNumber(boostMiles)}<span className={unitStyles.unit}>miles</span></> : 'No bonus miles'}</strong><small>{bonusEvents.length > 0 ? `${bonusEvents.length} eligible bonus reward${bonusEvents.length === 1 ? '' : 's'}` : 'No qualifying bonus is active'}</small></div>
      <div className={`${storyStyles.panel} ${storyStyles.earning}`}><span><i className="ti ti-chart-bar" /> YOUR EARNING</span><strong>{formatNumber(monthlyMiles)}<span className={unitStyles.unit}>miles/month</span></strong><small>From your monthly spend of {formatAed(monthlySpend)}</small></div>
      <div className={`${storyStyles.panel} ${storyStyles.exploitability} ${insightStyles.insight}`}><span><i className="ti ti-sparkles" /> WHY THIS WORKS</span>{whyMessages.map((message, index) => <small key={message} className={index === 0 ? insightStyles.reason : undefined}>• {message}</small>)}</div>
    </div>

    <div className={styles.actions}><button type="button" className="btn-primary" onClick={() => setExpanded(value => !value)} aria-expanded={expanded}>{expanded ? 'Hide full plan' : 'See full plan'} <i className={`ti ti-chevron-${expanded ? 'up' : 'down'}`} /></button><Link href="/compare">Get this card <i className="ti ti-arrow-up-right" /></Link></div>
    {expanded && <MilesCardDetails card={card} focused={focused} responses={responses} toggles={toggles} onToggleChange={onToggleChange} />}
  </article>
}
