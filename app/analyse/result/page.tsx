'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchCardDetail } from '@/lib/api'
import {
  evaluateWallet, SimulatorApiError, useSimulatorSession,
  type RecommendResponse, type SimulatorRequest, type Wallet,
} from '@/lib/wallet-simulator/api'
import { sameCards, walletKey } from '@/lib/wallet-simulator/playbook'
import type { CardInfo } from '@/components/wallet-simulator/card-art'
import { CompareDialog } from '@/components/wallet-simulator/compare'
import CardDetailPopup from '@/components/CardDetailPopup'
import { ReplaceCardDialog, WalletCustomizeDialog } from '@/components/wallet-simulator/customize'
import { Alternatives, PlaybookBody } from '@/components/wallet-simulator/sections'
import { ResultSummary } from '@/components/wallet-simulator/result-summary'
import { RewardModeProvider } from '@/lib/wallet-simulator/reward-mode'
import { AllBenefitsDialog } from '@/components/wallet-simulator/all-benefits'
import { CompareBand } from '@/components/wallet-simulator/compare-band'

export default function SimulatorResultPage() {
  const router = useRouter()
  const session = useSimulatorSession()
  useEffect(() => {
    if (session === null) router.replace('/analyse')
  }, [session, router])
  if (!session) return <div className="ws-root min-h-[60vh] bg-ws-bg" />
  return (
    <RewardModeProvider mode={session.request.reward_mode ?? session.result.mode}>
      <SmartWallet request={session.request} result={session.result} />
    </RewardModeProvider>
  )
}

function SmartWallet({ request, result }: { request: SimulatorRequest; result: RecommendResponse }) {
  // The recommended strategy (chosen as in Analyse, net of fees) is the pick; the engine's own pick is the fallback
  // for results saved before strategies existed.
  const strategies = useMemo(() => result.strategies ?? [], [result.strategies])
  const pick = strategies[0]?.wallet ?? result.recommendation.wallet
  const [ids, setIds] = useState<string[]>(pick.cards)
  // Wallets the backend has already calculated, keyed by card set (seeded with the pick + alternatives).
  const [evaluated, setEvaluated] = useState<Record<string, Wallet>>(() =>
    Object.fromEntries([pick, ...strategies.map(s => s.wallet), result.recommendation.wallet, ...result.alternatives]
      .reverse().map(w => [walletKey(w.cards), w])))
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [previous, setPrevious] = useState<Wallet | null>(pick) // shown (dimmed) while an update runs
  const [compareOpen, setCompareOpen] = useState(false) // compare against the user's current cards
  const [detailCardId, setDetailCardId] = useState<string | null>(null) // card-information popup
  const [replacing, setReplacing] = useState<{ id: string | null; group: string | null } | null>(null) // "Replace this card" list
  const [benefitsOpen, setBenefitsOpen] = useState(false) // "See all benefits" popup
  const [customizeOpen, setCustomizeOpen] = useState(false) // "Open wallet customization" popup
  const [extraInfo, setExtraInfo] = useState<Record<string, CardInfo>>({})

  const key = walletKey(ids)
  const current = ids.length ? evaluated[key] ?? null : null
  const status: 'ready' | 'updating' | 'error' =
    ids.length === 0 || current ? 'ready' : failedKey === key ? 'error' : 'updating'
  const displayWallet = ids.length === 0 ? null : current ?? previous

  // Re-evaluate whenever the wallet changes. The backend is the only source of reward numbers.
  useEffect(() => {
    if (ids.length === 0 || evaluated[key] || failedKey === key) return
    const controller = new AbortController()
    evaluateWallet(request, ids, controller.signal)
      .then(res => setEvaluated(prev => ({ ...prev, [key]: res.wallet })))
      .catch(e => {
        if ((e as Error).name === 'AbortError') return
        console.warn('Wallet evaluation failed:', e instanceof SimulatorApiError ? e.message : e)
        setFailedKey(key)
      })
    return () => controller.abort()
  }, [ids, key, evaluated, failedKey, request])

  // Card names/banks for display: everything the API returned, plus the existing card-detail
  // endpoint for any id that only appears in best_by_size.
  const directory = useMemo(() => {
    const m = new Map<string, CardInfo>()
    const put = (id: string, name: string, bank: string | null) => { if (!m.has(id)) m.set(id, { id, name, bank }) }
    for (const w of [pick, result.recommendation.wallet, ...strategies.map(st => st.wallet), ...result.alternatives, ...Object.values(evaluated)]) {
      for (const pc of w.per_card) put(pc.card_id, pc.card_name, pc.bank_name)
    }
    for (const b of result.discovery_blocks) for (const c of b.cards) put(c.card_id, c.card_name, c.bank_name)
    for (const c of result.card_scores ?? []) put(c.card_id, c.card_name, c.bank_name)
    for (const [id, info] of Object.entries(extraInfo)) put(id, info.name, info.bank)
    return m
  }, [pick, result, strategies, evaluated, extraInfo])

  useEffect(() => {
    const known = new Set<string>()
    for (const w of [pick, result.recommendation.wallet, ...result.alternatives]) w.cards.forEach(id => known.add(id))
    for (const b of result.discovery_blocks) b.cards.forEach(c => known.add(c.card_id))
    const missing = new Set(Object.values(result.best_by_size).flatMap(b => b.cards).filter(id => !known.has(id)))
    let cancelled = false
    for (const id of missing) {
      fetchCardDetail(id)
        .then(d => {
          if (!cancelled) setExtraInfo(prev => ({ ...prev, [id]: { id, name: String(d?.card?.card_name ?? id), bank: d?.card?.bank_name ?? null } }))
        })
        .catch(() => { /* the fallback art still renders */ })
    }
    return () => { cancelled = true }
  }, [pick, result])

  const card = useCallback((id: string): CardInfo => directory.get(id) ?? { id, name: id, bank: null }, [directory])

  const changeIds = useCallback((next: string[]) => {
    setPrevious(displayWallet)
    setFailedKey(null)
    setIds(next)
  }, [displayWallet])

  // choosing a way from "Other smart ways" brings the user back up to the result
  const useStrategy = useCallback((next: string[]) => {
    changeIds(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [changeIds])
  const removeCard = useCallback((id: string) => changeIds(ids.filter(c => c !== id)), [ids, changeIds])
  const reset = useCallback(() => changeIds(pick.cards), [changeIds, pick.cards])
  const retry = useCallback(() => setFailedKey(null), [])
  const closeCompare = useCallback(() => setCompareOpen(false), [])
  const isPick = sameCards(ids, pick.cards)
  // Known wallets with more cards than the pick that still earn more net: Earnn judged the extra card(s) not worth it.
  const biggerWorthless = useMemo(() => {
    const all = [...strategies.map(s => s.wallet), result.recommendation.wallet, ...result.alternatives,
      ...Object.values(result.top_by_size ?? {}).flat()]
    return pick.cards.length < 3 && all.some(w => w.cards.length > pick.cards.length && w.net_annual_value_aed > pick.net_annual_value_aed + 0.5)
  }, [strategies, result, pick])

  return (
    <div className="ws-root min-h-screen bg-ws-bg font-sans text-ws-fg">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-5 sm:px-8">
        {/* Statement runs have no manual form to edit (pre-filling it is switched off for now) */}
        {request.spend_summary
          ? <span aria-hidden />
          : <Link href="/analyse" className="text-[13px] font-semibold text-ws-primary hover:underline">← Edit my spending</Link>}
      </div>

      <main>
        <ResultSummary wallet={displayWallet} groups={result.spend.groups} ids={ids} isPick={isPick} pick={pick} moreCardsNote={biggerWorthless} monthlySpend={result.spend.eligible_spend_aed} card={card}
          updating={status === 'updating'} onChange={() => setCustomizeOpen(true)} onDetails={setDetailCardId} onAllBenefits={() => setBenefitsOpen(true)}
          onReplace={(id, group) => setReplacing({ id, group })} onRemove={removeCard} onReset={reset}
          plan={<PlaybookBody wallet={displayWallet} groups={result.spend.groups} monthlySpend={result.spend.eligible_spend_aed}
            card={card} updating={status === 'updating'} onDetails={setDetailCardId} hideSummary
            heading={<div>
              <h2 className="font-display text-[22px] font-bold text-ws-fg sm:text-[28px]">How to use these cards</h2>
              <p className="mt-1 text-[14px] text-ws-muted sm:text-[15px]">Which card to swipe for each kind of spending, and how much it earns you.</p>
            </div>} />} />
        <CompareBand wallet={displayWallet} card={card} onCompare={() => setCompareOpen(true)} />
        <Alternatives strategies={strategies} alternatives={result.alternatives} topBySize={result.top_by_size} pick={pick} currentIds={ids} card={card}
          onUse={useStrategy} onDetails={setDetailCardId} />
      </main>

      <p className="border-t border-ws-border px-5 py-3 text-center text-[11px] text-ws-muted sm:px-8">
        Earnn recommends. You decide. Estimates only — always check the bank&apos;s terms.
      </p>
      <div className="h-10" />



      {detailCardId && <CardDetailPopup cardId={detailCardId} onClose={() => setDetailCardId(null)} />}
      {replacing && (
        <ReplaceCardDialog cardScores={result.card_scores ?? []} groups={result.spend.groups} ids={ids}
          replaceId={replacing.id} group={replacing.group} cardName={replacing.id ? card(replacing.id).name : ''}
          onReplace={changeIds} onClose={() => setReplacing(null)} />
      )}
      {customizeOpen && (
        <WalletCustomizeDialog cardScores={result.card_scores ?? []} groups={result.spend.groups} ids={ids}
          wallet={displayWallet} status={status} onChange={changeIds} onRetry={retry} onClose={() => setCustomizeOpen(false)} />
      )}
      {benefitsOpen && ids.length > 0 && <AllBenefitsDialog cardIds={ids} onClose={() => setBenefitsOpen(false)} />}
      {compareOpen && (
        <CompareDialog request={request} smart={current} groups={result.spend.groups} card={card}
          onClose={closeCompare} />
      )}
    </div>
  )
}
