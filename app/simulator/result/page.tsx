'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { fetchCardDetail } from '@/lib/api'
import CardDetailPopup from '@/components/CardDetailPopup'
import {
  evaluateWallet, SimulatorApiError, useSimulatorSession,
  type RecommendResponse, type SimulatorRequest, type Wallet,
} from '@/lib/wallet-simulator/api'
import { MAX_WALLET } from '@/lib/wallet-simulator/groups'
import { sameCards, walletKey } from '@/lib/wallet-simulator/playbook'
import type { CardInfo } from '@/components/wallet-simulator/card-art'
import { WalletDock, WalletFullDialog } from '@/components/wallet-simulator/dock'
import { CompareDialog } from '@/components/wallet-simulator/compare'
import { Alternatives, Details, Discovery, Hero, Ladder, MakeItYours, Playbook, PlaybookBody } from '@/components/wallet-simulator/sections'

export default function SimulatorResultPage() {
  const router = useRouter()
  const session = useSimulatorSession()
  useEffect(() => {
    if (session === null) router.replace('/simulator')
  }, [session, router])
  if (!session) return <div className="ws-root min-h-[60vh] bg-ws-bg" />
  return <SmartWallet request={session.request} result={session.result} />
}

function SmartWallet({ request, result }: { request: SimulatorRequest; result: RecommendResponse }) {
  const pick = result.recommendation.wallet
  const [ids, setIds] = useState<string[]>(pick.cards)
  // Wallets the backend has already calculated, keyed by card set (seeded with the pick + alternatives).
  const [evaluated, setEvaluated] = useState<Record<string, Wallet>>(() =>
    Object.fromEntries([pick, ...result.alternatives].map(w => [walletKey(w.cards), w])))
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [previous, setPrevious] = useState<Wallet | null>(pick) // shown (dimmed) while an update runs
  const [walletFull, setWalletFull] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false) // expanded wallet panel (playbook)
  const [compareOpen, setCompareOpen] = useState(false) // compare against the user's current cards
  const [detailCardId, setDetailCardId] = useState<string | null>(null)
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
    for (const w of [pick, ...result.alternatives, ...Object.values(evaluated)]) {
      for (const pc of w.per_card) put(pc.card_id, pc.card_name, pc.bank_name)
    }
    for (const b of result.discovery_blocks) for (const c of b.cards) put(c.card_id, c.card_name, c.bank_name)
    for (const [id, info] of Object.entries(extraInfo)) put(id, info.name, info.bank)
    return m
  }, [pick, result, evaluated, extraInfo])

  useEffect(() => {
    const known = new Set<string>()
    for (const w of [pick, ...result.alternatives]) w.cards.forEach(id => known.add(id))
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

  const addCard = useCallback((id: string) => {
    if (ids.includes(id)) return
    if (ids.length < MAX_WALLET) changeIds([...ids, id])
    else setWalletFull(true) // the user removes a card first; nothing is replaced for them
  }, [ids, changeIds])
  const removeCard = useCallback((id: string) => changeIds(ids.filter(c => c !== id)), [ids, changeIds])
  const useAlternative = useCallback((w: Wallet) => changeIds(w.cards), [changeIds])
  const reset = useCallback(() => changeIds(pick.cards), [changeIds, pick.cards])
  const retry = useCallback(() => setFailedKey(null), [])
  const closeCompare = useCallback(() => setCompareOpen(false), [])
  const scrollToDiscover = useCallback(() => {
    document.getElementById('discover')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  const isPick = sameCards(ids, pick.cards)

  return (
    <div className="ws-root min-h-screen bg-ws-bg font-sans text-ws-fg">
      {/* keep Earnn's floating feedback button clear of the wallet dock on this page */}
      <style>{`
        body .earnn-feedback-trigger { bottom: calc(var(--ws-dock-h, 96px) + 14px) !important; }
        body .earnn-feedback-panel { bottom: calc(var(--ws-dock-h, 96px) + 90px) !important; }
      `}</style>

      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 pt-5 sm:px-8">
        <Link href="/simulator" className="text-[13px] font-semibold text-ws-primary hover:underline">← Edit my spending</Link>
        <nav className="flex items-center gap-5 text-[13px] font-medium text-ws-muted">
          <a href="#playbook" className="hidden hover:text-ws-fg sm:inline">Playbook</a>
          <a href="#discover" className="hidden hover:text-ws-fg sm:inline">Discover</a>
        </nav>
      </div>

      <main>
        <Hero pick={pick} monthlySpend={result.spend.eligible_spend_aed} card={card} onScrollToWallet={scrollToDiscover} />
        <Ladder bestBySize={result.best_by_size} increments={result.recommendation.increments_annual_aed}
          pickSize={result.recommendation.size} currentIds={ids} card={card} onUse={changeIds} />
        <Playbook onOpen={() => setWalletOpen(true)} wallet={displayWallet} groups={result.spend.groups} card={card} />
        <Discovery blocks={result.discovery_blocks} walletIds={ids} wallet={displayWallet} card={card}
          onAdd={addCard} onRemove={removeCard} onDetails={setDetailCardId} />
        <MakeItYours wallet={displayWallet} groups={result.spend.groups} card={card} onCompare={() => setCompareOpen(true)} />
        <Alternatives alternatives={result.alternatives} pick={pick} currentIds={ids} card={card} onUse={useAlternative} />
        <Details wallet={displayWallet} monthlySpend={result.spend.eligible_spend_aed} card={card} />
      </main>

      <p className="border-t border-ws-border px-5 py-10 text-center text-[12px] text-ws-muted sm:px-8">
        Earnn recommends. You decide. Estimates only — always check the bank&apos;s terms.
      </p>
      <div className="h-32" />

      <WalletDock ids={ids} wallet={displayWallet} pick={pick} isPick={isPick} status={status} card={card}
        onRemove={removeCard} onReset={reset} onRetry={retry} open={walletOpen} onOpenChange={setWalletOpen}>
        <PlaybookBody wallet={displayWallet} groups={result.spend.groups} monthlySpend={result.spend.eligible_spend_aed}
          card={card} updating={status === 'updating'} />
      </WalletDock>

      {detailCardId && <CardDetailPopup cardId={detailCardId} onClose={() => setDetailCardId(null)} />}
      {walletFull && (
        <WalletFullDialog ids={ids} wallet={current} card={card}
          onRemove={id => { removeCard(id); setWalletFull(false) }} onClose={() => setWalletFull(false)} />
      )}
      {compareOpen && (
        <CompareDialog request={request} smart={current} groups={result.spend.groups} card={card}
          onClose={closeCompare} />
      )}
    </div>
  )
}
