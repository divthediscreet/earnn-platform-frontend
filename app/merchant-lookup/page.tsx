'use client'

import { useState } from 'react'
import PageHero from '@/components/PageHero'
import { lookupMerchant, getCardImageUrl, type MerchantLookupCard, type MerchantLookupResult } from '@/lib/api'
import CardNameLink from '@/components/CardNameLink'
import RewardConditionLabel from '@/components/RewardConditionLabel'

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

type ViewMode = 'cashback' | 'miles'

// Miles view: the API sends rates and reward caps already converted (rate_pct = miles per AED 100); spend stays in AED.
const fmtReward = (mode: ViewMode, n: number) => (mode === 'miles' ? `${Math.round(n).toLocaleString()} miles` : `AED ${Math.round(n).toLocaleString()}`)

/** A cap amount with a light highlight on just the "AED 500" part; "No" when there is no cap. */
function CapAmount({ mode, amount }: { mode: ViewMode; amount: number | null | undefined }) {
  if (!amount) return <>No</>
  return <span style={{ background: '#FFF1C2', color: '#7A5A00', fontWeight: 700, padding: '1px 5px', borderRadius: 4 }}>{fmtReward(mode, amount)}</span>
}

function CardRow({ card, rank, mode }: { card: MerchantLookupCard; rank: number; mode: ViewMode }) {
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
        <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}><CardNameLink cardId={card.earnn_card_id}>{card.card_name}</CardNameLink></div>
        <div style={{ fontSize: 12.5, color: COLORS.secondary, marginTop: 2 }}>{card.bank_name}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
          {card.tier_breakdown.map((tier, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              padding: '5px 9px', borderRadius: 6, background: '#F4F8FF', fontSize: 12.5,
            }}>
              <strong style={{ color: COLORS.earn }}>{mode === 'miles' ? `${tier.rate_pct.toFixed(1)} mi` : `${tier.rate_pct.toFixed(2)}%`}</strong>
              <span style={{ color: COLORS.secondary }}>: {tierRangeLabel(tier.min_monthly_spend_aed, tier.max_monthly_spend_aed)}</span>
              <span style={{ color: '#7A8BA8', fontSize: 11.5 }}>
                (Category Cap: <CapAmount mode={mode} amount={tier.cap_aed} /> ; Card Level Cap: <CapAmount mode={mode} amount={tier.card_cap_aed} />)
              </span>
            </div>
          ))}
        </div>

        <RewardConditionLabel
          paymentCondition={card.payment_condition_and_other_restrictions}
          merchantList={card.merchant_list}
          matchedMalls={card.matched_malls}
          cardName={card.card_name}
        />
      </div>
    </div>
  )
}

const POPULAR_STORES = ['Lulu', 'Carrefour', 'Noon', 'Talabat', 'Amazon', 'Careem', 'Netflix']

const HOW_IT_WORKS = [
  { icon: 'ti-search', title: 'Search a store', text: 'Any shop, restaurant or app.', bg: '#E3EBFB', color: '#185FA5' },
  { icon: 'ti-credit-card', title: 'We check every card', text: 'Rates, caps and conditions.', bg: '#DCF3EA', color: '#0F6E56' },
  { icon: 'ti-trophy', title: 'See what you earn', text: 'The best card, ranked for you.', bg: '#FBEBCB', color: '#854F0B' },
]

export default function MerchantLookupPage() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<MerchantLookupResult | null>(null)
  const [mode, setMode] = useState<ViewMode>('cashback') // always opens on cashback
  const [searched, setSearched] = useState('')           // the name the current results are for

  async function runSearch(name = query.trim(), viewMode: ViewMode = mode, keepResults = false) {
    if (!name) return
    setLoading(true)
    setError(null)
    if (!keepResults) setResult(null) // a view switch keeps the list (and the toggle) on screen until the new one arrives
    try {
      const res = await lookupMerchant(name, viewMode)
      setSearched(name)
      setResult(res)
    } catch (e) {
      setError('Something went wrong looking that up. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
    <PageHero tone="light" tall image="/images/heroes/CardMatch.webp" width={1112} titleSize="clamp(30px,3.6vw,50px)"
      kicker="MATCH & TAP" kickerColor="#17265e"
      title={<span style={{ color: '#17265e' }}>Know which card<br />to use at any store<span style={{ color: '#8a4b2a' }}>.</span></span>}
      subtitle={<span style={{ color: '#2a3b6f' }}>Search a store, restaurant or merchant and we’ll show you the best card to use and how much you can earn.</span>} />
    <div style={{ width: 'min(1112px, calc(100% - 48px))', margin: '0 auto', padding: '0 0 80px' }}>
      <style>{'@media (max-width: 760px) { .cm-search { margin: 14px 0 0 !important; } .cm-how { margin: 16px 0 0 !important; } }'}</style>
      <div className="cm-search" style={{ position: 'relative', zIndex: 2, margin: '-46px 24px 0', background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 16, boxShadow: '0 14px 34px rgba(14,55,133,0.14)' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') runSearch() }}
            placeholder="Search Lulu, Noon, Talabat, Netflix…"
            aria-label="Store, restaurant or app"
            style={{
              flex: '1 1 260px', padding: '13px 16px', fontSize: 15, borderRadius: 10,
              border: `1px solid ${COLORS.border}`, outline: 'none', color: COLORS.text,
            }}
          />
          <button
            className="btn-primary"
            onClick={() => runSearch()}
            disabled={loading || !query.trim()}
          >
            {loading ? 'Searching…' : 'Find best card'}
          </button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 12 }}>
          <span style={{ fontSize: 12.5, color: COLORS.secondary, fontWeight: 600 }}>Popular:</span>
          {POPULAR_STORES.map(name => (
            <button key={name} type="button" disabled={loading}
              onClick={() => { setQuery(name); runSearch(name) }}
              style={{ border: `1px solid ${COLORS.border}`, background: COLORS.bgTint, color: COLORS.primary, fontSize: 12.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999, cursor: 'pointer' }}>
              {name}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ margin: '20px auto 0', maxWidth: 900, color: '#C0392B', fontSize: 14 }}>{error}</div>
      )}

      {!result && !loading && (
        <div className="cm-how" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, margin: '18px 24px 0' }}>
          {HOW_IT_WORKS.map(step => (
            <div key={step.title} style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 14, padding: '13px 16px' }}>
              <span aria-hidden style={{ display: 'grid', placeItems: 'center', flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: step.bg, color: step.color, fontSize: 18 }}><i className={`ti ${step.icon}`} /></span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: COLORS.text, lineHeight: 1.25 }}>{step.title}</div>
                <div style={{ fontSize: 12.5, color: COLORS.secondary, marginTop: 2, lineHeight: 1.4 }}>{step.text}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {result && result.resolved && (
        <div style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, color: COLORS.secondary }}>
              Showing results for <strong style={{ color: COLORS.text }}>{result.merchant_name}</strong>
              {result.category ? <> — category: <strong style={{ color: COLORS.text }}>{result.category_label || result.category.replace(/_/g, ' ')}</strong></> : null}
              {result.also_online ? <>. Also comes under <strong style={{ color: COLORS.text }}>Online Payment</strong></> : null}
              <div style={{ fontSize: 11.5, marginTop: 2 }}>
                {result.cards.length} card{result.cards.length === 1 ? '' : 's'} (estimated rate)
              </div>
            </div>
            <div role="radiogroup" aria-label="Reward view" style={{ display: 'inline-flex', gap: 2, padding: 2, borderRadius: 8, background: COLORS.bgTint, border: `1px solid ${COLORS.border}` }}>
              {(['cashback', 'miles'] as const).map(m => (
                <button key={m} type="button" role="radio" aria-checked={mode === m} disabled={loading}
                  onClick={() => { if (m !== mode) { setMode(m); runSearch(searched, m, true) } }}
                  style={{ border: 'none', cursor: 'pointer', padding: '3px 11px', borderRadius: 6, fontSize: 11.5, fontWeight: 800,
                    background: mode === m ? COLORS.primary : 'transparent', color: mode === m ? '#fff' : COLORS.primary }}>
                  {m === 'cashback' ? 'Cashback' : 'Miles'}
                </button>
              ))}
            </div>
          </div>
          {mode === 'miles' && <div style={{ fontSize: 11.5, color: COLORS.secondary, margin: '-6px 0 12px' }}>mi = miles earned per AED 100 spent</div>}
          <div style={{ position: 'relative' }}>
          {loading && (
            <div role="status" aria-live="polite" style={{
              position: 'absolute', inset: 0, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center',
              paddingTop: 90, gap: 12, background: 'rgba(255,255,255,0.88)', borderRadius: 12,
            }}>
              <style>{'@keyframes earnn-spin { to { transform: rotate(360deg) } }'}</style>
              <div style={{ width: 44, height: 44, borderRadius: '50%', border: `4px solid ${COLORS.border}`, borderTopColor: COLORS.primary, animation: 'earnn-spin 0.8s linear infinite' }} />
              <div style={{ fontSize: 13.5, fontWeight: 700, color: COLORS.primary }}>Finding the best {mode === 'miles' ? 'miles' : 'cashback'} cards…</div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {result.cards.map((card, i) => (
              <CardRow key={card.earnn_card_id} card={card} rank={i + 1} mode={mode} />
            ))}
          </div>
          </div>
          <div style={{ marginTop: 16, fontSize: 12, color: COLORS.secondary, textAlign: 'center', lineHeight: 1.5 }}>
            All rates are estimates only and may differ from the rate your bank actually applies.
          </div>
        </div>
      )}

      {result && !result.resolved && (
        <div style={{ marginTop: 28, fontSize: 14.5, color: COLORS.secondary }}>
          We couldn't recognise "{result.merchant_name}" as a merchant. Try a more specific or
          well-known name.
        </div>
      )}

      </div>

    </div>
    </>
  )
}
