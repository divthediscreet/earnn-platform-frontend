'use client'

import { useState } from 'react'
import { lookupMerchant, getCardImageUrl, type MerchantLookupCard, type MerchantLookupResult } from '@/lib/api'

const COLORS = {
  primary:    '#0E3785',
  text:       '#0D1828',
  secondary:  '#5A6A85',
  border:     '#D6E0F5',
  bgTint:     '#EEF3FF',
  earn:       '#00A67E',
}

function tierRangeLabel(min: number | null, max: number | null): string {
  const openEnded = max === null || max >= 999999
  if ((min === null || min === 0) && openEnded) return 'No min monthly spend required'
  if (min !== null && openEnded) return `Min spend AED ${Math.round(min).toLocaleString()}/mo required`
  if ((min === null || min === 0) && max !== null) return `Up to AED ${Math.round(max).toLocaleString()}/mo`
  if (min !== null && max !== null) return `AED ${Math.round(min).toLocaleString()}–${Math.round(max).toLocaleString()}/mo`
  return 'No min monthly spend required'
}

function CardRow({ card, rank, onShowMalls }: { card: MerchantLookupCard; rank: number; onShowMalls: (card: MerchantLookupCard) => void }) {
  return (
    <div style={{
      display: 'flex', gap: 16, alignItems: 'flex-start',
      padding: '16px 18px', border: `1px solid ${COLORS.border}`, borderRadius: 12,
      background: rank === 1 ? COLORS.bgTint : '#fff',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: rank === 1 ? COLORS.primary : '#EDF1F9',
        color: rank === 1 ? '#fff' : COLORS.secondary,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700,
      }}>{rank}</div>

      <img
        src={getCardImageUrl(card.earnn_card_id)}
        onError={(e) => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }}
        alt=""
        style={{ width: 88, height: 54, objectFit: 'contain', borderRadius: 6, flexShrink: 0 }}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>{card.card_name}</div>
        <div style={{ fontSize: 12.5, color: COLORS.secondary, marginTop: 2 }}>{card.bank_name}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
          {card.tier_breakdown.map((tier, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              padding: '5px 9px', borderRadius: 6, background: '#F4F8FF', fontSize: 12.5,
            }}>
              <strong style={{ color: COLORS.earn }}>{tier.rate_pct.toFixed(2)}%</strong>
              <span style={{ color: COLORS.secondary }}>: {tierRangeLabel(tier.min_monthly_spend_aed, tier.max_monthly_spend_aed)}</span>
              <span style={{ color: '#7A8BA8', fontSize: 11.5 }}>
                (Category Cap: {tier.cap_aed ? `AED ${Math.round(tier.cap_aed).toLocaleString()}` : 'No'} ; Card Level Cap: {tier.card_cap_aed ? `AED ${Math.round(tier.card_cap_aed).toLocaleString()}` : 'No'})
              </span>
            </div>
          ))}
        </div>

        {card.matched_malls.length > 0 && (
          <button
            onClick={() => onShowMalls(card)}
            style={{
              marginTop: 8, padding: 0, border: 'none', background: 'none',
              color: COLORS.primary, fontSize: 12.5, fontWeight: 600,
              textDecoration: 'underline', cursor: 'pointer',
            }}
          >
            Selected Stores Only
          </button>
        )}
      </div>
    </div>
  )
}

function MallListPopup({ card, onClose }: { card: MerchantLookupCard; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(13,24,40,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, padding: '22px 24px', maxWidth: 420,
          width: '100%', maxHeight: '70vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>Selected Stores Only</div>
            <div style={{ fontSize: 12.5, color: COLORS.secondary, marginTop: 4 }}>
              This rate applies at {card.card_name} only where the store is located inside one of these malls:
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ border: 'none', background: 'none', fontSize: 18, color: COLORS.secondary, cursor: 'pointer', lineHeight: 1 }}
          >×</button>
        </div>
        <ul style={{ margin: '14px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {card.matched_malls.map((mall) => (
            <li key={mall} style={{
              fontSize: 13.5, color: COLORS.text, padding: '7px 10px',
              background: COLORS.bgTint, borderRadius: 8,
            }}>{mall}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function MerchantLookupPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MerchantLookupResult | null>(null)
  const [mallPopupCard, setMallPopupCard] = useState<MerchantLookupCard | null>(null)

  async function runSearch() {
    const name = query.trim()
    if (!name) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await lookupMerchant(name)
      setResult(res)
    } catch (e) {
      setError('Something went wrong looking that up. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '48px 20px 80px' }}>
      <h1 style={{ fontSize: 26, fontWeight: 800, color: COLORS.text, margin: 0 }}>
        Best Card for This Store
      </h1>
      <p style={{ fontSize: 14.5, color: COLORS.secondary, marginTop: 8, lineHeight: 1.5 }}>
        Search any store, restaurant or app to find the UAE credit cards that reward you most there.
      </p>

      <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') runSearch() }}
          placeholder="e.g. Lulu, Carrefour, Netflix, Talabat..."
          style={{
            flex: 1, padding: '12px 14px', fontSize: 15, borderRadius: 10,
            border: `1px solid ${COLORS.border}`, outline: 'none', color: COLORS.text,
          }}
        />
        <button
          onClick={runSearch}
          disabled={loading || !query.trim()}
          style={{
            padding: '12px 22px', fontSize: 15, fontWeight: 700, borderRadius: 10, border: 'none',
            background: loading || !query.trim() ? '#A9B8D6' : COLORS.primary, color: '#fff',
            cursor: loading || !query.trim() ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Searching…' : 'Find Best Card'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 20, color: '#C0392B', fontSize: 14 }}>{error}</div>
      )}

      {result && result.resolved && (
        <div style={{ marginTop: 28 }}>
          <div style={{ fontSize: 13.5, color: COLORS.secondary, marginBottom: 14 }}>
            Showing results for <strong style={{ color: COLORS.text }}>{result.merchant_name}</strong>
            {result.category ? <> — category: <strong style={{ color: COLORS.text }}>{result.category.replace(/_/g, ' ')}</strong></> : null}
            {' · '}{result.cards.length} card{result.cards.length === 1 ? '' : 's'}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.cards.map((card, i) => (
              <CardRow key={card.earnn_card_id} card={card} rank={i + 1} onShowMalls={setMallPopupCard} />
            ))}
          </div>
        </div>
      )}

      {result && !result.resolved && (
        <div style={{ marginTop: 28, fontSize: 14.5, color: COLORS.secondary }}>
          We couldn't recognise "{result.merchant_name}" as a merchant. Try a more specific or
          well-known name.
        </div>
      )}

      {mallPopupCard && (
        <MallListPopup card={mallPopupCard} onClose={() => setMallPopupCard(null)} />
      )}
    </div>
  )
}
