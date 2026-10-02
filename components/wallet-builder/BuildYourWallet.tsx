'use client'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { getCardImageUrl } from '@/lib/api'
import CardDetailPopup from '@/components/CardDetailPopup'

// Shared "Build Your Wallet" step. Used by the Analyse results page and by the Wallet Simulator's
// "Open wallet customization" popup — only the inputs (scoredCards / spend / wallet) differ.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoredCard {
  earnn_card_id: string
  card_name: string
  bank_name?: string
  earnn_score: number
  card_ranking: number
  expected_annual_return_aed: number
  true_annual_fee_aed: number
  net_annual_value_aed: number
  free_for_life: boolean
  is_islamic: boolean
  network: string
  card_family?: string | null
  card_summary_tag?: string
  category_monthly_rewards: Record<string, number>
  category_effective_rates: Record<string, number>
}

export interface RouteEntry {
  card_id: string; card_name: string; rate: number; annual_aed: number; monthly_spend_chunk: number
}

export interface WalletEntry {
  n_cards: number; card_ids: string[]
  gross_annual_aed: number; total_fee_aed: number; net_annual_value_aed: number
  effective_rate: number; incremental_vs_prev_aed: number
  category_routing: Record<string, RouteEntry[]>
  top_combinations: Array<{ rank: number; card_ids: string[]; gross_annual_aed: number; total_fee_aed: number; net_annual_value_aed: number }>
}

export interface WalletResponse {
  user_spend: Record<string, number>; total_monthly: number; wallets: WalletEntry[]
}

export interface CustomScore {
  gross_annual_aed: number; total_fee_aed: number
  net_annual_value_aed: number; effective_rate: number
  category_routing: Record<string, RouteEntry[]>
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const CAT_LABELS: Record<string, string> = {
  dining: 'Dining', grocery: 'Grocery', travel: 'Travel', fuel: 'Fuel',
  online: 'Online Shopping', international: 'International', entertainment: 'Entertainment',
  retail: 'Retail', telecom: 'Telecom', transport: 'Transport',
  utility: 'Utilities', education: 'Education', miscellaneous: 'Other Miscellaneous', all_spend: 'All Spends',
  // Wallet Simulator spend groups
  dineout: 'Dining out', food_delivery: 'Food delivery', taxi: 'Taxi', grocery_store: 'Grocery store', grocery_online: 'Online grocery',
}

export const CAT_EMOJI: Record<string, string> = {
  dining: '🍽️', grocery: '🛒', travel: '✈️', fuel: '⛽',
  online: '📦', international: '🌍', entertainment: '🎬',
  retail: '🛍️', telecom: '📱', transport: '🚕',
  utility: '💡', education: '📚', miscellaneous: '🔖',
  dineout: '🍽️', food_delivery: '🛵', taxi: '🚕', grocery_store: '🛒', grocery_online: '📱',
}

export const SPEND_CATS = ['dining','grocery','travel','fuel','online','international',
  'entertainment','retail','telecom','transport','utility','education','miscellaneous']

export const fmt = (n: number) => new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 }).format(n)

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function CardImg({ id, size = 'sm', className = '' }: { id: string; size?: 'sm' | 'lg'; className?: string }) {
  const dims = size === 'lg' ? { w: 220, h: 138 } : { w: 132, h: 82 }
  return (
    <img
      src={getCardImageUrl(id)}
      alt=""
      width={dims.w}
      height={dims.h}
      className={`rounded-xl object-cover shrink-0 ${className}`}
      style={{ width: dims.w, height: dims.h, boxShadow: '0 4px 12px rgba(0,0,0,0.18)' }}
      onError={(e) => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }}
    />
  )
}

export function shortCardName(name: string) {
  return name.replace(/\s+(?:credit\s+card|card)$/i, '')
}

export function playbookLabel(key: string) {
  return key === 'all_spend' ? 'Everyday & Other Spending' : (CAT_LABELS[key] || key)
}

export function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-emerald">{eyebrow}</span>
      <h2 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">{title}</h2>
      <p className="max-w-2xl text-base text-muted-foreground">{subtitle}</p>
    </div>
  )
}

export function BuildYourWallet({ scoredCards, walletData, wallet, setWallet, onBack, onNext, maxCards = 4, nextLabel = 'See my final plan', embedded = false, categories = SPEND_CATS, scoreSource, monthly = false }: {
  scoredCards: ScoredCard[]; walletData: WalletResponse
  wallet: string[]; setWallet: (w: string[]) => void; onBack?: () => void; onNext: () => void
  maxCards?: number
  nextLabel?: string
  /** Inside a popup: the bottom Back/Next row is dropped and the top button uses `nextLabel`. */
  embedded?: boolean
  /** Spend categories offered as filters (default: the Analyse categories). */
  categories?: string[]
  /** When given, the wallet's numbers come from here instead of the Analyse engine's /wallet/custom call. */
  scoreSource?: { score: CustomScore | null; loading: boolean; error: boolean; refresh: () => void }
  /** Show rewards and net value per month instead of per year (the Wallet Simulator). Fees stay annual. */
  monthly?: boolean
}) {
  const per = monthly ? 12 : 1
  const unit = monthly ? '/mo' : '/yr'
  const [q, setQ] = useState('')
  const [detailCardId, setDetailCardId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [ownScore, setPgScore] = useState<CustomScore | null>(null)
  const [ownLoading, setPgLoading] = useState(false)
  const [ownError, setPgError] = useState(false)
  const [spendSplitView, setSpendSplitView] = useState<'card' | 'category'>('card')
  const [refreshTick, setRefreshTick] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const walletRef = useRef(wallet)
  const spendRef = useRef(walletData.user_spend)
  const [cardTags, setCardTags] = useState<Record<string, string>>({})

  useEffect(() => { walletRef.current = wallet }, [wallet])
  useEffect(() => { spendRef.current = walletData.user_spend }, [walletData.user_spend])

  // card_summary_tag is now included in scored_cards — no per-card fetch needed
  useEffect(() => {
    const tags: Record<string, string> = {}
    scoredCards.forEach(c => {
      const tag = c.card_summary_tag
      if (tag) tags[c.earnn_card_id] = tag
    })
    setCardTags(tags)
  }, [scoredCards])

  useEffect(() => {
    if (scoreSource) return                       // numbers are supplied by the caller (Wallet Simulator)
    if (wallet.length === 0) { setPgScore(null); return }
    clearTimeout(debounceRef.current)
    setPgError(false)
    debounceRef.current = setTimeout(() => {
      const ids = walletRef.current
      const spend = spendRef.current
      if (!ids.length) return
      setPgLoading(true)
      fetch('/api/rewards/wallet/custom', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spend, card_ids: ids }),
      })
        .then(res => res.ok ? res.json() : Promise.reject(res.status))
        .then(d => { setPgScore(d); setPgError(false) })
        .catch(() => setPgError(true))
        .finally(() => setPgLoading(false))
    }, 400)
    return () => clearTimeout(debounceRef.current)
  }, [wallet, refreshTick, scoreSource])

  const pgScore = scoreSource ? (wallet.length === 0 ? null : scoreSource.score) : ownScore
  const pgLoading = scoreSource ? scoreSource.loading : ownLoading
  const pgError = scoreSource ? scoreSource.error : ownError
  const refresh = () => (scoreSource ? scoreSource.refresh() : setRefreshTick(t => t + 1))

  // Non-null spend categories for this user
  const activeCatsForFilter = categories.filter(k => (walletData.user_spend[k] ?? 0) > 0)

  // Top 5 cards per active category, keyed by card id → which categories they appear for
  const catTopCards = new Map<string, string[]>() // card_id → [cat keys]
  for (const cat of activeCatsForFilter) {
    const top5 = [...scoredCards]
      .filter(c => (c.category_monthly_rewards[cat] ?? 0) > 0)
      .sort((a, b) => (b.category_monthly_rewards[cat] ?? 0) - (a.category_monthly_rewards[cat] ?? 0))
      .slice(0, 5)
    for (const card of top5) {
      const existing = catTopCards.get(card.earnn_card_id) ?? []
      catTopCards.set(card.earnn_card_id, [...existing, cat])
    }
  }

  // Personalized list: dedup by card_family (keep best card_ranking), sorted by card_ranking
  const personalizedCards = (() => {
    const candidates = scoredCards.filter(c => catTopCards.has(c.earnn_card_id))
    const seenFamilies = new Set<string>()
    const deduped: ScoredCard[] = []
    // candidates already sorted by card_ranking from scoredCards order
    for (const c of candidates) {
      if (c.card_family) {
        if (seenFamilies.has(c.card_family)) continue
        seenFamilies.add(c.card_family)
      }
      deduped.push(c)
    }
    return deduped
  })()

  // Filter: 'Personalized' | a category key | null (search-only, shows all)
  const FILTER_PERSONALIZED = '__personalized__'
  const filterIsPersonalized = activeFilter === FILTER_PERSONALIZED || activeFilter === null

  const filtered = (() => {
    const matchQ = (c: ScoredCard) => !q || c.card_name.toLowerCase().includes(q.toLowerCase()) || (c.bank_name ?? '').toLowerCase().includes(q.toLowerCase())
    if (filterIsPersonalized) return personalizedCards.filter(matchQ)
    // category filter: top 5 for that category, deduped by card_family
    const sorted = [...scoredCards]
      .filter(c => (c.category_monthly_rewards[activeFilter!] ?? 0) > 0 && matchQ(c))
      .sort((a, b) => (b.category_monthly_rewards[activeFilter!] ?? 0) - (a.category_monthly_rewards[activeFilter!] ?? 0))
    const seenFamilies = new Set<string>()
    const deduped: ScoredCard[] = []
    for (const c of sorted) {
      if (c.card_family) {
        if (seenFamilies.has(c.card_family)) continue
        seenFamilies.add(c.card_family)
      }
      deduped.push(c)
      if (deduped.length === 5) break
    }
    return deduped
  })()

  const inWallet = wallet.map(id => scoredCards.find(c => c.earnn_card_id === id)!).filter(Boolean)
  const gross = pgScore?.gross_annual_aed ?? inWallet.reduce((s, c) => s + c.expected_annual_return_aed, 0)
  const fees  = pgScore?.total_fee_aed   ?? inWallet.reduce((s, c) => s + c.true_annual_fee_aed, 0)
  const net   = pgScore?.net_annual_value_aed ?? (gross - fees)
  const totalAnnual = walletData.total_monthly * 12
  const effective = totalAnnual > 0 ? ((gross / totalAnnual) * 100).toFixed(2) : '0.00'
  const alloc = pgScore?.category_routing ?? {}

  const [showAllCards, setShowAllCards] = useState(false)
  const [allQ, setAllQ] = useState('')
  const [allBankFilter, setAllBankFilter] = useState<string | null>(null)
  const allBanks = [...new Set(scoredCards.map(c => c.bank_name ?? '').filter(Boolean))].sort()
  const [warningReady, setWarningReady] = useState(false)

  useEffect(() => {
    setWarningReady(false)
    const t = setTimeout(() => setWarningReady(true), 10000)
    return () => clearTimeout(t)
  }, [wallet.join(',')])

  const toggle = (id: string) => {
    if (wallet.includes(id)) setWallet(wallet.filter(x => x !== id))
    else if (wallet.length < maxCards) setWallet([...wallet, id])
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader
          eyebrow="Advanced"
          title="Build Your Wallet"
          subtitle="Experiment with cards and see how your rewards change in real time."
        />
        <button onClick={onNext} className="inline-flex shrink-0 items-center gap-2 self-start rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:self-auto">
          {nextLabel} →
        </button>
      </div>

      {/* Low-value card warning */}
      {warningReady && pgScore && inWallet.length > 1 && (() => {
        const cardRewards: Record<string, number> = {}
        for (const routes of Object.values(pgScore.category_routing)) {
          for (const r of routes) {
            cardRewards[r.card_id] = (cardRewards[r.card_id] ?? 0) + r.annual_aed
          }
        }
        const totalGross = Object.values(cardRewards).reduce((s, v) => s + v, 0)
        const lowCards = inWallet
          .map(c => ({ c, share: totalGross > 0 ? (cardRewards[c.earnn_card_id] ?? 0) / totalGross : 0 }))
          .filter(({ share }) => share < 0.10)
        if (lowCards.length === 0) return null
        return (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
            <span className="text-lg flex-shrink-0">⚠️</span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                {lowCards.map(({ c }) => c.card_name).join(', ')} {lowCards.length === 1 ? 'is' : 'are'} not adding much value
              </p>
              <p className="mt-0.5 text-xs text-amber-700">
                {lowCards.map(({ c, share }) => `${c.card_name} contributes only ${(share * 100).toFixed(1)}%`).join(' · ')} of your total wallet rewards. Consider swapping {lowCards.length === 1 ? 'it' : 'them'} for a card that better covers your spending.
              </p>
            </div>
          </div>
        )
      })()}

      <div className="grid gap-5 lg:grid-cols-[0.52fr_1fr]">
        {/* Left: available cards */}
        <div className="rounded-3xl border border-border/60 bg-card p-4 shadow-soft flex flex-col">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search cards or issuers"
              className="w-full rounded-full border border-border bg-surface-2 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5 items-center">
            {/* Personalized (default) */}
            {[{ key: FILTER_PERSONALIZED, label: '✦ All Personalized' }, ...activeCatsForFilter.map(k => ({ key: k, label: `${CAT_EMOJI[k]} ${CAT_LABELS[k]}` }))].map(f => {
              const a = activeFilter === f.key || (f.key === FILTER_PERSONALIZED && activeFilter === null)
              return (
                <button key={f.key} onClick={() => setActiveFilter(f.key === FILTER_PERSONALIZED ? null : (activeFilter === f.key ? null : f.key))}
                  className={`flex-auto rounded-full px-3 py-1 text-center text-xs font-medium whitespace-nowrap transition ${
                    a ? 'bg-primary text-primary-foreground' : 'bg-surface-2 text-muted-foreground hover:text-foreground'
                  }`}>
                  {f.label}
                </button>
              )
            })}
          </div>

          <ul className="mt-4 grid flex-1 min-h-0 gap-2 overflow-y-auto pr-1">
            {[...filtered].sort((a, b) => {
              const aIn = wallet.includes(a.earnn_card_id) ? 0 : 1
              const bIn = wallet.includes(b.earnn_card_id) ? 0 : 1
              return aIn - bIn
            }).map(c => {
              const inW = wallet.includes(c.earnn_card_id)
              const limit = !inW && wallet.length >= maxCards
              // For personalized view use catTopCards; for category filter derive from activeFilter
              const cardCats = filterIsPersonalized
                ? (catTopCards.get(c.earnn_card_id) ?? [])
                : (activeFilter ? [activeFilter] : [])
              return (
                <li key={c.earnn_card_id} className="relative rounded-xl border border-border/60 px-2.5 py-2">
                  <div className="flex items-start gap-2.5 pr-10">
                    <CardImg id={c.earnn_card_id} size="sm" className="flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <button onClick={() => setDetailCardId(c.earnn_card_id)} className="truncate font-semibold text-sm text-primary max-w-[240px] text-left hover:underline underline-offset-2 bg-transparent border-none p-0 cursor-pointer">{c.card_name}</button>
                      <div className="mt-1 flex items-center gap-1 text-[10px]">
                        <span className="text-muted-foreground">Fee {fmt(c.true_annual_fee_aed)}</span>
                        <span className="text-muted-foreground/40">·</span>
                        <span className="text-muted-foreground">Est Reward </span>
                        <span className="font-medium text-emerald">{fmt(c.expected_annual_return_aed / per)}{unit}</span>
                      </div>
                      <div className="mt-1 flex flex-nowrap gap-1 overflow-hidden">
                        {Object.entries(c.category_effective_rates)
                          .filter(([, rate]) => rate > 0)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 4)
                          .map(([cat, rate]) => (
                            <span key={cat} className="inline-flex items-center gap-0.5 rounded-md bg-surface-2 px-1.5 py-px text-[10px] text-muted-foreground whitespace-nowrap">
                              {CAT_EMOJI[cat] || CAT_LABELS[cat] || cat} <span className="font-semibold text-primary">{(rate * 100).toFixed(1)}%</span>
                            </span>
                          ))}
                      </div>
                      {cardTags[c.earnn_card_id] && (
                        <div className="mt-1">
                          <span className="flex items-center rounded-full bg-[#EEF3FF] px-2 py-px text-[10px] font-medium text-[#0E3785] w-full">
                            {cardTags[c.earnn_card_id]}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* + button — right, vertically centered */}
                  <div className="absolute right-2 top-[60%] -translate-y-1/2 group z-10 hover:z-[200]">
                    <button onClick={() => toggle(c.earnn_card_id)} disabled={limit}
                      className={`grid h-6 w-6 place-items-center rounded-full transition text-xs font-bold ${
                        inW ? 'bg-emerald text-white hover:opacity-90'
                          : limit ? 'cursor-default bg-muted text-muted-foreground'
                          : 'bg-[#0A2560] text-white hover:opacity-90'
                      }`}>
                      {inW ? '✓' : '+'}
                    </button>
                    {limit && (
                      <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover:block z-[300]">
                        <div className="rounded-xl bg-[#0D1828] px-3 py-2 text-[11px] text-white shadow-lg w-44 leading-snug">
                          <span className="font-semibold">Wallet maxed out.</span> Remove an existing card to add a new one.
                        </div>
                      </div>
                    )}
                  </div>
                  {/* Category pills — top right */}
                  {cardCats.length > 0 && (
                    <div className="absolute top-2.5 right-2.5 flex flex-wrap justify-end gap-1 max-w-[120px]">
                      {cardCats.map(cat => (
                        <span key={cat} className="inline-flex items-center gap-0.5 rounded-full bg-[#EEF3FF] px-1.5 py-px text-[9px] font-medium text-[#0E3785]">
                          {CAT_EMOJI[cat]} {CAT_LABELS[cat]}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
            {filtered.length === 0 && (
              <li className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No cards match your filters.
              </li>
            )}
          </ul>
          <button onClick={() => { setShowAllCards(true); setAllQ(''); setAllBankFilter(null) }}
            className="mt-3 w-full rounded-full border border-primary px-3 py-2 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground transition">
            + Add from All UAE Cards
          </button>
        </div>

        {/* Right: wallet */}
        <div className="flex flex-col gap-4 self-start">
            <div className="overflow-hidden rounded-3xl bg-primary p-6 text-primary-foreground shadow-card">
              <div className="flex items-center justify-between text-xs uppercase tracking-wider text-primary-foreground/70">
                <span>💳 Your wallet</span>
                <div className="flex items-center gap-2">
                  <span>{wallet.length} / {maxCards}{pgLoading ? ' · calculating…' : ''}</span>
                  {(pgError || (!pgLoading && !pgScore && wallet.length > 0)) && (
                    <button onClick={refresh}
                      className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary-foreground/25 transition-colors">
                      ↻ Refresh
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xs text-primary-foreground/70">{monthly ? 'Net monthly value' : 'Net annual value'}</div>
                <div className="font-display text-4xl font-bold tabular">{pgScore ? `AED ${fmt(Math.max(net, 0) / per)}` : 'AED XX,XXX'}</div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                {[{ l: monthly ? 'Gross / mo' : 'Gross', v: pgScore ? `AED ${fmt(gross / per)}` : 'AED XX,XXX' }, { l: monthly ? 'Annual fees' : 'Fees', v: pgScore ? `AED ${fmt(fees)}` : 'AED XX,XXX' }, { l: 'Effective', v: pgScore ? `${effective}%` : 'X.XX%' }].map(st => (
                  <div key={st.l} className="rounded-xl bg-primary-foreground/10 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-primary-foreground/70">{st.l}</div>
                    <div className="mt-0.5 font-display text-sm font-bold tabular text-primary-foreground">{st.v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex -space-x-3">
                {inWallet.map(c => (
                  <div key={c.earnn_card_id} className="relative">
                    <CardImg id={c.earnn_card_id} size="sm" className="ring-2 ring-primary" />
                    <button onClick={() => toggle(c.earnn_card_id)}
                      className="absolute -top-1 -left-1 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-white text-[10px] font-bold shadow hover:bg-red-600 transition z-10">
                      −
                    </button>
                  </div>
                ))}
                {inWallet.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-primary-foreground/30 px-4 py-3 text-xs text-primary-foreground/70">
                    Add cards from the left to start.
                  </div>
                )}
              </div>
            </div>

          {/* Spend split */}
          <div className="rounded-3xl border border-border/60 bg-card shadow-soft flex flex-col min-h-0 flex-1">
            <div className="flex-shrink-0 flex items-center justify-between gap-3 text-sm font-semibold text-primary px-5 py-4 border-b border-border/60 rounded-t-3xl bg-card">
              <span>💳 Spend Split by Card</span>
              <div role="tablist" aria-label="Spend split view" style={{ display: 'flex', gap: 2, padding: 3, borderRadius: 9, background: '#EEF3FF', flexShrink: 0 }}>
                {[
                  { id: 'card' as const, label: 'Card view' },
                  { id: 'category' as const, label: 'Category view' },
                ].map(view => {
                  const selected = spendSplitView === view.id
                  return <button key={view.id} type="button" role="tab" aria-selected={selected} onClick={() => setSpendSplitView(view.id)} style={{
                    border: 'none', borderRadius: 6, padding: '5px 7px', cursor: 'pointer', fontSize: 10, fontWeight: 700,
                    background: selected ? '#FFFFFF' : 'transparent', color: selected ? '#0E3785' : '#5A6A85',
                    boxShadow: selected ? '0 1px 3px rgba(14,55,133,0.12)' : 'none',
                  }}>{view.label}</button>
                })}
              </div>
            </div>
            <div className="p-5 pt-4 overflow-y-auto flex-1">
              {wallet.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add cards to your wallet to see category allocation.</p>
              ) : !pgScore ? (
                <p className="text-sm text-muted-foreground">{pgLoading ? 'Calculating…' : 'Select cards to see allocation.'}</p>
              ) : (() => {
                const userSpend = walletData.user_spend
                const totalMonthlyRewards = Math.round(pgScore.gross_annual_aed / 12)

                // Category view and card view deliberately share the exact same
                // live custom-wallet routing response.
                const categoryData = Object.entries(pgScore.category_routing)
                  .map(([key, routes]) => {
                    const earningRoutes = routes.filter(route => route.annual_aed > 0 && route.monthly_spend_chunk > 0)
                    return {
                      key,
                      routes: earningRoutes,
                      monthlySpend: earningRoutes.reduce((sum, route) => sum + route.monthly_spend_chunk, 0),
                      monthlyReward: earningRoutes.reduce((sum, route) => sum + route.annual_aed, 0) / 12,
                    }
                  })
                  .filter(category => category.routes.length > 0)
                  .sort((a, b) => b.monthlySpend - a.monthlySpend || b.monthlyReward - a.monthlyReward)

                if (spendSplitView === 'category') {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {categoryData.map(category => {
                        const label = playbookLabel(category.key)
                        const isSplit = category.routes.length > 1
                        return (
                          <section key={category.key} style={{ border: '1px solid #D6E0F5', borderRadius: 14, overflow: 'hidden', background: '#FFFFFF' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', background: '#F7F9FF', borderBottom: '1px solid #E6EEFC' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                <span style={{ width: 28, height: 28, display: 'grid', placeItems: 'center', borderRadius: 8, background: '#E9F0FF', fontSize: 15, flexShrink: 0 }}>{CAT_EMOJI[category.key] || '💳'}</span>
                                <span style={{ minWidth: 0, fontSize: 13, fontWeight: 700, color: '#0D1828' }}>{label}</span>
                              </div>
                              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <div style={{ fontSize: 9, color: '#7485A3', fontWeight: 700 }}>CATEGORY SPEND</div>
                                <div style={{ marginTop: 1, fontSize: 12, color: '#0D1828', fontWeight: 700 }}>AED {fmt(category.monthlySpend)} / mo</div>
                              </div>
                            </div>

                            <div style={{ padding: '3px 12px 9px' }}>
                              {category.routes.map((route, index) => {
                                const card = scoredCards.find(sc => sc.earnn_card_id === route.card_id)
                                const routeLabel = index === 0
                                  ? (isSplit ? `First AED ${fmt(route.monthly_spend_chunk)} / month` : 'Use this card')
                                  : index === category.routes.length - 1
                                    ? `Remaining AED ${fmt(route.monthly_spend_chunk)} / month`
                                    : `Next AED ${fmt(route.monthly_spend_chunk)} / month`
                                return (
                                  <div key={`${route.card_id}-${index}`}>
                                    {index > 0 && <div style={{ margin: '6px 0 3px' }}>
                                      <div style={{ padding: '4px 7px', borderRadius: 6, background: '#FFF7E3', border: '1px solid #FDE2A2', color: '#A85A00', fontSize: 9, fontWeight: 800, letterSpacing: '0.05em' }}>REWARD CAPPING REACHED</div>
                                      <div style={{ marginTop: 4, color: '#0E3785', fontSize: 11, fontWeight: 800 }}>↓ Then switch to</div>
                                    </div>}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center', padding: '8px 0' }}>
                                      <div style={{ minWidth: 0 }}>
                                        <div style={{ fontSize: 9, color: '#7485A3', letterSpacing: '0.06em', fontWeight: 700, textTransform: 'uppercase' }}>{routeLabel}</div>
                                        <div style={{ marginTop: 3, fontSize: 13, color: '#0D1828', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortCardName(card?.card_name ?? route.card_name ?? route.card_id)}</div>
                                        {card?.bank_name && <div style={{ marginTop: 1, fontSize: 10, color: '#5A6A85' }}>{card.bank_name}</div>}
                                      </div>
                                      <div style={{ paddingLeft: 10, borderLeft: '1px solid #E6EEFC', textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{ fontSize: 9, color: '#7485A3', fontWeight: 700 }}>YOU COULD EARN</div>
                                        <div style={{ marginTop: 2, fontSize: 14, color: '#00A67E', fontWeight: 700 }}>AED {fmt(Math.round(route.annual_aed / 12))}</div>
                                        <div style={{ fontSize: 9, color: '#7485A3' }}>/ month</div>
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>

                            {isSplit && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 12px', background: '#F0FBF7', borderTop: '1px solid #D6F2E6' }}>
                              <span style={{ fontSize: 11, color: '#287257', fontWeight: 700 }}>Total {label} rewards</span>
                              <span style={{ fontSize: 13, color: '#00A67E', fontWeight: 700 }}>AED {fmt(Math.round(category.monthlyReward))} / month</span>
                            </div>}
                          </section>
                        )
                      })}
                    </div>
                  )
                }

                // Build per-card view from routing
                const cardData = wallet.map(cardId => {
                  const sc = scoredCards.find(c => c.earnn_card_id === cardId)
                  type CatEntry = { key: string; route: RouteEntry; isCapped: boolean }
                  const catEntries: CatEntry[] = []
                  for (const [catKey, routes] of Object.entries(pgScore.category_routing)) {
                    const idx = routes.findIndex(r => r.card_id === cardId)
                    if (idx === -1) continue
                    const route = routes[idx]
                    if (route.annual_aed <= 0) continue
                    catEntries.push({ key: catKey, route, isCapped: routes.length > 1 && idx === 0 })
                  }
                  catEntries.sort((a, b) => b.route.annual_aed - a.route.annual_aed || (CAT_LABELS[a.key] ?? a.key).localeCompare(CAT_LABELS[b.key] ?? b.key))
                  const totalMonthly = Math.round(catEntries.reduce((s, e) => s + e.route.annual_aed, 0) / 12)
                  const totalSpendOnCard = Math.round(catEntries.reduce((s, e) => s + e.route.monthly_spend_chunk, 0))
                  const topCats = catEntries.slice(0, 2).map(e => CAT_LABELS[e.key]).join(' & ')
                  const sharePct = totalMonthlyRewards > 0 ? Math.round((totalMonthly / totalMonthlyRewards) * 100) : 0
                  return { cardId, sc, catEntries, totalMonthly, totalSpendOnCard, topCats, sharePct }
                }).filter(d => d.catEntries.length > 0)
                  // highest-earning card first; ties in alphabetical order
                  .sort((a, b) => b.totalMonthly - a.totalMonthly || (a.sc?.card_name ?? a.cardId).localeCompare(b.sc?.card_name ?? b.cardId))

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {cardData.map(({ cardId, sc, catEntries, totalMonthly, totalSpendOnCard, topCats, sharePct }) => (
                      <div key={cardId} style={{ border: '1px solid #D6E0F5', borderRadius: 14, overflow: 'hidden', background: 'white' }}>

                        {/* Header: card name + best-for badge */}
                        <div style={{ padding: '12px 18px', borderBottom: '1px solid #EEF3FF', display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1828' }}>{sc?.card_name ?? cardId}</div>
                          {topCats && (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FFF8E6', border: '1px solid #FDDEA0', borderRadius: 20, padding: '3px 10px', flexShrink: 0 }}>
                              <span style={{ fontSize: 10 }}>⭐</span>
                              <span style={{ fontSize: 10, fontWeight: 600, color: '#92600A' }}>Best for {topCats}</span>
                            </div>
                          )}
                        </div>

                        {/* Category rows — full width */}
                        <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column' }}>
                          {catEntries.map(({ key, route, isCapped }, i) => {
                            const monthlyReward = Math.round(route.annual_aed / 12)
                            const spendChunk = route.monthly_spend_chunk
                            const totalCatSpend = userSpend[key] ?? 0
                            return (
                              <div key={key} style={{ display: 'grid', gridTemplateColumns: '34px 1fr auto', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid #F0F4FF' : 'none' }}>
                                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EEF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                                  {CAT_EMOJI[key] || '💳'}
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0D1828' }}>
                                      {CAT_LABELS[key]}{!isCapped && totalCatSpend > spendChunk ? ' (after cap)' : ''}
                                    </span>
                                    {isCapped && (
                                      <span style={{ fontSize: 9, fontWeight: 700, background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.04em' }}>CAPPING HIT</span>
                                    )}
                                  </div>
                                  <div style={{ fontSize: 10, color: '#5A6A85' }}>
                                    Spent: AED {fmt(spendChunk)}{totalCatSpend > spendChunk ? ` / AED ${fmt(totalCatSpend)}` : ''} ({totalCatSpend > 0 ? Math.round((spendChunk / totalCatSpend) * 100) : 100}% of spend)

                                  </div>
                                </div>
                                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                  <div style={{ fontSize: 10, color: '#9DAEC8', fontWeight: 600, marginBottom: 1 }}>Reward</div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: '#00A67E' }}>AED {fmt(monthlyReward)}</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Footer */}
                        <div style={{ borderTop: '1px solid #EEF3FF', padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 14, background: '#FAFBFF' }}>
                          <span style={{ fontSize: 11, color: '#5A6A85', fontWeight: 600 }}>Total spent on this card</span>
                          <span style={{ fontSize: 12, color: '#0D1828', fontWeight: 700 }}>AED {fmt(totalSpendOnCard)} / month</span>
                          <div style={{ width: 1, background: '#D6E0F5', alignSelf: 'stretch', margin: '0 2px' }} />
                          <span style={{ fontSize: 11, color: '#5A6A85', fontWeight: 600 }}>Total reward</span>
                          <span style={{ fontSize: 13, color: '#00A67E', fontWeight: 700 }}>AED {fmt(totalMonthly)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          </div>
        </div>
      </div>

      {!embedded && onBack && <NavRow onBack={onBack} onNext={onNext} nextLabel={nextLabel} />}


      {/* All UAE Cards modal */}
      {showAllCards && createPortal(
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowAllCards(false)}>
          <div className="w-full max-w-2xl rounded-3xl bg-background shadow-elevated flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/60">
              <div>
                <div className="font-display text-lg font-bold text-primary">All UAE Cards</div>
                <div className="text-xs text-muted-foreground mt-0.5">{scoredCards.length} cards · click + to add to wallet</div>
              </div>
              <button onClick={() => setShowAllCards(false)} className="grid h-8 w-8 place-items-center rounded-full bg-muted text-foreground hover:bg-muted/70 text-sm">✕</button>
            </div>
            {/* Search + bank filter */}
            <div className="px-5 pt-3 pb-2 flex gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
                <input value={allQ} onChange={e => setAllQ(e.target.value)} placeholder="Search cards or issuers"
                  className="w-full rounded-full border border-border bg-surface-2 py-2 pl-10 pr-4 text-sm outline-none focus:border-emerald" />
              </div>
              <select value={allBankFilter ?? ''} onChange={e => setAllBankFilter(e.target.value || null)}
                className="flex-1 rounded-full border border-border bg-surface-2 px-4 py-2 text-sm text-foreground outline-none focus:border-emerald">
                <option value="">All Banks</option>
                {allBanks.map(bank => <option key={bank} value={bank}>{bank}</option>)}
              </select>
            </div>
            {/* Card list */}
            <ul className="flex-1 overflow-y-auto px-5 pb-5 space-y-2 mt-1">
              {scoredCards
                .filter(c => {
                  const matchQ = !allQ || c.card_name.toLowerCase().includes(allQ.toLowerCase()) || (c.bank_name ?? '').toLowerCase().includes(allQ.toLowerCase())
                  const matchB = !allBankFilter || c.bank_name === allBankFilter
                  return matchQ && matchB
                })
                .map(c => {
                  const inW = wallet.includes(c.earnn_card_id)
                  const full = !inW && wallet.length >= maxCards
                  return (
                    <li key={c.earnn_card_id} className="flex items-center gap-3 rounded-2xl border border-border/60 p-3">
                      <CardImg id={c.earnn_card_id} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-sm text-primary">{c.card_name}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{c.bank_name}</span>
                          <span>·</span>
                          <span>Fee AED {fmt(c.true_annual_fee_aed)}</span>
                          <span className="text-emerald">+AED {fmt(c.expected_annual_return_aed / per)}{unit}</span>
                        </div>
                      </div>
                      <div className="relative flex-shrink-0 group/add">
                      <button onClick={() => { if (!inW && !full) { toggle(c.earnn_card_id); setShowAllCards(false) } else if (inW) toggle(c.earnn_card_id) }}
                        className={`grid h-8 w-8 place-items-center rounded-full transition text-sm font-bold ${
                          inW ? 'bg-emerald text-white hover:opacity-90'
                            : full ? 'cursor-pointer bg-muted text-muted-foreground'
                            : 'bg-primary text-primary-foreground hover:opacity-90'
                        }`}>
                        {inW ? '✓' : '+'}
                      </button>
                      {full && (
                        <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-48 rounded-xl border border-border bg-card px-3 py-2 text-[11px] text-foreground shadow-lg opacity-0 group-hover/add:opacity-100 transition-opacity z-50">
                          Wallet Max out. Remove an existing card to add new card.
                        </div>
                      )}
                      </div>
                    </li>
                  )
                })}
            </ul>
          </div>
        </div>,
        document.body
      )}
      {detailCardId && <CardDetailPopup cardId={detailCardId} onClose={() => setDetailCardId(null)} />}
    </section>
  )
}

function NavRow({ onBack, onNext, nextLabel }: { onBack: () => void; onNext: () => void; nextLabel: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
      <button onClick={onBack} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground transition hover:bg-surface-2">
        ← Back
      </button>
      <button onClick={onNext} className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
        {nextLabel} →
      </button>
    </div>
  )
}
