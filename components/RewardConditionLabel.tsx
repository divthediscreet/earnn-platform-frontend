'use client'

import { useState } from 'react'

type RewardConditionLabelProps = {
  paymentCondition?: string | null
  merchantList?: string | null
  matchedMalls?: string[]
  cardName?: string
  emphasis?: 'standard' | 'highlight'
}

type ConditionPopupKind = 'malls' | 'merchants'

const COLORS = {
  primary: '#0E3785',
  text: '#0D1828',
  secondary: '#5A6A85',
  bgTint: '#EEF3FF',
}

function ClickHint() {
  return <span style={{ marginLeft: 5, color: '#0D1828', fontSize: 11.5, fontWeight: 700 }}>( Click )</span>
}

// The mall-only rules belong to three defined mall ecosystems. The source rule's
// merchant_list also contains hotels, attractions and shops, which must not be
// presented as malls. Keep the customer-facing mall lists explicit and stable.
const MALLS_BY_ECOSYSTEM = {
  majid_al_futtaim: [
    'Mall of the Emirates', 'City Centre Mirdif', 'City Centre Deira', 'City Centre Me’Aisem',
    'City Centre Al Shindagha', 'City Centre Sharjah', 'City Centre Ajman', 'City Centre Fujairah',
    'City Centre Al Zahia', 'My City Centre Al Barsha', 'My City Centre Al Dhait',
    'My City Centre Al Nasseriya', 'My City Centre Masdar', 'Distrikt', 'Matajer Al Juraina',
    'Matajer Al Khan', 'Matajer Al Mirgab', 'Matajer Al Musalla', 'Matajer Al Quoz',
  ],
  emaar: [
    'Dubai Mall', 'Dubai Hills Mall', 'Dubai Marina Mall', 'Souk Al Bahar',
    'The Springs Souk', 'The Meadows Village', 'The Meadows Souk',
  ],
  aldar: [
    'Yas Mall', 'WTC Mall', 'Al Jimi Mall', 'Al Hamra Mall', 'Saadiyat Grove',
  ],
} as const

function normalisedCondition(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase()
}

function isMallOnlyCondition(value: string | null | undefined): boolean {
  return normalisedCondition(value) === 'purchase made on selected malls only'
}

function isSelectedMerchantsCondition(value: string | null | undefined): boolean {
  const condition = normalisedCondition(value)
  return condition === 'selected merchants only' || condition === 'selected merchant only'
}

function merchantListItems(value: string | null | undefined): string[] {
  return (value || '')
    .split(/\r?\n|\||;/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function mallListFor(value: string | null | undefined): string[] {
  const list = normalisedCondition(value)
  if (list.includes('mall of the emirates') || list.includes('city centre mirdif')) return [...MALLS_BY_ECOSYSTEM.majid_al_futtaim]
  if (list.includes('dubai hills mall') || list.includes('emaar hospitality')) return [...MALLS_BY_ECOSYSTEM.emaar]
  if (list.includes('yas mall') || list.includes('al jimi mall')) return [...MALLS_BY_ECOSYSTEM.aldar]
  return []
}

function ConditionListPopup({ title, items, cardName, kind, onClose }: {
  title: string; items: string[]; cardName?: string; kind: ConditionPopupKind; onClose: () => void
}) {
  const isMallList = kind === 'malls'
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(13,24,40,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
    }}>
      <div onClick={(event) => event.stopPropagation()} style={{
        background: '#fff', borderRadius: 14, padding: '22px 24px', maxWidth: 420,
        width: '100%', maxHeight: '70vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, color: COLORS.text }}>{title}</div>
            <div style={{ fontSize: 12.5, color: COLORS.secondary, marginTop: 4 }}>
              {isMallList
                ? `This rate applies${cardName ? ` on ${cardName}` : ''} only where the store is located inside one of these malls:`
                : `This rate applies at the following merchants${cardName ? ` for ${cardName}` : ''}:`}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            border: 'none', background: 'none', fontSize: 18, color: COLORS.secondary, cursor: 'pointer', lineHeight: 1,
          }}>×</button>
        </div>
        <ul style={{ margin: '14px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map((item) => (
            <li key={item} style={{
              fontSize: 13.5, color: COLORS.text, padding: '7px 10px', background: COLORS.bgTint,
              borderRadius: 8, wordBreak: 'break-word',
            }}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function RewardConditionLabel({ paymentCondition, merchantList, matchedMalls = [], cardName, emphasis = 'standard' }: RewardConditionLabelProps) {
  const [popupKind, setPopupKind] = useState<ConditionPopupKind | null>(null)
  const condition = paymentCondition?.trim()
  const merchantItems = merchantListItems(merchantList)
  // Mall-only rules use the fixed mall list for the matching ecosystem. A Match & Tap result's tenant-matched
  // malls remain a fallback for legacy rows without a recognised ecosystem list.
  const mallItems = mallListFor(merchantList)
  const shownMallItems = mallItems.length ? mallItems : matchedMalls
  const hasMallList = isMallOnlyCondition(condition) && shownMallItems.length > 0
  const hasMerchantList = isSelectedMerchantsCondition(condition) && merchantItems.length > 0
  const isClickable = hasMallList || hasMerchantList
  const label = isMallOnlyCondition(condition) ? 'Selected Malls Only' : condition || ''
  const popupKindForLink: ConditionPopupKind = hasMallList ? 'malls' : 'merchants'
  const popupItems = popupKind === 'malls' ? shownMallItems : merchantItems
  const popupTitle = popupKind === 'malls' ? 'Selected Malls Only' : (condition || 'Selected Merchants Only')
  const highlightedStyle = {
    marginTop: 8, display: 'inline', padding: '1px 3px', borderRadius: 2,
    background: 'linear-gradient(transparent 36%, #FFF0A8 36%, #FFF0A8 92%, transparent 92%)',
    color: '#5A6A85', fontSize: 12.5, fontWeight: 600, lineHeight: 1.4,
  }

  if (!isClickable && !condition) return null

  return (
    <>
      {emphasis === 'highlight' && isClickable ? (
        <button type="button" onClick={() => setPopupKind(popupKindForLink)} style={{
          ...highlightedStyle, border: 'none', cursor: 'pointer', textAlign: 'left', textDecoration: 'none',
        }}>
          {label}<ClickHint />
        </button>
      ) : emphasis === 'highlight' ? (
        <div style={highlightedStyle}>
          {label}
        </div>
      ) : isClickable ? (
        <button type="button" onClick={() => setPopupKind(popupKindForLink)} style={{
          marginTop: 8, padding: 0, border: 'none', background: 'none', color: COLORS.primary,
          fontSize: 12.5, fontWeight: 600, textDecoration: 'underline', cursor: 'pointer',
        }}>{label}<ClickHint /></button>
      ) : (
        <div style={{ marginTop: 8, color: COLORS.secondary, fontSize: 12.5, fontWeight: 600 }}>{condition}</div>
      )}
      {popupKind && <ConditionListPopup title={popupTitle} items={popupItems} cardName={cardName} kind={popupKind} onClose={() => setPopupKind(null)} />}
    </>
  )
}
