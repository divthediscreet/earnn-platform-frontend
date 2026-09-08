'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Airline, MilesGoalSimulationResponse, ToggleState } from '@/lib/miles-goal/contracts'
import { getMilesRegion } from '@/lib/miles-goal/regions'
import { resolveCatalog, withTravellerTarget } from '@/lib/miles-goal/resolver'
import { buildDisplayCards, STRATEGY_IDS, withLockedDisplayOrder } from '@/lib/miles-goal/selectors'
import { clearMilesGoalSession, readMilesGoalSession, writeMilesGoalSession } from '@/lib/miles-goal/storage'
import type { MilesGoalSession } from '@/lib/miles-goal/storage'
import MilesShowcaseCard from './MilesShowcaseCard'
import styles from '@/app/miles/results/preview/PreviewResults.module.css'

export default function MilesResultPreview() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const region = getMilesRegion(searchParams.get('region'))
  const [session, setSession] = useState<MilesGoalSession | null>(null)
  const [toggles, setToggles] = useState<Partial<Record<Airline, ToggleState>>>({})

  useEffect(() => {
    const stored = readMilesGoalSession()
    if (!stored || !region || stored.region_id !== region.id || stored.mode !== 'personalized') return
    const lockedCardOrder = stored.locked_card_order ?? Object.fromEntries(STRATEGY_IDS.map(strategy => [strategy, buildDisplayCards(stored.responses, stored.airline_scope, strategy).map(card => card.earnn_card_id)]))
    const nextSession = stored.locked_card_order ? stored : { ...stored, locked_card_order: lockedCardOrder }
    if (!stored.locked_card_order) writeMilesGoalSession(nextSession)
    setSession(nextSession)
    setToggles(stored.toggles)
  }, [region])

  const responses = useMemo(() => {
    if (!session) return {}
    const travellerCount = (session.travellers?.adults ?? 1) + (session.travellers?.children ?? 0)
    return Object.fromEntries(Object.entries(session.responses).flatMap(([airline, response]) => {
      if (!response) return []
      const catalog = withTravellerTarget(response.interaction_catalog, travellerCount)
      const state = toggles[airline as Airline] ?? catalog.toggle_defaults
      return [[airline, { ...response, interaction_catalog: catalog, resolved_view: resolveCatalog(catalog, state) }]]
    })) as Partial<Record<Airline, MilesGoalSimulationResponse>>
  }, [session, toggles])
  const cards = session ? withLockedDisplayOrder(buildDisplayCards(responses, session.airline_scope, session.focused_strategy), session.locked_card_order?.[session.focused_strategy]) : []
  const updateToggle = (airline: Airline, state: ToggleState) => {
    setToggles(current => {
      const next = { ...current, [airline]: state }
      if (session) writeMilesGoalSession({ ...session, toggles: next })
      return next
    })
  }

  if (!region || !session) return <main className={styles.page}><section className={styles.empty}><h1>No personalised plan available</h1><p>Build a Miles plan first, then return here to preview the alternate card design.</p><Link className="btn-primary" href="/miles">Start a new search</Link></section></main>

  return <main className={styles.page}><div className={styles.shell}><header className={styles.top}><div><span className={styles.label}>YOUR PERSONALISED PLAN</span><h1>Here’s your fastest route.</h1></div><nav className={styles.switches} aria-label="Result layouts"><button type="button" onClick={() => { clearMilesGoalSession(); router.push('/miles') }}><i className="ti ti-search" /> New Search</button><Link href={`/miles/results?region=${encodeURIComponent(region.id)}&view=current`}>View 1.0</Link></nav></header><section className={styles.cards}>{cards.map(card => <MilesShowcaseCard key={card.earnn_card_id} card={card} focused={session.focused_strategy} responses={responses} toggles={toggles} onToggleChange={updateToggle} />)}</section></div></main>
}
