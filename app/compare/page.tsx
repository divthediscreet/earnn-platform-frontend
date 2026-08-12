'use client'
import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { fetchCards, fetchCardDetail, getCardImageUrl } from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface ApiCard {
  earnn_card_id: string
  card_name: string
  bank_name: string
  network: string
  reward_program_type: string | null
  reward_currency_name: string | null
  earnn_highlight: string | null
  min_salary_aed: number | null
  annual_fee_year1_aed: number | null
  annual_fee_from_year2_aed: number | null
  free_for_life: boolean
  has_lounge_access: boolean
  has_golf_benefit: boolean
  has_cinema_benefit: boolean
  has_dining_benefit: boolean
  has_travel_insurance: boolean
  has_welcome_bonus: boolean
  earnn_score: number
  rating_band: string
  card_ranking: number
  card_family: string | null
  effective_reward_rate: number
  expected_annual_return_aed: number
  true_annual_fee_aed: number
  nav_aed: number
  effective_reward_rate_dining: number
  effective_reward_rate_grocery: number
  effective_reward_rate_travel: number
  effective_reward_rate_fuel: number
  effective_reward_rate_online: number
  effective_reward_rate_retail: number
  effective_reward_rate_utility: number
  effective_reward_rate_all_spend: number
  display_reward_rate_dining: number
  display_reward_rate_grocery: number
  display_reward_rate_travel: number
  display_reward_rate_fuel: number
  display_reward_rate_online: number
  display_reward_rate_retail: number
  display_reward_rate_utility: number
  display_reward_rate_all_spend: number
}

interface CardDetail {
  card: Record<string, unknown>
  benefits: string[]
  best_for: string[]
  card_disclaimer: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
// Score-based gradient: dark green (100) → dark red (0)
function scoreColor(score: number): string {
  // Clamp 0-100, then lerp HSL: 142° green → 0° red
  const t = Math.max(0, Math.min(100, score)) / 100
  const hue = Math.round(t * 142)          // 0=red, 142=green
  const sat  = 72
  const light = 28 + (1 - t) * 8          // slightly lighter at bottom
  return `hsl(${hue}, ${sat}%, ${light}%)`
}

const RATE_PILLS = [
  { key: 'display_reward_rate_dining',    name: 'Dining',    icon: '🍽️' },
  { key: 'display_reward_rate_grocery',   name: 'Grocery',   icon: '🛒' },
  { key: 'display_reward_rate_travel',    name: 'Travel',    icon: '✈️' },
  { key: 'display_reward_rate_fuel',      name: 'Fuel',      icon: '⛽' },
  { key: 'display_reward_rate_online',    name: 'Online',    icon: '📦' },
  { key: 'display_reward_rate_retail',    name: 'Retail',    icon: '🛍️' },
  { key: 'display_reward_rate_utility',   name: 'Utility',   icon: '💡' },
  { key: 'display_reward_rate_all_spend', name: 'All Other', icon: '➕' },
]

const SALARY_BANDS = [
  { label: 'Any salary', min: 0 },
  { label: 'AED 5,000+', min: 5000 },
  { label: 'AED 8,000+', min: 8000 },
  { label: 'AED 15,000+', min: 15000 },
  { label: 'AED 20,000+', min: 20000 },
]

const NETWORK_OPTIONS = ['All Networks', 'Visa', 'Mastercard', 'Amex']
const PAGE_SIZE = 10

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
// Best card per family first, duplicates pushed to end (cards already sorted by card_ranking asc)
function promoteOneFamilyMember(cards: ApiCard[]): ApiCard[] {
  const seen = new Set<string>()
  const primaries: ApiCard[] = []
  const secondaries: ApiCard[] = []
  for (const card of cards) {
    const fk = card.card_family || card.earnn_card_id
    if (seen.has(fk)) {
      secondaries.push(card)
    } else {
      seen.add(fk)
      primaries.push(card)
    }
  }
  return [...primaries, ...secondaries]
}

function fmtRate(r: number): string {
  if (!r) return '0%'
  return `${(r * 100).toFixed(1)}%`
}

function effectiveFeeAed(card: ApiCard): number {
  if (card.free_for_life) return 0
  return card.true_annual_fee_aed ?? card.annual_fee_from_year2_aed ?? 0
}

function fmtScore(score: number): string {
  return score.toFixed(1)
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function ComparePage() {
  const [fromResults, setFromResults] = useState(false)

  const [cards, setCards]           = useState<ApiCard[]>([])
  const [loading, setLoading]       = useState(true)

  const [error, setError]           = useState<string | null>(null)
  const [details, setDetails]       = useState<Record<string, CardDetail>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)

  const [salaryMin, setSalaryMin]   = useState(0)
  const [network, setNetwork]       = useState('All Networks')
  const [bank, setBank]             = useState('All Banks')
  const [freeOnly, setFreeOnly]     = useState(false)
  const [sortCat, setSortCat]       = useState('')
  const [page, setPage]             = useState(1)

  // App preferences — multi-select sets (UI-only, backend wiring coming soon)
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set())
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const toggleApp = (key: string) => setSelectedApps(prev => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  // Benefit preferences (UI-only for now)
  const [prefLounge,   setPrefLounge]   = useState(false)
  const [prefGolf,     setPrefGolf]     = useState(false)
  const [prefCinema,   setPrefCinema]   = useState(false)
  const [prefTravel,   setPrefTravel]   = useState(false)
  const [prefWelcome,  setPrefWelcome]  = useState(false)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [hoverNav, setHoverNav]     = useState<string | null>(null)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [comingSoon, setComingSoon] = useState(false)

  // ── Read URL params on mount (avoids useSearchParams + Suspense requirement)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const isFromResults = params.get('from_results') === '1'
    const salary = parseFloat(params.get('salary') || '0') || 0
    setFromResults(isFromResults)
    if (salary > 0) {
      const bands = [20000, 15000, 8000, 5000, 0]
      setSalaryMin(bands.find(b => salary >= b) ?? 0)
    }
  }, [])

  // ── Fetch all cards on mount (min 2s display so heading is readable) ───
  useEffect(() => {
    const minDelay = new Promise<void>(res => setTimeout(res, 2000))
    Promise.all([
      fetchCards({ sort_by: 'card_ranking' })
        .then(d => setCards(promoteOneFamilyMember(d.cards || [])))
        .catch(e => setError(e.message)),
      minDelay,
    ]).finally(() => setLoading(false))
  }, [])

  // ── Fetch card detail lazily on expand ──────────────────────────────────
  const loadDetail = useCallback(async (cardId: string) => {
    if (details[cardId] || detailLoading === cardId) return
    setDetailLoading(cardId)
    try {
      const d = await fetchCardDetail(cardId)
      setDetails(prev => ({ ...prev, [cardId]: d }))
    } catch { /* non-fatal — expanded section shows fallback */ }
    finally { setDetailLoading(null) }
  }, [details, detailLoading])

  const handleExpand = useCallback((cardId: string) => {
    const next = expanded === cardId ? null : cardId
    setExpanded(next)
    if (next) loadDetail(next)
  }, [expanded, loadDetail])

  useEffect(() => {
    if (!comingSoon) return
    const t = setTimeout(() => setComingSoon(false), 2200)
    return () => clearTimeout(t)
  }, [comingSoon])

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdown) return
    const handler = () => setOpenDropdown(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openDropdown])

  // ── Derived bank list from loaded cards ────────────────────────────────
  const bankOptions = useMemo(() => {
    const names = Array.from(new Set(cards.map(c => c.bank_name).filter(Boolean))).sort()
    return ['All Banks', ...names]
  }, [cards])

  // ── Client-side filtering + sorting ────────────────────────────────────
  const filtered = useMemo(() => {
    const base = cards.filter(c => {
      if (salaryMin > 0 && c.min_salary_aed && c.min_salary_aed > salaryMin) return false
      if (network !== 'All Networks' && c.network?.toLowerCase() !== network.toLowerCase()) return false
      if (bank !== 'All Banks' && c.bank_name !== bank) return false
      if (freeOnly && !c.free_for_life) return false
      return true
    })
    if (!sortCat) return base
    const col = `display_reward_rate_${sortCat}` as keyof ApiCard
    return [...base].sort((a, b) => ((b[col] as number) ?? 0) - ((a[col] as number) ?? 0))
  }, [cards, salaryMin, network, bank, freeOnly, sortCat])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageCards  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleCompare = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }, [])

  const compareCards = compareIds.map(id => cards.find(c => c.earnn_card_id === id)!).filter(Boolean)

  // ── Loading / error states ──────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
      <style>{`
        @keyframes cmpCardSpin { 0% { transform: rotateY(0deg); } 50% { transform: rotateY(180deg); } 100% { transform: rotateY(360deg); } }
        .cmp-spin0 { animation: cmpCardSpin 1.4s ease-in-out infinite 0s; }
        .cmp-spin1 { animation: cmpCardSpin 1.4s ease-in-out infinite .28s; }
        .cmp-spin2 { animation: cmpCardSpin 1.4s ease-in-out infinite .56s; }
      `}</style>
      <div style={{ display: 'flex', gap: 14, perspective: 400 }}>
        {[['#0E3785','cmp-spin0'],['#059669','cmp-spin1'],['#1D4ED8','cmp-spin2']].map(([bg, cls], i) => (
          <div key={i} className={cls} style={{ width: 56, height: 36, borderRadius: 8, background: bg, boxShadow: '0 4px 16px rgba(0,0,0,0.18)' }} />
        ))}
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#0E3785', marginBottom: 6 }}>Fetching all UAE cards</div>
        <div style={{ fontSize: 13, color: '#5A6A85' }}>Customised as per average UAE resident spending</div>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ textAlign: 'center', padding: '80px 24px', color: '#DC2626' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <p style={{ fontWeight: 700 }}>Could not load cards</p>
      <p style={{ fontSize: 13, color: '#5A6A85' }}>{error}</p>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 100px' }}>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      {!fromResults && <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 24,
        background: 'linear-gradient(120deg, #0A2860 0%, #0E3785 60%, #163E8C 100%)',
        padding: '40px 40px', marginBottom: 28, color: 'white',
        boxShadow: '0 12px 44px rgba(14,55,133,0.25)'
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div style={{ position: 'relative', maxWidth: 860 }}>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 12 }}>
            ALL UAE CREDIT CARDS
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 3.4vw, 32px)', fontWeight: 800, lineHeight: 1.25, marginBottom: 10, color: 'white' }}>
            See what you’re actually likely to earn.
          </h1>
          <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, marginBottom: 24 }}>
            Earnnn Scores and reward rates are estimated using the spending patterns of an average UAE resident, accounting for reward caps, eligibility conditions, spending mix and the likelihood of earning each reward.
            <span style={{ display: 'block', marginTop: 10, fontStyle: 'italic', color: 'rgba(255,255,255,0.66)' }}>
              Displayed reward rates are Earnnn estimates, not banks’ advertised rates.
            </span>
          </p>
          <Link href="/analyse" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: '#C9A84C', color: '#0A2860', padding: '14px 30px', borderRadius: 10,
            fontSize: 15, fontWeight: 800, textDecoration: 'none',
            boxShadow: '0 8px 28px rgba(201,168,76,0.35)'
          }}>
            🎯 Calculate My Personal Rewards →
          </Link>
        </div>
      </div>}

      {/* ── FILTER BAR ───────────────────────────────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: 16, border: '1px solid #D6E0F5',
        marginBottom: 20, boxShadow: '0 2px 14px rgba(14,55,133,0.05)', overflow: 'hidden'
      }}>
        {/* Filter row */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, padding: '10px 14px' }}>

          {/* Salary */}
          <div style={{ ...filterGroupStyle, flex: 1 }}>
            <span style={filterLabelStyle}>Salary</span>
            <select value={salaryMin} onChange={e => { setSalaryMin(Number(e.target.value)); setPage(1) }} style={filterSelectStyle}>
              {SALARY_BANDS.map(b => <option key={b.label} value={b.min}>{b.label}</option>)}
            </select>
          </div>

          <div style={dividerStyle} />

          {/* Bank */}
          <div style={{ ...filterGroupStyle, flex: 1.6 }}>
            <span style={filterLabelStyle}>Bank</span>
            <select value={bank} onChange={e => { setBank(e.target.value); setPage(1) }} style={filterSelectStyle}>
              {bankOptions.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>

          <div style={dividerStyle} />

          {/* Network */}
          <div style={{ ...filterGroupStyle, flex: 1 }}>
            <span style={filterLabelStyle}>Network</span>
            <select value={network} onChange={e => { setNetwork(e.target.value); setPage(1) }} style={filterSelectStyle}>
              {NETWORK_OPTIONS.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>

          <div style={dividerStyle} />

          {/* Free for life */}
          <button onClick={() => { setFreeOnly(f => !f); setPage(1) }} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
            gap: 2, padding: '3px 11px 4px', borderRadius: 0, border: 'none',
            borderLeft: freeOnly ? '1.5px solid #00A67E' : 'none',
            borderRight: freeOnly ? '1.5px solid #00A67E' : 'none',
            background: freeOnly ? '#EAFBF5' : '#F4F6FB',
            color: freeOnly ? '#00785C' : '#5A6A85', cursor: 'pointer'
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: freeOnly ? '#00785C' : '#9DAEC8', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.4 }}>🆓 Fee</span>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Free for life{freeOnly ? ' ✓' : ''}</span>
          </button>

          <div style={dividerStyle} />

          {/* Sort by category */}
          <div style={{ ...filterGroupStyle, flex: 1.4 }}>
            <span style={filterLabelStyle}>Sort by</span>
            <select value={sortCat} onChange={e => { setSortCat(e.target.value); setPage(1) }} style={filterSelectStyle}>
              <option value="">Default (earnn rank)</option>
              {RATE_PILLS.map(c => <option key={c.key} value={c.key.replace('display_reward_rate_', '')}>{c.name} rate</option>)}
            </select>
          </div>

          {/* Result count */}
          <span style={{ marginLeft: 12, fontSize: 12, color: '#5A6A85', whiteSpace: 'nowrap', alignSelf: 'center' }}>
            <strong style={{ color: '#0D1828' }}>{filtered.length}</strong> cards · pg {page}/{totalPages}
          </span>
        </div>

        {/* Row 2 — Preferences: app dropdowns + benefit chips, all one row */}
        <div style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#FAFBFF' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#5A6A85', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>✨ I prefer:</span>

          {/* Food Delivery multi-select */}
          <MultiSelectDropdown
            label="🛵 Food Delivery"
            options={[
              { key: 'talabat',     name: 'Talabat'    },
              { key: 'noon_food',   name: 'Noon Food'  },
              { key: 'careem_food', name: 'Careem'     },
            ]}
            selected={selectedApps}
            onToggle={toggleApp}
            openKey="food"
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
          />

          {/* Grocery multi-select */}
          <MultiSelectDropdown
            label="🛒 Grocery"
            options={[
              { key: 'carrefour',    name: 'Carrefour'    },
              { key: 'noon_grocery', name: 'Noon'         },
              { key: 'amazon_fresh', name: 'Amazon Fresh' },
              { key: 'lulu',         name: 'Lulu'         },
              { key: 'spinneys',     name: 'Spinneys'     },
            ]}
            selected={selectedApps}
            onToggle={toggleApp}
            openKey="grocery"
            openDropdown={openDropdown}
            setOpenDropdown={setOpenDropdown}
          />

          <div style={dividerStyle} />

          {/* Benefit chips */}
          {[
            { key: 'lounge',  label: '🛫 Lounge',          val: prefLounge,  set: setPrefLounge  },
            { key: 'golf',    label: '⛳ Golf',             val: prefGolf,    set: setPrefGolf    },
            { key: 'cinema',  label: '🎬 Cinema',           val: prefCinema,  set: setPrefCinema  },
            { key: 'travel',  label: '🌍 Travel Insurance', val: prefTravel,  set: setPrefTravel  },
            { key: 'welcome', label: '🎁 Welcome Bonus',    val: prefWelcome, set: setPrefWelcome },
          ].map(p => (
            <button key={p.key} onClick={() => p.set(v => !v)} style={{
              padding: '4px 10px', borderRadius: 100, fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
              border: p.val ? '1.5px solid #0E3785' : '1.5px solid #E4EAF5',
              background: p.val ? '#EEF3FF' : 'white',
              color: p.val ? '#0E3785' : '#5A6A85', transition: 'all 0.12s'
            }}>{p.label}{p.val ? ' ✓' : ''}</button>
          ))}

          <span style={{ fontSize: 10.5, color: '#C2CCDD', marginLeft: 'auto', whiteSpace: 'nowrap' }}>personalisation coming soon</span>
        </div>
      </div>

      {/* ── CARD TILES ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pageCards.map(card => (
          <CardTile
            key={card.earnn_card_id}
            card={card}
            detail={details[card.earnn_card_id] || null}
            detailLoading={detailLoading === card.earnn_card_id}
            inCompare={compareIds.includes(card.earnn_card_id)}
            compareFull={compareIds.length >= 3 && !compareIds.includes(card.earnn_card_id)}
            onToggleCompare={(e) => { e?.stopPropagation(); setComingSoon(true) }}
            expanded={expanded === card.earnn_card_id}
            onExpand={() => handleExpand(card.earnn_card_id)}
            onHover={() => loadDetail(card.earnn_card_id)}
            hoverNav={hoverNav}
            setHoverNav={setHoverNav}
          />
        ))}
      </div>

      {/* ── PAGINATION ───────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
          <button disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} style={pagerBtn(page <= 1)}>← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPage(n)} style={{
              ...pagerBtn(false),
              background: page === n ? '#0E3785' : 'white',
              color: page === n ? 'white' : '#5A6A85',
              borderColor: page === n ? '#0E3785' : '#D6E0F5', minWidth: 40
            }}>{n}</button>
          ))}
          <button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={pagerBtn(page >= totalPages)}>Next →</button>
        </div>
      )}

      {/* ── COMPARISON TABLE ─────────────────────────────────────────────── */}
      {compareCards.length > 0 && (
        <div style={{ marginTop: 56 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: '#0E3785' }}>
              ⚖️ Comparing {compareCards.length} card{compareCards.length > 1 ? 's' : ''}{' '}
              <span style={{ color: '#5A6A85', fontWeight: 500, fontSize: 14 }}>(up to 3)</span>
            </h2>
            <button onClick={() => setCompareIds([])} style={{ fontSize: 13, fontWeight: 600, color: '#5A6A85', background: '#EEF3FF', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
              Clear all
            </button>
          </div>
          <ComparisonTable
            cards={compareCards}
            details={details}
            onRemove={(id) => toggleCompare(id)}
            hoverNav={hoverNav}
            setHoverNav={setHoverNav}
          />
        </div>
      )}

      {/* Coming soon toast */}
      {comingSoon && (
        <div style={{
          position: 'fixed', bottom: 36, left: '50%', transform: 'translateX(-50%)', zIndex: 200,
          background: '#0D1828', color: 'white', padding: '14px 28px', borderRadius: 100,
          fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 16px 48px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span style={{ fontSize: 17 }}>🚀</span> Coming Soon — apply directly through earnn very soon!
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// CARD TILE — new layout
// ─────────────────────────────────────────────────────────────────────────────
function CardTile({ card, detail, detailLoading, inCompare, compareFull, onToggleCompare, expanded, onExpand, onHover, hoverNav, setHoverNav }: {
  card: ApiCard
  detail: CardDetail | null
  detailLoading: boolean
  inCompare: boolean
  compareFull: boolean
  onToggleCompare: (e?: React.MouseEvent) => void
  expanded: boolean
  onExpand: () => void
  onHover: () => void
  hoverNav: string | null
  setHoverNav: (v: string | null) => void
}) {
  const fee = effectiveFeeAed(card)
  const navKey = `earn_${card.earnn_card_id}`

  // Fixed importance order — always all 8, split into 2 columns of 4
  const allBars = RATE_PILLS.map(p => ({
    ...p,
    rate: (card[p.key as keyof ApiCard] as number) || 0,
    catKey: p.key.replace('display_reward_rate_', ''),
  }))
  const leftBars  = allBars.slice(0, 4)   // Dining, Grocery, Travel, Fuel
  const rightBars = allBars.slice(4)       // Online, Retail, Utility, All Other

  // Max rate across all 8 for consistent bar scaling
  const maxRate = Math.max(...allBars.map(p => p.rate), 0.001)

  return (
    <div
      onClick={onExpand}
      onMouseEnter={onHover}
      style={{
        position: 'relative', background: 'white', borderRadius: 16, cursor: 'pointer', overflow: 'visible',
        border: inCompare ? '2px solid #0E3785' : expanded ? '1.5px solid #C2CCDD' : '1px solid #D6E0F5',
        boxShadow: inCompare ? '0 8px 28px rgba(14,55,133,0.14)' : '0 2px 12px rgba(14,55,133,0.05)',
        transition: 'all 0.18s'
      }}>

      {/* ── HEADER ROW: rank · name · score badge · button ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderBottom: '1px solid #EEF3FF',
        background: inCompare ? '#F0F4FF' : 'white'
      }}>
        {/* Name + bank */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: '#0D1828', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.card_name}
          </div>
          <div style={{ fontSize: 11.5, color: '#5A6A85', marginTop: 2 }}>
            {card.bank_name} · {card.network}
            {card.free_for_life && <span style={{ marginLeft: 8, background: '#EAFBF4', color: '#00785C', fontWeight: 700, fontSize: 10, padding: '2px 7px', borderRadius: 100 }}>FREE FOR LIFE</span>}
          </div>
        </div>

        {/* Score badge inline — hover tooltip */}
        <div
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, background: scoreColor(card.earnn_score), borderRadius: 8, padding: '5px 10px', color: 'white', position: 'relative', cursor: 'help' }}
          onMouseEnter={() => setHoverNav(`score_${card.earnn_card_id}`)}
          onMouseLeave={() => setHoverNav(null)}
          onClick={e => e.stopPropagation()}
        >
          <span style={{ fontSize: 15, fontWeight: 800 }}>⭐ {fmtScore(card.earnn_score)}</span>
          <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>{card.rating_band}</span>
          {hoverNav === `score_${card.earnn_card_id}` && (
            <InlineTooltip text="earnn Score is hyper-personalised — it varies based on your spending pattern. This score reflects how well this card works for you." />
          )}
        </div>

        {/* View & Apply button — coming soon */}
        <button onClick={(e) => { e.stopPropagation(); onToggleCompare(e) }} style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 100, border: 'none',
          cursor: 'pointer', background: '#EEF3FF', color: '#0E3785',
          fontSize: 12, fontWeight: 700
        }}>
          View &amp; Apply
        </button>
      </div>

      {/* ── BODY ROW: image | rate bars | earn up to | fee ── */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>

        {/* Card image + effective rate */}
        <div style={{ flexShrink: 0, padding: '12px 12px 12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <img src={getCardImageUrl(card.earnn_card_id)} alt={card.card_name} width={108} height={66} loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }}
            style={{ borderRadius: 8, objectFit: 'cover', boxShadow: '0 4px 16px rgba(14,55,133,0.2)', display: 'block' }} />
          {card.effective_reward_rate > 0 && (() => {
            const rate = card.effective_reward_rate * 100
            const hue = Math.round((rate / 10) * 142)
            const bg = `hsl(${hue}, 72%, 32%)`
            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ width: 46, height: 46, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 2px 8px ${bg}66` }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'white', lineHeight: 1 }}>{rate.toFixed(1)}%</span>
                </div>
                <div style={{ fontSize: 8, fontWeight: 600, color: '#7A8BA8', textAlign: 'center', lineHeight: 1.3, maxWidth: 60 }}>Overall Effective Rate</div>
              </div>
            )
          })()}
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: '#EEF3FF', margin: '12px 0' }} />

        {/* Rate bars — 2 columns × 4 rows, fixed positions */}
        <div style={{ flex: 1, padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', alignItems: 'center', minWidth: 0 }}>
          {[leftBars, rightBars].map((col, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {col.map(p => {
                const tooltipKey = `bar_${card.earnn_card_id}_${p.key}`
                return (
                  <div key={p.key}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}
                    onMouseEnter={() => setHoverNav(tooltipKey)}
                    onMouseLeave={() => setHoverNav(null)}
                    onClick={e => e.stopPropagation()}
                  >
                    <span style={{ fontSize: 11, flexShrink: 0, width: 14 }}>{p.icon}</span>
                    <span style={{ fontSize: 11, color: p.rate > 0 ? '#3D4B63' : '#C2CCDD', width: 48, flexShrink: 0, cursor: 'default' }}>{p.name}</span>
                    {/* Bar track */}
                    <div style={{ flex: 1, height: 6, background: '#F0F2F7', borderRadius: 100, overflow: 'hidden' }}>
                      {p.rate > 0 && (
                        <div style={{
                          height: '100%', borderRadius: 100,
                          width: `${Math.round((p.rate / maxRate) * 100)}%`,
                          background: '#8B2E2E',
                          transition: 'width 0.4s ease'
                        }} />
                      )}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: p.rate > 0 ? '#0D1828' : '#C2CCDD', width: 36, textAlign: 'right', flexShrink: 0 }}>{fmtRate(p.rate)}</span>
                    {/* Hover tooltip */}
                    {hoverNav === tooltipKey && (
                      <span style={{
                        position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                        background: '#0D1828', color: 'white', fontSize: 11.5, fontWeight: 600,
                        padding: '5px 10px', borderRadius: 7, whiteSpace: 'nowrap', zIndex: 80,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.25)'
                      }}>
                        {p.name}: {fmtRate(p.rate)}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: '#EEF3FF', margin: '12px 0' }} />

        {/* Earn Up To — hero number */}
        <div
          style={{ flexShrink: 0, width: 130, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, position: 'relative', cursor: 'help' }}
          onMouseEnter={() => setHoverNav(navKey)} onMouseLeave={() => setHoverNav(null)}
          onClick={e => e.stopPropagation()}
        >
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#5A6A85', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1.5px dotted #9CA3AF' }}>Earn Up To</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: '#00A67E', lineHeight: 1.1 }}>
            AED {Math.round(card.expected_annual_return_aed).toLocaleString()}
          </span>
          <span style={{ fontSize: 10.5, color: '#9CA3AF' }}>per year</span>
          {hoverNav === navKey && (
            <InlineTooltip text="Calculating how much you could potentially earn annually — based on your spending pattern across all categories." />
          )}
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: '#EEF3FF', margin: '12px 0' }} />

        {/* Effective Fee */}
        <div
          style={{ flexShrink: 0, width: 110, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, position: 'relative', cursor: 'help', background: fee === 0 ? '#FAFFFE' : '#FFFAF6' }}
          onMouseEnter={() => setHoverNav(`fee_${card.earnn_card_id}`)} onMouseLeave={() => setHoverNav(null)}
          onClick={e => e.stopPropagation()}
        >
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#5A6A85', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1.5px dotted #9CA3AF' }}>Eff. Fee</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: fee === 0 ? '#00A67E' : '#C95B00', lineHeight: 1.1 }}>
            AED {(card.true_annual_fee_aed ?? 0).toLocaleString()}
          </span>
          <span style={{ fontSize: 10.5, color: '#9CA3AF' }}>per year</span>
          {hoverNav === `fee_${card.earnn_card_id}` && (
            <InlineTooltip text="Estimating how much you could pay in annual fees based on your spending — after waivers and first-year offers." />
          )}
        </div>

      </div>

      {/* Expand / collapse caret */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
        <span style={{ fontSize: 10, color: '#C2CCDD', fontWeight: 700, letterSpacing: '0.06em' }}>
          {expanded ? 'HIDE DETAILS ▲' : 'MORE DETAILS ▼'}
        </span>
      </div>

      {/* ── EXPANDED SECTION ── */}
      {expanded && (
        <div onClick={e => e.stopPropagation()} style={{
          borderTop: '1px solid #EEF3FF', padding: '20px 24px', background: '#FBFCFF',
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24
        }}>
          {detailLoading ? (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px 0', color: '#5A6A85', fontSize: 13 }}>Loading card details…</div>
          ) : detail ? (
            <>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#0E3785', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>🎁 Top Benefits</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {detail.benefits.length > 0 ? detail.benefits.map((b, i) => <li key={i} style={{ fontSize: 13, color: '#0D1828', lineHeight: 1.5 }}>• {b}</li>) : <li style={{ fontSize: 13, color: '#9CA3AF' }}>No featured benefits listed</li>}
                </ul>
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#00A67E', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>💡 Best For</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {detail.best_for.length > 0 ? detail.best_for.map((b, i) => <li key={i} style={{ fontSize: 13, color: '#0D1828', lineHeight: 1.5 }}>• {b}</li>) : <li style={{ fontSize: 13, color: '#9CA3AF' }}>—</li>}
                </ul>
              </div>
              <div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#5A6A85', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>⚠️ Things To Note</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {detail.card_disclaimer.length > 0 ? detail.card_disclaimer.map((d, i) => <li key={i} style={{ fontSize: 12.5, color: '#5A6A85', lineHeight: 1.6, fontStyle: 'italic' }}>• {d}</li>) : <li style={{ fontSize: 13, color: '#9CA3AF' }}>—</li>}
                </ul>
              </div>
            </>
          ) : (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '20px 0', color: '#9CA3AF', fontSize: 13 }}>Could not load card details</div>
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPARISON TABLE
// ─────────────────────────────────────────────────────────────────────────────
function ComparisonTable({ cards, details, onRemove, hoverNav, setHoverNav }: {
  cards: ApiCard[]
  details: Record<string, CardDetail>
  onRemove: (id: string) => void
  hoverNav: string | null
  setHoverNav: (v: string | null) => void
}) {
  const rowLabel = (): React.CSSProperties => ({
    fontSize: 12.5, fontWeight: 700, color: '#5A6A85', letterSpacing: '0.04em',
    textTransform: 'uppercase', padding: '16px 20px', verticalAlign: 'top', whiteSpace: 'nowrap'
  })
  const cell: React.CSSProperties = { padding: '16px 20px', verticalAlign: 'top', borderLeft: '1px solid #EEF3FF' }

  return (
    <div style={{ background: 'white', borderRadius: 20, border: '1px solid #D6E0F5', overflow: 'hidden', boxShadow: '0 8px 32px rgba(14,55,133,0.08)' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead>
            <tr style={{ background: 'linear-gradient(135deg, #0E3785 0%, #0A2860 100%)' }}>
              <th style={{ ...rowLabel(), color: 'rgba(255,255,255,0.65)', background: 'transparent' }}>Card</th>
              {cards.map(c => (
                <th key={c.earnn_card_id} style={{ ...cell, borderLeft: '1px solid rgba(255,255,255,0.12)', minWidth: 220 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{c.bank_name}</div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: 'white', marginTop: 2 }}>{c.card_name}</div>
                      </div>
                      <button onClick={() => onRemove(c.earnn_card_id)} style={{
                        background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, color: 'white',
                        width: 24, height: 24, fontSize: 13, cursor: 'pointer', flexShrink: 0
                      }}>✕</button>
                    </div>
                    <img src={getCardImageUrl(c.earnn_card_id)} alt={c.card_name} width={110} height={70} loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }}
                      style={{ borderRadius: 8, objectFit: 'cover' }} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: '#F8FAFF' }}>
              <td style={rowLabel()}>⭐ earnn Score</td>
              {cards.map(c => (
                <td key={c.earnn_card_id} style={cell}>
                  <span style={{
                    display: 'inline-block', padding: '5px 12px', borderRadius: 100, fontSize: 13, fontWeight: 800,
                    background: scoreColor(c.earnn_score) + '22', color: scoreColor(c.earnn_score)
                  }}>{fmtScore(c.earnn_score)} · {c.rating_band}</span>
                </td>
              ))}
            </tr>
            <tr>
              <td style={rowLabel()}>💳 Effective Fee</td>
              {cards.map(c => {
                const fee = effectiveFeeAed(c)
                return (
                  <td key={c.earnn_card_id} style={{ ...cell, fontSize: 15, fontWeight: 800, color: fee === 0 ? '#00A67E' : '#C95B00' }}>
                    AED {fee.toLocaleString()} /yr
                  </td>
                )
              })}
            </tr>
            <tr style={{ background: '#F8FAFF' }}>
              <td style={rowLabel()}>📈 Estimated Reward</td>
              {cards.map(c => (
                <td key={c.earnn_card_id} style={{ ...cell, fontSize: 15, fontWeight: 800, color: '#00A67E' }}>
                  <NavTableTooltip id={c.earnn_card_id} value={c.nav_aed} hoverNav={hoverNav} setHoverNav={setHoverNav} />
                </td>
              ))}
            </tr>
            <tr>
              <td style={rowLabel()}>🏆 Effective Rates</td>
              {cards.map(c => (
                <td key={c.earnn_card_id} style={cell}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {RATE_PILLS.map(p => {
                      const rate = c[p.key as keyof ApiCard] as number
                      if (!rate) return null
                      return (
                        <div key={p.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                          <span style={{ color: '#5A6A85' }}>{p.icon} {p.name}</span>
                          <span style={{ fontWeight: 800, color: '#0E3785' }}>{fmtRate(rate)}</span>
                        </div>
                      )
                    })}
                  </div>
                </td>
              ))}
            </tr>
            <tr style={{ background: '#F8FAFF' }}>
              <td style={rowLabel()}>🎁 Top Benefits</td>
              {cards.map(c => {
                const d = details[c.earnn_card_id]
                return (
                  <td key={c.earnn_card_id} style={cell}>
                    {d ? (
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {d.benefits.slice(0, 4).map((b, i) => <li key={i} style={{ fontSize: 12, color: '#0D1828', lineHeight: 1.5 }}>• {b}</li>)}
                        {d.benefits.length === 0 && <li style={{ fontSize: 12, color: '#9CA3AF' }}>—</li>}
                      </ul>
                    ) : <span style={{ fontSize: 12, color: '#9CA3AF' }}>Expand card to load</span>}
                  </td>
                )
              })}
            </tr>
            <tr>
              <td style={rowLabel()}>💡 Best For</td>
              {cards.map(c => {
                const d = details[c.earnn_card_id]
                return (
                  <td key={c.earnn_card_id} style={{ ...cell, fontSize: 12.5, color: '#0D1828', lineHeight: 1.6 }}>
                    {d ? (
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {d.best_for.slice(0, 3).map((b, i) => <li key={i} style={{ fontSize: 12, color: '#0D1828', lineHeight: 1.5 }}>• {b}</li>)}
                        {d.best_for.length === 0 && <li style={{ fontSize: 12, color: '#9CA3AF' }}>—</li>}
                      </ul>
                    ) : <span style={{ fontSize: 12, color: '#9CA3AF' }}>Expand card to load</span>}
                  </td>
                )
              })}
            </tr>
            <tr style={{ background: '#F8FAFF' }}>
              <td style={rowLabel()}>⚠️ Things To Note</td>
              {cards.map(c => {
                const d = details[c.earnn_card_id]
                return (
                  <td key={c.earnn_card_id} style={{ ...cell, fontSize: 11.5, color: '#5A6A85', lineHeight: 1.6, fontStyle: 'italic' }}>
                    {d ? (
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>
                        {d.card_disclaimer.slice(0, 3).map((d2, i) => <li key={i} style={{ fontSize: 11.5, color: '#5A6A85', lineHeight: 1.5 }}>• {d2}</li>)}
                        {d.card_disclaimer.length === 0 && <li style={{ fontSize: 12, color: '#9CA3AF' }}>—</li>}
                      </ul>
                    ) : <span style={{ fontSize: 12, color: '#9CA3AF' }}>Expand card to load</span>}
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ padding: '20px 24px', background: '#EEF3FF', textAlign: 'center' }}>
        <Link href="/analyse" style={{ background: '#0E3785', color: 'white', padding: '13px 32px', borderRadius: 10, textDecoration: 'none', fontWeight: 700, fontSize: 14.5 }}>
          🎯 Get my personalised numbers for these cards →
        </Link>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SMALL HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function NavTooltip({ id, hoverNav, setHoverNav }: { id: string; hoverNav: string | null; setHoverNav: (v: string | null) => void }) {
  const key = `earn_${id}`
  return (
    <span style={{ position: 'relative', lineHeight: 1 }}
      onMouseEnter={() => setHoverNav(key)} onMouseLeave={() => setHoverNav(null)}
      onClick={e => e.stopPropagation()}>
      <span style={{ fontSize: 11, fontWeight: 700, color: '#5A6A85', borderBottom: '1.5px dotted #5A6A85', cursor: 'help', textTransform: 'uppercase', letterSpacing: '0.03em', lineHeight: 1 }}>Earn Up To</span>
      {hoverNav === key && <Tooltip text="Expected yearly rewards minus the true annual fee (after waivers) — what this card puts in your pocket." />}
    </span>
  )
}

function NavTableTooltip({ id, value, hoverNav, setHoverNav }: { id: string; value: number; hoverNav: string | null; setHoverNav: (v: string | null) => void }) {
  const key = `nav_tbl_${id}`
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setHoverNav(key)} onMouseLeave={() => setHoverNav(null)}>
      <span style={{ borderBottom: '1.5px dotted #5A6A85', cursor: 'help' }}>
        AED {Math.round(value).toLocaleString()}
      </span>
      {hoverNav === key && <Tooltip text="Expected yearly rewards minus the true annual fee (after waivers)." />}
    </span>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-SELECT DROPDOWN
// ─────────────────────────────────────────────────────────────────────────────
function MultiSelectDropdown({ label, options, selected, onToggle, openKey, openDropdown, setOpenDropdown }: {
  label: string
  options: { key: string; name: string }[]
  selected: Set<string>
  onToggle: (key: string) => void
  openKey: string
  openDropdown: string | null
  setOpenDropdown: (v: string | null) => void
}) {
  const isOpen     = openDropdown === openKey
  const activeCount = options.filter(o => selected.has(o.key)).length

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpenDropdown(isOpen ? null : openKey) }}
        style={{
          display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px 4px 11px',
          borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer',
          border: activeCount > 0 ? '1.5px solid #C9A84C' : '1.5px solid #E4EAF5',
          background: activeCount > 0 ? '#FFF8E7' : isOpen ? '#F4F6FB' : 'white',
          color: activeCount > 0 ? '#8B6200' : '#3D4B63',
          transition: 'all 0.12s'
        }}>
        <span>{label}</span>
        {activeCount > 0 && (
          <span style={{ background: '#C9A84C', color: 'white', fontSize: 10, fontWeight: 800, borderRadius: 100, padding: '1px 6px', minWidth: 16, textAlign: 'center' }}>
            {activeCount}
          </span>
        )}
        <span style={{ fontSize: 9, color: '#8896AD', marginLeft: 2 }}>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 300,
            background: 'white', borderRadius: 10, border: '1px solid #D6E0F5',
            boxShadow: '0 8px 28px rgba(14,55,133,0.14)', padding: '6px 4px', minWidth: 160
          }}>
          {options.map(opt => {
            const checked = selected.has(opt.key)
            return (
              <label key={opt.key} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 12px', cursor: 'pointer', borderRadius: 7,
                background: checked ? '#FFF8E7' : 'transparent',
                transition: 'background 0.1s'
              }}>
                <input type="checkbox" checked={checked} onChange={() => onToggle(opt.key)}
                  style={{ accentColor: '#C9A84C', width: 14, height: 14, cursor: 'pointer' }} />
                <span style={{ fontSize: 12.5, fontWeight: checked ? 700 : 500, color: checked ? '#8B6200' : '#3D4B63' }}>
                  {opt.name}
                </span>
              </label>
            )
          })}
          {options.some(o => selected.has(o.key)) && (
            <div style={{ borderTop: '1px solid #EEF3FF', margin: '4px 0' }}>
              <button onClick={() => options.forEach(o => selected.has(o.key) && onToggle(o.key))}
                style={{ width: '100%', padding: '5px', fontSize: 11, fontWeight: 700, color: '#9CA3AF', background: 'none', border: 'none', cursor: 'pointer' }}>
                Clear
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Generic tooltip — positions BELOW the element (safe, never clipped by sibling tiles)
function Tooltip({ text }: { text: string }) {
  return (
    <span style={{
      position: 'absolute', top: '120%', left: '50%', transform: 'translateX(-50%)',
      background: '#0D1828', color: 'white', fontSize: 12, lineHeight: 1.6, fontWeight: 400,
      padding: '10px 14px', borderRadius: 10, width: 240, zIndex: 200,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)', textAlign: 'center', fontStyle: 'normal',
      pointerEvents: 'none'
    }}>{text}</span>
  )
}

// Inline tooltip for use inside card tiles — same but below, centred
function InlineTooltip({ text }: { text: string }) {
  return (
    <span style={{
      position: 'absolute', top: '110%', left: '50%', transform: 'translateX(-50%)',
      background: '#0D1828', color: 'white', fontSize: 12, lineHeight: 1.6, fontWeight: 400,
      padding: '10px 14px', borderRadius: 10, width: 240, zIndex: 200,
      boxShadow: '0 8px 24px rgba(0,0,0,0.28)', textAlign: 'center', fontStyle: 'normal',
      pointerEvents: 'none', whiteSpace: 'normal'
    }}>{text}</span>
  )
}

const selectStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8, border: '1.5px solid #D6E0F5',
  background: '#F8FAFF', color: '#0D1828', fontSize: 13, fontWeight: 600,
  cursor: 'pointer', outline: 'none'
}

// Compact filter group — label sits flush above/beside the select
const filterGroupStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
  background: '#F4F6FB', border: 'none', paddingTop: 3, paddingBottom: 4
}
const filterLabelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: '#9DAEC8',
  textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
  lineHeight: 1.4, textAlign: 'center'
}
const filterSelectStyle: React.CSSProperties = {
  width: '100%', padding: '0 8px', height: 24, border: 'none', background: 'transparent',
  color: '#0D1828', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none', textAlign: 'center'
}
const dividerStyle: React.CSSProperties = {
  width: 1, height: 20, background: '#E4EAF5', flexShrink: 0
}

function pagerBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: '9px 16px', borderRadius: 8, fontSize: 13.5, fontWeight: 600,
    border: '1.5px solid #D6E0F5', background: 'white',
    color: disabled ? '#C2CCDD' : '#5A6A85',
    cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s'
  }
}
