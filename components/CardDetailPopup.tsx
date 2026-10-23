'use client'

import { useEffect, useState } from 'react'
import { fetchCardDetail, getCardImageUrl } from '@/lib/api'
import { parseDetail, type Benefit, type BenefitRow } from '@/lib/cardDetailParse'
import { benefitVisual } from '@/lib/benefitVisuals'
import { buildRewardWindow, hasRewards, type RewardItem, type RewardRow } from '@/lib/rewardWindow'

type Detail = {
  card: Record<string, unknown>
  benefits: string[]
  best_for: string[]
  card_disclaimer: string[] | string
  benefit_rows?: BenefitRow[]
  reward_rows?: RewardRow[]
  miles_ratio?: number | null
}

const formatNumber = (value: number) => new Intl.NumberFormat('en-AE', { maximumFractionDigits: 0 }).format(value)

function asFee(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const numeric = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

function feeLines(card: Record<string, unknown>) {
  const firstYear = asFee(card.annual_fee_year1_aed)
  const laterYear = asFee(card.annual_fee_from_year2_aed)
  const freeForLife = card.free_for_life === true || String(card.free_for_life).toLowerCase() === 'true'
  const firstYearFree = card.annual_fee_year1_free === true || String(card.annual_fee_year1_free).toLowerCase() === 'true'
  const waived = card.annual_fee_waiver_available === true || String(card.annual_fee_waiver_available).toLowerCase() === 'true'
  const waiverSpend = asFee(card.annual_fee_waiver_spend_aed)
  const money = (amount: number) => `AED ${formatNumber(amount)}`
  const waiver = waived && waiverSpend !== null && waiverSpend > 0 ? `(Waived on annual spend of ${money(waiverSpend)})` : null

  if (freeForLife) return { lines: ['Free for life'], waiver: null }
  if (firstYearFree) return { lines: ['First year: Free', laterYear === null ? 'From year 2: Fee not specified' : `From year 2: ${money(laterYear)} / year`], waiver }
  if (firstYear !== null && laterYear !== null && firstYear !== laterYear) return { lines: [`First year: ${money(firstYear)}`, `From year 2: ${money(laterYear)} / year`], waiver }
  const annualFee = laterYear ?? firstYear
  return { lines: [annualFee === null ? 'Fee not specified' : `Fee: ${money(annualFee)} / year`], waiver }
}

const NAVY = '#0D1828'
const BLUE = '#0E3785'
const GREEN = '#00A67E'

const asList = (value: unknown): string[] => ([] as unknown[]).concat(value ?? []).map(item => String(item)).filter(Boolean)

// Bold the numbers / amounts inside free text so key figures pop.
function emphasise(text: string) {
  return text.split(/((?:AED\s?)?\d[\d,.]*\s?(?:%|x\b|k\b)?)/g).map((part, i) => i % 2 === 1 ? <strong key={i} style={{ color: GREEN, fontWeight: 800 }}>{part}</strong> : part)
}

const panel = (background: string): React.CSSProperties => ({ background, borderRadius: 14, padding: '12px 14px' })
const heading: React.CSSProperties = { margin: '0 0 8px', color: BLUE, fontSize: 11.5, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase' }
const pill: React.CSSProperties = { padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(255,255,255,.28)', background: 'rgba(255,255,255,.08)', fontSize: 11.5, fontWeight: 600 }
// the golden boxes of the hero (monthly cap, minimum spend)
const goldPill: React.CSSProperties = { ...pill, border: '1px solid #F5C451', background: 'linear-gradient(135deg,#FFE08A 0%,#F5B93A 100%)', color: '#4A3000', fontWeight: 800, boxShadow: '0 2px 8px rgba(245,185,58,.35)' }
// the hero's minimum-spend box (violet, to tell it apart from the golden cap box)
const minSpendPill: React.CSSProperties = { ...pill, border: '1px solid #B9A2FF', background: 'linear-gradient(135deg,#E6DCFF 0%,#B99CFF 100%)', color: '#241150', fontWeight: 800, boxShadow: '0 2px 8px rgba(185,156,255,.45)' }
const NOTE_STYLE = { warn: { icon: '⚠️', color: '#B45309' }, low: { icon: '📉', color: '#5A6A85' }, bonus: { icon: '🎯', color: BLUE }, info: { icon: 'ℹ️', color: '#374151' } } as const

const rewardBox: React.CSSProperties = { boxSizing: 'border-box', height: '100%', padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,.85)', border: '1px solid #D6E0F5' }

function RewardList({ title, items, tone, emptyText }: { title: string; items: RewardItem[]; tone?: string; emptyText?: string }) {
  if (!items.length && !emptyText) return null
  return <div style={rewardBox}>
    <div style={{ marginBottom: 4, color: tone ?? '#5A6A85', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>{title}</div>
    {items.length ? items.map((item, index) => <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, padding: '4px 0', borderTop: index ? '1px solid rgba(14,55,133,.1)' : 'none' }}>
      <span style={{ color: NAVY, fontSize: 12, fontWeight: 600, lineHeight: 1.3 }}>{item.label}</span>
      <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.2 }}><span style={{ color: GREEN, fontSize: 14, fontWeight: 800 }}>{item.rate}</span>{item.cap && <span style={{ color: '#5A6A85', fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap' }}>({item.cap})</span>}</span>
    </div>) : <div style={{ padding: '4px 0', color: '#8A95A8', fontSize: 12 }}>{emptyText}</div>}
  </div>
}

function BenefitIcon({ item }: { item: Benefit }) {
  const { brand, glyph, tone } = benefitVisual(item.category, item.provider)
  if (brand) {
    const size = brand.label.length > 6 ? 9 : brand.label.length > 4 ? 11 : 13
    return <div style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: brand.bg, color: brand.fg, fontSize: size, fontWeight: 800, letterSpacing: '-.02em', textAlign: 'center', lineHeight: 1 }}>{brand.label}</div>
  }
  return <div style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', background: tone.bg, color: tone.fg }}>
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{glyph}</svg>
  </div>
}

// `mode` is the view the popup was opened from (Cashback/Miles tab). Without it, a pure miles card shows miles and
// everything else shows AED/%. In miles every AED rate and cap is divided by the card's AED-per-mile ratio (as in Analyze).
export default function CardDetailPopup({ cardId, onClose, mode }: { cardId: string; onClose: () => void; mode?: 'cashback' | 'miles' }) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    fetchCardDetail(cardId).then(result => {
      if (active) setDetail(result)
    }).catch(() => {}).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [cardId])

  const card = detail?.card
  const fee = card ? feeLines(card) : null
  const programType = String(card?.reward_program_type ?? '').toLowerCase()
  const ratio = detail?.miles_ratio && detail.miles_ratio > 0 ? detail.miles_ratio : null
  const inMiles = (mode ?? (programType === 'miles' ? 'miles' : 'cashback')) === 'miles' && ratio !== null
  const rewards = buildRewardWindow(detail?.reward_rows ?? [], { miles: inMiles, ratio })
  const parsed = detail ? parseDetail(asList(detail.best_for), asList(detail.benefits), asList(detail.card_disclaimer), detail.benefit_rows ?? []) : null
  // Card-level cap (dim_cards.max_earning_per_card_in_aed, monthly): AED, or miles = AED / ratio.
  const cardCapAed = asFee(card?.max_earning_per_card_in_aed)
  const textCapAed = Number((parsed?.monthlyCap ?? '').match(/AED\s?([\d,]+)/)?.[1]?.replace(/,/g, ''))
  const capAed = cardCapAed && cardCapAed > 0 ? cardCapAed : (Number.isFinite(textCapAed) && textCapAed > 0 ? textCapAed : null)
  const cardCapLabel = capAed ? (inMiles && ratio ? `${formatNumber(capAed / ratio)} miles` : `AED ${formatNumber(capAed)}`) : parsed?.monthlyCap ?? null
  // Card-level minimum monthly spend (fact_reward_rules; AED in every view): shown only when the card applies one.
  const minSpendOn = card?.is_min_spend_applicable === true || String(card?.is_min_spend_applicable).toLowerCase() === 'true'
  const minSpendAed = minSpendOn ? asFee(card?.min_monthly_spend_aed_on_card) : null
  const minSpendLabel = minSpendAed && minSpendAed > 0 ? `AED ${formatNumber(minSpendAed)} / month` : null
  // Best-for lines: new line only at ';' or '|'
  const headlineParts = parsed?.headlineParts ?? []

  return <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)' }} />
    <section style={{ position: 'relative', width: '94%', maxWidth: 900, maxHeight: '92vh', overflowY: 'auto', padding: 12, borderRadius: 22, background: '#fff', boxShadow: '0 24px 64px rgba(0,0,0,.3)' }} onClick={event => event.stopPropagation()} aria-label="Card details">
      <button type="button" onClick={onClose} aria-label="Close card details" style={{ position: 'absolute', top: 20, right: 22, zIndex: 2, width: 30, height: 30, border: 0, borderRadius: 15, background: 'rgba(255,255,255,.18)', color: '#fff', fontSize: 20, cursor: 'pointer' }}>×</button>
      {loading ? <div style={{ padding: 60, color: '#888', textAlign: 'center' }}>Loading…</div> : !card || !parsed ? <div style={{ padding: 60, color: '#888', textAlign: 'center' }}>Details unavailable</div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, padding: '16px 20px', borderRadius: 16, color: '#fff', background: 'linear-gradient(120deg,#0B2A5E 0%,#0E3785 60%,#134aa8 100%)' }}>
          <img src={getCardImageUrl(cardId)} alt="" width={132} height={83} style={{ flexShrink: 0, borderRadius: 10, objectFit: 'cover', boxShadow: '0 8px 22px rgba(0,0,0,.4)' }} onError={event => { event.currentTarget.src = '/card-dummy.svg' }} />
          <div style={{ flex: '1 1 280px', minWidth: 0, paddingRight: 28 }}>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', opacity: .7 }}>{String(card.bank_name ?? '')}</div>
            <div style={{ marginTop: 3, fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{String(card.card_name ?? '')}</div>
            {parsed.headline && <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.18)' }}>
              <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 999, background: '#19C3A0', color: '#04332A', fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em' }}>BEST FOR</span>
              {headlineParts.length > 1
                ? <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '4px 18px', marginTop: 9 }}>{headlineParts.map((part, index) => <div key={index} style={{ display: 'flex', gap: 7, fontSize: 13, fontWeight: 400, lineHeight: 1.45, opacity: .95 }}><span style={{ color: '#19C3A0' }}>•</span><span>{part}</span></div>)}</div>
                : <div style={{ marginTop: 9, fontSize: 14, fontWeight: 400, lineHeight: 1.5, opacity: .95 }}>{parsed.headline}</div>}
            </div>}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 14 }}>
              {fee?.lines.map(line => <span key={line} style={pill}>{line}</span>)}
              <span style={goldPill}>{cardCapLabel ? `Monthly earn cap: ${cardCapLabel}` : 'No monthly cap'}</span>
              <span style={minSpendPill}>{minSpendLabel ? `Min spend: ${minSpendLabel}` : 'No min spend'}</span>
            </div>
            {fee?.waiver && <div style={{ display: 'flex', marginTop: 6 }}><span style={pill}>{fee.waiver.replace(/^\(|\)$/g, '').replace(/^Waived/, 'Fee waived')}</span></div>}
          </div>
        </div>

        {hasRewards(rewards) ? <div style={panel('#EAF7F4')}>
          <h3 style={heading}>Rewards{rewards.isMiles && <span style={{ marginLeft: 8, color: '#5A6A85', fontWeight: 500, letterSpacing: 0, textTransform: 'none' }}>mi = miles earned per AED 100 spent</span>}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, alignItems: 'stretch' }}>
              <RewardList title="High reward category" items={rewards.high} tone={GREEN} emptyText="No category" />
              <RewardList title="Low reward category" items={rewards.low} tone="#C0392B" emptyText="No category" />
            </div>
            {(rewards.intlEu.length > 0 || rewards.intlOther.length > 0 || rewards.base.length > 0 || rewards.currencies.length > 0) && <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr) minmax(0, 1fr)', gap: 10, alignItems: 'stretch' }}>
              <div style={rewardBox}>
                <div style={{ marginBottom: 4, color: BLUE, fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>International</div>
                {[['EU/UK Region', rewards.intlEu], ['Other than - EU/UK countries', rewards.intlOther]].map(([label, items], index) => <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, padding: '4px 0', borderTop: index ? '1px solid rgba(14,55,133,.1)' : 'none' }}>
                  <span style={{ color: NAVY, fontSize: 12, fontWeight: 600 }}>{label as string}</span>
                  <span style={{ display: 'flex', gap: 10, alignItems: 'flex-start', lineHeight: 1.2 }}>{(items as RewardItem[]).length ? (items as RewardItem[]).map((item, i) => <span key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}><span style={{ color: GREEN, fontSize: 14, fontWeight: 800 }}>{item.rate}</span>{item.cap && <span style={{ color: '#5A6A85', fontSize: 10, fontWeight: 500, whiteSpace: 'nowrap' }}>({item.cap})</span>}</span>) : <span style={{ color: GREEN, fontSize: 14, fontWeight: 800 }}>—</span>}</span>
                </div>)}
              </div>
              <RewardList title="Base" items={rewards.base} emptyText="—" />
              <div style={rewardBox}>
                <div style={{ marginBottom: 4, color: '#5A6A85', fontSize: 11, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase' }}>Reward currency</div>
                <div style={{ padding: '4px 0', color: NAVY, fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{inMiles && programType === 'points_to_miles' ? `Miles (from ${rewards.currencies.join(' · ')})` : rewards.currencies.length ? rewards.currencies.join(' · ') : '—'}</div>
              </div>
            </div>}
          </div>
        </div> : parsed.earnRates.length > 0 && <div style={panel('#EAF7F4')}>
          <h3 style={heading}>Top Earn Rates</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{parsed.earnRates.map((rate, index) => <div key={index} style={{ display: 'flex', alignItems: 'baseline', gap: 8, color: NAVY, fontSize: 13 }}>
            {rate.big && <span style={{ flexShrink: 0, minWidth: 54, color: GREEN, fontSize: 18, fontWeight: 800 }}>{rate.big}</span>}
            <span style={{ fontWeight: 600 }}>{rate.label}</span>
          </div>)}</div>
        </div>}

        {parsed.highlights.length > 0 && <div style={panel('#FFF6E6')}>
          <h3 style={heading}>Key Highlights</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '5px 16px' }}>{parsed.highlights.map((item, index) => <div key={index} style={{ display: 'flex', gap: 7, color: NAVY, fontSize: 12.5, lineHeight: 1.4 }}>
            <span style={{ color: GREEN, fontWeight: 800 }}>✓</span><span>{emphasise(item.text)}</span>
          </div>)}</div>
        </div>}

        {parsed.benefits.length > 0 && <div style={panel('#EEF3FF')}>
          <h3 style={heading}>Top Benefits</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 8 }}>{parsed.benefits.map((item, index) => <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 12, background: 'rgba(255,255,255,.8)' }}>
            <BenefitIcon item={item} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: NAVY, fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>{item.title}</div>
              {item.sub && <div style={{ marginTop: 2, color: '#5A6A85', fontSize: 11.5 }}>{item.sub}</div>}
            </div>
          </div>)}</div>
        </div>}

        {(parsed.tiers.length > 0 || parsed.notes.length > 0) && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: 10 }}>
          {parsed.tiers.length > 0 && <div style={panel('#EEF3FF')}>
            <h3 style={heading}>Spending Tiers</h3>
            {parsed.tierTitle && <div style={{ marginBottom: 6, color: '#5A6A85', fontSize: 11.5 }}>{parsed.tierTitle}</div>}
            <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden' }}>
              {parsed.tiers.map((tier, index) => <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 8, padding: '7px 12px', borderTop: index ? '1px solid #E5EBF8' : 'none', fontSize: 12.5, color: NAVY }}>
                <div style={{ fontWeight: 700 }}>{tier.spend.replace(/^spend\s*/i, '')}</div>
                <div>{emphasise(tier.reward)}</div>
              </div>)}
            </div>
          </div>}
          {parsed.notes.length > 0 && <div style={panel('#FDF0F0')}>
            <h3 style={heading}>Good To Know</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{parsed.notes.map((note, index) => <div key={index} style={{ display: 'flex', gap: 8, fontSize: 12.5, lineHeight: 1.4, color: '#374151' }}>
              <span style={{ fontSize: 14 }}>{NOTE_STYLE[note.kind].icon}</span>
              <div>{note.label && <strong style={{ color: NOTE_STYLE[note.kind].color }}>{note.label}: </strong>}{note.text}</div>
            </div>)}</div>
          </div>}
        </div>}
      </div>}
    </section>
  </div>
}
