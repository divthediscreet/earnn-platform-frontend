'use client'

// "Add to Wallet" bar for the All UAE Cards page. It is the Analyze result page's wallet (SmartWallet in
// app/analyse/result/page.tsx) with nothing new in it: the same backend calls (recommend for the Earnn pick, evaluate for
// the user's own card set), the same evaluation / caching / "dimmed while updating" logic, and the same WalletDock,
// PlaybookBody ("Which card should I use?") and GetCardsDialog components. The only difference is how cards are added:
// the page's tiles add and remove them (up to 3) instead of Analyze's customise dialog.
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  evaluateWallet, recommendWallet, SimulatorApiError,
  type RecommendResponse, type RewardMode, type SimulatorRequest, type Wallet,
} from '@/lib/wallet-simulator/api'
import { sameCards, walletKey } from '@/lib/wallet-simulator/playbook'
import type { CardInfo } from '@/components/wallet-simulator/card-art'
import { WalletDock } from '@/components/wallet-simulator/dock'
import { PlaybookBody } from '@/components/wallet-simulator/sections'
import { GetCardsDialog } from '@/components/wallet-simulator/get-cards'
import { RewardModeProvider } from '@/lib/wallet-simulator/reward-mode'
import CardDetailPopup from '@/components/CardDetailPopup'

type Props = {
  request: SimulatorRequest
  mode: RewardMode
  /** The cards in the wallet (owned by the page, so its tiles can show "In wallet"). */
  ids: string[]
  onIdsChange: (ids: string[]) => void
  /** Names for cards the simulator response does not mention (the page's own card list). */
  directory: Map<string, CardInfo>
  /** The dock's empty "+" slots: take the user back to the card list. */
  onAddMore: () => void
}

export default function CompareWallet(props: Props) {
  const [result, setResult] = useState<RecommendResponse | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // The Earnn pick, spend groups and card fees: the same recommend call Analyze makes when the form is submitted.
  useEffect(() => {
    setResult(null)
    setFailed(false)
    const controller = new AbortController()
    recommendWallet(props.request, controller.signal)
      .then(setResult)
      .catch(e => { if ((e as Error).name !== 'AbortError') setFailed(true) })
    return () => controller.abort()
  }, [props.request, attempt])

  if (!result) {
    return (
      <div className="ws-root">
        <div className="fixed inset-x-0 bottom-0 z-[900] border-t border-[#E9C46A]/50 bg-gradient-to-b from-[#FFF9EA]/95 to-[#FBEFCF]/95 px-5 py-4 text-center text-[13px] font-semibold text-ws-primary shadow-ws-dock backdrop-blur-xl">
          {failed
            ? <>We couldn&apos;t build your wallet. <button onClick={() => setAttempt(n => n + 1)} className="ml-2 rounded-full bg-ws-ink px-3 py-1 text-[11px] font-semibold text-ws-ink-fg">Try again</button></>
            : <span className="ws-animate-pulse">Preparing your wallet…</span>}
        </div>
      </div>
    )
  }
  return (
    <RewardModeProvider mode={props.mode}>
      <WalletBar {...props} result={result} />
    </RewardModeProvider>
  )
}

function WalletBar({ request, ids, onIdsChange, directory: pageDirectory, onAddMore, result }: Props & { result: RecommendResponse }) {
  // as in SmartWallet: the recommended strategy is the pick; the engine's own pick is the fallback
  const strategies = useMemo(() => result.strategies ?? [], [result.strategies])
  const pick = strategies[0]?.wallet ?? result.recommendation.wallet
  // Wallets the backend has already calculated, keyed by card set (seeded with the pick + alternatives).
  const [evaluated, setEvaluated] = useState<Record<string, Wallet>>(() =>
    Object.fromEntries([pick, ...strategies.map(s => s.wallet), result.recommendation.wallet, ...result.alternatives]
      .reverse().map(w => [walletKey(w.cards), w])))
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [previous, setPrevious] = useState<Wallet | null>(null) // shown (dimmed) while an update runs
  const [walletOpen, setWalletOpen] = useState(false) // expanded wallet panel (playbook)
  const [detailCardId, setDetailCardId] = useState<string | null>(null) // card-information popup
  const [getOpen, setGetOpen] = useState(false) // "Get these cards" (final plan) popup

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

  // keep the last calculated wallet to show (dimmed) while the next one is being calculated
  useEffect(() => { if (current) setPrevious(current) }, [current])

  const directory = useMemo(() => {
    const m = new Map<string, CardInfo>()
    const put = (id: string, name: string, bank: string | null) => { if (!m.has(id)) m.set(id, { id, name, bank }) }
    for (const w of [pick, result.recommendation.wallet, ...strategies.map(st => st.wallet), ...result.alternatives, ...Object.values(evaluated)]) {
      for (const pc of w.per_card) put(pc.card_id, pc.card_name, pc.bank_name)
    }
    for (const c of result.card_scores ?? []) put(c.card_id, c.card_name, c.bank_name)
    for (const [id, info] of pageDirectory) put(id, info.name, info.bank)
    return m
  }, [pick, result, strategies, evaluated, pageDirectory])
  const card = useCallback((id: string): CardInfo => directory.get(id) ?? { id, name: id, bank: null }, [directory])

  const changeIds = useCallback((next: string[]) => {
    setPrevious(displayWallet)
    setFailedKey(null)
    onIdsChange(next)
  }, [displayWallet, onIdsChange])
  const removeCard = useCallback((id: string) => changeIds(ids.filter(c => c !== id)), [ids, changeIds])
  const reset = useCallback(() => changeIds(pick.cards), [changeIds, pick.cards])
  const retry = useCallback(() => setFailedKey(null), [])
  const isPick = sameCards(ids, pick.cards)

  if (ids.length === 0) return null
  return (
    <div className="ws-root">
      {/* keep Earnn's floating feedback button clear of the wallet dock (as on the Analyze result page) */}
      <style>{`
        body .earnn-feedback-trigger { bottom: calc(var(--ws-dock-h, 96px) + 14px) !important; }
        body .earnn-feedback-panel { bottom: calc(var(--ws-dock-h, 96px) + 90px) !important; }
      `}</style>
      <WalletDock ids={ids} wallet={displayWallet} pick={pick} isPick={isPick} status={status} card={card}
        onRemove={removeCard} onAdd={onAddMore} onGetCards={() => setGetOpen(true)} onReset={reset} onRetry={retry} open={walletOpen} onOpenChange={setWalletOpen}>
        <PlaybookBody wallet={displayWallet} groups={result.spend.groups} monthlySpend={result.spend.eligible_spend_aed}
          card={card} updating={status === 'updating'} onDetails={setDetailCardId} />
      </WalletDock>

      {detailCardId && <CardDetailPopup cardId={detailCardId} mode={request.reward_mode} onClose={() => setDetailCardId(null)} />}
      {getOpen && displayWallet && (
        <GetCardsDialog wallet={displayWallet} groups={result.spend.groups} cardScores={result.card_scores ?? []} card={card}
          onDetails={setDetailCardId} onClose={() => setGetOpen(false)} />
      )}
    </div>
  )
}
