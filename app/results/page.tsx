'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCardImageUrl, getOptimalWallet, fetchCardDetail } from '@/lib/api'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoredCard {
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

interface RouteEntry {
  card_id: string; card_name: string; rate: number; annual_aed: number; monthly_spend_chunk: number
}

interface WalletEntry {
  n_cards: number; card_ids: string[]
  gross_annual_aed: number; total_fee_aed: number; net_annual_value_aed: number
  effective_rate: number; incremental_vs_prev_aed: number
  category_routing: Record<string, RouteEntry[]>
  top_combinations: Array<{ rank: number; card_ids: string[]; gross_annual_aed: number; total_fee_aed: number; net_annual_value_aed: number }>
}

interface WalletResponse {
  user_spend: Record<string, number>; total_monthly: number; wallets: WalletEntry[]
}

interface CustomScore {
  gross_annual_aed: number; total_fee_aed: number
  net_annual_value_aed: number; effective_rate: number
  category_routing: Record<string, RouteEntry[]>
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CAT_LABELS: Record<string, string> = {
  dining: 'Dining', grocery: 'Grocery', travel: 'Travel', fuel: 'Fuel',
  online: 'Online Shopping', international: 'International', entertainment: 'Entertainment',
  retail: 'Retail', telecom: 'Telecom', transport: 'Transport',
  utility: 'Utilities', education: 'Education', miscellaneous: 'Other Miscellaneous', all_spend: 'All Spends',
}

const CAT_EMOJI: Record<string, string> = {
  dining: '🍽️', grocery: '🛒', travel: '✈️', fuel: '⛽',
  online: '📦', international: '🌍', entertainment: '🎬',
  retail: '🛍️', telecom: '📱', transport: '🚕',
  utility: '💡', education: '📚', miscellaneous: '🔖',
}

const CAT_BADGE: Record<string, string> = {
  dining: 'Best for food & dining', grocery: 'Top grocery cashback',
  travel: 'Best for travel rewards', fuel: 'Best petrol card',
  online: 'Best for online spend', international: 'No FX fee leader',
  entertainment: 'Best entertainment card', retail: 'Best retail card',
  telecom: 'Best for bills', transport: 'Best commuter card',
  utility: 'Best for utilities', education: 'Best for school fees',
  miscellaneous: 'Strong everyday rate',
}

const SPEND_CATS = ['dining','grocery','travel','fuel','online','international',
  'entertainment','retail','telecom','transport','utility','education','miscellaneous']

const PLAYGROUND_FILTERS = ['Cashback', 'Travel', 'No annual fee', 'Islamic', 'Premium', 'Dining', 'Fuel', 'Online']

const fmt = (n: number) => new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 }).format(n)

// ─── Card image ───────────────────────────────────────────────────────────────

function CardImg({ id, size = 'sm', className = '' }: { id: string; size?: 'sm' | 'lg'; className?: string }) {
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

// ─── Card row ─────────────────────────────────────────────────────────────────

function CardFan({ cardIds, names, size = 'lg' }: { cardIds: string[]; names?: string[]; size?: 'sm' | 'lg' }) {
  const n = cardIds.length
  if (n === 0) return null

  const { w, h } = size === 'lg' ? { w: 220, h: 138 } : { w: 132, h: 82 }
  const colGap = Math.round(w * 0.78)   // horizontal step — ~22% overlap
  const rowGap = Math.round(h * 0.80)   // vertical step   — ~20% overlap

  // Fixed "random-looking" offsets + rotations per slot (top-left, top-right, bottom-left, bottom-right)
  const slots = [
    { col: 0, row: 0, rot: -6,  dx:  4, dy:  6 },
    { col: 1, row: 0, rot:  4,  dx: -6, dy:  0 },
    { col: 0, row: 1, rot:  3,  dx:  8, dy: -4 },
    { col: 1, row: 1, rot: -5,  dx: -4, dy:  6 },
  ]

  const containerW = colGap + w + 24
  const containerH = rowGap + h + 24

  return (
    <div style={{ position: 'relative', width: containerW, height: containerH, flexShrink: 0 }}>
      {cardIds.slice(0, 4).map((id, i) => {
        const s = slots[i]
        return (
          <div key={id} style={{
            position: 'absolute',
            left: s.col * colGap + s.dx,
            top:  s.row * rowGap + s.dy,
            transform: `rotate(${s.rot}deg)`,
            transformOrigin: 'center center',
            zIndex: i,
          }}>
            <CardImg id={id} size={size} />
          </div>
        )
      })}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cardName(id: string, cards: ScoredCard[]) {
  return cards.find(c => c.earnn_card_id === id)?.card_name ?? id
}

type WalletCategoryEntry = { key: string; route: RouteEntry; isCapped: boolean }

type WalletCardSummary = {
  cardId: string
  sc: ScoredCard | undefined
  catEntries: WalletCategoryEntry[]
  totalMonthly: number
  totalSpendOnCard: number
  topCats: string
  sharePct: number
}

function buildWalletCardSummaries(rec: WalletEntry, scoredCards: ScoredCard[]): WalletCardSummary[] {
  const totalMonthlyRewards = Math.round(rec.gross_annual_aed / 12)

  return rec.card_ids.map(cardId => {
    const sc = scoredCards.find(c => c.earnn_card_id === cardId)
    const catEntries: WalletCategoryEntry[] = []
    for (const [catKey, routes] of Object.entries(rec.category_routing)) {
      const idx = routes.findIndex(r => r.card_id === cardId)
      if (idx === -1) continue
      const route = routes[idx]
      if (route.annual_aed <= 0) continue
      catEntries.push({ key: catKey, route, isCapped: routes.length > 1 && idx === 0 })
    }
    catEntries.sort((a, b) => b.route.annual_aed - a.route.annual_aed)
    const totalMonthly = Math.round(catEntries.reduce((sum, entry) => sum + entry.route.annual_aed, 0) / 12)
    const totalSpendOnCard = Math.round(catEntries.reduce((sum, entry) => sum + entry.route.monthly_spend_chunk, 0))
    const topCats = catEntries.slice(0, 2).map(entry => CAT_LABELS[entry.key]).join(' & ')
    const sharePct = totalMonthlyRewards > 0 ? Math.round((totalMonthly / totalMonthlyRewards) * 100) : 0
    return { cardId, sc, catEntries, totalMonthly, totalSpendOnCard, topCats, sharePct }
  })
}

function shortCardName(name: string) {
  return name.replace(/\s+(?:credit\s+card|card)$/i, '')
}

function heroRole(categories: WalletCategoryEntry[]) {
  const labels = categories.slice(0, 2).map(({ key }) => key === 'all_spend' ? 'Everything else' : CAT_LABELS[key])
  return labels.join(' & ') || 'Your spending'
}

function calcCoverage(cardIds: string[], scoredCards: ScoredCard[], userSpend: Record<string, number>, total: number) {
  if (total <= 0) return 0
  const cards = scoredCards.filter(c => cardIds.includes(c.earnn_card_id))
  let covered = 0
  for (const cat of SPEND_CATS) {
    const spend = userSpend[cat] ?? 0
    if (spend <= 0) continue
    const anyCardCovers = cards.some(c => (c.category_effective_rates[cat] ?? 0) > 0)
    if (anyCardCovers) covered += spend
  }
  return Math.round((covered / total) * 100)
}

function topCategories(userSpend: Record<string, number>, n: number) {
  return SPEND_CATS.filter(k => (userSpend[k] ?? 0) > 0)
    .sort((a, b) => (userSpend[b] ?? 0) - (userSpend[a] ?? 0))
    .slice(0, n)
}

function cardTags(c: ScoredCard): string[] {
  const tags: string[] = []
  if (c.true_annual_fee_aed === 0) tags.push('No annual fee')
  if (c.is_islamic) tags.push('Islamic')
  if (c.earnn_score >= 70) tags.push('Premium')
  if ((c.category_effective_rates['dining'] ?? 0) >= 0.05) tags.push('Dining')
  if ((c.category_effective_rates['travel'] ?? 0) >= 0.03) tags.push('Travel')
  if ((c.category_effective_rates['online'] ?? 0) >= 0.05) tags.push('Online')
  if ((c.category_effective_rates['fuel'] ?? 0) >= 0.05) tags.push('Fuel')
  if (tags.length === 0) tags.push('Cashback')
  return tags
}

// ─── Loading ──────────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6">
      <style>{`
        @keyframes cardSpin {
          0%   { transform: rotateY(0deg); }
          50%  { transform: rotateY(180deg); }
          100% { transform: rotateY(360deg); }
        }
        .spin0 { animation: cardSpin 1.4s ease-in-out infinite 0s; }
        .spin1 { animation: cardSpin 1.4s ease-in-out infinite .28s; }
        .spin2 { animation: cardSpin 1.4s ease-in-out infinite .56s; }
      `}</style>
      <div className="flex gap-4" style={{ perspective: 400 }}>
        {[['bg-primary','spin0'],['bg-emerald','spin1'],['bg-blue-600','spin2']].map(([bg, cls], i) => (
          <div key={i} className={`h-9 w-14 rounded-lg shadow-md ${bg} ${cls}`} />
        ))}
      </div>
      <div className="text-center">
        <p className="font-display text-lg font-bold text-primary">Optimising your wallet…</p>
        <p className="mt-1 text-sm text-muted-foreground">Running simulations across thousands of card combinations</p>
      </div>
    </div>
  )
}

// ─── Top Nav ──────────────────────────────────────────────────────────────────

function TopNav() {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
            <span className="text-sm font-bold">✦</span>
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-primary">Earnn</span>
        </div>
        <div className="hidden items-center gap-2 rounded-full bg-emerald-soft px-3 py-1 text-xs font-medium text-emerald sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
          Strategy ready
        </div>
      </div>
    </header>
  )
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

const STEPS = ['Recommendation', 'Build Your Wallet', "You're ready"]

function Stepper({ current, onJump }: { current: number; onJump: (i: number) => void }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 lg:px-8">
      <ol className="flex items-center gap-1 overflow-x-auto pb-2 text-xs">
        {STEPS.map((s, i) => {
          const active = i === current
          const done = i < current
          return (
            <li key={s} className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => onJump(i)}
                className={`flex items-center gap-2 rounded-full px-3 py-1.5 transition ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : done
                      ? 'bg-emerald-soft text-emerald'
                      : 'bg-card text-muted-foreground hover:text-foreground'
                }`}
              >
                <span className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${
                  active ? 'bg-white/20' : done ? 'bg-emerald text-white' : 'bg-muted'
                }`}>
                  {done ? '✓' : i + 1}
                </span>
                <span className="whitespace-nowrap font-medium">{s}</span>
              </button>
              {i < STEPS.length - 1 && <span className="text-xs text-muted-foreground">›</span>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ─── NavRow ───────────────────────────────────────────────────────────────────

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

// ─── SectionHeader ────────────────────────────────────────────────────────────

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-widest text-emerald">{eyebrow}</span>
      <h2 className="font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">{title}</h2>
      <p className="max-w-2xl text-base text-muted-foreground">{subtitle}</p>
    </div>
  )
}

// ─── SummaryStat ─────────────────────────────────────────────────────────────

function SummaryStat({ label, value, tone, big }: { label: string; value: string; tone?: 'emerald'; big?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-soft">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display font-bold tabular ${big ? 'text-3xl' : 'text-2xl'} ${tone === 'emerald' ? 'text-emerald' : 'text-primary'}`}>
        {value}
      </div>
    </div>
  )
}

// ─── Card Detail Popup ────────────────────────────────────────────────────────

function CardDetailPopup({ cardId, onClose }: { cardId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<{ card: Record<string, unknown>; benefits: string[]; best_for: string[]; card_disclaimer: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCardDetail(cardId).then(d => { setDetail(d); setLoading(false) }).catch(() => setLoading(false))
  }, [cardId])

  const card = detail?.card as Record<string, unknown> | undefined
  const feeValue = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null
    const numeric = typeof value === 'number' ? value : Number(value)
    return Number.isFinite(numeric) ? numeric : null
  }
  const feeDisplay = (cardData: Record<string, unknown>) => {
    const firstYearFee = feeValue(cardData.annual_fee_year1_aed)
    const laterYearFee = feeValue(cardData.annual_fee_from_year2_aed)
    const freeForLife = cardData.free_for_life === true || String(cardData.free_for_life).toLowerCase() === 'true'
    const firstYearFree = cardData.annual_fee_year1_free === true || String(cardData.annual_fee_year1_free).toLowerCase() === 'true'
    const waiverAvailable = cardData.annual_fee_waiver_available === true || String(cardData.annual_fee_waiver_available).toLowerCase() === 'true'
    const waiverSpend = feeValue(cardData.annual_fee_waiver_spend_aed)
    const amount = (fee: number) => `AED ${fmt(fee)}`
    const waiver = waiverAvailable && waiverSpend !== null && waiverSpend > 0
      ? `(Waived on annual spend of AED ${fmt(waiverSpend)})`
      : null

    if (freeForLife) return { lines: ['Free for life'], waiver: null }
    if (firstYearFree) {
      return {
        lines: [
          'First year: Free',
          laterYearFee === null ? 'From year 2: Fee not specified' : `From year 2: ${amount(laterYearFee)} / year`,
        ],
        waiver,
      }
    }
    if (firstYearFee !== null && laterYearFee !== null && firstYearFee !== laterYearFee) {
      return { lines: [`First year: ${amount(firstYearFee)}`, `From year 2: ${amount(laterYearFee)} / year`], waiver }
    }
    const annualFee = laterYearFee ?? firstYearFee
    return { lines: [annualFee === null ? 'Fee not specified' : `AED ${fmt(annualFee)} / year`], waiver }
  }
  const fee = card ? feeDisplay(card) : null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
      <div style={{
        position: 'relative', background: '#fff', borderRadius: 20, padding: 28, maxWidth: 540, width: '90%',
        maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 16, fontSize: 20, background: 'none', border: 'none', cursor: 'pointer', color: '#666' }}>×</button>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Loading…</div>
        ) : !card ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>Details unavailable</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 20 }}>
              <img src={getCardImageUrl(cardId)} alt="" width={132} height={82}
                style={{ borderRadius: 10, objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', flexShrink: 0 }}
                onError={(e) => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 17, color: '#0D1828' }}>{String(card.card_name ?? '')}</div>
                <div style={{ fontSize: 13, color: '#5A6A85', marginTop: 3 }}>{String(card.bank_name ?? '')}</div>
                <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#5A6A85', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Annual Fee</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 3 }}>
                      {fee?.lines.map((line, index) => (
                        <div key={line} style={{ fontSize: index === 0 ? 15 : 12, fontWeight: index === 0 ? 700 : 600, color: line.includes('Free') ? '#00A67E' : '#C0392B' }}>{line}</div>
                      ))}
                      {fee?.waiver && <div style={{ fontSize: 10, color: '#5A6A85', fontWeight: 500 }}>{fee.waiver}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {[
              { title: 'Top Benefits', items: detail?.benefits ?? [] },
              { title: 'Best For', items: detail?.best_for ?? [] },
              { title: 'Things To Note', items: detail?.card_disclaimer ? [detail.card_disclaimer] : [] },
            ].map(sec => sec.items.length > 0 && (
              <div key={sec.title} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0E3785', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{sec.title}</div>
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {sec.items.map((it, i) => <li key={i} style={{ fontSize: 13, color: '#374151', marginBottom: 4 }}>{it}</li>)}
                </ul>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Screen 1 — Hero ─────────────────────────────────────────────────────────

// builds the 3 hero card configs from wallet data + scored cards
function buildHeroCards(walletData: WalletResponse, scoredCards: ScoredCard[]): HeroCardData[] {
  const sorted = [...walletData.wallets].sort((a, b) => a.n_cards - b.n_cards)
  const byN: Record<number, WalletEntry> = {}
  for (const w of sorted) byN[w.n_cards] = w

  // Hero 1: incremental >1000 threshold
  let h1 = sorted[0]
  for (const w of sorted.slice(1)) {
    if (w.incremental_vs_prev_aed > 1000) h1 = w
    else break
  }

  const toHero = (w: WalletEntry, title: string, subMsg?: string): HeroCardData => ({
    walletEntry: w, title, subMsg,
    card_ids: w.card_ids, n_cards: w.n_cards,
    net_annual_value_aed: w.net_annual_value_aed,
    gross_annual_aed: w.gross_annual_aed,
    total_fee_aed: w.total_fee_aed,
    category_routing: w.category_routing,
  })

  // single card fallback using scored cards — dedupe by card_family (keep best rank per family)
  const seenFamilies = new Set<string>()
  const singleCards = [...scoredCards]
    .sort((a, b) => a.card_ranking - b.card_ranking)
    .filter(c => {
      const fam = c.card_family
      if (!fam) return true  // no family → always include
      if (seenFamilies.has(fam)) return false
      seenFamilies.add(fam)
      return true
    })
  const singleWallet = (idx: number): WalletEntry => {
    const c = singleCards[idx] ?? singleCards[0]
    const userSpend = walletData.user_spend
    // build synthetic routing from card's own category data
    const routing: Record<string, RouteEntry[]> = {}
    for (const cat of SPEND_CATS) {
      const monthlyReward = c.category_monthly_rewards[cat] ?? 0
      const rate = c.category_effective_rates[cat] ?? 0
      if (monthlyReward > 0 && rate > 0) {
        routing[cat] = [{
          card_id: c.earnn_card_id,
          card_name: c.card_name,
          rate,
          annual_aed: monthlyReward * 12,
          monthly_spend_chunk: userSpend[cat] ?? 0,
        }]
      }
    }
    return {
      n_cards: 1, card_ids: [c.earnn_card_id],
      gross_annual_aed: c.expected_annual_return_aed,
      total_fee_aed: c.true_annual_fee_aed,
      net_annual_value_aed: c.net_annual_value_aed,
      effective_rate: 0, incremental_vs_prev_aed: 0,
      category_routing: routing,
      top_combinations: [],
    }
  }

  const h1Nav = h1.net_annual_value_aed
  const heroes: HeroCardData[] = [toHero(h1,
    h1.n_cards === 1 ? 'Your Best Card for This Spend' :
    h1.n_cards === 2 ? '2 Cards Deliver You Maximum Rewards' :
    `${h1.n_cards} Cards Deliver You Maximum Rewards`
  )]

  if (h1.n_cards >= 3) {
    // Hero 2 = 2-card, Hero 3 = single best
    const w2 = byN[2]
    const h2 = w2 ?? singleWallet(0)
    const h2gain = fmt(Math.round(h1Nav - h2.net_annual_value_aed))
    heroes.push(toHero(h2, '2 Cards Still Cover Most of Your Rewards',
      `Adding ${h1.n_cards - 2} more card${h1.n_cards - 2 > 1 ? 's' : ''} could earn you AED ${h2gain} more each year`))
    const w1 = byN[1] ?? singleWallet(0)
    const h3gain = fmt(Math.round(h1Nav - w1.net_annual_value_aed))
    heroes.push(toHero(w1, '🎯 Your Best Single Card',
      `Adding ${h1.n_cards - 1} more card${h1.n_cards - 1 > 1 ? 's' : ''} could earn you AED ${h3gain} more each year`))

  } else if (h1.n_cards === 2) {
    const w3 = byN[3]
    if (w3 && w3.incremental_vs_prev_aed >= 500 && w3.incremental_vs_prev_aed <= 1000) {
      // Hero 2 = 3-card (step up), Hero 3 = single best
      heroes.push(toHero(w3, '3 Cards Unlock a Little More',
        `You could earn AED ${fmt(Math.round(w3.incremental_vs_prev_aed))} more — worth it if you're comfortable managing one extra card`))
      const w1 = byN[1] ?? singleWallet(0)
      const h3gain = fmt(Math.round(h1Nav - w1.net_annual_value_aed))
      heroes.push(toHero(w1, '🎯 Your Best Single Card',
        `Adding 1 more card could earn you AED ${h3gain} more each year`))
    } else {
      // Hero 2 & 3 = 1st and 2nd best single cards
      const w1 = byN[1] ?? singleWallet(0)
      const h2gain = fmt(Math.round(h1Nav - w1.net_annual_value_aed))
      heroes.push(toHero(w1, '🎯 Your Best Single Card',
        `Adding 1 more card could earn you AED ${h2gain} more each year`))
      heroes.push(toHero(singleWallet(1), '🎯 2nd Best Single Card', undefined))
    }

  } else {
    // Hero 1 = single card
    const w2 = byN[2]
    if (w2 && w2.incremental_vs_prev_aed >= 500 && w2.incremental_vs_prev_aed <= 1000) {
      heroes.push(toHero(w2, '2 Cards Unlock More Rewards',
        `You could earn AED ${fmt(Math.round(w2.incremental_vs_prev_aed))} more — worth it if you're comfortable managing one extra card`))
      heroes.push(toHero(singleWallet(1), '🎯 2nd Best Single Card', undefined))
    } else {
      heroes.push(toHero(singleWallet(1), '🎯 2nd Best Single Card', undefined))
      heroes.push(toHero(singleWallet(2), '🎯 3rd Best Single Card', undefined))
    }
  }

  return heroes
}

interface HeroCardData {
  walletEntry: WalletEntry; title: string; subMsg?: string
  card_ids: string[]; n_cards: number
  net_annual_value_aed: number; gross_annual_aed: number; total_fee_aed: number
  category_routing: Record<string, RouteEntry[]>
}

function Screen1Hero({ scoredCards, walletData, onNext, onExplore }: {
  scoredCards: ScoredCard[]; walletData: WalletResponse; onNext: () => void; onExplore: () => void
}) {
  const [heroIdx, setHeroIdx] = useState(0)
  const [showWhy, setShowWhy] = useState(false)
  // The category playbook is the clearest first view; users can switch to the
  // original card-by-card explanation when they want its full detail.
  const [whyView, setWhyView] = useState<'category' | 'card'>('category')
  const [detailCardId, setDetailCardId] = useState<string | null>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const whyRef = useRef<HTMLDivElement>(null)
  const whyBtnRef = useRef<HTMLButtonElement>(null)
  const [feeHover, setFeeHover] = useState(false)
  const [rewardsHover, setRewardsHover] = useState(false)

  const heroCards = buildHeroCards(walletData, scoredCards)
  const rec = heroCards[heroIdx]
  const total = walletData.total_monthly
  const coverage = calcCoverage(rec.card_ids, scoredCards, walletData.user_spend, total)
  const names = rec.card_ids.map(id => cardName(id, scoredCards))
  const walletCardSummaries = buildWalletCardSummaries(rec.walletEntry, scoredCards)

  const portfolioTabs = [
    'Recommended · Maximum Rewards',
    'Best Balance · Low Effort',
    'Keep It Simple · Minimum Effort',
  ]

  return (
    <section ref={sectionRef} className="space-y-6">
      <div className="space-y-3 -mt-3">
        <h1 className="font-display text-4xl font-bold tracking-tight text-primary sm:text-5xl">
          Your spending is unique. So is your card strategy.
        </h1>
        <div className="space-y-0.5 text-base text-muted-foreground sm:text-lg">
          <p>Based on your <span className="font-semibold text-foreground">AED {fmt(total)} monthly spend across {Object.values(walletData.user_spend).filter(v => v > 0).length} categories</span>, we tested millions of UAE card combinations to find your highest-value wallet.</p>
        </div>
      </div>

      {/* Hero card carousel */}
      <div className="-mt-3" style={{ position: 'relative' }}>
        {/* Named portfolio choices replace the unlabeled carousel controls. */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#5A6A85', letterSpacing: '0.08em', marginBottom: 6 }}>CHOOSE YOUR CARD STRATEGY</div>
          <div role="tablist" aria-label="Recommended card strategies" style={{ display: 'grid', gridTemplateColumns: `repeat(${heroCards.length}, minmax(0, 1fr))`, gap: 8 }}>
            {heroCards.map((_, i) => {
              const selected = i === heroIdx
              return (
                <button key={portfolioTabs[i]} type="button" role="tab" aria-selected={selected} onClick={() => { setHeroIdx(i); setShowWhy(false) }} style={{
                  minHeight: 42, borderRadius: 10, border: `1px solid ${selected ? '#0E3785' : '#D6E0F5'}`,
                  background: selected ? '#0E3785' : '#F8FAFF', color: selected ? '#FFFFFF' : '#395170',
                  padding: '7px 10px', fontSize: 11, lineHeight: 1.25, fontWeight: selected ? 700 : 600,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  {portfolioTabs[i]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl p-5 pt-0 pb-3 text-primary-foreground shadow-card sm:p-8 sm:pt-0 sm:pb-3"
          style={{ background: 'linear-gradient(110deg,#091e42 0%,#0A2A66 35%,#143a7a 70%,#1b4080 100%)' }}>
          <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #00A870 0%, transparent 70%)' }} />

          <div className="relative grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
            <div className="space-y-0">
              <div className="mb-3 mt-4">
                <div className="flex items-center gap-2 text-base font-bold text-primary-foreground">
                  {heroIdx === 0 && (
                    <span style={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>🏆</span>
                  )}
                  {heroIdx === 1 && (
                    <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>⚖️</span>
                  )}
                  {rec.title}
                </div>
              </div>
              <div>
                <div className="text-sm text-primary-foreground/70">POTENTIAL MONTHLY REWARDS</div>
                <div className="mt-1 flex items-baseline gap-2 tabular">
                  <span className="font-display text-5xl font-bold sm:text-6xl" style={{ color: '#F5D76E' }}>AED {fmt(Math.round(rec.gross_annual_aed / 12))}</span>
                  <span className="text-base" style={{ color: 'rgba(245,215,110,0.75)' }}>/ month</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium" style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.70)' }}>
                  <span className="font-semibold text-emerald">{coverage}%</span> of your spend earns boosted rewards
                </div>
              </div>

              <div>
                <div className="text-sm text-primary-foreground/70 mb-3 mt-5">Recommended Cards</div>
                <ul className="flex flex-col gap-1.5">
                  {walletCardSummaries.slice(0, 4).map(({ cardId, sc, catEntries, totalMonthly }) => (
                    <li key={cardId}>
                      <button onClick={() => setDetailCardId(cardId)}
                        className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/10">
                        <span style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}>{(catEntries[0] && CAT_EMOJI[catEntries[0].key]) || '💳'}</span>
                        <span className="min-w-0 flex-1 text-[13px] leading-tight text-primary-foreground/90">
                          <span className="font-semibold">{shortCardName(sc?.card_name ?? cardId)}</span>
                          <span className="text-primary-foreground/60"> — {heroRole(catEntries)}</span>
                        </span>
                        <span className="shrink-0 text-[12px] font-bold tabular" style={{ color: '#6EF0BF' }}>+AED {fmt(totalMonthly)}/mo</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="relative flex flex-col items-center justify-between gap-4">
              <div style={{ marginTop: 8, transform: rec.n_cards <= 2 ? 'translateY(16px)' : 'none' }}>
                <CardFan cardIds={rec.card_ids.slice(0, 4)} names={names} size="lg" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>Want to try a different cards?</span>
                <button onClick={onNext}
                  className="group inline-flex items-center gap-2.5 rounded-2xl px-5 py-3 text-sm font-semibold transition-all hover:brightness-110 active:scale-95"
                  style={{ background: '#2D8C6A', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', boxShadow: '0 2px 12px rgba(45,140,106,0.35)' }}>
                  <img src="/wallet-icon.png" alt="" width={20} height={20} style={{ width: 20, height: 20, objectFit: 'contain', opacity: 0.9 }} />
                  Customize Your Wallet
                </button>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-2 grid grid-cols-2 gap-2.5 border-t border-primary-foreground/10 pt-2 sm:grid-cols-4">
            {[
              { label: 'Annual Rewards',  value: `AED ${fmt(rec.gross_annual_aed)}`,      emerald: false, sub: 'Total cashback & benefits', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
                  <path d="M20 12v9H4v-9"/><path d="M22 7H2v5h20V7z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/>
                </svg>
              )},
              { label: 'Annual Fees',     value: `AED ${fmt(rec.total_fee_aed)}`,          emerald: false, sub: 'Considering Waiver Probability', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
                  <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>
                </svg>
              )},
              { label: 'Net Value',       value: `AED ${fmt(rec.net_annual_value_aed)}/year`, emerald: true,  sub: 'Rewards & benefits after card fees', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>
                </svg>
              )},
              { label: 'Cards Needed',    value: String(rec.n_cards),                      emerald: false, sub: 'Easy to manage', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={20} height={20}>
                  <rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h.01M10 15h4"/>
                </svg>
              )},
            ].map(s => (
              <div key={s.label}
                onMouseEnter={() => { if (s.label === 'Annual Fees') setFeeHover(true); if (s.label === 'Annual Rewards') setRewardsHover(true) }}
                onMouseLeave={() => { setFeeHover(false); setRewardsHover(false) }}
                style={{
                  position: 'relative', background: 'rgba(255,255,255,0.07)',
                  border: '1px solid rgba(255,255,255,0.10)', borderRadius: 12,
                  padding: '6px 10px', display: 'flex', flexDirection: 'column', gap: 1,
                }}>
                <div className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>{s.label}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div className="font-display text-lg font-bold tabular" style={{ color: s.emerald ? '#00E5A0' : '#fff', textShadow: s.emerald ? '0 0 12px rgba(0,229,160,0.4)' : 'none' }}>{s.value}</div>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                    background: s.emerald ? 'rgba(0,166,126,0.20)' : 'rgba(255,255,255,0.10)',
                    border: `1px solid ${s.emerald ? 'rgba(0,166,126,0.35)' : 'rgba(255,255,255,0.15)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: s.emerald ? '#00A67E' : 'rgba(255,255,255,0.55)',
                  }}>
                    {s.icon}
                  </div>
                </div>
                <div style={{ fontSize: 9, lineHeight: 1.25, color: 'rgba(255,255,255,0.35)' }}>{s.sub}</div>
                {s.label === 'Annual Rewards' && rewardsHover && (
                  <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, background: '#0D1828', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px', zIndex: 50, fontSize: 11, color: 'rgba(255,255,255,0.70)', lineHeight: 1.5, pointerEvents: 'none' }}>
                    Earnn model optimizes every dirham of spend by assigning purchases to the card that earns the highest rewards first, then seamlessly allocating any remaining spend to the next best option, maximizing returns without double counting.
                  </div>
                )}
                {s.label === 'Annual Fees' && feeHover && (
                  <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, right: 0, background: '#0D1828', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 12px', zIndex: 50, fontSize: 11, color: 'rgba(255,255,255,0.70)', lineHeight: 1.5, pointerEvents: 'none' }}>
                    Where banks offer annual fee waivers based on minimum spend requirements, Earnn model estimates your probability of qualifying using your spending behavior and factors this into the fee calculation.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* See why button — just below hero card, centered */}
      <div className="flex justify-center -mt-3">
        <button ref={whyBtnRef} onClick={() => {
          const opening = !showWhy
          setShowWhy(v => !v)
          if (opening) setTimeout(() => {
            const btn = whyBtnRef.current
            if (!btn) return
            const y = btn.getBoundingClientRect().top + window.scrollY - 80
            window.scrollTo({ top: y, behavior: 'smooth' })
          }, 50)
          else setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50)
        }}
          className="inline-flex min-w-[340px] items-center justify-center gap-2 rounded-xl border px-6 py-2.5 text-sm font-bold shadow-card transition hover:brightness-110"
          style={{ background: '#2D8C6A', borderColor: '#2D8C6A', color: '#FFFFFF' }}>
          <span>{showWhy ? 'Hide card recommendations' : 'See why these cards are recommended?'}</span>
          <span aria-hidden="true" style={{ fontSize: 13, lineHeight: 1 }}>{showWhy ? '▲' : '▼'}</span>
        </button>
      </div>

      {/* See why expanded content */}
      <div ref={whyRef as React.RefObject<HTMLDivElement>}>
        {showWhy && (
          <div className="mt-4 space-y-4">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ fontSize: 13, color: '#5A6A85', fontWeight: 600 }}>
                {rec.walletEntry.n_cards} card{rec.walletEntry.n_cards > 1 ? 's' : ''} in your optimal wallet
              </div>
              <div role="tablist" aria-label="Recommendation view" style={{ display: 'flex', gap: 3, padding: 3, background: '#EEF3FF', borderRadius: 10, flexShrink: 0 }}>
                {[
                  { id: 'category' as const, label: 'Category view' },
                  { id: 'card' as const, label: 'Card-level view' },
                ].map(tab => {
                  const selected = whyView === tab.id
                  return (
                    <button key={tab.id} type="button" role="tab" aria-selected={selected} onClick={() => setWhyView(tab.id)} style={{
                      border: 'none', borderRadius: 7, background: selected ? '#FFFFFF' : 'transparent', color: selected ? '#0E3785' : '#5A6A85',
                      boxShadow: selected ? '0 1px 4px rgba(14,55,133,0.12)' : 'none', padding: '7px 11px', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    }}>
                      {tab.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {whyView === 'card' && <>
            {/* Existing detailed view — retained unchanged as the first option. */}
            <WhyTheseCards scoredCards={scoredCards} walletData={walletData} forcedRec={rec.walletEntry} subMsg={rec.subMsg} heroIdx={heroIdx} showWalletLabel={false} />
            </>}

            {whyView === 'category' && <CardPlaybook scoredCards={scoredCards} walletData={walletData} rec={rec.walletEntry} compact />}
          </div>
        )}
      </div>

      {detailCardId && <CardDetailPopup cardId={detailCardId} onClose={() => setDetailCardId(null)} />}
    </section>
  )
}

// ─── Why These Cards — card-first layout matching earnn wallet UI ─────────────

function WhyTheseCards({ scoredCards, walletData, forcedRec, subMsg, heroIdx, showWalletLabel = true }: { scoredCards: ScoredCard[]; walletData: WalletResponse; forcedRec?: WalletEntry; subMsg?: string; heroIdx?: number; showWalletLabel?: boolean }) {
  const rec = forcedRec ?? (() => {
    const sorted = [...walletData.wallets].sort((a, b) => a.n_cards - b.n_cards)
    let best = sorted[0]
    for (const w of sorted.slice(1)) {
      if (w.incremental_vs_prev_aed > 1000) best = w
      else break
    }
    return best
  })()
  const userSpend = walletData.user_spend
  const totalMonthlyRewards = Math.round(rec.gross_annual_aed / 12)

  // Same routing-derived ownership and reward figures used in the hero summary.
  const cardData = buildWalletCardSummaries(rec, scoredCards)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {[
          { label: 'MONTHLY SPEND',       value: `AED ${fmt(walletData.total_monthly)}`,          valueColor: '#0D1828', bg: '#F8FAFF', border: '#D6E0F5' },
          { label: 'POTENTIAL REWARDS',   value: `AED ${fmt(totalMonthlyRewards)} / mo`,           valueColor: '#00A67E', bg: '#F8FAFF', border: '#D6E0F5' },
          { label: 'NET VALUE',           value: `AED ${fmt(rec.net_annual_value_aed)} / year`,   valueColor: '#0E3785', bg: '#EEF9F4', border: '#B3E8D4' },
        ].map((s, i) => (
          <div key={i} style={{ background: s.bg, border: `1px solid ${s.border}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: '#5A6A85', fontWeight: 600, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontSize: i === 2 ? 17 : 19, fontWeight: 700, color: s.valueColor, lineHeight: 1.2 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {showWalletLabel && <div style={{ fontSize: 13, color: '#5A6A85', fontWeight: 500 }}>
        {rec.n_cards} card{rec.n_cards > 1 ? 's' : ''} in your optimal wallet
      </div>}

      {/* Per-card blocks */}
      {cardData.map(({ cardId, sc, catEntries, totalMonthly, totalSpendOnCard, topCats, sharePct }) => (
        <div key={cardId} style={{ border: '1px solid #D6E0F5', borderRadius: 16, overflow: 'hidden', background: 'white', display: 'grid', gridTemplateColumns: '180px 220px 1fr' }}>

          {/* Col 1: card image */}
          <div style={{ background: '#F4F7FF', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>
            <img
              src={getCardImageUrl(cardId)}
              alt=""
              style={{ width: 148, height: 93, objectFit: 'cover', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.22)', display: 'block' }}
              onError={e => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }}
            />
          </div>

          {/* Col 2: card meta */}
          <div style={{ padding: '20px 18px', borderLeft: '1px solid #EEF3FF', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1828', lineHeight: 1.3 }}>{sc?.card_name ?? cardId}</div>
            {sc?.bank_name && <div style={{ fontSize: 12, color: '#5A6A85' }}>{sc.bank_name}</div>}
            {topCats && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#FFF8E6', border: '1px solid #FDDEA0', borderRadius: 20, padding: '3px 10px', width: 'fit-content' }}>
                <span style={{ fontSize: 11 }}>⭐</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#92600A' }}>Best for {topCats}</span>
              </div>
            )}
            <div style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, color: '#5A6A85', fontWeight: 600, marginBottom: 3 }}>Monthly Rewards</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#00A67E', lineHeight: 1 }}>AED {fmt(totalMonthly)}</div>
              <div style={{ fontSize: 11, color: '#9DAEC8', marginTop: 3 }}>({sharePct}% of total rewards)</div>
            </div>
          </div>

          {/* Col 3: where this card is used */}
          <div style={{ borderLeft: '1px solid #EEF3FF', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 20px 10px', fontSize: 11, fontWeight: 600, color: '#5A6A85' }}>Where this card is used</div>

            {/* Category rows */}
            <div style={{ flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {catEntries.map(({ key, route, isCapped }, i) => {
                const monthlyReward = Math.round(route.annual_aed / 12)
                const spendChunk = route.monthly_spend_chunk
                const totalCatSpend = userSpend[key] ?? 0
                return (
                  <div key={key} style={{ display: 'grid', gridTemplateColumns: '40px 1fr auto', alignItems: 'center', gap: 12, padding: '10px 0', borderTop: i > 0 ? '1px solid #F0F4FF' : 'none' }}>
                    {/* Icon circle */}
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EEF3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
                      {CAT_EMOJI[key] || '💳'}
                    </div>
                    {/* Name + spend line */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#0D1828' }}>
                          {CAT_LABELS[key]}{!isCapped && (userSpend[key] ?? 0) > route.monthly_spend_chunk ? ' (after cap)' : ''}
                        </span>
                        {isCapped && (
                          <span style={{ fontSize: 9, fontWeight: 700, background: '#FEF3C7', color: '#B45309', border: '1px solid #FDE68A', borderRadius: 4, padding: '2px 6px', letterSpacing: '0.04em' }}>CAPPING HIT</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#5A6A85' }}>
                        Spent: AED {fmt(spendChunk)}{totalCatSpend > spendChunk ? ` / AED ${fmt(totalCatSpend)}` : ''} ({totalCatSpend > 0 ? Math.round((spendChunk / totalCatSpend) * 100) : 100}% of spend)
                      </div>
                    </div>
                    {/* Reward */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 10, color: '#9DAEC8', fontWeight: 600, marginBottom: 2 }}>Reward</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#00A67E' }}>AED {fmt(monthlyReward)}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer totals */}
            <div style={{ borderTop: '1px solid #EEF3FF', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 16, background: '#FAFBFF' }}>
              <span style={{ fontSize: 12, color: '#5A6A85', fontWeight: 600 }}>Total spent on this card</span>
              <span style={{ fontSize: 13, color: '#0D1828', fontWeight: 700 }}>AED {fmt(totalSpendOnCard)} / month</span>
              <div style={{ width: 1, background: '#D6E0F5', alignSelf: 'stretch', margin: '0 4px' }} />
              <span style={{ fontSize: 12, color: '#5A6A85', fontWeight: 600 }}>Total reward</span>
              <span style={{ fontSize: 15, color: '#00A67E', fontWeight: 700 }}>AED {fmt(totalMonthly)}</span>
            </div>
          </div>
        </div>
      ))}

      {/* Footer strategy bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏆</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#92400E' }}>Follow this strategy to earn the maximum rewards</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexShrink: 0 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#B45309', fontWeight: 700, letterSpacing: '0.06em' }}>TOTAL MONTHLY REWARDS</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#00A67E' }}>AED {fmt(totalMonthlyRewards)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#B45309', fontWeight: 700, letterSpacing: '0.06em' }}>TOTAL YEARLY REWARDS</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#00A67E' }}>AED {fmt(totalMonthlyRewards * 12)}</div>
          </div>
        </div>
      </div>

      {subMsg && (
        <div style={{ borderRadius: 12, border: heroIdx === 0 ? '1px solid rgba(14,55,133,0.20)' : '1px solid rgba(245,215,110,0.35)', background: heroIdx === 0 ? 'rgba(14,55,133,0.05)' : 'rgba(245,215,110,0.08)', color: heroIdx === 0 ? '#5A6A85' : '#92660A', padding: '12px 16px', fontSize: 14 }}>
          {subMsg}
        </div>
      )}
    </div>
  )
}

// ─── Screen 2 — Why these cards (kept as standalone step if needed) ────────────

type PlaybookCategory = {
  key: string
  routes: RouteEntry[]
  monthlySpend: number
  monthlyReward: number
}

function playbookLabel(key: string) {
  return key === 'all_spend' ? 'Everyday & Other Spending' : (CAT_LABELS[key] || key)
}

function buildPlaybookCategories(rec: WalletEntry): PlaybookCategory[] {
  return Object.entries(rec.category_routing)
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
}

function CardPlaybook({ scoredCards, walletData, rec, compact = false }: { scoredCards: ScoredCard[]; walletData: WalletResponse; rec: WalletEntry; compact?: boolean }) {
  const categories = buildPlaybookCategories(rec)
  const primaryCategories = categories.slice(0, 4)
  const secondaryCategories = categories.slice(4)
  const monthlyRewards = Math.round(rec.gross_annual_aed / 12)
  const cardFor = (cardId: string) => scoredCards.find(card => card.earnn_card_id === cardId)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        {[
          { label: 'MONTHLY SPEND', value: `AED ${fmt(walletData.total_monthly)}`, color: '#0D1828', bg: '#F8FAFF', border: '#D6E0F5' },
          { label: 'POTENTIAL REWARDS', value: `AED ${fmt(monthlyRewards)} / mo`, color: '#00A67E', bg: '#F8FAFF', border: '#D6E0F5' },
          { label: 'NET VALUE', value: `AED ${fmt(rec.net_annual_value_aed)} / year`, color: '#0E3785', bg: '#EEF9F4', border: '#B3E8D4' },
        ].map(item => (
          <div key={item.label} style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: 12, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, color: '#5A6A85', fontWeight: 600, marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: item.label === 'NET VALUE' ? 17 : 19, fontWeight: 700, color: item.color, lineHeight: 1.2 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ margin: '3px 0 8px', fontSize: 12, fontWeight: 700, color: '#5A6A85', letterSpacing: '0.06em' }}>WHERE TO USE EACH CARD</div>
        <div className={compact ? 'grid grid-cols-1 gap-3 lg:grid-cols-2' : undefined} style={compact ? { alignItems: 'start' } : { display: 'flex', flexDirection: 'column', gap: 10 }}>
          {primaryCategories.map(category => {
            const label = playbookLabel(category.key)
            const isSplit = category.routes.length > 1
            return (
              <section key={category.key} style={{ border: '1px solid #D6E0F5', borderRadius: 16, overflow: 'hidden', background: '#FFFFFF' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '13px 16px', background: '#F7F9FF', borderBottom: '1px solid #E6EEFC' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, minWidth: 0 }}>
                    <span style={{ width: 32, height: 32, display: 'grid', placeItems: 'center', borderRadius: 9, background: '#E9F0FF', fontSize: 17, flexShrink: 0 }}>{CAT_EMOJI[category.key] || '💳'}</span>
                    <div style={{ minWidth: 0, fontSize: 14, fontWeight: 700, color: '#0D1828' }}>{label}</div>
                  </div>
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#7485A3', fontWeight: 700 }}>CATEGORY SPEND</div>
                    <div style={{ marginTop: 2, fontSize: 13, color: '#0D1828', fontWeight: 700 }}>AED {fmt(category.monthlySpend)} / month</div>
                  </div>
                </div>

                <div style={{ padding: '4px 16px 14px' }}>
                  {category.routes.map((route, index) => {
                    const card = cardFor(route.card_id)
                    const isFirst = index === 0
                    const isLast = index === category.routes.length - 1
                    const routeHeading = isFirst ? `First AED ${fmt(route.monthly_spend_chunk)} / month` : isLast ? `Remaining AED ${fmt(route.monthly_spend_chunk)} / month` : `Next AED ${fmt(route.monthly_spend_chunk)} / month`
                    return (
                      <div key={`${route.card_id}-${index}`}>
                        {index > 0 && <div style={{ margin: '8px 0 3px' }}>
                          <div style={{ padding: '5px 9px', borderRadius: 7, background: '#FFF7E3', border: '1px solid #FDE2A2', color: '#A85A00', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em' }}>REWARD CAPPING REACHED</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5, padding: '7px 9px', borderRadius: 8, background: '#EEF3FF', color: '#0E3785' }}>
                            <span style={{ fontSize: 19, lineHeight: 1 }}>↓</span>
                            <span style={{ fontSize: 12, fontWeight: 800 }}>Then switch to</span>
                          </div>
                        </div>}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: '11px 0' }}>
                          <div style={{ minWidth: 0 }}>
                            {isSplit && <div style={{ fontSize: 10, color: '#5A6A85', letterSpacing: '0.07em', fontWeight: 700, textTransform: 'uppercase' }}>{routeHeading}</div>}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginTop: 6 }}>
                              <img src={getCardImageUrl(route.card_id)} alt="" style={{ width: 52, height: 33, objectFit: 'cover', borderRadius: 5, boxShadow: '0 2px 7px rgba(0,0,0,0.16)', flexShrink: 0 }} onError={event => { (event.target as HTMLImageElement).src = '/card-dummy.svg' }} />
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1828', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shortCardName(card?.card_name ?? route.card_name ?? route.card_id)}</div>
                                {card?.bank_name && <div style={{ marginTop: 1, fontSize: 11, color: '#5A6A85' }}>{card.bank_name}</div>}
                              </div>
                            </div>
                          </div>
                          <div style={{ paddingLeft: 12, borderLeft: '1px solid #E6EEFC', textAlign: 'right', flexShrink: 0 }}>
                            <div style={{ fontSize: 10, color: '#7485A3', fontWeight: 700 }}>YOU COULD EARN</div>
                            <div style={{ marginTop: 3, fontSize: 17, lineHeight: 1.1, color: '#00A67E', fontWeight: 700 }}>AED {fmt(Math.round(route.annual_aed / 12))}</div>
                            <div style={{ marginTop: 2, fontSize: 10, color: '#7485A3' }}>/ month</div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {isSplit && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 16px', background: '#F0FBF7', borderTop: '1px solid #D6F2E6' }}>
                  <span style={{ fontSize: 12, color: '#287257', fontWeight: 700 }}>Total {label} rewards</span>
                  <span style={{ fontSize: 16, color: '#00A67E', fontWeight: 700 }}>AED {fmt(Math.round(category.monthlyReward))} / month</span>
                </div>}
              </section>
            )
          })}
        </div>
      </div>

      {secondaryCategories.length > 0 && <div style={{ border: '1px solid #D6E0F5', borderRadius: 16, padding: '15px 16px', background: '#FBFCFF' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0D1828' }}>Other Remaining Categories</div>
        <div style={{ marginTop: 3, fontSize: 11, color: '#5A6A85' }}>Use these cards for your smaller monthly spending areas too.</div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
          {secondaryCategories.map(category => {
            const cardNames = category.routes.map(route => shortCardName(cardFor(route.card_id)?.card_name ?? route.card_name ?? route.card_id)).join(' → ')
            return <div key={category.key} style={{ display: 'grid', gridTemplateColumns: '26px minmax(0, 1fr) auto', gap: 7, alignItems: 'center', padding: '9px 8px', background: '#FFFFFF', borderRadius: 9, border: '1px solid #EDF1FA' }}>
              <span style={{ fontSize: 15 }}>{CAT_EMOJI[category.key] || '💳'}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#0D1828' }}>{playbookLabel(category.key)}</div>
                <div style={{ marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10, color: '#5A6A85' }}>Use {cardNames}</div>
              </div>
              <div style={{ fontSize: 12, color: '#00A67E', fontWeight: 700, whiteSpace: 'nowrap' }}>AED {fmt(Math.round(category.monthlyReward))}</div>
            </div>
          })}
        </div>
      </div>}

      <div style={{ borderRadius: 14, padding: '16px 18px', color: '#FFFFFF', background: '#2D8C6A', textAlign: 'center' }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>You could potentially earn AED {fmt(monthlyRewards)}/month</div>
        <div style={{ marginTop: 4, fontSize: 11, color: 'rgba(255,255,255,0.78)' }}>Use the recommended card for each category to maximize your estimated rewards.</div>
      </div>
    </div>
  )
}

function Screen2Why({ scoredCards, walletData, onBack, onNext }: {
  scoredCards: ScoredCard[]; walletData: WalletResponse; onBack: () => void; onNext: () => void
}) {
  return (
    <section className="space-y-6">
      <SectionHeader eyebrow="The reasoning" title="Why these cards?" subtitle="Your biggest spending areas are where these cards shine." />
      <WhyTheseCards scoredCards={scoredCards} walletData={walletData} />
      <NavRow onBack={onBack} onNext={onNext} nextLabel="Choose your style" />
    </section>
  )
}

function AlternativesModal({ category, scoredCards, onClose }: {
  category: string; scoredCards: ScoredCard[]; onClose: () => void
}) {
  const top5 = [...scoredCards]
    .filter(c => (c.category_monthly_rewards[category] ?? 0) > 0)
    .sort((a, b) => (b.category_monthly_rewards[category] ?? 0) - (a.category_monthly_rewards[category] ?? 0))
    .slice(0, 5)

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-primary/30 backdrop-blur-sm sm:place-items-center" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-t-3xl bg-background p-6 shadow-elevated sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-emerald">Top 5 for {CAT_LABELS[category]}</div>
            <h3 className="mt-1 font-display text-2xl font-bold text-primary">Alternatives we considered</h3>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full bg-muted text-foreground hover:bg-muted/70">
            ✕
          </button>
        </div>
        <ul className="max-h-[60vh] space-y-2 overflow-y-auto">
          {top5.map((c, i) => (
            <li key={c.earnn_card_id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border/60 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
              <CardImg id={c.earnn_card_id} size="sm" className="hidden sm:block" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {i === 0 && <span className="rounded-full bg-emerald-soft px-2 py-0.5 text-[10px] font-bold text-emerald">PICK</span>}
                  <span className="truncate font-semibold text-primary">{c.card_name}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Annual fee: AED {fmt(c.true_annual_fee_aed)}</span>
                  <span>·</span>
                  <span>Rewards: <span className="font-semibold text-emerald">AED {fmt(c.category_monthly_rewards[category] * 12)}/yr</span></span>
                </div>
              </div>
              <button className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
                onClick={() => alert('Coming soon')}>
                Apply
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ─── Screen 3 — Choose your style ────────────────────────────────────────────

function Screen3Style({ scoredCards, walletData, chosen, onChoose, onBack, onNext }: {
  scoredCards: ScoredCard[]; walletData: WalletResponse; chosen: string
  onChoose: (id: string) => void; onBack: () => void; onNext: () => void
}) {
  const best1 = scoredCards[0]
  const w2 = walletData.wallets.find(w => w.n_cards === 2)
  const w3 = walletData.wallets.find(w => w.n_cards === 3)
  const w4 = walletData.wallets.find(w => w.n_cards === 4)

  // 3rd tile always shows the highest available combo
  const wMax = w4 ?? w3 ?? w2

  const strategies = [
    {
      id: 'simple', best: 'Best for beginners', name: 'Keep It Simple',
      cardsNeeded: 1, rewards: best1.expected_annual_return_aed, fees: best1.true_annual_fee_aed,
      cardIds: [best1.earnn_card_id],
      pros: ['Easy to manage', 'No card switching', 'One statement'],
    },
    {
      id: 'balanced', best: 'Recommended', name: 'Balanced Rewards',
      cardsNeeded: w2?.n_cards ?? 2, rewards: w2?.gross_annual_aed ?? 0, fees: w2?.total_fee_aed ?? 0,
      cardIds: w2?.card_ids ?? [],
      pros: ['High rewards', 'Minimal effort', 'Most popular'],
    },
    {
      id: 'max', best: 'For optimizers', name: 'Maximize Rewards',
      cardsNeeded: wMax?.n_cards ?? 4, rewards: wMax?.gross_annual_aed ?? 0, fees: wMax?.total_fee_aed ?? 0,
      cardIds: wMax?.card_ids ?? [],
      pros: ['Highest possible rewards', 'Perfect category coverage'],
      cons: ['Requires active card management'],
    },
  ]

  const max = Math.max(...strategies.map(s => s.rewards))

  const dimRows = [
    { label: '1 card', value: best1.net_annual_value_aed },
    ...(w2 ? [{ label: '2 cards', value: w2.net_annual_value_aed }] : []),
    ...(w3 ? [{ label: '3 cards', value: w3.net_annual_value_aed }] : []),
    ...(w4 ? [{ label: '4 cards', value: w4.net_annual_value_aed }] : []),
  ]
  const dimMax = Math.max(...dimRows.map(r => r.value))

  return (
    <section className="space-y-6">
      <SectionHeader
        eyebrow="Your call"
        title="Choose your style"
        subtitle="Pick how much effort you want to spend managing cards. We do the math."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {strategies.map(s => {
          const active = chosen === s.id
          return (
            <button
              key={s.id}
              onClick={() => onChoose(s.id)}
              className={`group relative flex h-full flex-col gap-5 rounded-3xl border p-6 text-left shadow-soft transition ${
                active
                  ? 'border-emerald bg-card shadow-elevated ring-2 ring-emerald'
                  : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-elevated'
              }`}
            >
              <div>
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.best}</div>
                <h3 className="mt-1 font-display text-2xl font-bold text-primary">{s.name}</h3>
              </div>

              <div className={`flex ${s.cardsNeeded >= 4 ? '-space-x-14' : '-space-x-8'}`}>
                {s.cardIds.slice(0, 4).map((id) => (
                  <CardImg key={id} id={id} size="sm" className="ring-2 ring-card" />
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-surface-2 p-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Annual rewards</div>
                  <div className="mt-1 font-display text-xl font-bold text-emerald tabular">AED {fmt(s.rewards)}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Cards</div>
                  <div className="mt-1 font-display text-xl font-bold text-primary tabular">{s.cardsNeeded}</div>
                </div>
              </div>

              <ul className="space-y-1.5 text-sm">
                {s.pros.map(p => (
                  <li key={p} className="flex items-center gap-2 text-foreground">
                    <span className="h-4 w-4 shrink-0 font-bold text-emerald">✓</span> {p}
                  </li>
                ))}
                {s.cons?.map(p => (
                  <li key={p} className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-4 w-4 shrink-0">–</span> {p}
                  </li>
                ))}
              </ul>

              <div className={`mt-auto inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
                active ? 'bg-emerald text-primary' : 'bg-primary text-primary-foreground group-hover:opacity-90'
              }`}>
                {active ? '✓ Selected' : 'Choose strategy →'}
              </div>
            </button>
          )
        })}
      </div>

      {/* Diminishing returns */}
      <div className="rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2 text-sm font-semibold text-primary">
          📉 Diminishing returns
        </div>
        <p className="mt-1 text-sm text-muted-foreground">More cards = more rewards, but the gains shrink quickly.</p>
        <div className="mt-5 space-y-3">
          {dimRows.map(row => (
            <div key={row.label} className="grid grid-cols-[6rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
              <span className="font-semibold text-primary">{row.label}</span>
              <div className="h-3 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-emerald transition-all duration-700"
                  style={{ width: `${(row.value / dimMax) * 100}%` }} />
              </div>
              <span className="font-display font-bold text-emerald tabular">AED {fmt(row.value)}</span>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-2 rounded-2xl bg-surface-2 p-4 text-xs text-muted-foreground sm:grid-cols-2">
          {w3 && <span>Adding 3rd card → only <span className="font-semibold text-foreground">+AED {fmt(w3.incremental_vs_prev_aed)}/yr</span></span>}
          {w4 && <span>Adding 4th card → only <span className="font-semibold text-foreground">+AED {fmt(w4.incremental_vs_prev_aed)}/yr</span></span>}
        </div>
      </div>

      <NavRow onBack={onBack} onNext={onNext} nextLabel="Customize my wallet" />
    </section>
  )
}

// ─── Screen 4 — Wallet playground ────────────────────────────────────────────

function Screen4Wallet({ scoredCards, walletData, wallet, setWallet, onBack, onNext }: {
  scoredCards: ScoredCard[]; walletData: WalletResponse
  wallet: string[]; setWallet: (w: string[]) => void; onBack: () => void; onNext: () => void
}) {
  const [q, setQ] = useState('')
  const [detailCardId, setDetailCardId] = useState<string | null>(null)
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [pgScore, setPgScore] = useState<CustomScore | null>(null)
  const [pgLoading, setPgLoading] = useState(false)
  const [pgError, setPgError] = useState(false)
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
  }, [wallet, refreshTick])

  // Non-null spend categories for this user
  const activeCatsForFilter = SPEND_CATS.filter(k => (walletData.user_spend[k] ?? 0) > 0)

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
    else if (wallet.length < 4) setWallet([...wallet, id])
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
          See my final plan →
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
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
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
              const limit = !inW && wallet.length >= 4
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
                        <span className="font-medium text-emerald">{fmt(c.expected_annual_return_aed)}/yr</span>
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
                  <span>{wallet.length} / 4{pgLoading ? ' · calculating…' : ''}</span>
                  {(pgError || (!pgLoading && !pgScore && wallet.length > 0)) && (
                    <button onClick={() => setRefreshTick(t => t + 1)}
                      className="rounded-full bg-primary-foreground/15 px-2 py-0.5 text-[10px] font-semibold text-primary-foreground hover:bg-primary-foreground/25 transition-colors">
                      ↻ Refresh
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xs text-primary-foreground/70">Net annual value</div>
                <div className="font-display text-4xl font-bold tabular">{pgScore ? `AED ${fmt(Math.max(net, 0))}` : 'AED XX,XXX'}</div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                {[{ l: 'Gross', v: pgScore ? `AED ${fmt(gross)}` : 'AED XX,XXX' }, { l: 'Fees', v: pgScore ? `AED ${fmt(fees)}` : 'AED XX,XXX' }, { l: 'Effective', v: pgScore ? `${effective}%` : 'X.XX%' }].map(st => (
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
                  catEntries.sort((a, b) => b.route.annual_aed - a.route.annual_aed)
                  const totalMonthly = Math.round(catEntries.reduce((s, e) => s + e.route.annual_aed, 0) / 12)
                  const totalSpendOnCard = Math.round(catEntries.reduce((s, e) => s + e.route.monthly_spend_chunk, 0))
                  const topCats = catEntries.slice(0, 2).map(e => CAT_LABELS[e.key]).join(' & ')
                  const sharePct = totalMonthlyRewards > 0 ? Math.round((totalMonthly / totalMonthlyRewards) * 100) : 0
                  return { cardId, sc, catEntries, totalMonthly, totalSpendOnCard, topCats, sharePct }
                }).filter(d => d.catEntries.length > 0)

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

      <NavRow onBack={onBack} onNext={onNext} nextLabel="See my final plan" />


      {/* All UAE Cards modal */}
      {showAllCards && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowAllCards(false)}>
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
                  const full = !inW && wallet.length >= 4
                  return (
                    <li key={c.earnn_card_id} className="flex items-center gap-3 rounded-2xl border border-border/60 p-3">
                      <CardImg id={c.earnn_card_id} size="sm" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold text-sm text-primary">{c.card_name}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{c.bank_name}</span>
                          <span>·</span>
                          <span>Fee AED {fmt(c.true_annual_fee_aed)}</span>
                          <span className="text-emerald">+AED {fmt(c.expected_annual_return_aed)}/yr</span>
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
        </div>
      )}
      {detailCardId && <CardDetailPopup cardId={detailCardId} onClose={() => setDetailCardId(null)} />}
    </section>
  )
}

// ─── Screen 5 — Final ─────────────────────────────────────────────────────────

function Screen5Final({ scoredCards, walletData, wallet, onBack }: {
  scoredCards: ScoredCard[]; walletData: WalletResponse; wallet: string[]; onBack: () => void
}) {
  const [pgScore, setPgScore] = useState<CustomScore | null>(null)
  const [detailCardId, setDetailCardId] = useState<string | null>(null)
  const [cardDetails, setCardDetails] = useState<Record<string, Record<string, unknown>>>({})

  useEffect(() => {
    wallet.forEach(id => {
      fetchCardDetail(id).then(d => {
        if (d?.card) setCardDetails(prev => ({ ...prev, [id]: { ...d.card, card_summary_tag: d.card_summary_tag } as Record<string, unknown> }))
      }).catch(() => {})
    })
  }, [wallet])

  useEffect(() => {
    if (wallet.length === 0) return
    fetch('/api/rewards/wallet/custom', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ spend: walletData.user_spend, card_ids: wallet }),
    }).then(r => r.ok ? r.json() : null).then(d => { if (d) setPgScore(d) }).catch(() => {})
  }, [wallet, walletData.user_spend])

  const cards = wallet.map(id => scoredCards.find(c => c.earnn_card_id === id)!).filter(Boolean)
  const gross = pgScore?.gross_annual_aed ?? cards.reduce((s, c) => s + c.expected_annual_return_aed, 0)
  const fees  = cards.reduce((s, c) => s + c.true_annual_fee_aed, 0)
  const net   = pgScore?.net_annual_value_aed ?? (gross - fees)
  const avgBaseline = walletData.total_monthly * 12 * 0.01
  const multiplier = avgBaseline > 0 ? (net / avgBaseline).toFixed(1) : '–'

  const [pdfLoading, setPdfLoading] = useState(false)

  const handleDownloadPdf = async () => {
    setPdfLoading(true)
    try {
      const { downloadEarnnReport } = await import('@/lib/earnn-report')
      await downloadEarnnReport({
        cards,
        wallet: walletData.wallets.find(w => w.card_ids.join() === wallet.join()) ?? null,
        userSpend: walletData.user_spend,
        totalMonthly: walletData.total_monthly,
        categoryRouting: pgScore?.category_routing ?? {},
        generatedDate: new Date().toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' }),
        net, gross, fees,
      })
    } catch (e) { console.error(e) }
    finally { setPdfLoading(false) }
  }

  const handleEmail = () => {
    const subject = encodeURIComponent('My earnn Wallet Report')
    const cardNames = cards.map(c => `• ${c.card_name}`).join('%0A')
    const body = encodeURIComponent(
      `Here's my earnn.money recommended wallet:\n\n${cards.map(c => `• ${c.card_name} — AED ${Math.round(c.expected_annual_return_aed)}/yr`).join('\n')}\n\nEstimated annual rewards: AED ${Math.round(gross)}\nNet after fees: AED ${Math.round(net)}\n\nGenerated at earnn.money`
    )
    alert('Functionality coming soon')
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-soft px-3 py-1 text-xs font-semibold text-emerald">
          ✓ Plan locked in
        </span>
        <h1 className="font-display text-4xl font-bold tracking-tight text-primary sm:text-5xl">You're ready</h1>
        <p className="mx-auto max-w-xl text-base text-muted-foreground">
          Here's your final wallet and what it earns you. Apply in a few minutes — most cards approve same-day in the UAE.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[#0d1f4a] p-8 text-primary-foreground shadow-card">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary-foreground/70">You could earn</div>
            <div className="mt-2 font-display text-6xl font-bold tabular text-emerald">{pgScore ? `AED ${fmt(net)}` : 'AED XX,XXX'}</div>
            <div className="mt-1 text-sm text-primary-foreground/80">per year, after fees</div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-primary-foreground/10 p-4">
                <div className="text-xs text-primary-foreground/70">vs. average UAE cardholder</div>
                <div className="mt-1 font-display text-xl font-bold">{multiplier}× more rewards</div>
              </div>
              <div className="rounded-2xl bg-primary-foreground/10 p-4">
                <div className="text-xs text-primary-foreground/70">Cards in wallet</div>
                <div className="mt-1 font-display text-xl font-bold text-emerald">{cards.length}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <CardFan cardIds={cards.map(c => c.earnn_card_id)} names={cards.map(c => c.card_name)} size="lg" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
        <div className="text-sm font-semibold text-primary">Your Selected Cards</div>
        <ul className="divide-y divide-border/60">
          {cards.map(c => (
            <li key={c.earnn_card_id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-3">
              <CardImg id={c.earnn_card_id} size="sm" />
              <div className="min-w-0">
                <button onClick={() => setDetailCardId(c.earnn_card_id)}
                  className="truncate font-semibold text-primary hover:underline underline-offset-2 text-left">
                  {c.card_name}
                </button>
                <div className="text-xs text-muted-foreground">{c.bank_name ?? ''}</div>
                {(() => {
                  const d = cardDetails[c.earnn_card_id]
                  return (
                    <div className="mt-1 flex flex-nowrap gap-1 overflow-hidden">
                      {Object.entries(c.category_effective_rates)
                        .filter(([, rate]) => rate > 0)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 4)
                        .map(([cat, rate]) => {
                          const tierCapped = d?.[`is_tier_capped_${cat}`] === true || d?.[`is_tier_capped_${cat}`] === 'true'
                          const tierCapAed = tierCapped && d?.[`${cat}_tier_cap_aed`] ? Number(d[`${cat}_tier_cap_aed`]) : null
                          return (
                            <span key={cat} className="inline-flex items-center gap-0.5 rounded-md bg-surface-2 px-1.5 py-0.5 text-[12px] text-muted-foreground whitespace-nowrap">
                              {CAT_EMOJI[cat] || CAT_LABELS[cat] || cat} <span className="font-semibold text-primary">{(rate * 100).toFixed(1)}%</span>
                              {tierCapped && <span className="text-amber-600">{tierCapAed ? ` (cap AED ${fmt(tierCapAed)})` : ' (capped)'}</span>}
                            </span>
                          )
                        })}
                    </div>
                  )
                })()}
                {(() => {
                  const d = cardDetails[c.earnn_card_id]
                  if (!d) return null
                  const salary = d.min_salary_aed ? `AED ${fmt(Number(d.min_salary_aed))}` : 'Not specified'
                  const tag = d.card_summary_tag as string | undefined
                  return (
                    <div className="mt-1.5 flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1 text-[10px]">
                        <span className="text-muted-foreground/60">Salary Req.:</span>
                        <span className="font-medium text-foreground">{salary}</span>
                      </div>
                      {tag && (
                        <span className="inline-flex items-center rounded-full bg-[#EEF3FF] px-2 py-px text-[10px] font-medium text-[#0E3785]">{tag}</span>
                      )}
                    </div>
                  )
                })()}
              </div>
              <div className="flex flex-col items-end justify-between self-stretch py-0.5">
                <div className="text-right">
                  <div className="font-display font-bold text-emerald tabular text-sm">+AED {fmt(c.expected_annual_return_aed)}</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">Fee AED {fmt(c.true_annual_fee_aed)}</div>
                </div>
                <button
                  onClick={() => alert('Coming soon')}
                  className="mt-2 rounded-full border border-[#0E3785] px-3 py-1 text-[11px] font-semibold text-[#0E3785] hover:bg-[#EEF3FF] transition-colors"
                >
                  View &amp; Apply
                </button>
              </div>
            </li>
          ))}
        </ul>
        {detailCardId && <CardDetailPopup cardId={detailCardId} onClose={() => setDetailCardId(null)} />}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button onClick={() => alert('Coming soon')}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald px-5 py-3.5 text-sm font-semibold text-primary shadow-soft transition hover:opacity-90 sm:col-span-3">
          Apply for selected cards →
        </button>
        <button onClick={handleDownloadPdf} disabled={pdfLoading}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-primary transition hover:bg-surface-2 disabled:opacity-50">
          {pdfLoading ? '⏳ Generating…' : '⬇ Download PDF report'}
        </button>
        <button onClick={handleEmail}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-primary transition hover:bg-surface-2">
          ✉ Email me this plan
        </button>
        <button onClick={onBack}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-surface-2">
          ← Back to wallet
        </button>
      </div>
    </section>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ResultsPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [scoredCards, setScoredCards] = useState<ScoredCard[]>([])
  const [walletData, setWalletData] = useState<WalletResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [chosenStrategy, setChosenStrategy] = useState('')
  const [wallet, setWallet] = useState<string[]>([])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('earnn_result')
      if (!raw) { router.replace('/analyse'); return }
      const { data } = JSON.parse(raw)
      const cards: ScoredCard[] = data.scored_cards ?? []
      setScoredCards(cards)

      const applyWallet = (wd: WalletResponse) => {
        setWalletData(wd)
        const sorted = [...wd.wallets].sort((a: WalletEntry, b: WalletEntry) => a.n_cards - b.n_cards)
        let rec = sorted[0]
        for (const w of sorted.slice(1)) {
          if (w.incremental_vs_prev_aed > 1000) rec = w
          else break
        }
        if (rec) setWallet(rec.card_ids)
      }

      // Use pre-fetched wallet from sessionStorage if available (set by analyse page)
      const cachedWallet = sessionStorage.getItem('earnn_wallet')
      if (cachedWallet) {
        applyWallet(JSON.parse(cachedWallet))
        setLoading(false)
        // The analyse page already called /api/rewards/wallet which populated Railway's
        // in-memory _score_cache. No second warmup needed — /wallet/custom will hit the cache.
      } else {
        // Fallback: fetch wallet on-demand (e.g. direct navigation to /results)
        const userSpend: Record<string, number> = data.user_spend ?? {}
        getOptimalWallet(userSpend)
          .then((wd: WalletResponse) => applyWallet(wd))
          .catch((e: Error) => setError(e.message))
          .finally(() => setLoading(false))
      }
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }, [router])

  // Loading screen disabled — Screen 1 animation on analyse page covers this wait
  // if (loading) {
  //   return (
  //     <div className="min-h-screen bg-surface-2">
  //       <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
  //         <LoadingScreen />
  //       </main>
  //     </div>
  //   )
  // }

  if (error || !walletData || scoredCards.length === 0) {
    return (
      <div className="min-h-screen bg-surface-2">

        <main className="mx-auto max-w-6xl px-4 pb-24 pt-24 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-primary">Something went wrong</h2>
          <p className="mt-3 text-muted-foreground">{error ?? 'No results found.'}</p>
          <button onClick={() => router.push('/analyse')}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90">
            ← Start again
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-2">
      <Stepper current={step} onJump={setStep} />

      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 sm:px-6 lg:px-8">
        {step === 0 && <Screen1Hero scoredCards={scoredCards} walletData={walletData} onNext={() => setStep(1)} onExplore={() => setStep(1)} />}
        {step === 1 && <Screen4Wallet scoredCards={scoredCards} walletData={walletData} wallet={wallet} setWallet={setWallet} onBack={() => setStep(0)} onNext={() => setStep(2)} />}
        {step === 2 && <Screen5Final scoredCards={scoredCards} walletData={walletData} wallet={wallet.length > 0 ? wallet : (walletData.wallets.find(w => w.n_cards === 2)?.card_ids ?? [])} onBack={() => setStep(1)} />}
      </main>

      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <span>© {new Date().getFullYear()} earnn.money · AI credit card strategy for the UAE</span>
          <span>Estimates based on published reward rates. Actual rewards may vary.</span>
        </div>
      </footer>
    </div>
  )
}
