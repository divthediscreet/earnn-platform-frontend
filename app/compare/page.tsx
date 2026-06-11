'use client'
import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { fetchCards, fetchCardDetail } from '@/lib/api'

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
  { key: 'effective_reward_rate_dining',    name: 'Dining',    icon: '🍽️' },
  { key: 'effective_reward_rate_grocery',   name: 'Grocery',   icon: '🛒' },
  { key: 'effective_reward_rate_travel',    name: 'Travel',    icon: '✈️' },
  { key: 'effective_reward_rate_fuel',      name: 'Fuel',      icon: '⛽' },
  { key: 'effective_reward_rate_online',    name: 'Online',    icon: '📦' },
  { key: 'effective_reward_rate_retail',    name: 'Retail',    icon: '🛍️' },
  { key: 'effective_reward_rate_utility',   name: 'Utility',   icon: '💡' },
  { key: 'effective_reward_rate_all_spend', name: 'All Other', icon: '➕' },
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
  const [cards, setCards]           = useState<ApiCard[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [details, setDetails]       = useState<Record<string, CardDetail>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)

  const [salaryMin, setSalaryMin]   = useState(0)
  const [network, setNetwork]       = useState('All Networks')
  const [bank, setBank]             = useState('All Banks')
  const [freeOnly, setFreeOnly]     = useState(false)
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

  // ── Fetch all cards on mount ────────────────────────────────────────────
  useEffect(() => {
    fetchCards({ sort_by: 'card_ranking' })
      .then(d => setCards(d.cards || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
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

  // ── Client-side filtering ───────────────────────────────────────────────
  const filtered = useMemo(() => cards.filter(c => {
    if (salaryMin > 0 && c.min_salary_aed && c.min_salary_aed > salaryMin) return false
    if (network !== 'All Networks' && c.network?.toLowerCase() !== network.toLowerCase()) return false
    if (bank !== 'All Banks' && c.bank_name !== bank) return false
    if (freeOnly && !c.free_for_life) return false
    return true
  }), [cards, salaryMin, network, bank, freeOnly])

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #EEF3FF', borderTopColor: '#0E3785', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#5A6A85', fontSize: 14 }}>Loading 155 UAE credit cards…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
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
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 24,
        background: 'linear-gradient(120deg, #0A2860 0%, #0E3785 60%, #163E8C 100%)',
        padding: '40px 40px', marginBottom: 28, color: 'white',
        boxShadow: '0 12px 44px rgba(14,55,133,0.25)'
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div style={{ position: 'relative', maxWidth: 760 }}>
          <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 12 }}>
            Compare UAE Credit Cards
          </div>
          <h1 style={{ fontSize: 'clamp(24px, 3.4vw, 32px)', fontWeight: 800, lineHeight: 1.25, marginBottom: 10, color: 'white' }}>
            Credit card rewards are highly personal.
          </h1>
          <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, marginBottom: 24 }}>
            Rankings below are calculated using spending patterns of an average UAE resident.
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
      </div>

      {/* ── FILTER BAR ───────────────────────────────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: 16, border: '1px solid #D6E0F5',
        marginBottom: 20, boxShadow: '0 2px 14px rgba(14,55,133,0.05)', overflow: 'hidden'
      }}>
        {/* Row 1 — dropdowns + toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 14px', borderBottom: '1px solid #EEF3FF' }}>

          {/* Salary */}
          <div style={filterGroupStyle}>
            <span style={filterLabelStyle}>💼 Salary</span>
            <select value={salaryMin} onChange={e => { setSalaryMin(Number(e.target.value)); setPage(1) }} style={filterSelectStyle}>
              {SALARY_BANDS.map(b => <option key={b.label} value={b.min}>{b.label}</option>)}
            </select>
          </div>

          <div style={dividerStyle} />

          {/* Bank */}
          <div style={filterGroupStyle}>
            <span style={filterLabelStyle}>🏦 Bank</span>
            <select value={bank} onChange={e => { setBank(e.target.value); setPage(1) }} style={filterSelectStyle}>
              {bankOptions.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>

          <div style={dividerStyle} />

          {/* Network */}
          <div style={filterGroupStyle}>
            <span style={filterLabelStyle}>🌐 Network</span>
            <select value={network} onChange={e => { setNetwork(e.target.value); setPage(1) }} style={filterSelectStyle}>
              {NETWORK_OPTIONS.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>

          <div style={dividerStyle} />

          {/* Free for life */}
          <button onClick={() => { setFreeOnly(f => !f); setPage(1) }} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 7,
            border: freeOnly ? '1.5px solid #00A67E' : '1.5px solid #D6E0F5',
            background: freeOnly ? '#EAFBF5' : '#F8FAFF',
            color: freeOnly ? '#00785C' : '#5A6A85', fontSize: 12, fontWeight: 700, cursor: 'pointer'
          }}>
            🆓 Free for life{freeOnly ? ' ✓' : ''}
          </button>

          {/* Result count */}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#5A6A85', whiteSpace: 'nowrap' }}>
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
    catKey: p.key.replace('effective_reward_rate_', ''),
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
        {/* Rank */}
        <span style={{
          flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
          background: card.card_ranking === 1 ? '#C9A84C' : card.card_ranking <= 3 ? '#0E3785' : '#EEF3FF',
          color: card.card_ranking <= 3 ? 'white' : '#5A6A85',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800
        }}>#{card.card_ranking}</span>

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

        {/* Card image */}
        <div style={{ flexShrink: 0, padding: '16px 12px 16px 16px', display: 'flex', alignItems: 'center' }}>
          <Image src="/card-dummy.svg" alt={card.card_name} width={108} height={66}
            style={{ borderRadius: 8, objectFit: 'cover', boxShadow: '0 4px 16px rgba(14,55,133,0.2)', display: 'block' }} />
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: '#EEF3FF', margin: '12px 0' }} />

        {/* Rate bars — 2 columns × 4 rows, fixed positions */}
        <div style={{ flex: 1, padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', alignItems: 'center', minWidth: 0 }}>
          {[leftBars, rightBars].map((col, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {col.map(p => {
                const monthlyAed = detail?.card
                  ? (detail.card as Record<string, unknown>)[`${p.catKey}_monthly_reward_aed`] as number | undefined
                  : undefined
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
                        {monthlyAed != null ? ` · AED ${monthlyAed.toFixed(1)}/mo` : ''}
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
                    <Image src="/card-dummy.svg" alt={c.card_name} width={110} height={70} style={{ borderRadius: 8, objectFit: 'cover' }} />
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
  display: 'flex', alignItems: 'center', gap: 0,
  background: '#F4F6FB', borderRadius: 8, border: '1px solid #E4EAF5',
  overflow: 'hidden'
}
const filterLabelStyle: React.CSSProperties = {
  padding: '0 8px', fontSize: 11.5, fontWeight: 700, color: '#5A6A85',
  whiteSpace: 'nowrap', borderRight: '1px solid #E4EAF5', lineHeight: '32px', height: 32,
  display: 'flex', alignItems: 'center'
}
const filterSelectStyle: React.CSSProperties = {
  padding: '0 8px', height: 32, border: 'none', background: 'transparent',
  color: '#0D1828', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none'
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
