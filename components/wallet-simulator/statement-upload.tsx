'use client'

// Statement-upload path of /analyse, carried over from the old Analyse page (app/analyse-old):
// PDF drop zone -> password check -> scan overlay -> review (detected card, category split, top merchants).
// Difference from the old page: the review lists spend per GRANULAR category (the old one rolled it up to
// the 13 parent categories), and the statement's granular spend_summary feeds the simulator directly.

import { useCallback, useEffect, useRef, useState } from 'react'
import { uploadStatement, fetchCardDetail, fetchCards, getCardImageUrl } from '@/lib/api'
import { listSimulatorCards, type StatementSpendRow } from '@/lib/wallet-simulator/api'
import { ParseDataDebug, formatBankName } from './parse-debug'
import { STATEMENT_CONSENT_VERSION } from '@/lib/statement-consent'

type SummaryRow = { earnn_category_granular_code: string | null; total_spend_aed: number; transaction_count?: number }
type Merchant = { merchant_name: string; total_spend_aed: number; transaction_count: number }

export type StatementSubmit = { spend_summary: StatementSpendRow[]; salary_aed: number; currentCardId: string | null }

const TOP_CATEGORIES = 15

const aed = (n: number) => `AED ${n.toLocaleString('en-AE', { maximumFractionDigits: 0 })}`
const prettify = (code: string) => code.replace(/[_-]+/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase())

/** Granular summary: one row per granular category code, biggest first (statement rows already arrive per code). */
function granularSplit(rows: SummaryRow[]) {
  const by = new Map<string, { amount: number; count: number }>()
  for (const r of rows) {
    const code = (r.earnn_category_granular_code || 'unknown').trim().toLowerCase()
    const cur = by.get(code) ?? { amount: 0, count: 0 }
    cur.amount += Number(r.total_spend_aed) || 0
    cur.count += Number(r.transaction_count) || 0
    by.set(code, cur)
  }
  return [...by.entries()].filter(([, v]) => v.amount > 0)
    .map(([code, v]) => ({ code, label: code === 'unknown' ? 'Unmapped spend' : prettify(code), ...v }))
    .sort((a, b) => b.amount - a.amount)
}

export function StatementUpload({ onSubmit, submitting, submitError }: {
  onSubmit: (s: StatementSubmit) => void
  submitting: boolean
  submitError: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [passwordMode, setPasswordMode] = useState<'none' | 'has_password' | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const [review, setReview] = useState<any>(null)
  const [reviewTab, setReviewTab] = useState<'category' | 'merchants'>('category')
  const [cardInfo, setCardInfo] = useState<{ card_name: string; bank_name?: string } | null>(null)
  const [salary, setSalary] = useState('')
  const salaryTouchedRef = useRef(false)
  const [supportedIds, setSupportedIds] = useState<Set<string> | null>(null) // cards the (cashback) simulator can compare
  // detected / manually picked current card (the old page's card picker)
  const [currentCardId, setCurrentCardId] = useState<string | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerBanks, setPickerBanks] = useState<string[]>([])
  const [pickerBank, setPickerBank] = useState('')
  const [pickerCards, setPickerCards] = useState<any[]>([])
  const [pickerLoading, setPickerLoading] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [reviewError, setReviewError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [consent, setConsent] = useState(false) // explicit consent, unticked by default and reset for every upload
  const fileReady = !!file && (passwordMode === 'none' || (passwordMode === 'has_password' && password.trim().length > 0))
  const uploadReady = fileReady && consent

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type === 'application/pdf') { setFile(f); setPasswordMode(null); setPassword('') }
    else setError('Please upload a PDF file')
  }, [])

  // Prefill the salary field with the card's minimum salary requirement (dim_cards), unless the user typed their own.
  const prefillSalary = (minSalary: unknown) => {
    const v = Number(minSalary)
    if (!salaryTouchedRef.current && v > 0) setSalary(String(Math.round(v)))
  }

  // Auto-retries once on gateway timeout (the backend may be cold-starting), as the old page did.
  const handleUpload = async (isRetry = false) => {
    if (!consent) return setError('Please tick the consent box to continue')
    if (!file) return setError('Please select a PDF file first')
    if (passwordMode === null) return setError('Please confirm if your PDF has a password')
    if (passwordMode === 'has_password' && !password.trim()) return setError('Please enter your PDF password')
    setScanning(true)
    setError(isRetry ? 'Server was waking up — retrying now…' : '')
    try {
      const result = await uploadStatement(file, passwordMode === 'has_password' ? password.trim() : undefined, STATEMENT_CONSENT_VERSION)
      if (result.success) {
        setError('')
        setReview(result)
        setReviewTab('category')
        setCardInfo(null)
        setCurrentCardId(result.earnn_card_id || null)
        if (result.earnn_card_id) {
          try {
            const d = await fetchCardDetail(result.earnn_card_id)
            setCardInfo({ card_name: d.card?.card_name, bank_name: d.card?.bank_name })
            prefillSalary(d.card?.min_salary_aed)
          } catch { /* banner falls back to the generic text */ }
        }
      } else {
        if (result.error_code === 'PDF_ENCRYPTED_NO_PASSWORD') setPasswordMode('has_password')
        if ((result.error_code === 'GATEWAY_TIMEOUT' || result.error_code === 'GATEWAY_ERROR') && !isRetry) {
          setScanning(false)
          return handleUpload(true)
        }
        setError(result.error_message || 'Could not parse this statement. Try manual entry.')
      }
    } catch {
      setError('Upload failed. Please try again or use manual entry.')
    } finally { setScanning(false) }
  }

  useEffect(() => {
    if (!review || supportedIds) return
    listSimulatorCards('cashback').then(c => setSupportedIds(new Set(c.map(x => x.card_id)))).catch(() => {})
  }, [review, supportedIds])
  const cardUnsupported = !!currentCardId && !!supportedIds && !supportedIds.has(currentCardId)

  // bank list when the picker opens; cards when a bank is chosen
  useEffect(() => {
    if (!pickerOpen || pickerBanks.length > 0) return
    fetchCards({ limit: 200 })
      .then(d => setPickerBanks(Array.from(new Set<string>((d.cards || []).map((c: any) => c.bank_name).filter(Boolean))).sort() as string[]))
      .catch(() => {})
  }, [pickerOpen, pickerBanks.length])
  useEffect(() => {
    if (!pickerBank) { setPickerCards([]); setPickerSearch(''); return }
    setPickerSearch('')
    setPickerLoading(true)
    fetchCards({ bank: pickerBank, limit: 100 }).then(d => setPickerCards(d.cards || [])).catch(() => {}).finally(() => setPickerLoading(false))
  }, [pickerBank])

  const closePicker = () => { setPickerOpen(false); setPickerBank(''); setPickerSearch('') }

  const split = review ? granularSplit(review.spend_summary || []) : []
  const total = split.reduce((s, r) => s + r.amount, 0)
  const salaryNum = parseFloat(salary) || 0

  const proceed = () => {
    if (total <= 0) return setReviewError('No categorised spend was found in this statement.')
    if (salaryNum <= 0) return setReviewError('Enter your monthly salary so we only suggest cards you can apply for.')
    setReviewError('')
    onSubmit({
      spend_summary: (review.spend_summary as SummaryRow[]).map(r => ({
        earnn_category_granular_code: r.earnn_category_granular_code, total_spend_aed: Number(r.total_spend_aed) || 0,
      })),
      salary_aed: salaryNum,
      currentCardId: cardUnsupported ? null : currentCardId, // miles-only cards can't be compared in cashback yet
    })
  }

  return (
    <>
      <style>{`
        @media (max-width: 560px) {
          .su-banner { flex-wrap: wrap; padding: 12px 14px !important; gap: 10px 12px !important; margin-bottom: 20px !important; }
          .su-banner-text { flex: 1 1 0; min-width: 0; }
          .su-banner-btn { width: 100%; }
          .su-review { padding: 16px !important; }
        }
      `}</style>
      {scanning && <PdfScanOverlay />}

      {review ? (
        <div className="su-review" style={{ background: 'white', borderRadius: 20, border: '1px solid #D6E0F5', padding: 'clamp(18px, 4vw, 40px)', boxShadow: '0 4px 24px rgba(14,55,133,0.08)', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button type="button" onClick={() => { setReview(null); setCurrentCardId(null); setSalary(''); salaryTouchedRef.current = false; setFile(null); setPasswordMode(null); setPassword(''); setConsent(false); setError(''); setReviewError('') }}
              style={{ background: 'none', border: '1px solid #D6E0F5', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, color: '#5A6A85', cursor: 'pointer' }}>
              ← Upload another statement
            </button>
          </div>

          <div className="su-banner" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, padding: '16px 20px', borderRadius: 12, background: '#EEF3FF', border: '1px solid #D6E0F5' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={review.earnn_card_id ? getCardImageUrl(review.earnn_card_id) : '/card-dummy.svg'} onError={e => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }} alt="" style={{ width: 64, height: 40, borderRadius: 6, flexShrink: 0, objectFit: 'cover' }} />
            <div className="su-banner-text" style={{ flex: 1, minWidth: 0 }}>
              {currentCardId && cardInfo ? (
                <>
                  <div style={{ fontSize: 12, color: '#5A6A85', fontWeight: 600, marginBottom: 2 }}>{review.earnn_card_id === currentCardId ? 'WE DETECTED YOUR CARD' : 'YOUR CARD'}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#0D1828' }}>{cardInfo.card_name}</div>
                  {cardInfo.bank_name && <div style={{ fontSize: 13, color: '#5A6A85' }}>{cardInfo.bank_name}</div>}
                </>
              ) : currentCardId ? (
                <div style={{ fontSize: 14, color: '#5A6A85' }}>Loading your card details...</div>
              ) : (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1828', marginBottom: 4 }}>We couldn&apos;t identify your card</div>
                  <div style={{ fontSize: 13, color: '#5A6A85' }}>Add it so we can show how much your card is missing against your best option.</div>
                </>
              )}
            </div>
            <button className="su-banner-btn" type="button" onClick={() => { setPickerOpen(v => !v); setPickerBank('') }}
              style={{ flexShrink: 0, padding: '9px 16px', borderRadius: 8, border: '1.5px solid #0E3785', background: 'white', color: '#0E3785', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              {currentCardId ? 'Change card' : '+ Add card manually'}
            </button>
          </div>

          {cardUnsupported && (
            <div style={{ marginTop: -16, marginBottom: 24, padding: '10px 14px', borderRadius: 10, background: '#FFF8E6', border: '1px solid #F5DFA0', color: '#7A5B00', fontSize: 13, lineHeight: 1.45 }}>
              We only compare cashback cards for now, so we can&apos;t show how much this card is missing. We&apos;ll still find the best cards for your spend.
            </div>
          )}

          {pickerOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 2200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={closePicker}>
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,17,43,0.5)', backdropFilter: 'blur(4px)' }} />
              <div style={{ position: 'relative', width: '100%', maxWidth: 480, background: 'white', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #EEF3FF' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0D1828' }}>Select your card</div>
                    <div style={{ fontSize: 12, color: '#9DAEC8', marginTop: 2 }}>Choose bank then pick your card</div>
                  </div>
                  <button type="button" onClick={closePicker} aria-label="Close" style={{ background: '#EEF3FF', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#5A6A85' }}>×</button>
                </div>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #EEF3FF' }}>
                  <select value={pickerBank} onChange={e => setPickerBank(e.target.value)} aria-label="Bank"
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D6E0F5', borderRadius: 8, fontSize: 14, color: pickerBank ? '#0D1828' : '#9DAEC8', outline: 'none', background: 'white', cursor: 'pointer' }}>
                    <option value="">Select bank…</option>
                    {pickerBanks.map(b => <option key={b} value={b}>{formatBankName(b)}</option>)}
                  </select>
                </div>
                {pickerBank ? (
                  <>
                    <div style={{ padding: '10px 20px', borderBottom: '1px solid #EEF3FF', background: '#F8FAFF' }}>
                      <input type="text" placeholder="Search card name…" value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} autoFocus
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D6E0F5', borderRadius: 8, fontSize: 13, outline: 'none', color: '#0D1828', background: 'white', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {pickerLoading ? (
                        <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#9DAEC8' }}>Loading cards…</div>
                      ) : pickerCards.length === 0 ? (
                        <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#9DAEC8' }}>No cards found for this bank</div>
                      ) : (() => {
                        const filtered = pickerCards.filter(c => !pickerSearch || c.card_name?.toLowerCase().includes(pickerSearch.toLowerCase()))
                        return filtered.length === 0
                          ? <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#9DAEC8' }}>No cards match &ldquo;{pickerSearch}&rdquo;</div>
                          : filtered.map((card, i) => (
                            <div key={card.earnn_card_id}
                              onClick={() => { setCurrentCardId(card.earnn_card_id); setCardInfo({ card_name: card.card_name, bank_name: card.bank_name }); prefillSalary(card.min_salary_aed); closePicker() }}
                              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', cursor: 'pointer', borderBottom: i < filtered.length - 1 ? '1px solid #EEF3FF' : 'none' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#EEF3FF')} onMouseLeave={e => (e.currentTarget.style.background = 'white')}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={getCardImageUrl(card.earnn_card_id)} onError={e => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }} alt=""
                                style={{ width: 72, height: 45, objectFit: 'cover', borderRadius: 6, flexShrink: 0, border: '1px solid #EEF3FF' }} />
                              <div>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1828', lineHeight: 1.3 }}>{card.card_name}</div>
                                {card.bank_name && <div style={{ fontSize: 12, color: '#9DAEC8', marginTop: 2 }}>{card.bank_name}</div>}
                              </div>
                            </div>
                          ))
                      })()}
                    </div>
                  </>
                ) : (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9DAEC8', fontSize: 13 }}>Select a bank above to see its cards</div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', background: '#EEF3FF', borderRadius: 12, padding: 4, marginBottom: 24, width: '100%' }}>
            {([{ key: 'category', label: '📊 Category Split' }, { key: 'merchants', label: '🏪 Top Merchants' }] as const).map(t => (
              <button type="button" key={t.key} onClick={() => setReviewTab(t.key)} style={{
                flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                background: reviewTab === t.key ? '#0E3785' : 'transparent', color: reviewTab === t.key ? 'white' : '#5A6A85', transition: 'all 0.2s',
              }}>{t.label}</button>
            ))}
          </div>

          {reviewTab === 'category' && (
            <div style={{ marginBottom: 32 }}>
              {split.length === 0 ? (
                <div style={{ fontSize: 14, color: '#5A6A85' }}>No categorised spend found in this statement.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {split.slice(0, TOP_CATEGORIES).map(s => (
                    <div key={s.code}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6, fontSize: 14 }}>
                        <span style={{ fontWeight: 600, color: '#0D1828' }}>{s.label}</span>
                        <span style={{ fontWeight: 700, color: '#0E3785', flexShrink: 0 }}>{aed(s.amount)}</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 4, background: '#EEF3FF', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${(s.amount / split[0].amount) * 100}%`, background: '#8B2E2E', borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {reviewTab === 'merchants' && (
            <div style={{ marginBottom: 32 }}>
              {(review.top_merchants || []).length === 0 ? (
                <div style={{ fontSize: 14, color: '#5A6A85' }}>No merchant data found in this statement.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(review.top_merchants as Merchant[]).map((m, i) => (
                    <div key={m.merchant_name} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '1.5px solid #D6E0F5', borderRadius: 10, background: i % 2 === 0 ? 'white' : '#F8FAFF' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#0E3785', color: 'white', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1828' }}>{m.merchant_name}</div>
                        <div style={{ fontSize: 12, color: '#5A6A85' }}>{m.transaction_count} transaction{m.transaction_count === 1 ? '' : 's'}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0E3785', flexShrink: 0 }}>{aed(m.total_spend_aed)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {total > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 20px', borderRadius: 12, background: '#EEF3FF', border: '1px solid #D6E0F5', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#5A6A85', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>Total categorised spend</div>
                <div style={{ fontSize: 13, color: '#9DAEC8' }}>{split.length} categories{split.length > TOP_CATEGORIES ? ` (top ${TOP_CATEGORIES} shown)` : ''} · {review.transaction_count || 0} transactions</div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#0E3785', letterSpacing: '-0.5px' }}>{aed(total)}</div>
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <label className="sim-salary">
              <span>Monthly salary</span>
              <div>
                <b>AED</b>
                <input type="number" inputMode="numeric" min="0" step="100" placeholder="e.g. 15,000" value={salary}
                  onChange={e => { salaryTouchedRef.current = true; setSalary(e.target.value) }} aria-label="Monthly salary in AED" />
              </div>
            </label>
          </div>

          {(reviewError || submitError) && <div style={{ background: '#FFF3F0', border: '1px solid #FFD0C8', borderRadius: 8, padding: '12px 16px', color: '#C0392B', fontSize: 14, marginBottom: 20 }}>⚠️ {reviewError || submitError}</div>}

          <button type="button" onClick={proceed} disabled={submitting} style={{
            width: '100%', padding: '18px', fontSize: 17, fontWeight: 700, border: 'none', borderRadius: 10,
            background: submitting ? '#6B8EC7' : '#0E3785', color: 'white', cursor: submitting ? 'default' : 'pointer', boxShadow: '0 6px 20px rgba(14,55,133,0.25)',
          }}>
            {submitting ? 'Finding your best cards…' : 'Here is your spend — Find the best card for me →'}
          </button>

          <ParseDataDebug data={review} />
        </div>
      ) : (
        <div style={{ maxWidth: 760, margin: '0 auto 24px', background: 'white', borderRadius: 16, border: '0.5px solid #D6E0F5', padding: '14px 18px', boxShadow: '0 2px 12px rgba(14,55,133,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 12, padding: '20px 18px', borderRadius: 12, cursor: 'pointer',
                border: `1.5px dashed ${dragging ? '#0E3785' : file ? '#00A67E' : '#C8D4E8'}`,
                background: dragging ? '#EEF3FF' : file ? '#F0FDF8' : '#F8FAFF', transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: 20, flexShrink: 0 }}>{file ? '✅' : '📄'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                {file ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#00A67E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: '#9DAEC8' }}>{(file.size / 1024).toFixed(0)} KB · click to change</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0E3785' }}>Drop your credit card statement here</div>
                    <div style={{ fontSize: 11, color: '#9DAEC8' }}>PDF · Most UAE bank statements supported</div>
                  </>
                )}
              </div>
              <button type="button" onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: '1.5px solid #0E3785', background: 'white', color: '#0E3785', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                Browse
              </button>
            </div>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setPasswordMode(null); setPassword('') } }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <span style={{ fontSize: 12, color: '#5A6A85', fontWeight: 500, flexShrink: 0 }}>Password protected?</span>
            {(['none', 'has_password'] as const).map(opt => (
              <button type="button" key={opt} onClick={() => { setPasswordMode(opt); if (opt === 'none') setPassword('') }} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: `1.5px solid ${passwordMode === opt ? '#0E3785' : '#D6E0F5'}`,
                background: passwordMode === opt ? '#EEF3FF' : 'white', color: passwordMode === opt ? '#0E3785' : '#5A6A85',
              }}>{opt === 'none' ? 'No' : 'Yes'}</button>
            ))}
            {passwordMode === 'has_password' && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input type={showPassword ? 'text' : 'password'} placeholder="Enter PDF password" value={password} onChange={e => setPassword(e.target.value)} autoFocus
                  style={{ padding: '5px 36px 5px 12px', border: '1.5px solid #0E3785', borderRadius: 20, fontSize: 12, outline: 'none', color: '#0D1828', minWidth: 180 }} />
                <button onClick={() => setShowPassword(v => !v)} type="button" aria-label={showPassword ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A6A85" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A6A85" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>

          <div style={{ marginBottom: 14, padding: '12px 14px', borderRadius: 10, background: '#F8FAFF', border: '1px solid #D6E0F5', color: '#0D1828' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, lineHeight: 1.45 }}>
              <input type="checkbox" checked={consent} onChange={e => { setConsent(e.target.checked); if (e.target.checked) setError('') }}
                style={{ marginTop: 3, width: 16, height: 16, flexShrink: 0, accentColor: '#0E3785', cursor: 'pointer' }} />
              <span>I consent to Earnn processing my statement as described below.{' '}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#0E3785' }} onClick={e => e.stopPropagation()}>Privacy Policy</a>
              </span>
            </label>
            <p style={{ margin: '8px 0 0 26px', fontSize: 12, color: '#5A6A85', lineHeight: 1.5 }}>
              Earnn analyses your statement to recommend suitable cards. Your name, card number, phone and address are masked before processing, and we don&apos;t keep your personal information or transactions afterwards. Masked statements may be used for quality assurance and to improve our models. Statements can contain sensitive information, so upload only one you&apos;re comfortable sharing.
            </p>
            <p style={{ margin: '6px 0 0 26px', fontSize: 12, color: '#5A6A85' }}>
              Questions or withdrawal: <a href="mailto:earnn.money@outlook.com" style={{ color: '#0E3785' }}>earnn.money@outlook.com</a>
            </p>
          </div>

          {error && <div style={{ background: '#FFF3F0', border: '1px solid #FFD0C8', borderRadius: 8, padding: '10px 14px', color: '#C0392B', fontSize: 13, marginBottom: 14 }}>⚠️ {error}</div>}

          <button type="button" onClick={() => handleUpload()} disabled={!uploadReady || scanning} style={{
            width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 10, transition: 'all 0.2s',
            background: uploadReady ? '#0E3785' : '#D6E0F5', color: uploadReady ? 'white' : '#9DAEC8', cursor: uploadReady ? 'pointer' : 'not-allowed',
          }}>
            {scanning ? 'Analysing your statement…' : uploadReady ? 'Analyse my spending →' : fileReady ? 'Tick the consent box to continue' : 'Select a statement to continue'}
          </button>
        </div>
      )}
    </>
  )
}

/** Full-screen "scanning your PDF" holding screen (same animation as the old Analyse page). */
function PdfScanOverlay() {
  return (
    <div role="status" aria-live="polite" style={{ position: 'fixed', inset: 0, zIndex: 2000, background: '#07112B', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'relative', width: 160, height: 210, marginBottom: 40 }}>
        <div style={{ width: '100%', height: '100%', background: '#F0F4FF', borderRadius: 6, boxShadow: '0 8px 40px rgba(0,0,0,0.5)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 28px 28px 0', borderColor: 'transparent #B8C8F0 transparent transparent' }} />
          <div style={{ position: 'absolute', top: 0, right: 0, width: 28, height: 28, background: '#8BA8D8', clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }} />
          {[20, 44, 56, 68, 80, 100, 112, 124, 144, 156, 168].map((top, i) => (
            <div key={i} style={{ position: 'absolute', left: 18, right: i % 3 === 2 ? 40 : 18, top, height: 6, borderRadius: 3, background: 'rgba(14,55,133,0.15)' }} />
          ))}
          <div style={{ position: 'absolute', left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, transparent 0%, #4A8EFF 20%, #A8D0FF 50%, #4A8EFF 80%, transparent 100%)', boxShadow: '0 0 12px 4px rgba(74,142,255,0.6)', animation: 'pdfScan 1.8s ease-in-out infinite' }} />
        </div>
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'white', textAlign: 'center', letterSpacing: '-0.3px' }}>Analysing your statement</div>
      <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Reading transactions and categorising spend…</div>
      <style>{`@keyframes pdfScan { 0% { top: 0%; } 50% { top: calc(100% - 3px); } 100% { top: 0%; } }`}</style>
    </div>
  )
}
