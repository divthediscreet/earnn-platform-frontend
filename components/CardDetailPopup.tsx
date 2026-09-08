'use client'

import { useEffect, useState } from 'react'
import { fetchCardDetail, getCardImageUrl } from '@/lib/api'

type Detail = {
  card: Record<string, unknown>
  benefits: string[]
  best_for: string[]
  card_disclaimer: string
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
  return { lines: [annualFee === null ? 'Fee not specified' : `${money(annualFee)} / year`], waiver }
}

export default function CardDetailPopup({ cardId, onClose }: { cardId: string; onClose: () => void }) {
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
  const sections = [
    { title: 'Top Benefits', items: detail?.benefits ?? [] },
    { title: 'Best For', items: detail?.best_for ?? [] },
    { title: 'Things To Note', items: detail?.card_disclaimer ? [detail.card_disclaimer] : [] },
  ]

  return <div style={{ position: 'fixed', inset: 0, zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)' }} />
    <section style={{ position: 'relative', width: '90%', maxWidth: 540, maxHeight: '85vh', overflowY: 'auto', padding: 28, borderRadius: 20, background: '#fff', boxShadow: '0 24px 64px rgba(0,0,0,.25)' }} onClick={event => event.stopPropagation()} aria-label="Card details">
      <button type="button" onClick={onClose} aria-label="Close card details" style={{ position: 'absolute', top: 14, right: 16, border: 0, background: 'none', color: '#666', fontSize: 20, cursor: 'pointer' }}>×</button>
      {loading ? <div style={{ padding: 40, color: '#888', textAlign: 'center' }}>Loading…</div> : !card ? <div style={{ padding: 40, color: '#888', textAlign: 'center' }}>Details unavailable</div> : <>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, marginBottom: 20 }}>
          <img src={getCardImageUrl(cardId)} alt="" width={132} height={82} style={{ flexShrink: 0, borderRadius: 10, objectFit: 'cover', boxShadow: '0 4px 12px rgba(0,0,0,.15)' }} onError={event => { event.currentTarget.src = '/card-dummy.svg' }} />
          <div><div style={{ color: '#0D1828', fontSize: 17, fontWeight: 700 }}>{String(card.card_name ?? '')}</div><div style={{ marginTop: 3, color: '#5A6A85', fontSize: 13 }}>{String(card.bank_name ?? '')}</div><div style={{ marginTop: 10, color: '#5A6A85', fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase' }}>Annual Fee</div><div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 3 }}>{fee?.lines.map((line, index) => <div key={line} style={{ color: line.includes('Free') ? '#00A67E' : '#C0392B', fontSize: index === 0 ? 15 : 12, fontWeight: index === 0 ? 700 : 600 }}>{line}</div>)}{fee?.waiver && <div style={{ color: '#5A6A85', fontSize: 10 }}>{fee.waiver}</div>}</div></div>
        </div>
        {sections.map(section => section.items.length > 0 && <div key={section.title} style={{ marginBottom: 16 }}><div style={{ marginBottom: 6, color: '#0E3785', fontSize: 12, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase' }}>{section.title}</div><ul style={{ margin: 0, paddingLeft: 16 }}>{section.items.map((item, index) => <li key={index} style={{ marginBottom: 4, color: '#374151', fontSize: 13 }}>{item}</li>)}</ul></div>)}
      </>}
    </section>
  </div>
}
