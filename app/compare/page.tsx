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
  bank_code: string | null
  best_for: string | null
  card_summary_tag: string | null
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
  has_airport_transfer: boolean
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
  display_tier_cap_dining: number
  display_tier_cap_grocery: number
  display_tier_cap_travel: number
  display_tier_cap_fuel: number
  display_tier_cap_online: number
  display_tier_cap_retail: number
  display_tier_cap_utility: number
  display_tier_cap_all_spend: number
  display_max_earning_per_card_aed: number
  display_min_monthly_spend_aed_on_card: number
  display_reward_tiers?: Record<string, RewardThresholdTier[]>
  display_merchant_lists?: Record<string, string>
}

interface CardDetail {
  card: Record<string, unknown>
  benefits: string[]
  // Optional while older API deployments return only the legacy `benefits` list.
  benefit_rows?: CardBenefit[]
  best_for: string[]
  card_disclaimer: string[]
}

interface CardBenefit {
  benefit_category_normalised: string | null
  benefit_category: string | null
  featured_display_message: string | null
  quantity_per_period: number | null
  quantity_period: string | null
  requires_monthly_min_spend_on_card: boolean
  monthly_min_spend_aed_on_card: number | null
}

interface RewardThresholdTier {
  min_monthly_spend_aed_on_card: number | null
  max_monthly_spend_aed_on_card: number | null
  aed_value_per_aed_spent: number
  max_earning_per_tier_in_aed: number | null
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

const NETWORK_OPTIONS = ['All Networks', 'Visa', 'Mastercard', 'Amex']
const PAGE_SIZE = 10

type BenefitFilterKey =
  | 'has_welcome_bonus'
  | 'has_lounge_access'
  | 'has_golf_benefit'
  | 'has_cinema_benefit'
  | 'has_airport_transfer'
  | 'has_travel_insurance'

const BENEFIT_FILTERS: { key: BenefitFilterKey; label: string }[] = [
  { key: 'has_welcome_bonus', label: 'Welcome bonus' },
  { key: 'has_lounge_access', label: 'Lounge access' },
  { key: 'has_golf_benefit', label: 'Golf benefit' },
  { key: 'has_cinema_benefit', label: 'Cinema benefit' },
  { key: 'has_airport_transfer', label: 'Airport transfer' },
  { key: 'has_travel_insurance', label: 'Travel insurance' },
]

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

function bestForSectionItems(
  bestFor: string | string[] | null | undefined,
  section: 'Top earn rates' | 'Highlight' | 'Best for',
): string[] {
  const lines = Array.isArray(bestFor) ? bestFor : (bestFor || '').split(/\r?\n/)
  const prefix = section.replace(/\s+/g, '\\s+')
  return lines
    .map(line => line.match(new RegExp(`^\\s*${prefix}\\s*:\\s*(.*)$`, 'i'))?.[1] || '')
    .filter(Boolean)
    .flatMap(value => value.split(/[;|]/).map(item => item.trim()).filter(Boolean))
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function ComparePage() {
  const [fromResults, setFromResults] = useState(false)

  const [cards, setCards]           = useState<ApiCard[]>([])
  const [catalogueRewardRates, setCatalogueRewardRates] = useState<number[]>([])
  const [loading, setLoading]       = useState(true)

  const [error, setError]           = useState<string | null>(null)
  const [details, setDetails]       = useState<Record<string, CardDetail>>({})
  const [detailLoading, setDetailLoading] = useState<string | null>(null)
  // A Fast Refresh can retain a card detail fetched before a backend response
  // gains a field.  Keep one controlled retry per card for that migration.
  const legacyDetailRefreshes = useRef<Set<string>>(new Set())

  const [salaryInput, setSalaryInput] = useState('')
  const [cardNameQuery, setCardNameQuery] = useState('')
  const [network, setNetwork]       = useState('All Networks')
  const [bank, setBank]             = useState('All Banks')
  const [rewardProgramFilter, setRewardProgramFilter] = useState('')
  const [rewardCurrencyFilter, setRewardCurrencyFilter] = useState('')
  const [benefitFilters, setBenefitFilters] = useState<Set<BenefitFilterKey>>(new Set())
  const [freeOnly, setFreeOnly]     = useState(false)
  const [sortCat, setSortCat]       = useState('')
  const [page, setPage]             = useState(1)
  const [bankPickerOpen, setBankPickerOpen] = useState(false)
  const [allFiltersOpen, setAllFiltersOpen] = useState(false)
  const bankPickerRef = useRef<HTMLDivElement>(null)
  const allFiltersRef = useRef<HTMLDivElement>(null)

  // App preferences — multi-select sets (UI-only, backend wiring coming soon)
  // Benefit preferences (UI-only for now)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareOpen, setCompareOpen] = useState(false)
  const [showOptionalRewardCategories, setShowOptionalRewardCategories] = useState(false)
  const [hoverNav, setHoverNav]     = useState<string | null>(null)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [comingSoon, setComingSoon] = useState(false)

  // ── Read URL params on mount (avoids useSearchParams + Suspense requirement)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const isFromResults = params.get('from_results') === '1'
    const salary = params.get('salary') || ''
    setFromResults(isFromResults)
    setSalaryInput(salary.replace(/\D/g, '').slice(0, 6))
  }, [])

  // ── Fetch all cards on mount (min 2s display so heading is readable) ───
  const salaryMin = salaryInput === '' ? null : Number(salaryInput)
  const normalisedCardNameQuery = cardNameQuery.trim().toLowerCase()

  useEffect(() => {
    let active = true
    fetchCards({ sort_by: 'card_ranking', min_salary: salaryMin ?? undefined })
      .then(d => {
        if (!active) return
        setCards(promoteOneFamilyMember(d.cards || []))
        setError(null)
      })
      .catch(e => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [salaryMin])

  // The reward-rate badge is benchmarked against the full active catalogue,
  // independent of the user’s temporary salary or card filters.
  useEffect(() => {
    let active = true
    fetchCards({ sort_by: 'card_ranking' })
      .then(data => {
        if (!active) return
        setCatalogueRewardRates((data.cards || [])
          .map((card: ApiCard) => card.effective_reward_rate)
          .filter((rate: number): rate is number => typeof rate === 'number' && Number.isFinite(rate)))
      })
      .catch(() => { /* The modal safely falls back to its selected cards. */ })
    return () => { active = false }
  }, [])

  // ── Fetch card detail lazily on expand ──────────────────────────────────
  const loadDetail = useCallback(async (cardId: string, refreshLegacyDetail = false) => {
    const existingDetail = details[cardId]
    if (detailLoading === cardId) return
    if (existingDetail && (!refreshLegacyDetail || Array.isArray(existingDetail.benefit_rows))) return
    if (existingDetail && refreshLegacyDetail) {
      if (legacyDetailRefreshes.current.has(cardId)) return
      legacyDetailRefreshes.current.add(cardId)
    }
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

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node
      if (bankPickerRef.current && !bankPickerRef.current.contains(target)) setBankPickerOpen(false)
      if (allFiltersRef.current && !allFiltersRef.current.contains(target)) setAllFiltersOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [])

  // Close dropdown on outside click
  // ── Derived bank list from loaded cards ────────────────────────────────
  const bankOptions = useMemo(() => {
    const banks = new Map<string, string | null>()
    for (const card of cards) {
      if (card.bank_name && !banks.has(card.bank_name)) banks.set(card.bank_name, card.bank_code)
    }
    return [
      { value: 'All Banks', label: 'All Banks' },
      ...Array.from(banks.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, code]) => ({
          value: name,
          label: code ? `${name} (${code})` : name,
        })),
    ]
  }, [cards])
  const selectedBankLabel = bankOptions.find(option => option.value === bank)?.label ?? bank
  const rewardProgramOptions = useMemo(() => Array.from(new Set(
    cards.map(card => card.reward_program_type).filter((value): value is string => Boolean(value?.trim()))
  )).sort(), [cards])
  const rewardCurrencyOptions = useMemo(() => Array.from(new Set(
    cards.map(card => card.reward_currency_name).filter((value): value is string => Boolean(value?.trim()))
  )).sort(), [cards])
  const toggleBenefitFilter = (key: BenefitFilterKey) => {
    setBenefitFilters(current => {
      const next = new Set(current)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
    setPage(1)
  }

  // ── Client-side filtering + sorting ────────────────────────────────────
  const filtered = useMemo(() => {
    const base = cards.filter(c => {
      if (salaryMin !== null && c.min_salary_aed !== null && c.min_salary_aed > salaryMin) return false
      if (normalisedCardNameQuery && !c.card_name.toLowerCase().includes(normalisedCardNameQuery)) return false
      if (network !== 'All Networks' && c.network?.toLowerCase() !== network.toLowerCase()) return false
      if (bank !== 'All Banks' && c.bank_name !== bank) return false
      if (rewardProgramFilter && c.reward_program_type !== rewardProgramFilter) return false
      if (rewardCurrencyFilter && c.reward_currency_name !== rewardCurrencyFilter) return false
      if (!Array.from(benefitFilters).every(filterKey => c[filterKey] === true)) return false
      if (freeOnly && !c.free_for_life) return false
      return true
    })
    if (!sortCat) return base
    const col = `display_reward_rate_${sortCat}` as keyof ApiCard
    return [...base].sort((a, b) => ((b[col] as number) ?? 0) - ((a[col] as number) ?? 0))
  }, [cards, salaryMin, normalisedCardNameQuery, network, bank, rewardProgramFilter, rewardCurrencyFilter, benefitFilters, freeOnly, sortCat])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageCards  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleCompare = useCallback((id: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    setCompareIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      if (prev.length >= 3) return prev
      loadDetail(id)
      return [...prev, id]
    })
  }, [loadDetail])

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
            DISCOVER UAE CREDIT CARDS
          </div>
          <h1 style={{ fontSize: 'clamp(21px, 2.6vw, 28px)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.25, marginBottom: 10, color: 'white' }}>
            Compare Real Earning Potential, Not Headline Rates
          </h1>
          <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,0.78)', lineHeight: 1.7, marginBottom: 24 }}>
            We estimate each UAE credit card&apos;s <strong>effective reward rate</strong> and <strong>earning potential</strong>, taking reward rules, caps and conditions into account, so you can see how cards may perform in practice.
            <span style={{ display: 'block', marginTop: 10, fontWeight: 800, color: 'rgba(255,255,255,0.9)' }}>
              Select up to 3 cards to compare side by side.
            </span>
          </p>
          <Link href="/analyse" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            background: '#C9A84C', color: '#0A2860', padding: '14px 30px', borderRadius: 10,
            fontSize: 15, fontWeight: 800, textDecoration: 'none',
            boxShadow: '0 8px 28px rgba(201,168,76,0.35)'
          }}>
            🎯 Personalized My Portfolio →
          </Link>
        </div>
      </div>}

      {/* ── FILTER BAR ───────────────────────────────────────────────────── */}
      <div style={{
        background: 'white', borderRadius: 16, border: '1px solid #D6E0F5',
        marginBottom: 20, boxShadow: '0 2px 14px rgba(14,55,133,0.05)', overflow: 'visible', position: 'relative', zIndex: allFiltersOpen ? 400 : 20
      }}>
        {/* Filter row */}
        <div style={{ display: 'flex', alignItems: 'stretch', gap: 0, padding: '10px 14px' }}>

          {/* Card name */}
          <div style={{ ...filterGroupStyle, flex: 1.65 }}>
            <span style={leftFilterLabelStyle}>Card Name</span>
            <input
              value={cardNameQuery}
              onChange={e => { setCardNameQuery(e.target.value); setPage(1) }}
              placeholder="Search card name"
              aria-label="Search by card name"
              style={{ ...filterSelectStyle, cursor: 'text' }}
            />
          </div>

          <div style={dividerStyle} />

          {/* Salary */}
          <div style={{ ...filterGroupStyle, flex: 0.9 }}>
            <span style={leftFilterLabelStyle}>Salary</span>
            <input
              value={salaryInput}
              onChange={e => { setSalaryInput(e.target.value.replace(/\D/g, '').slice(0, 6)); setPage(1) }}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              placeholder="AED salary"
              aria-label="Monthly salary in AED"
              style={{ ...filterSelectStyle, cursor: 'text' }}
            />
          </div>

          <div style={dividerStyle} />

          {/* Bank */}
          <div ref={bankPickerRef} style={{ ...filterGroupStyle, flex: 0.8, minWidth: 116, position: 'relative' }}>
            <span style={leftFilterLabelStyle}>Bank</span>
            <button
              type="button"
              onClick={() => { setBankPickerOpen(open => !open); setAllFiltersOpen(false) }}
              aria-expanded={bankPickerOpen}
              style={{ ...filterSelectStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedBankLabel}</span>
              <span style={{ color: '#5A6A85', marginLeft: 5 }}>⌄</span>
            </button>
            {bankPickerOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 9px)', left: 0, width: 'min(430px, calc(100vw - 48px))', maxHeight: 360, overflowY: 'auto', background: 'white', border: '1px solid #D6E0F5', borderRadius: 14, boxShadow: '0 16px 34px rgba(13,24,40,0.18)', padding: 7, zIndex: 40 }}>
                {bankOptions.map(option => (
                  <button key={option.value} type="button" onClick={() => { setBank(option.value); setPage(1); setBankPickerOpen(false) }} style={{ width: '100%', padding: '10px 12px', border: 'none', borderRadius: 8, background: bank === option.value ? '#EEF3FF' : 'transparent', color: bank === option.value ? '#0E3785' : '#0D1828', textAlign: 'left', fontSize: 13, fontWeight: bank === option.value ? 700 : 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div style={dividerStyle} />

          {/* Free for life */}
          <button onClick={() => { setFreeOnly(f => !f); setPage(1) }} style={{
            flex: 0.7, display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start',
            gap: 2, padding: '3px 11px 4px', borderRadius: 0, border: 'none',
            borderLeft: freeOnly ? '1.5px solid #00A67E' : 'none',
            borderRight: freeOnly ? '1.5px solid #00A67E' : 'none',
            background: freeOnly ? '#EAFBF5' : '#F4F6FB',
            color: freeOnly ? '#00785C' : '#5A6A85', cursor: 'pointer'
          }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: freeOnly ? '#00785C' : '#9DAEC8', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.4, textAlign: 'left' }}>🆓 Fee</span>
            <span style={{ fontSize: 12, fontWeight: 700, textAlign: 'left' }}>Free for life{freeOnly ? ' ✓' : ''}</span>
          </button>

          <div style={dividerStyle} />

          {/* Find best cards by category */}
          <div style={{ ...filterGroupStyle, flex: 1.4 }}>
            <span style={leftFilterLabelStyle}>Find Best Cards</span>
            <select value={sortCat} onChange={e => { setSortCat(e.target.value); setPage(1) }} style={filterSelectStyle}>
              <option value="">Best Overall Cards</option>
              {RATE_PILLS.map(c => <option key={c.key} value={c.key.replace('display_reward_rate_', '')}>Best {c.name} Cards</option>)}
            </select>
          </div>

          <div ref={allFiltersRef} style={{ position: 'relative', alignSelf: 'center', marginLeft: 12 }}>
            <button type="button" onClick={() => { setAllFiltersOpen(open => !open); setBankPickerOpen(false) }} aria-expanded={allFiltersOpen} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 12px', border: '1px solid #D6E0F5', borderRadius: 9, background: allFiltersOpen ? '#EEF3FF' : 'white', color: '#0E3785', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" /><circle cx="9" cy="6" r="1.5" fill="white" /><circle cx="15" cy="12" r="1.5" fill="white" /><circle cx="7" cy="18" r="1.5" fill="white" />
              </svg>
              All Filters
            </button>
            {allFiltersOpen && (
              <div role="dialog" aria-modal="true" aria-label="All card filters" onClick={() => setAllFiltersOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'rgba(13,24,40,0.42)' }}>
                <div onClick={event => event.stopPropagation()} style={{ width: 'min(580px, 100%)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', background: 'white', border: '1px solid #D6E0F5', borderRadius: 18, boxShadow: '0 24px 60px rgba(13,24,40,0.28)', padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <strong style={{ color: '#0D1828', fontSize: 16 }}>All Filters</strong>
                  <button type="button" onClick={() => setAllFiltersOpen(false)} aria-label="Close filters" style={{ border: 'none', background: 'transparent', color: '#5A6A85', cursor: 'pointer', fontSize: 23, lineHeight: 1 }}>×</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }}>
                  <label style={popupFilterLabelStyle}>Salary (AED)
                    <input value={salaryInput} onChange={e => { setSalaryInput(e.target.value.replace(/\D/g, '').slice(0, 6)); setPage(1) }} inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="Enter monthly salary" style={popupControlStyle} />
                  </label>
                  <label style={popupFilterLabelStyle}>Card Name
                    <input value={cardNameQuery} onChange={e => { setCardNameQuery(e.target.value); setPage(1) }} placeholder="Search card name" style={popupControlStyle} />
                  </label>
                  <label style={popupFilterLabelStyle}>Bank
                    <select value={bank} onChange={e => { setBank(e.target.value); setPage(1) }} style={popupControlStyle}>
                      {bankOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                  <label style={popupFilterLabelStyle}>Network
                    <select value={network} onChange={e => { setNetwork(e.target.value); setPage(1) }} style={popupControlStyle}>
                      {NETWORK_OPTIONS.map(option => <option key={option}>{option}</option>)}
                    </select>
                  </label>
                  <label style={popupFilterLabelStyle}>Reward Program Type
                    <select value={rewardProgramFilter} onChange={e => { setRewardProgramFilter(e.target.value); setPage(1) }} style={popupControlStyle}>
                      <option value="">All reward programs</option>
                      {rewardProgramOptions.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </label>
                  <label style={popupFilterLabelStyle}>Reward Currency
                    <select value={rewardCurrencyFilter} onChange={e => { setRewardCurrencyFilter(e.target.value); setPage(1) }} style={popupControlStyle}>
                      <option value="">All reward currencies</option>
                      {rewardCurrencyOptions.map(option => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}
                    </select>
                  </label>
                  <label style={popupFilterLabelStyle}>Find Best Cards
                    <select value={sortCat} onChange={e => { setSortCat(e.target.value); setPage(1) }} style={popupControlStyle}>
                      <option value="">Best Overall Cards</option>
                      {RATE_PILLS.map(category => <option key={category.key} value={category.key.replace('display_reward_rate_', '')}>Best {category.name} Cards</option>)}
                    </select>
                  </label>
                  <div style={popupFilterLabelStyle}>Fee
                    <button type="button" onClick={() => { setFreeOnly(value => !value); setPage(1) }} style={{ ...popupControlStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: freeOnly ? '1.5px solid #00A67E' : '1px solid #D6E0F5', background: freeOnly ? '#EAFBF5' : '#F8FAFF', color: freeOnly ? '#00785C' : '#0D1828', cursor: 'pointer' }}>
                      <span>Show only Free for Life Cards{freeOnly ? ' ✓' : ''}</span>
                    </button>
                  </div>
                  <div style={{ gridColumn: '1 / -1', paddingTop: 4, borderTop: '1px solid #E4EAF5' }}>
                    <div style={{ margin: '14px 0 10px', color: '#0D1828', fontSize: 13, fontWeight: 800 }}>Benefit Filters <span style={{ color: '#94A3B8', fontSize: 11, fontWeight: 600 }}>(must include)</span></div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                      {BENEFIT_FILTERS.map(filter => {
                        const selected = benefitFilters.has(filter.key)
                        return (
                          <button key={filter.key} type="button" onClick={() => toggleBenefitFilter(filter.key)} aria-pressed={selected} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', border: selected ? '1px solid #B7D4FF' : '1px solid transparent', borderRadius: 8, background: selected ? '#EEF3FF' : 'white', color: selected ? '#0E3785' : '#334155', fontSize: 13, fontWeight: selected ? 700 : 600, cursor: 'pointer', textAlign: 'left' }}>
                            <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: '50%', border: selected ? '1.5px solid #1677FF' : '1.5px solid #94A3B8', background: selected ? '#1677FF' : 'white', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, lineHeight: 1, flexShrink: 0 }}>{selected ? '✓' : ''}</span>
                            {filter.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                  <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
                    <button type="button" onClick={() => setAllFiltersOpen(false)} style={{ minWidth: 170, padding: '11px 24px', border: 'none', borderRadius: 9, background: '#0E3785', color: 'white', fontSize: 13, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 16px rgba(14,55,133,0.22)' }}>
                      Apply Filters
                    </button>
                  </div>
                </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ── CARD TILES ───────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {pageCards.length === 0 && (
          <div style={{ padding: '44px 24px', textAlign: 'center', border: '1px solid #D6E0F5', borderRadius: 16, background: 'white', color: '#5A6A85' }}>
            {salaryMin !== null ? 'There is no eligible card for the given salary.' : 'No cards match the selected filters.'}
          </div>
        )}
        {pageCards.map(card => (
          <CardTile
            key={card.earnn_card_id}
            card={card}
            detail={details[card.earnn_card_id] || null}
            detailLoading={detailLoading === card.earnn_card_id}
            inCompare={compareIds.includes(card.earnn_card_id)}
            compareFull={compareIds.length >= 3 && !compareIds.includes(card.earnn_card_id)}
            onToggleCompare={(e) => toggleCompare(card.earnn_card_id, e)}
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

      {/* ── PERSISTENT COMPARE ACTION ─────────────────────────────────────── */}
      {compareCards.length > 0 && (
        <div style={{ position: 'fixed', right: 28, top: 84, zIndex: 150 }}>
          <button onClick={() => {
            compareCards.forEach(card => loadDetail(card.earnn_card_id, true))
            setCompareOpen(true)
          }} style={{
            display: 'flex', alignItems: 'center', gap: 10, background: '#0E3785', color: 'white',
            border: 'none', borderRadius: 100, padding: '14px 20px', cursor: 'pointer',
            boxShadow: '0 14px 34px rgba(14,55,133,0.34)', fontSize: 14, fontWeight: 800,
          }}>
            Compare {compareCards.length} card{compareCards.length === 1 ? '' : 's'}
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 7px', borderRadius: 100, background: 'rgba(255,255,255,0.18)' }}>up to 3</span>
          </button>
        </div>
      )}

      {compareOpen && compareCards.length > 0 && (
        <ComparisonModal
          cards={compareCards}
          catalogueRewardRates={catalogueRewardRates}
          details={details}
          onClose={() => setCompareOpen(false)}
          onRemove={(id) => toggleCompare(id)}
          showOptionalCategories={showOptionalRewardCategories}
          onToggleOptionalSection={() => setShowOptionalRewardCategories(open => !open)}
        />
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
  const bestForItems = detail ? bestForSectionItems(detail.best_for, 'Best for') : []
  const highlightItems = detail ? bestForSectionItems(detail.best_for, 'Highlight') : []

  const topEarnRates = bestForSectionItems(card.best_for, 'Top earn rates')

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
        background: inCompare ? '#F0F4FF' : 'white',
        borderTopLeftRadius: inCompare ? 14 : 15,
        borderTopRightRadius: inCompare ? 14 : 15
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

        {/* Card-selection action for the persistent comparison view. */}
        <button type="button" aria-pressed={inCompare} onClick={(e) => { e.stopPropagation(); onToggleCompare(e) }} disabled={compareFull} style={{
          flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px', borderRadius: 100,
          border: inCompare ? '1px solid #0E3785' : '1px solid #D6E0F5',
          cursor: compareFull ? 'not-allowed' : 'pointer',
          background: inCompare ? '#0E3785' : '#EEF3FF',
          color: inCompare ? 'white' : compareFull ? '#9DAEC8' : '#0E3785',
          fontSize: 12, fontWeight: 800, opacity: compareFull ? 0.7 : 1,
        }}>
          <span>Compare</span>
          <span aria-hidden="true" style={{ width: 15, height: 15, boxSizing: 'border-box', borderRadius: 3, border: inCompare ? '1.5px solid white' : `1.5px solid ${compareFull ? '#C2CCDD' : '#0E3785'}`, background: 'white', color: '#0E3785', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, lineHeight: 1 }}>
            {inCompare ? '✓' : ''}
          </span>
        </button>
      </div>

      {/* ── BODY ROW: image | rate bars | earn up to | fee ── */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>

        {/* Card image + salary requirement */}
        <div style={{ flexShrink: 0, width: 164, boxSizing: 'border-box', padding: '14px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 9, textAlign: 'center' }}>
          <img src={getCardImageUrl(card.earnn_card_id)} alt={card.card_name} width={126} height={78} loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }}
            style={{ borderRadius: 8, objectFit: 'cover', boxShadow: '0 4px 16px rgba(14,55,133,0.2)', display: 'block' }} />
          <div style={{ textAlign: 'center', width: '100%' }}>
            <div style={{ fontSize: 8.5, fontWeight: 800, color: '#7A8BA8', textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.3 }}>Salary requirement</div>
            <div style={{ marginTop: 3, fontSize: 11, fontWeight: 800, color: card.min_salary_aed ? '#0D1828' : '#00A67E', lineHeight: 1.3 }}>
              {card.min_salary_aed ? `AED ${Math.round(card.min_salary_aed).toLocaleString()} / mo` : 'No minimum salary'}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, background: '#EEF3FF', margin: '12px 0' }} />

        {/* Rate bars — 2 columns × 4 rows, fixed positions */}
        <div style={{ flex: 1, padding: '13px 16px', display: 'grid', gridTemplateColumns: 'minmax(0, 7fr) minmax(0, 3fr)', columnGap: 16, rowGap: 12, minWidth: 0 }}>
          <div style={{ minWidth: 0, paddingRight: 16, borderRight: '1px solid #EEF3FF' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#0E3785', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 7 }}>Top earn rates</div>
            {topEarnRates.length > 0 ? (
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {topEarnRates.map((item, index) => <li key={index} style={{ fontSize: 12, color: '#0D1828', lineHeight: 1.35 }}>• {item}</li>)}
              </ul>
            ) : <div style={{ fontSize: 12, color: '#94A3B8' }}>No top earn rates available</div>}
          </div>
          <div
            style={{ minWidth: 0, minHeight: 88, padding: '10px 8px', borderRadius: 10, background: '#00A67E', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 3px 10px rgba(0,166,126,0.24)', position: 'relative', cursor: 'help' }}
            onMouseEnter={() => setHoverNav(`effective_rate_${card.earnn_card_id}`)}
            onMouseLeave={() => setHoverNav(null)}
            onClick={event => event.stopPropagation()}
          >
            <div style={{ fontSize: 11.5, fontWeight: 800, color: 'white', textAlign: 'center', lineHeight: 1.25 }}>Overall Effective Reward Rate</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1 }}>{(card.effective_reward_rate * 100).toFixed(1)}%</div>
            {hoverNav === `effective_rate_${card.earnn_card_id}` && (
              <InlineTooltip text="A generic estimate of how much an average UAE resident could potentially earn across all spending categories, after accounting for minimum-spend requirements and applicable reward caps." />
            )}
          </div>
          <div style={{ gridColumn: '1 / -1', minWidth: 0, paddingTop: 10, borderTop: '1px solid #EEF3FF' }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#0E3785', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>Card summary</div>
            <div style={{ fontSize: 12, color: card.card_summary_tag ? '#0D1828' : '#94A3B8', lineHeight: 1.45 }}>
              {card.card_summary_tag || 'No card summary available'}
            </div>
          </div>
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
                  {bestForItems.length > 0 ? bestForItems.map((b, i) => <li key={i} style={{ fontSize: 13, color: '#0D1828', lineHeight: 1.5 }}>• {b}</li>) : <li style={{ fontSize: 13, color: '#9CA3AF' }}>—</li>}
                </ul>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: '#C95B00', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '16px 0 10px' }}>✨ Highlight</div>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {highlightItems.length > 0 ? highlightItems.map((item, index) => <li key={index} style={{ fontSize: 13, color: '#0D1828', lineHeight: 1.5 }}>• {item}</li>) : <li style={{ fontSize: 13, color: '#9CA3AF' }}>—</li>}
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
function ComparisonModal({ cards, catalogueRewardRates, details, onClose, onRemove, showOptionalCategories, onToggleOptionalSection }: {
  cards: ApiCard[]
  catalogueRewardRates: number[]
  details: Record<string, CardDetail>
  onClose: () => void
  onRemove: (id: string) => void
  showOptionalCategories: boolean
  onToggleOptionalSection: () => void
}) {
  const [activeMerchantDisclaimer, setActiveMerchantDisclaimer] = useState<string | null>(null)
  const fixed = [['dining', 'Dining'], ['grocery', 'Grocery'], ['travel', 'Travel'], ['all_spend', 'Base expense']] as const
  const optional = [['utility', 'Utility'], ['education', 'Education'], ['online', 'Online'], ['retail', 'Retail'], ['fuel', 'Fuel']] as const
  const categories = [...fixed, ...(showOptionalCategories ? optional : [])]
  const firstColumnWidth = 190
  const label: React.CSSProperties = { width: firstColumnWidth, minWidth: firstColumnWidth, maxWidth: firstColumnWidth, padding: '16px 18px', fontSize: 10.5, fontWeight: 900, color: '#4C6183', textTransform: 'uppercase', letterSpacing: '.075em', verticalAlign: 'top', whiteSpace: 'normal', overflowWrap: 'anywhere', background: '#F7F9FE', borderRight: '1px solid #E5ECF8', borderBottom: '1px solid #CFDCEC' }
  const cell: React.CSSProperties = { padding: '16px 18px', fontSize: 13, color: '#10213B', verticalAlign: 'top', borderLeft: '1px solid #E5ECF8', borderBottom: '1px solid #CFDCEC', lineHeight: 1.45 }
  const detailValue = (card: ApiCard, key: string): number | null => {
    const value = details[card.earnn_card_id]?.card?.[key]
    return typeof value === 'number' ? value : null
  }
  const rate = (card: ApiCard, category: string): number => {
    const listValue = card[`display_reward_rate_${category}` as keyof ApiCard]
    return typeof listValue === 'number' ? listValue : detailValue(card, `${category}_actual_rate`) ?? detailValue(card, `effective_reward_rate_${category}`) ?? 0
  }
  const cap = (card: ApiCard, category: string): string => {
    const directValue = card[`display_tier_cap_${category}` as keyof ApiCard]
    const value = typeof directValue === 'number' ? directValue : detailValue(card, `${category}_tier_cap_aed`)
    return value && value > 0 ? `cap AED ${Math.round(value).toLocaleString()}` : 'no category cap'
  }
  const rewardRateBadge = (card: ApiCard) => {
    const benchmark = catalogueRewardRates.length ? catalogueRewardRates : cards.map(item => item.effective_reward_rate)
    const rate = card.effective_reward_rate || 0
    const percentile = benchmark.length
      ? (benchmark.filter(value => value <= rate).length / benchmark.length) * 100
      : 50
    const band = percentile <= 25
      ? { background: '#C93D3D', emoji: '😞😞', label: 'Bad effective reward rate' }
      : percentile <= 50
        ? { background: '#D99817', emoji: '😞', label: 'Not so good effective reward rate' }
        : percentile <= 75
          ? { background: '#69AE6A', emoji: '🙂', label: 'Good effective reward Rate' }
          : { background: '#087448', emoji: '😊😊', label: 'One of the best effective reward' }
    return <span aria-label={`${fmtRate(rate)}. ${band.label}.`} title={band.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 5, background: band.background, color: 'white', fontSize: 12, lineHeight: 1, fontWeight: 900, boxShadow: 'inset 0 -1px 0 rgba(0,0,0,.15)' }}><span>{fmtRate(rate)}</span><span aria-hidden="true" style={{ fontSize: 13, letterSpacing: -2 }}>{band.emoji}</span></span>
  }
  const thresholdTiers = (card: ApiCard, category: string): RewardThresholdTier[] => card.display_reward_tiers?.[category] || []
  const merchantDisclaimer = (card: ApiCard, category: string) => {
    const merchantList = card.display_merchant_lists?.[category]?.trim()
    if (!merchantList) return null
    const key = `${card.earnn_card_id}_${category}`
    return <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} onMouseEnter={() => setActiveMerchantDisclaimer(key)} onMouseLeave={() => setActiveMerchantDisclaimer(null)}>
      <button type="button" aria-label={`Merchant restriction: only applicable at ${merchantList}`} onFocus={() => setActiveMerchantDisclaimer(key)} onBlur={() => setActiveMerchantDisclaimer(null)} onClick={() => setActiveMerchantDisclaimer(activeMerchantDisclaimer === key ? null : key)} style={{ width: 15, height: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', border: 'none', padding: 0, background: '#E9A928', color: '#0D1828', fontSize: 10, fontWeight: 900, lineHeight: 1, cursor: 'help' }}>!</button>
      {activeMerchantDisclaimer === key && <Tooltip text={`Only Applicable at ${merchantList}`} wide />}
    </span>
  }
  const tierSpendRange = (tier: RewardThresholdTier): string => {
    const minimum = tier.min_monthly_spend_aed_on_card
    const maximum = tier.max_monthly_spend_aed_on_card
    const openEnded = maximum !== null && maximum >= 999999
    if (minimum !== null && openEnded) return `AED ${Math.round(minimum).toLocaleString()}/mo and Above`
    if ((minimum === null || minimum === 0) && maximum !== null) return `Up to AED ${Math.round(maximum).toLocaleString()}/mo`
    if (minimum !== null && maximum !== null) return `AED ${Math.round(minimum).toLocaleString()}–${Math.round(maximum).toLocaleString()} / mo`
    if (minimum !== null) return `AED ${Math.round(minimum).toLocaleString()}+ / mo`
    if (maximum !== null) return `Up to AED ${Math.round(maximum).toLocaleString()} / mo`
    return 'Any monthly spend'
  }
  const categoryRewardValue = (card: ApiCard, category: string) => {
    const tiers = thresholdTiers(card, category)
    if (tiers.length) {
      return <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {tiers.map((tier, index) => <div key={`${tier.min_monthly_spend_aed_on_card}-${tier.max_monthly_spend_aed_on_card}-${tier.aed_value_per_aed_spent}-${index}`} style={{ display: 'flex', alignItems: 'center', flexWrap: 'nowrap', gap: 7, padding: '5px 7px', borderRadius: 6, background: '#F4F8FF', fontSize: 11.5, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
          <strong style={{ color: '#0E3785', whiteSpace: 'nowrap' }}>{fmtRate(tier.aed_value_per_aed_spent)}</strong>
          <span style={{ color: '#60738F' }}>: {tierSpendRange(tier)}</span>
          <span style={{ color: '#7A8BA8', fontSize: 11 }}>({tier.max_earning_per_tier_in_aed !== null && tier.max_earning_per_tier_in_aed > 0 ? `cap AED ${Math.round(tier.max_earning_per_tier_in_aed).toLocaleString()}` : 'no category cap'})</span>
          {index === tiers.length - 1 && merchantDisclaimer(card, category)}
        </div>)}
      </div>
    }
    return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, whiteSpace: 'nowrap' }}><strong style={{ color: '#0E3785' }}>{fmtRate(rate(card, category))}</strong><span style={{ color: '#7A8BA8', fontSize: 11 }}>({cap(card, category)})</span>{merchantDisclaimer(card, category)}</div>
  }
  const list = (items: string[] | undefined) => items && items.length ? <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>{items.map((item, index) => <li key={index} style={{ lineHeight: 1.5, fontSize: 12 }}>• {item}</li>)}</ul> : <span style={{ color: '#9CA3AF', fontSize: 12 }}>Loading current card details…</span>
  const benefitRows = (card: ApiCard) => details[card.earnn_card_id]?.benefit_rows || []
  const hasStructuredBenefits = (card: ApiCard) => Array.isArray(details[card.earnn_card_id]?.benefit_rows)
  const isLounge = (benefit: CardBenefit) => benefit.benefit_category_normalised === 'airport_lounge_access'
  const isCinema = (benefit: CardBenefit) => benefit.benefit_category?.toLowerCase() === 'cinema'
  const loungeRows = (card: ApiCard) => benefitRows(card).filter(isLounge)
  const cinemaRows = (card: ApiCard) => benefitRows(card).filter(isCinema)
  const otherBenefits = (card: ApiCard) => benefitRows(card).filter(benefit => !isLounge(benefit) && !isCinema(benefit) && Boolean(benefit.featured_display_message))
  const spendCondition = (benefit: CardBenefit) => benefit.requires_monthly_min_spend_on_card
    ? benefit.monthly_min_spend_aed_on_card && benefit.monthly_min_spend_aed_on_card > 0
      ? `min spend AED ${Math.round(benefit.monthly_min_spend_aed_on_card).toLocaleString()}/mo`
      : 'min spend required'
    : 'no min spend needed'
  const loungeValue = (benefit: CardBenefit) => benefit.quantity_per_period && benefit.quantity_per_period >= 999999
    ? `Unlimited lounge access (${spendCondition(benefit)})`
    : benefit.quantity_per_period != null
      ? `${benefit.quantity_per_period} lounge visit${benefit.quantity_per_period === 1 ? '' : 's'} / year (${spendCondition(benefit)})`
      : `Lounge access (${spendCondition(benefit)})`
  const cinemaValue = (benefit: CardBenefit) => `${benefit.featured_display_message || 'Cinema benefit'} (${spendCondition(benefit)})`
  const otherBenefitList = (card: ApiCard) => {
    const detail = details[card.earnn_card_id]
    const rows = otherBenefits(card)
    if (!detail) return <span style={{ color: '#9CA3AF', fontSize: 12 }}>Loading current card details…</span>
    // The deployed API may temporarily be the older response shape. Continue
    // showing its existing featured messages; after the backend update, the
    // structured category data allows lounge/cinema to be excluded exactly.
    if (!hasStructuredBenefits(card)) return list(detail.benefits)
    if (!rows.length) return <span style={{ color: '#9CA3AF', fontSize: 12 }}>No other top benefits available</span>
    return <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>{rows.map((row, index) => <li key={index} style={{ lineHeight: 1.5, fontSize: 12 }}>• {row.featured_display_message}</li>)}</ul>
  }
  const bestForItems = (card: ApiCard, section: 'Top earn rates' | 'Highlight' | 'Best for') => {
    const detail = details[card.earnn_card_id]
    if (!detail) return null
    const prefix = section.replace(/\s+/g, '\\s+')
    const matched = detail.best_for
      .map(line => line.match(new RegExp(`^\\s*${prefix}\\s*:\\s*(.*)$`, 'i'))?.[1] || '')
      .filter(Boolean)
      .flatMap(value => value.split(/[;|]/).map(item => item.trim()).filter(Boolean))
    return matched
  }
  const bestForSection = (card: ApiCard, section: 'Top earn rates' | 'Highlight' | 'Best for') => {
    const items = bestForItems(card, section)
    if (items === null) return <span style={{ color: '#9CA3AF', fontSize: 12 }}>Loading current card details…</span>
    if (!items.length) return null
    return <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 5 }}>{items.map((item, index) => <li key={index} style={{ lineHeight: 1.5, fontSize: 12 }}>• {item}</li>)}</ul>
  }
  const row = (text: string, render: (card: ApiCard) => React.ReactNode, shaded = false, labelContent: React.ReactNode = text) => <tr key={text} style={{ background: shaded ? '#FBFCFF' : 'white' }}><td style={label}>{labelContent}</td>{cards.map(card => <td key={card.earnn_card_id} style={cell}>{render(card)}</td>)}</tr>
  const sectionHeading = (title: string, eyebrow: string) => <tr><td colSpan={cards.length + 1} style={{ padding: 0, borderTop: '1px solid #DCE6F6' }}><div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 10, background: 'linear-gradient(90deg, #EEF3FF 0%, #F9FBFF 72%, #FFFFFF 100%)' }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: '#C9A84C', boxShadow: '0 0 0 5px rgba(201,168,76,.13)' }} /><span style={{ color: '#0E3785', fontSize: 15, fontWeight: 900, letterSpacing: '-.01em' }}>{title}</span><span style={{ color: '#7A8BA8', fontSize: 11.5, fontWeight: 600 }}>{eyebrow}</span></div></td></tr>

  return <div role="dialog" aria-modal="true" aria-label="Compare selected cards" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, padding: 'clamp(12px, 3vw, 32px)', background: 'rgba(5,18,43,.72)', backdropFilter: 'blur(7px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
    <div onClick={event => event.stopPropagation()} style={{ width: 'min(1280px, 100%)', maxHeight: '94vh', overflow: 'auto', borderRadius: 26, background: '#F3F6FC', boxShadow: '0 32px 96px rgba(3,12,30,.48)', border: '1px solid rgba(255,255,255,.35)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 3, padding: '25px clamp(20px, 3vw, 34px)', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden', background: 'radial-gradient(circle at 82% 0%, rgba(52,112,222,.65), transparent 32%), linear-gradient(118deg, #071D4A 0%, #0E3785 58%, #123F91 100%)' }}>
        <div style={{ position: 'absolute', right: 82, bottom: -58, width: 220, height: 160, border: '1px solid rgba(255,255,255,.12)', borderRadius: '50%', transform: 'rotate(-18deg)' }} />
        <div style={{ position: 'relative' }}><div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 9px', borderRadius: 100, background: 'rgba(255,255,255,.1)', color: '#E7C65A', fontSize: 10.5, letterSpacing: '.11em', fontWeight: 900, textTransform: 'uppercase' }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E7C65A' }} />Earnn card compare</div><div style={{ marginTop: 10, fontSize: 'clamp(22px, 3vw, 30px)', fontWeight: 900, letterSpacing: '-.035em' }}>Your cards, side by side.</div><div style={{ marginTop: 5, color: '#C7D7F6', fontSize: 12.5 }}>Compare rewards, value and benefits at a glance.</div></div>
        <button onClick={onClose} aria-label="Close comparison" style={{ width: 34, height: 34, borderRadius: 8, border: '1px solid rgba(255,255,255,.25)', background: 'rgba(255,255,255,.1)', color: 'white', cursor: 'pointer', fontSize: 20 }}>×</button>
      </div>
      <div style={{ padding: 'clamp(14px, 2.4vw, 28px)', background: 'linear-gradient(180deg, #EAF0FB 0%, #F8FAFE 290px)' }}><div style={{ overflowX: 'auto', borderRadius: 18, overflowY: 'hidden', border: '1px solid #D7E2F3', background: 'white', boxShadow: '0 14px 34px rgba(24,58,112,.10)' }}><table style={{ minWidth: 920, width: '100%', tableLayout: 'fixed', borderCollapse: 'separate', borderSpacing: 0 }}>
        <colgroup><col style={{ width: firstColumnWidth }} />{cards.map(card => <col key={card.earnn_card_id} />)}</colgroup>
        <thead><tr style={{ background: '#FFFFFF' }}><th style={{ ...label, textAlign: 'left', background: '#F0F4FC', borderBottom: '1px solid #DCE6F6' }}><div style={{ color: '#0E3785', fontSize: 11, fontWeight: 900 }}>SELECTED<br />CARDS</div><div style={{ marginTop: 5, color: '#7385A5', fontSize: 10, fontWeight: 700, textTransform: 'none', letterSpacing: 0 }}>{cards.length} of 3 selected</div></th>{cards.map(card => <th key={card.earnn_card_id} style={{ ...cell, minWidth: 0, textAlign: 'left', background: '#FFFFFF', borderBottom: '1px solid #DCE6F6' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}><div style={{ padding: 4, flexShrink: 0, borderRadius: 9, background: '#F2F6FF', border: '1px solid #DFE8F8' }}><img src={getCardImageUrl(card.earnn_card_id)} alt={card.card_name} width={70} height={44} loading="lazy" onError={(event) => { (event.target as HTMLImageElement).src = '/card-dummy.svg' }} style={{ display: 'block', borderRadius: 5, objectFit: 'cover' }} /></div><div><div style={{ color: '#6A7D9E', fontSize: 10.5, fontWeight: 700 }}>{card.bank_name}</div><div style={{ marginTop: 3, color: '#10213B', fontWeight: 900, fontSize: 13, lineHeight: 1.25 }}>{card.card_name}</div></div></div><button onClick={() => onRemove(card.earnn_card_id)} aria-label={`Remove ${card.card_name}`} style={{ flexShrink: 0, width: 27, height: 27, border: '1px solid #D9E3F4', borderRadius: 8, background: '#F5F8FE', color: '#45628E', cursor: 'pointer', fontWeight: 900 }}>×</button></div></th>)}</tr></thead>
        <tbody>
          {row('earnn score', card => <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><ScoreGauge score={card.earnn_score} /><div><strong style={{ display: 'block', color: scoreColor(card.earnn_score), fontSize: 24, letterSpacing: '-.04em', lineHeight: 1 }}>{fmtScore(card.earnn_score)}</strong><span style={{ display: 'block', marginTop: 3, color: '#7184A4', fontSize: 10.5, fontWeight: 800, letterSpacing: '.04em' }}>/ 100</span></div></div>, true, <ComparisonMetricLabel label="earnn score" text="earnn Score is hyper-personalised — it varies based on your spending pattern. This score reflects how well this card works for you." />)}
          {row('Best for', card => bestForSection(card, 'Best for'))}
          {row('Highlight', card => bestForSection(card, 'Highlight'), true)}
          {row('Overall expected reward rate', rewardRateBadge)}
          {row('Fee', card => { const fee = effectiveFeeAed(card); return <strong style={{ color: fee === 0 ? '#00A67E' : '#C95B00' }}>{fee === 0 ? 'Lifetime free' : `AED ${Math.round(fee).toLocaleString()} / yr`}</strong> }, true)}
          {row('Expected yearly reward', card => <strong style={{ color: '#00A67E' }}>AED {Math.round(card.expected_annual_return_aed || 0).toLocaleString()}</strong>, false, <ComparisonMetricLabel label="Expected yearly reward" text="Estimated annual rewards based on the standard UAE spending profile used for this comparison, before annual fees." />)}
          {row('Expected monthly reward', card => <strong style={{ color: '#00A67E' }}>AED {Math.round((card.expected_annual_return_aed || 0) / 12).toLocaleString()}</strong>, true)}
          {row('NAV', card => <strong style={{ color: '#0E3785' }}>AED {Math.round(card.nav_aed || 0).toLocaleString()}</strong>, false, <ComparisonMetricLabel label="NAV" text="Expected yearly rewards minus the true annual fee (after waivers)." />)}
          {sectionHeading('Rewards', 'Rates, caps and earning thresholds')}
          {categories.map(([key, text], index) => row(text, card => categoryRewardValue(card, key), index % 2 === 0))}
          <tr style={{ height: 42, background: '#F7F9FE', borderTop: '1px solid #E3EAF6', borderBottom: '1px solid #E3EAF6' }}><td style={{ ...label, padding: '9px 14px' }}><button onClick={onToggleOptionalSection} aria-expanded={showOptionalCategories} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, border: 'none', padding: 0, background: 'transparent', color: '#0E3785', cursor: 'pointer', fontSize: 10.5, fontWeight: 900, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '.06em' }}><span style={{ display: 'inline-flex', width: 17, height: 17, alignItems: 'center', justifyContent: 'center', borderRadius: 5, background: '#0E3785', color: 'white', fontSize: 15, lineHeight: 1 }}>{showOptionalCategories ? '−' : '+'}</span>{showOptionalCategories ? 'Hide extra categories' : 'Show more categories'}</button></td><td colSpan={cards.length} style={{ ...cell, padding: 0, background: '#FFFFFF' }} /></tr>
          {row('Max capping at card', card => { const value = card.display_max_earning_per_card_aed ?? detailValue(card, 'max_earning_per_card_in_aed'); return value && value > 0 ? `AED ${Math.round(value).toLocaleString()} / mo` : 'No card cap recorded' })}
          {row('Min spend required', card => { const value = card.display_min_monthly_spend_aed_on_card ?? detailValue(card, 'min_monthly_spend_aed_on_card'); return value && value > 0 ? `AED ${Math.round(value).toLocaleString()} / mo` : 'No minimum spend recorded' }, true)}
          {sectionHeading('Benefits', 'Travel, entertainment and card privileges')}
          {row('Lounge access', card => { const rows = loungeRows(card); return !details[card.earnn_card_id] ? <span style={{ color: '#9CA3AF', fontSize: 12 }}>Loading current card details…</span> : rows.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{rows.map((benefit, index) => <span key={index}>{loungeValue(benefit)}</span>)}</div> : <span style={{ color: '#9CA3AF', fontSize: 12 }}>No benefit available</span> }, true)}
          {row('Cinema benefit', card => { const rows = cinemaRows(card); return !details[card.earnn_card_id] ? <span style={{ color: '#9CA3AF', fontSize: 12 }}>Loading current card details…</span> : rows.length ? <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>{rows.map((benefit, index) => <span key={index}>{cinemaValue(benefit)}</span>)}</div> : <span style={{ color: '#9CA3AF', fontSize: 12 }}>No benefit available</span> })}
          {row('Other top benefits', otherBenefitList, true)}
          {row('Things to note', card => list(details[card.earnn_card_id]?.card_disclaimer), true)}
          <tr style={{ borderTop: '1px solid #DCE6F6', background: '#F7F9FE' }}><td style={{ ...label, verticalAlign: 'middle' }}><span style={{ color: '#7385A5', fontSize: 10 }}>APPLICATION</span></td>{cards.map(card => <td key={card.earnn_card_id} style={{ ...cell, verticalAlign: 'middle', textAlign: 'center' }}><button disabled aria-disabled="true" style={{ minWidth: 132, padding: '11px 18px', border: 'none', borderRadius: 9, background: '#C9A84C', color: '#FFFFFF', opacity: .52, cursor: 'not-allowed', fontSize: 12, fontWeight: 900, letterSpacing: '.02em' }}>Apply Now</button></td>)}</tr>
        </tbody>
      </table></div></div>
    </div>
  </div>
}

function ScoreGauge({ score }: { score: number }) {
  const value = Math.max(0, Math.min(100, score))
  const angle = Math.PI - (value / 100) * Math.PI
  const needleX = 80 + 46 * Math.cos(angle)
  const needleY = 78 - 46 * Math.sin(angle)

  return <svg viewBox="0 0 160 96" width="106" height="64" role="img" aria-label={`Earnn score gauge: ${fmtScore(value)} out of 100`} style={{ flexShrink: 0, overflow: 'visible' }}>
    <title>Earnn score gauge</title>
    <path d="M22 78 C22 65 26 53 33 44" fill="none" stroke="#E94B3C" strokeWidth="16" strokeLinecap="butt" />
    <path d="M33 44 C41 33 50 26 62 23" fill="none" stroke="#F78C32" strokeWidth="16" strokeLinecap="butt" />
    <path d="M62 23 C74 18 86 18 98 23" fill="none" stroke="#F4C842" strokeWidth="16" strokeLinecap="butt" />
    <path d="M98 23 C110 26 119 33 127 44" fill="none" stroke="#85C84A" strokeWidth="16" strokeLinecap="butt" />
    <path d="M127 44 C134 53 138 65 138 78" fill="none" stroke="#159B61" strokeWidth="16" strokeLinecap="butt" />
    <path d="M35 78 C35 53 55 33 80 33 C105 33 125 53 125 78" fill="none" stroke="rgba(14,55,133,.08)" strokeWidth="18" strokeLinecap="butt" />
    <line x1="80" y1="78" x2={needleX} y2={needleY} stroke="#143968" strokeWidth="3.5" strokeLinecap="round" />
    <circle cx="80" cy="78" r="8" fill="#143968" />
    <circle cx="80" cy="78" r="3" fill="#FFFFFF" opacity=".85" />
    <text x="16" y="94" fill="#8090A8" fontSize="9" fontWeight="800">0</text>
    <text x="135" y="94" fill="#8090A8" fontSize="9" fontWeight="800">100</text>
  </svg>
}

function ComparisonMetricLabel({ label, text }: { label: string; text: string }) {
  const [visible, setVisible] = useState(false)
  return <span style={{ position: 'relative', display: 'inline-block', cursor: 'help', borderBottom: '1.5px dotted #7589AA' }} onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
    {label}
    {visible && <span style={{ position: 'absolute', zIndex: 20, left: 0, bottom: 'calc(100% + 9px)', width: 240, padding: '10px 12px', borderRadius: 9, background: '#0D1828', color: 'white', textTransform: 'none', letterSpacing: 0, fontSize: 11.5, fontWeight: 500, lineHeight: 1.5, boxShadow: '0 10px 24px rgba(0,0,0,.24)', pointerEvents: 'none' }}>{text}</span>}
  </span>
}

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
function Tooltip({ text, wide = false }: { text: string; wide?: boolean }) {
  return (
    <span style={{
      position: 'absolute', top: '120%', left: '50%', transform: 'translateX(-50%)',
      background: '#0D1828', color: 'white', fontSize: 12, lineHeight: 1.6, fontWeight: 400,
      padding: '10px 14px', borderRadius: 10, width: wide ? 'max-content' : 240, maxWidth: wide ? 'min(560px, calc(100vw - 32px))' : 240, zIndex: 200,
      boxShadow: '0 8px 24px rgba(0,0,0,0.25)', textAlign: 'center', fontStyle: 'normal',
      pointerEvents: 'none', whiteSpace: 'normal'
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
  display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start',
  background: '#F4F6FB', border: 'none', paddingTop: 3, paddingBottom: 4
}
const filterLabelStyle: React.CSSProperties = {
  fontSize: 9, fontWeight: 700, color: '#9DAEC8',
  textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
  lineHeight: 1.4, textAlign: 'center'
}
const leftFilterLabelStyle: React.CSSProperties = {
  ...filterLabelStyle, textAlign: 'left', paddingLeft: 8
}
const filterSelectStyle: React.CSSProperties = {
  width: '100%', padding: '0 8px', height: 24, border: 'none', background: 'transparent',
  color: '#0D1828', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none', textAlign: 'left'
}
const popupFilterLabelStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: 6, color: '#5A6A85',
  fontSize: 11, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase', textAlign: 'left'
}
const popupControlStyle: React.CSSProperties = {
  width: '100%', height: 38, padding: '0 10px', border: '1px solid #D6E0F5', borderRadius: 8,
  background: '#F8FAFF', color: '#0D1828', fontSize: 13, fontWeight: 600, outline: 'none', textAlign: 'left'
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
