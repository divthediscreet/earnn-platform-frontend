'use client'
import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { fetchCards, fetchCardDetail, getCardImageUrl } from '@/lib/api'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface ScoredCard {
  earnn_card_id: string
  card_name: string
  bank_name: string
  card_family: string | null
  earnn_score: number
  card_ranking: number
  rating_band: string
  expected_annual_return_aed: number
  true_annual_fee_aed: number
  net_annual_value_aed: number
  effective_reward_rate: number
  category_monthly_rewards: Record<string, number>
  category_effective_rates: Record<string, number>
}

// Metadata from GET /api/cards — supplementary fields for filtering
interface CardMeta {
  earnn_card_id: string
  network: string
  free_for_life: boolean
  min_salary_aed: number | null
}

// Merged card used by the tile — scored data + metadata
interface ResultCard extends ScoredCard {
  network: string
  free_for_life: boolean
  min_salary_aed: number | null
  // Flat rate fields derived from category_effective_rates (for sort/filter parity with compare)
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
function scoreColor(score: number): string {
  const t = Math.max(0, Math.min(100, score)) / 100
  const hue = Math.round(t * 142)
  const light = 28 + (1 - t) * 8
  return `hsl(${hue}, 72%, ${light}%)`
}

const RATE_BARS = [
  { cat: 'dining',        name: 'Dining',    icon: '🍽️' },
  { cat: 'grocery',       name: 'Grocery',   icon: '🛒' },
  { cat: 'travel',        name: 'Travel',    icon: '✈️' },
  { cat: 'fuel',          name: 'Fuel',      icon: '⛽' },
  { cat: 'online',        name: 'Online',    icon: '📦' },
  { cat: 'retail',        name: 'Retail',    icon: '🛍️' },
  { cat: 'utility',       name: 'Utility',   icon: '💡' },
  { cat: 'all_spend',     name: 'All Other', icon: '➕' },
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

const CAT_LABELS: Record<string, string> = {
  dining: 'Dining', grocery: 'Grocery', travel: 'Travel', fuel: 'Fuel',
  online: 'Online', international: 'International', entertainment: 'Entertainment',
  retail: 'Retail', telecom: 'Telecom', transport: 'Transport',
  utility: 'Utilities', education: 'Education', miscellaneous: 'Other',
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function fmtRate(r: number): string {
  if (!r) return '0%'
  return `${(r * 100).toFixed(1)}%`
}

function fmtScore(s: number): string {
  return s.toFixed(1)
}

function dedupByFamily(cards: ResultCard[]): ResultCard[] {
  const seen = new Set<string>()
  const primaries: ResultCard[] = []
  const secondaries: ResultCard[] = []
  for (const card of cards) {
    const fk = card.card_family || card.earnn_card_id
    if (seen.has(fk)) secondaries.push(card)
    else { seen.add(fk); primaries.push(card) }
  }
  return [...primaries, ...secondaries]
}

function mergeCards(scored: ScoredCard[], metaMap: Map<string, CardMeta>): ResultCard[] {
  return scored.map(s => {
    const m = metaMap.get(s.earnn_card_id)
    return {
      ...s,
      network:       m?.network       ?? '',
      free_for_life: m?.free_for_life ?? false,
      min_salary_aed: m?.min_salary_aed ?? null,
      effective_reward_rate_dining:    s.category_effective_rates['dining']        ?? 0,
      effective_reward_rate_grocery:   s.category_effective_rates['grocery']       ?? 0,
      effective_reward_rate_travel:    s.category_effective_rates['travel']        ?? 0,
      effective_reward_rate_fuel:      s.category_effective_rates['fuel']          ?? 0,
      effective_reward_rate_online:    s.category_effective_rates['online']        ?? 0,
      effective_reward_rate_retail:    s.category_effective_rates['retail']        ?? 0,
      effective_reward_rate_utility:   s.category_effective_rates['utility']       ?? 0,
      effective_reward_rate_all_spend: s.category_effective_rates['all_spend']     ?? 0,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function AllCardResultPage() {
  const router = useRouter()

  const [cards, setCards]     = useState<ResultCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)
  const [userSpend, setUserSpend] = useState<Record<string, number>>({})

  const [details, setDetails]           = useState<Record<string, CardDetail>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  const [expanded, setExpanded]         = useState<string | null>(null)
  const [hoverNav, setHoverNav]         = useState<string | null>(null)
  const [comingSoon, setComingSoon]     = useState(false)

  const [salaryMin, setSalaryMin] = useState(0)
  const [network, setNetwork]     = useState('All Networks')
  const [bank, setBank]           = useState('All Banks')
  const [freeOnly, setFreeOnly]   = useState(false)
  const [sortCat, setSortCat]     = useState('')
  const [page, setPage]           = useState(1)

  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [selectedApps, setSelectedApps] = useState<Set<string>>(new Set())
  const toggleApp = (key: string) => setSelectedApps(prev => {
    const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next
  })
  const [prefLounge,  setPrefLounge]  = useState(false)
  const [prefGolf,    setPrefGolf]    = useState(false)
  const [prefCinema,  setPrefCinema]  = useState(false)
  const [prefTravel,  setPrefTravel]  = useState(false)
  const [prefWelcome, setPrefWelcome] = useState(false)

  // ── Load from sessionStorage + fetch metadata ──────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return

    const raw = sessionStorage.getItem('earnn_result')
    if (!raw) { router.push('/analyse'); return }

    let parsed: { type: string; data: { scored_cards?: ScoredCard[]; user_spend?: Record<string, number> } }
    try { parsed = JSON.parse(raw) } catch { router.push('/analyse'); return }

    const scored = parsed?.data?.scored_cards
    const spend  = parsed?.data?.user_spend ?? {}
    if (!scored || scored.length === 0) { router.push('/analyse'); return }

    setUserSpend(spend)

    // Fetch metadata for network / free_for_life / min_salary fields
    fetchCards({ sort_by: 'card_ranking' })
      .then(d => {
        const metaMap = new Map<string, CardMeta>(
          (d.cards || []).map((c: CardMeta) => [c.earnn_card_id, c])
        )
        const merged = mergeCards(scored, metaMap)
        setCards(dedupByFamily(merged))
      })
      .catch(() => {
        // Metadata fetch failed — still show cards, just without network/salary filters
        const merged = mergeCards(scored, new Map())
        setCards(dedupByFamily(merged))
      })
      .finally(() => setLoading(false))
  }, [router])

  // ── Lazy detail fetch on expand ────────────────────────────────────────
  const loadDetail = useCallback(async (cardId: string) => {
    if (details[cardId] || detailLoading === cardId) return
    setDetailLoading(cardId)
    try {
      const d = await fetchCardDetail(cardId)
      setDetails(prev => ({ ...prev, [cardId]: d }))
    } catch { /* non-fatal */ }
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

  useEffect(() => {
    if (!openDropdown) return
    const handler = () => setOpenDropdown(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openDropdown])

  // ── Derived bank list ──────────────────────────────────────────────────
  const bankOptions = useMemo(() => {
    const names = Array.from(new Set(cards.map(c => c.bank_name).filter(Boolean))).sort()
    return ['All Banks', ...names]
  }, [cards])

  // ── Spend summary for header ───────────────────────────────────────────
  const spendSummary = useMemo(() => {
    return Object.entries(userSpend)
      .filter(([k, v]) => v > 0 && k !== 'miscellaneous' && k !== 'all_spend')
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([k, v]) => `${CAT_LABELS[k] ?? k} AED ${v.toLocaleString()}`)
      .join('  ·  ')
  }, [userSpend])

  // ── Client-side filtering + sorting ───────────────────────────────────
  const filtered = useMemo(() => {
    const base = cards.filter(c => {
      if (salaryMin > 0 && c.min_salary_aed && c.min_salary_aed > salaryMin) return false
      if (network !== 'All Networks' && c.network?.toLowerCase() !== network.toLowerCase()) return false
      if (bank !== 'All Banks' && c.bank_name !== bank) return false
      if (freeOnly && !c.free_for_life) return false
      return true
    })
    if (!sortCat) return base
    return [...base].sort((a, b) =>
      (b.category_effective_rates[sortCat] ?? 0) - (a.category_effective_rates[sortCat] ?? 0)
    )
  }, [cards, salaryMin, network, bank, freeOnly, sortCat])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageCards  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Loading / error ────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: '#0E3785' }}>Ranking all UAE cards for your spend</div>
      <div style={{ fontSize: 14, color: '#5A6A85' }}>Personalised to your exact spending pattern</div>
    </div>
  )

  if (error) return (
    <div style={{ textAlign: 'center', padding: '80px 24px', color: '#DC2626' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <p style={{ fontWeight: 700 }}>Could not load results</p>
      <p style={{ fontSize: 13, color: '#5A6A85' }}>{error}</p>
      <Link href="/results" style={{ color: '#0E3785', fontWeight: 700, fontSize: 14 }}>← Back to results</Link>
    </div>
  )

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px 100px' }}>

      {/* ── PERSONALISED HEADER ───────────────────────────────────────── */}
      <div style={{
        position: 'relative', overflow: 'hidden', borderRadius: 24,
        background: 'linear-gradient(120deg, #0A2860 0%, #0E3785 60%, #163E8C 100%)',
        padding: '32px 40px', marginBottom: 28, color: 'white',
        boxShadow: '0 12px 44px rgba(14,55,133,0.25)'
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05, backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
        <div style={{ position: 'relative' }}>
          <Link href="/results" style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 14 }}>
            ← Back to your results
          </Link>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: 10, display: 'block' }}>
            Personalised Rankings
          </div>
          <h1 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, lineHeight: 1.25, marginBottom: 8, color: 'white' }}>
            All {cards.length} UAE cards, ranked for your spending
          </h1>
          {spendSummary && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 0 }}>
              Based on your spend: {spendSummary}
            </p>
          )}
        </div>
      </div>

      {/* ── FILTER BAR ────────────────────────────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: 16, border: '1px solid #D6E0F5',
        marginBottom: 20, boxShadow: '0 2px 14px rgba(14,55,133,0.05)', overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, padding: '10px 14px' }}>

          <div style={{ ...filterGroupStyle, flex: 1 }}>
            <span style={filterLabelStyle}>Salary</span>
            <select value={salaryMin} onChange={e => { setSalaryMin(Number(e.target.value)); setPage(1) }} style={filterSelectStyle}>
              {SALARY_BANDS.map(b => <option key={b.label} value={b.min}>{b.label}</option>)}
            </select>
          </div>

          <div style={dividerStyle} />

          <div style={{ ...filterGroupStyle, flex: 1.6 }}>
            <span style={filterLabelStyle}>Bank</span>
            <select value={bank} onChange={e => { setBank(e.target.value); setPage(1) }} style={filterSelectStyle}>
              {bankOptions.map(b => <option key={b}>{b}</option>)}
            </select>
          </div>

          <div style={dividerStyle} />

          <div style={{ ...filterGroupStyle, flex: 1 }}>
            <span style={filterLabelStyle}>Network</span>
            <select value={network} onChange={e => { setNetwork(e.target.value); setPage(1) }} style={filterSelectStyle}>
              {NETWORK_OPTIONS.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>

          <div style={dividerStyle} />

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

          <div style={{ ...filterGroupStyle, flex: 1.4 }}>
            <span style={filterLabelStyle}>Sort by</span>
            <select value={sortCat} onChange={e => { setSortCat(e.target.value); setPage(1) }} style={filterSelectStyle}>
              <option value="">Your ranking (personalised)</option>
              {RATE_BARS.map(c => <option key={c.cat} value={c.cat}>{c.name} rate</option>)}
            </select>
          </div>

          <span style={{ marginLeft: 12, fontSize: 12, color: '#5A6A85', whiteSpace: 'nowrap', alignSelf: 'center' }}>
            <strong style={{ color: '#0D1828' }}>{filtered.length}</strong> cards · pg {page}/{totalPages}
          </span>
        </div>

        {/* Row 2 — Preferences */}
        <div style={{ padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: '#FAFBFF' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#5A6A85', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>✨ I prefer:</span>

          <MultiSelectDropdown
            label="🛵 Food Delivery"
            options={[
              { key: 'talabat', name: 'Talabat' },
              { key: 'noon_food', name: 'Noon Food' },
              { key: 'careem_food', name: 'Careem' },
            ]}
            selected={selectedApps} onToggle={toggleApp}
            openKey="food" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown}
          />

          <MultiSelectDropdown
            label="🛒 Grocery"
            options={[
              { key: 'carrefour', name: 'Carrefour' },
              { key: 'noon_grocery', name: 'Noon' },
              { key: 'amazon_fresh', name: 'Amazon Fresh' },
              { key: 'lulu', name: 'Lulu' },
              { key: 'spinneys', name: 'Spinneys' },
            ]}
            selected={selectedApps} onToggle={toggleApp}
            openKey="grocery" openDropdown={openDropdown} setOpenDropdown={setOpenDropdown}
          />

          <div style={dividerStyle} />

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

      {/* ── CARD TILES ────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pageCards.map(card => (
          <CardTile
            key={card.earnn_card_id}
            card={card}
            detail={details[card.earnn_card_id] || null}
            detailLoading={detailLoading === card.earnn_card_id}
            expanded={expanded === card.earnn_card_id}
            onExpand={() => handleExpand(card.earnn_card_id)}
            onHover={() => loadDetail(card.earnn_card_id)}
            hoverNav={hoverNav}
            setHoverNav={setHoverNav}
            onApply={() => setComingSoon(true)}
          />
        ))}
      </div>

      {/* ── PAGINATION ────────────────────────────────────────────────── */}
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
// CARD TILE
// ─────────────────────────────────────────────────────────────────────────────
function CardTile({ card, detail, detailLoading, expanded, onExpand, onHover, hoverNav, setHoverNav, onApply }: {
  card: ResultCard
  detail: CardDetail | null
  detailLoading: boolean
  expanded: boolean
  onExpand: () => void
  onHover: () => void
  hoverNav: string | null
  setHoverNav: (v: string | null) => void
  onApply: () => void
}) {
  const fee = card.true_annual_fee_aed ?? 0
  const navKey = `earn_${card.earnn_card_id}`

  const allBars = RATE_BARS.map(b => ({
    ...b,
    rate:         card.category_effective_rates[b.cat] ?? 0,
    monthlyAed:   card.category_monthly_rewards[b.cat]  ?? 0,
  }))
  const leftBars  = allBars.slice(0, 4)
  const rightBars = allBars.slice(4)
  const maxRate   = Math.max(...allBars.map(b => b.rate), 0.001)

  return (
    <div
      onClick={onExpand}
      onMouseEnter={onHover}
      style={{
        position: 'relative', background: 'white', borderRadius: 16, cursor: 'pointer', overflow: 'visible',
        border: expanded ? '1.5px solid #C2CCDD' : '1px solid #D6E0F5',
        boxShadow: '0 2px 12px rgba(14,55,133,0.05)', transition: 'all 0.18s'
      }}>

      {/* ── HEADER: name · score · button ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderBottom: '1px solid #EEF3FF'
      }}>
        {/* Rank badge */}
        <div style={{
          flexShrink: 0, width: 32, height: 32, borderRadius: '50%',
          background: card.card_ranking <= 3 ? '#0E3785' : '#EEF3FF',
          color: card.card_ranking <= 3 ? 'white' : '#5A6A85',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800
        }}>
          #{card.card_ranking}
        </div>

        {/* Name + bank */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: '#0D1828', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {card.card_name}
          </div>
          <div style={{ fontSize: 11.5, color: '#5A6A85', marginTop: 2 }}>
            {card.bank_name}{card.network ? ` · ${card.network}` : ''}
            {card.free_for_life && <span style={{ marginLeft: 8, background: '#EAFBF4', color: '#00785C', fontWeight: 700, fontSize: 10, padding: '2px 7px', borderRadius: 100 }}>FREE FOR LIFE</span>}
          </div>
        </div>

        {/* Score badge */}
        <div
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, background: scoreColor(card.earnn_score), borderRadius: 8, padding: '5px 10px', color: 'white', position: 'relative', cursor: 'help' }}
          onMouseEnter={() => setHoverNav(`score_${card.earnn_card_id}`)}
          onMouseLeave={() => setHoverNav(null)}
          onClick={e => e.stopPropagation()}
        >
          <span style={{ fontSize: 15, fontWeight: 800 }}>⭐ {fmtScore(card.earnn_score)}</span>
          <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.85 }}>{card.rating_band}</span>
          {hoverNav === `score_${card.earnn_card_id}` && (
            <InlineTooltip text="earnn Score personalised to your spending pattern." />
          )}
        </div>

        {/* Apply button */}
        <button onClick={(e) => { e.stopPropagation(); onApply() }} style={{
          flexShrink: 0, padding: '8px 16px', borderRadius: 100, border: 'none',
          cursor: 'pointer', background: '#EEF3FF', color: '#0E3785', fontSize: 12, fontWeight: 700
        }}>
          View &amp; Apply
        </button>
      </div>

      {/* ── BODY: image | rate bars | earn up to | fee ── */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>

        {/* Card image + overall rate circle */}
        <div style={{ flexShrink: 0, padding: '12px 12px 12px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <img src={getCardImageUrl(card.earnn_card_id)} alt={card.card_name} width={108} height={66} loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }}
            style={{ borderRadius: 8, objectFit: 'cover', boxShadow: '0 4px 16px rgba(14,55,133,0.2)' }} />
          {card.effective_reward_rate > 0 && (() => {
            const rate = card.effective_reward_rate * 100
            const hue  = Math.round((rate / 10) * 142)
            const bg   = `hsl(${hue}, 72%, 32%)`
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

        <div style={{ width: 1, background: '#EEF3FF', margin: '12px 0' }} />

        {/* Rate bars — personalised, hover shows AED/month from user's actual spend */}
        <div style={{ flex: 1, padding: '12px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px', alignItems: 'center', minWidth: 0 }}>
          {[leftBars, rightBars].map((col, ci) => (
            <div key={ci} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {col.map(b => {
                const tooltipKey = `bar_${card.earnn_card_id}_${b.cat}`
                return (
                  <div key={b.cat}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}
                    onMouseEnter={() => setHoverNav(tooltipKey)}
                    onMouseLeave={() => setHoverNav(null)}
                    onClick={e => e.stopPropagation()}
                  >
                    <span style={{ fontSize: 11, flexShrink: 0, width: 14 }}>{b.icon}</span>
                    <span style={{ fontSize: 11, color: b.rate > 0 ? '#3D4B63' : '#C2CCDD', width: 48, flexShrink: 0 }}>{b.name}</span>
                    <div style={{ flex: 1, height: 6, background: '#F0F2F7', borderRadius: 100, overflow: 'hidden' }}>
                      {b.rate > 0 && (
                        <div style={{
                          height: '100%', borderRadius: 100,
                          width: `${Math.round((b.rate / maxRate) * 100)}%`,
                          background: '#8B2E2E', transition: 'width 0.4s ease'
                        }} />
                      )}
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: b.rate > 0 ? '#0D1828' : '#C2CCDD', width: 36, textAlign: 'right', flexShrink: 0 }}>{fmtRate(b.rate)}</span>
                    {hoverNav === tooltipKey && (
                      <span style={{
                        position: 'absolute', bottom: '120%', left: '50%', transform: 'translateX(-50%)',
                        background: '#0D1828', color: 'white', fontSize: 11.5, fontWeight: 600,
                        padding: '5px 10px', borderRadius: 7, whiteSpace: 'nowrap', zIndex: 80,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.25)'
                      }}>
                        {b.name}: {fmtRate(b.rate)}
                        {b.monthlyAed > 0 ? ` · AED ${b.monthlyAed.toFixed(1)}/mo` : ''}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div style={{ width: 1, background: '#EEF3FF', margin: '12px 0' }} />

        {/* Earn Up To */}
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
            <InlineTooltip text="Expected annual rewards based on your actual spend across all categories." />
          )}
        </div>

        <div style={{ width: 1, background: '#EEF3FF', margin: '12px 0' }} />

        {/* Effective Fee */}
        <div
          style={{ flexShrink: 0, width: 110, padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3, position: 'relative', cursor: 'help', background: fee === 0 ? '#FAFFFE' : '#FFFAF6' }}
          onMouseEnter={() => setHoverNav(`fee_${card.earnn_card_id}`)} onMouseLeave={() => setHoverNav(null)}
          onClick={e => e.stopPropagation()}
        >
          <span style={{ fontSize: 10.5, fontWeight: 700, color: '#5A6A85', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1.5px dotted #9CA3AF' }}>Eff. Fee</span>
          <span style={{ fontSize: 22, fontWeight: 800, color: fee === 0 ? '#00A67E' : '#C95B00', lineHeight: 1.1 }}>
            AED {fee.toLocaleString()}
          </span>
          <span style={{ fontSize: 10.5, color: '#9CA3AF' }}>per year</span>
          {hoverNav === `fee_${card.earnn_card_id}` && (
            <InlineTooltip text="Estimated annual fee after waivers and first-year offers based on your spend level." />
          )}
        </div>
      </div>

      {/* Expand caret */}
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
  const isOpen      = openDropdown === openKey
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
          color: activeCount > 0 ? '#8B6200' : '#3D4B63', transition: 'all 0.12s'
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
        <div onClick={e => e.stopPropagation()} style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 300,
          background: 'white', borderRadius: 10, border: '1px solid #D6E0F5',
          boxShadow: '0 8px 28px rgba(14,55,133,0.14)', padding: '6px 4px', minWidth: 160
        }}>
          {options.map(opt => {
            const checked = selected.has(opt.key)
            return (
              <label key={opt.key} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
                cursor: 'pointer', borderRadius: 7,
                background: checked ? '#FFF8E7' : 'transparent', transition: 'background 0.1s'
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

// ─────────────────────────────────────────────────────────────────────────────
// TOOLTIP HELPERS
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// STYLE CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
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
