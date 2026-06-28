'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { uploadStatement, scoreCards, getOptimalWallet, fetchCardDetail, fetchCards, searchCards, pingBackend, getCardImageUrl } from '@/lib/api'
import { Suspense } from 'react'

const BANK_ABBREV: Record<string, string> = {
  'Emirates NBD':                        'ENBD',
  'First Abu Dhabi Bank':                'FAB',
  'Abu Dhabi Commercial Bank':           'ADCB',
  'Abu Dhabi Islamic Bank':              'ADIB',
  'Dubai Islamic Bank':                  'DIB',
  'Emirates Islamic Bank':               'EIB',
  'Commercial Bank of Dubai':            'CBD',
  'Sharjah Islamic Bank':                'SIB',
  'Standard Chartered Bank':             'SCB',
  'Citibank Bank UAE':                   'CITI',
  'The National Bank of Ras Al Khaimah': 'RAK',
}

const BANK_NO_ABBREV = new Set([
  'First Abu Dhabi Bank PJSC',
  'Ajman Bank',
  'HSBC Middle East Limited',
])

const formatBankName = (name: string) => {
  if (BANK_NO_ABBREV.has(name)) return name
  const abbrev = BANK_ABBREV[name]
  if (abbrev) return `${name} (${abbrev})`
  return name
}

const MERCHANT_OPTIONS: Record<string, { key: string; label: string }[]> = {
  dining:  [{ key: 'noon', label: 'noon Food' }, { key: 'talabat', label: 'talabat' }, { key: 'deliveroo', label: 'Deliveroo' }, { key: 'careem', label: 'Careem' }, { key: 'smiles', label: 'Smiles' }],
  grocery: [{ key: 'noon', label: 'noon' }, { key: 'talabat', label: 'talabat' }, { key: 'amazon', label: 'Amazon' }, { key: 'carrefour', label: 'Carrefour' }, { key: 'lulu', label: 'LuLu' }],
  travel:  [{ key: 'etihad', label: 'Etihad' }, { key: 'emirates', label: 'Emirates' }],
}

const CATEGORIES = [
  { key: 'dining',        label: 'Dining & Restaurants',     icon: '🍽️',  hint: 'Talabat, Zomato, restaurants, cafes' },
  { key: 'grocery',       label: 'Grocery',                  icon: '🛒',  hint: 'LuLu, Carrefour, Spinneys, supermarkets' },
  { key: 'travel',        label: 'Travel',                   icon: '✈️',  hint: 'Emirates, Flydubai, hotels, Booking.com' },
  { key: 'fuel',          label: 'Fuel',                     icon: '⛽',  hint: 'ENOC, ADNOC petrol stations' },
  { key: 'online',        label: 'Online Shopping',          icon: '📦',  hint: 'Amazon, Temu, subscriptions' },
  { key: 'international', label: 'International Spend',      icon: '🌍',  hint: 'Any spend outside UAE or in foreign currency' },
  { key: 'entertainment', label: 'Entertainment',            icon: '🎬',  hint: 'VOX, Reel, theme parks' },
  { key: 'retail',        label: 'Retail Shopping',          icon: '🛍️',  hint: 'Mall shopping, in-store purchases' },
  { key: 'telecom',       label: 'Telecom',                  icon: '📱',  hint: 'Etisalat/du bills, internet' },
  { key: 'transport',     label: 'Transport',                icon: '🚕',  hint: 'Careem, RTA, NOL, SALIK' },
  { key: 'utility',       label: 'Utilities',                icon: '💡',  hint: 'DEWA, water, electricity' },
  { key: 'education',     label: 'Education',                icon: '📚',  hint: 'School fees, courses' },
  { key: 'miscellaneous', label: 'Other / Miscellaneous',    icon: '🔖',  hint: 'Everything else' },
]

// =============================================================================
// PARSE VALIDATION DEBUG PANEL — independent component, remove when no longer needed
// Shows raw parse output for validating statement parsing accuracy.
// To remove: delete this component + the <ParseDataDebug data={reviewData} /> usage above.
// =============================================================================

const HEADER_LABELS: Record<string, string> = {
  bank_name_code: 'Bank', bank_country: 'Country', card_last4: 'Card Last 4', card_type: 'Card Type', earnn_card_id: 'earnn Card ID',
  statement_start_date: 'Statement Start', statement_end_date: 'Statement End', statement_generation_date: 'Statement Date', payment_due_date: 'Payment Due Date',
  total_credit_limit_aed: 'Credit Limit (AED)', available_credit_limit_aed: 'Available Credit (AED)',
  minimum_payment_due_aed: 'Min Payment Due (AED)', total_amount_due_aed: 'Total Amount Due (AED)', outstanding_current_balance: 'Outstanding Balance (AED)',
  previous_balance_aed: 'Previous Balance (AED)', purchase_cash_advances: 'Purchases & Cash Advances (AED)', payment_received_credit: 'Payment Received (AED)',
  interest: 'Interest (AED)', fee_and_other_charges: 'Fees & Charges (AED)',
  parsed_total_debits_aed: 'Parsed Total Debits (AED)', parsed_total_credits_aed: 'Parsed Total Credits (AED)',
  stated_purchases_aed: 'Stated Purchases (AED)', stated_credits_aed: 'Stated Credits (AED)',
  confidence_score: 'Confidence Score', confidence_verdict: 'Confidence Verdict', statement_parsing_flag: 'Parser Path',
  mapper_used: 'Mapper Used', pdf_type_detected: 'PDF Type',
  chk_dates_in_window_pass: 'Check: Dates in Window', chk_debit_reconciliation_pass: 'Check: Debit Recon',
  chk_credit_reconciliation_pass: 'Check: Credit Recon', chk_descriptions_valid_pass: 'Check: Descriptions Valid',
  debit_reconciliation_ratio: 'Debit Recon Ratio', credit_reconciliation_ratio: 'Credit Recon Ratio',
}

function ParseDataDebug({ data }: { data: any }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'header' | 'transactions'>('header')

  if (!data) return null

  const header: Record<string, any> = data.statement_header || {}
  const transactions: any[] = data.transactions_raw || []

  return (
    <div style={{ marginTop: 24, borderTop: '1px dashed #D6E0F5', paddingTop: 16 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'none', border: '1px dashed #C8D4E8', borderRadius: 8,
          padding: '10px 16px', cursor: 'pointer', color: '#5A6A85', fontSize: 13,
          fontWeight: 600, textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16 }}>{open ? '▾' : '▸'}</span>
        🔍 View raw parse data ({transactions.length} transactions)
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: '#9DAEC8' }}>for parse validation only</span>
      </button>

      {open && (
        <div style={{ marginTop: 12, background: '#F8FAFF', borderRadius: 12, border: '1px solid #D6E0F5', overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #D6E0F5' }}>
            {([['header', '📋 Statement Header'], ['transactions', `📄 Transactions (${transactions.length})`]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: tab === k ? 'white' : 'transparent',
                color: tab === k ? '#0E3785' : '#5A6A85',
                borderBottom: tab === k ? '2px solid #0E3785' : '2px solid transparent',
              }}>
                {label}
              </button>
            ))}
          </div>

          {/* Statement header tab */}
          {tab === 'header' && (
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
              {Object.entries(header).map(([k, v], i) => {
                const label = HEADER_LABELS[k] || k
                const isNull = v === null || v === undefined || v === ''
                const isCheck = k.startsWith('chk_')
                const displayVal = isNull ? '—' : isCheck ? (v ? '✅ Pass' : '❌ Fail') : String(v)
                return (
                  <div key={k} style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #EEF3FF',
                    background: i % 2 === 0 ? 'white' : '#F8FAFF',
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}>
                    <div style={{ fontSize: 10, color: '#9DAEC8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                    <div style={{ fontSize: 13, color: isNull ? '#C8D4E8' : '#0D1828', fontWeight: isNull ? 400 : 500, fontFamily: 'monospace' }}>{displayVal}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Transactions tab */}
          {tab === 'transactions' && (
            <div style={{ overflowX: 'auto' }}>
              {transactions.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#9DAEC8' }}>No transactions found</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#EEF3FF' }}>
                      {['#', 'Date', 'Description', 'Merchant (clean)', 'Category', 'Debit AED', 'Credit AED', 'Instalment'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#5A6A85', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', borderBottom: '1px solid #D6E0F5' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#F8FAFF' }}>
                        <td style={{ padding: '7px 10px', color: '#9DAEC8', fontFamily: 'monospace' }}>{i + 1}</td>
                        <td style={{ padding: '7px 10px', color: '#5A6A85', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{t.transaction_date || '—'}</td>
                        <td style={{ padding: '7px 10px', color: '#0D1828', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.description_raw}>{t.description_raw || '—'}</td>
                        <td style={{ padding: '7px 10px', color: '#5A6A85', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.parent_merchant || t.merchant_name_clean || '—'}</td>
                        <td style={{ padding: '7px 10px' }}>
                          {t.earnn_category_code ? (
                            <span style={{ background: '#EEF3FF', color: '#0E3785', borderRadius: 4, padding: '2px 7px', fontWeight: 600, fontSize: 11 }}>{t.earnn_category_code}</span>
                          ) : <span style={{ color: '#C8D4E8' }}>—</span>}
                        </td>
                        <td style={{ padding: '7px 10px', color: t.debit_amount_aed ? '#C0392B' : '#C8D4E8', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                          {t.debit_amount_aed ? t.debit_amount_aed.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td style={{ padding: '7px 10px', color: t.credit_amount_aed ? '#00A67E' : '#C8D4E8', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                          {t.credit_amount_aed ? t.credit_amount_aed.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', color: '#9DAEC8' }}>{t.is_installment ? '✅' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// COMPARISON POPUP — shown after scoring, before results page
// =============================================================================

function getWittyMessage(spend: Record<string, number>, annualLoss: number): { emoji: string; line1: string; line2: string } {
  const total = Object.values(spend).reduce((s, v) => s + v, 0)
  if (total === 0) return { emoji: '💸', line1: 'Your wallet has been busy.', line2: `And silently losing AED ${Math.round(annualLoss).toLocaleString('en-AE')} a year.` }

  const top = Object.entries(spend)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)[0]

  const pct = top ? (top[1] / total) * 100 : 0
  const cat = top?.[0] || ''

  const msgs: Record<string, { emoji: string; line1: string; line2: string }> = {
    dining:        { emoji: '🍕', line1: 'Seems like you hate cooking... totally valid.', line2: `But your card? It's been eating your rewards for free.` },
    grocery:       { emoji: '🛒', line1: 'Feeding a small army, or just really into meal prep?', line2: `Either way, your card is not doing its job at the checkout.` },
    travel:        { emoji: '✈️', line1: 'Passport full, rewards empty.', line2: `All those flights and hotels — and your card's just along for the ride.` },
    fuel:          { emoji: '⛽', line1: 'You've basically funded ENOC single-handedly.', line2: `Your car gets premium fuel. Your rewards? Running on empty.` },
    online:        { emoji: '📦', line1: 'The delivery guy knows your name by now.', line2: `But your card doesn't know how to reward online shopping properly.` },
    international: { emoji: '🌍', line1: 'Living the global life — spending in currencies your card barely understands.', line2: `Those foreign transaction fees aren't the only thing draining you.` },
    entertainment: { emoji: '🎬', line1: 'VOX, Reel, Global Village — you live for the experience.', line2: `But your card is sitting in the dark with zero rewards.` },
    retail:        { emoji: '🛍️', line1: 'The malls of Dubai thank you personally.', line2: `Your card, though? Not quite keeping up with your lifestyle.` },
    telecom:       { emoji: '📱', line1: 'Always connected. Except to the right credit card.', line2: `Etisalat and du love you. Your rewards? Dial tone.` },
    transport:     { emoji: '🚕', line1: 'Careem's ride rating: ⭐⭐⭐⭐⭐. Your card's reward rating: 😐', line2: `All those rides, and nothing to show for it.` },
    utility:       { emoji: '💡', line1: 'Keeping the lights on, the AC running, the DEWA bill climbing.', line2: `Essential spending — but your card's treating it like it doesn't count.` },
    education:     { emoji: '📚', line1: 'Investing in brains. Except the one choosing your card.', line2: `Your tuition fees deserve better reward treatment.` },
    miscellaneous: { emoji: '🎲', line1: 'A little bit of everything — and your card rewards? Also a little bit of nothing.', line2: `Turns out "misc" doesn't have to mean missed rewards.` },
  }

  const msg = msgs[cat] || { emoji: '💸', line1: 'Your spending pattern is unique.', line2: `Your card, however, is uniquely bad at rewarding it.` }
  return msg
}

function ComparisonPopup({ data, onContinue }: {
  data: {
    monthlyDiff:    number
    annualDiff:     number
    currentMonthly: number
    isWinning:      boolean
    categoryGaps:   { label: string; current: number; diff: number }[]
    spendNumbers:   Record<string, number>
  }
  onContinue: () => void
}) {
  const [showLoss, setShowLoss] = useState(false)
  const [showWhy,  setShowWhy]  = useState(false)
  const [showCta,  setShowCta]  = useState(false)

  const monthly = Math.round(Math.abs(data.monthlyDiff))
  const annual  = Math.round(Math.abs(data.annualDiff))
  const witty   = getWittyMessage(data.spendNumbers, annual)

  useEffect(() => {
    if (data.isWinning) { setShowLoss(true); setShowWhy(true); setShowCta(true); return }
    const t0 = setTimeout(() => setShowLoss(true), 1400)
    const t1 = setTimeout(() => setShowWhy(true),  2200)
    const t2 = setTimeout(() => setShowCta(true),  2800)
    return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2500,
      background: '#07112B',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px',
    }}>
      <style>{`
        @keyframes cmp-up   { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes cmp-btn  { 0%,100% { box-shadow:0 8px 32px rgba(74,142,255,0.3); } 50% { box-shadow:0 12px 48px rgba(74,142,255,0.55); } }
      `}</style>

      <div style={{ width: '100%', maxWidth: 400 }}>

        {!data.isWinning ? (
          <>
            {/* Witty personalised intro */}
            <div style={{ marginBottom: 28, animation: 'cmp-up 0.5s ease both' }}>
              <div style={{ fontSize: 40, marginBottom: 14 }}>{witty.emoji}</div>
              <div style={{ fontSize: 'clamp(18px,4vw,24px)', fontWeight: 700, color: 'white', lineHeight: 1.4, marginBottom: 8 }}>
                {witty.line1}
              </div>
              <div style={{ fontSize: 'clamp(14px,3vw,17px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                {witty.line2}
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 24 }} />

            {/* Main loss statement */}
            {showLoss && (
              <div style={{ animation: 'cmp-up 0.5s ease both', marginBottom: 8 }}>
                <div style={{ fontSize: 'clamp(22px,5vw,30px)', fontWeight: 800, color: 'white', lineHeight: 1.3 }}>
                  💸 You&apos;re losing{' '}
                  <span style={{ color: '#FFD700' }}>AED {monthly.toLocaleString('en-AE')}</span>{' '}
                  every month
                </div>
                <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
                  AED {annual.toLocaleString('en-AE')}/year
                </div>
              </div>
            )}

            {/* Divider */}
            {showWhy && <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', margin: '20px 0' }} />}

            {/* Why breakdown */}
            {showWhy && data.categoryGaps.length > 0 && (
              <div style={{ animation: 'cmp-up 0.5s ease both', marginBottom: 32 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>Why?</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    Your card earns <strong style={{ color: 'rgba(255,255,255,0.55)' }}>AED {Math.round(data.currentMonthly).toLocaleString('en-AE')}/month</strong> total
                  </span>
                </div>

                {/* Column headers */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px 16px', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right' }}>You earn</span>
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.08em', textAlign: 'right' }}>Gap</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {data.categoryGaps.map(g => (
                    <div key={g.label} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '6px 16px', alignItems: 'center' }}>
                      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>{g.label}</span>
                      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {g.current > 0 ? `AED ${g.current.toLocaleString('en-AE')}` : '—'}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: g.diff > 0 ? '#00C48C' : 'rgba(255,255,255,0.2)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {g.diff > 0 ? `+AED ${g.diff.toLocaleString('en-AE')}` : '—'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Divider before CTA */}
            {showCta && <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginBottom: 28 }} />}

            {/* CTA */}
            {showCta && (
              <div style={{ animation: 'cmp-up 0.4s ease both' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'white', marginBottom: 20 }}>
                  Really? 😲
                </div>
                <button onClick={onContinue} style={{
                  width: '100%', padding: '16px', fontSize: 16, fontWeight: 800,
                  border: 'none', borderRadius: 12,
                  background: 'linear-gradient(135deg, #4A8EFF, #0E3785)',
                  color: 'white', cursor: 'pointer',
                  animation: 'cmp-btn 2s ease infinite',
                }}>
                  Show me how to fix this →
                </button>
              </div>
            )}
          </>
        ) : (
          /* Winning variant */
          <div style={{ animation: 'cmp-up 0.5s ease both', textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>👏</div>
            <div style={{ fontSize: 'clamp(20px,4vw,26px)', fontWeight: 800, color: 'white', lineHeight: 1.3, marginBottom: 12 }}>
              You already have a very good card
            </div>
            <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', marginBottom: 36 }}>
              See more options for your spend — there might be an even better fit 👀
            </div>
            <button onClick={onContinue} style={{
              width: '100%', padding: '16px', fontSize: 16, fontWeight: 800,
              border: 'none', borderRadius: 12,
              background: 'linear-gradient(135deg, #4A8EFF, #0E3785)',
              color: 'white', cursor: 'pointer', animation: 'cmp-btn 2s ease infinite',
            }}>
              See all options for me →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================

function AnalyseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultMode = searchParams.get('mode') === 'manual' ? 'manual' : 'upload'

  const [mode, setMode] = useState<'upload' | 'manual'>(defaultMode)
  const manualSectionRef = useRef<HTMLDivElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [passwordMode, setPasswordMode] = useState<'none' | 'has_password' | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingType, setLoadingType] = useState<'upload' | 'score'>('score')
  const [animCardIds, setAnimCardIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [spend, setSpend] = useState<Record<string, string>>(() => {
    // Pre-fill from chatbot session if available
    try {
      const prefill = sessionStorage.getItem('prefill_spend')
      if (prefill) {
        sessionStorage.removeItem('prefill_spend')
        const parsed = JSON.parse(prefill) as Record<string, number>
        return Object.fromEntries(Object.entries(parsed).map(([k, v]) => [k, String(v)]))
      }
    } catch { /* ignore */ }
    return {}
  })
  const [merchantPrefs, setMerchantPrefs] = useState<Record<string, string[]>>({})
  const [salary, setSalary] = useState('')
  const [salaryPopup, setSalaryPopup] = useState(false)
  const [preference, setPreference] = useState<'cashback' | 'miles'>('cashback')
  const fileRef = useRef<HTMLInputElement>(null)

  // Statement Review screen (shown after a successful upload, before manual entry)
  const [showReview, setShowReview] = useState(false)
  const [reviewData, setReviewData] = useState<any>(null)
  const [reviewTab, setReviewTab] = useState<'category' | 'merchants'>('category')

  // Detected / manually-picked current card
  const [currentCardId, setCurrentCardId] = useState<string | null>(null)
  const [currentCardInfo, setCurrentCardInfo] = useState<{ card_name: string; bank_name?: string } | null>(null)
  const [cardPickerOpen, setCardPickerOpen] = useState(false)
  const [pickerBanks, setPickerBanks] = useState<string[]>([])
  const [pickerSelectedBank, setPickerSelectedBank] = useState('')
  const [pickerBankCards, setPickerBankCards] = useState<any[]>([])
  const [pickerBankCardsLoading, setPickerBankCardsLoading] = useState(false)
  const [pickerCardSearch, setPickerCardSearch] = useState('')

  // Upload button is enabled only when: file selected AND password choice made
  const uploadReady = !!file && (passwordMode === 'none' || (passwordMode === 'has_password' && password.trim().length > 0))

  const totalMonthly = CATEGORIES.reduce((sum, c) => sum + (parseFloat(spend[c.key] || '0') || 0), 0)

  // Drag & drop handlers
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type === 'application/pdf') setFile(f)
    else setError('Please upload a PDF file')
  }, [])

  // Upload path — auto-retries once on gateway timeout (Railway cold start)
  const handleUpload = async (isRetry = false) => {
    if (!file) return setError('Please select a PDF file first')
    if (passwordMode === null) return setError('Please confirm if your PDF has a password')
    if (passwordMode === 'has_password' && !password.trim()) return setError('Please enter your PDF password')
    setLoadingType('upload'); setLoading(true)
    setError(isRetry ? 'Server was waking up — retrying now…' : '')
    try {
      const result = await uploadStatement(file, passwordMode === 'has_password' ? password.trim() : undefined)
      if (result.success) {
        setError('')
        setReviewData(result)
        setReviewTab('category')
        const cardId = result.earnn_card_id || null
        setCurrentCardId(cardId)
        if (cardId) {
          try {
            const detail = await fetchCardDetail(cardId)
            setCurrentCardInfo({ card_name: detail.card?.card_name, bank_name: detail.card?.bank_name })
          } catch { setCurrentCardInfo(null) }
        } else {
          setCurrentCardInfo(null)
        }
        setShowReview(true)
      } else {
        if (result.error_code === 'PDF_ENCRYPTED_NO_PASSWORD') {
          setPasswordMode('has_password')
        }
        // Auto-retry once on gateway timeout — Railway was cold-starting
        if ((result.error_code === 'GATEWAY_TIMEOUT' || result.error_code === 'GATEWAY_ERROR') && !isRetry) {
          setLoading(false)
          return handleUpload(true)
        }
        setError(result.error_message || 'Could not parse this statement. Try manual entry.')
      }
    } catch (e: any) {
      setError('Upload failed. Please try again or use manual entry.')
    } finally { setLoading(false) }
  }

  // Warm up Railway + pre-fetch card IDs for loading animation
  useEffect(() => {
    pingBackend()
    fetch('/api/cards?limit=16&sort_by=card_ranking')
      .then(r => r.json())
      .then(d => setAnimCardIds((d.cards || []).map((c: any) => c.earnn_card_id)))
      .catch(() => {})
  }, [])

  // Fetch detected card's name once we know its earnn_card_id
  useEffect(() => {
    if (!currentCardId) { setCurrentCardInfo(null); return }
    let cancelled = false
    fetchCardDetail(currentCardId)
      .then(d => { if (!cancelled) setCurrentCardInfo({ card_name: d.card?.card_name, bank_name: d.card?.bank_name }) })
      .catch(() => { if (!cancelled) setCurrentCardInfo(null) })
    return () => { cancelled = true }
  }, [currentCardId])

  // Load bank list when picker opens
  useEffect(() => {
    if (!cardPickerOpen || pickerBanks.length > 0) return
    fetchCards({ limit: 200 })
      .then(d => {
        const banks = Array.from(new Set<string>((d.cards || []).map((c: any) => c.bank_name).filter(Boolean))).sort()
        setPickerBanks(banks as string[])
      })
      .catch(() => {})
  }, [cardPickerOpen])

  // Load cards for selected bank
  useEffect(() => {
    if (!pickerSelectedBank) { setPickerBankCards([]); setPickerCardSearch(''); return }
    setPickerCardSearch('')
    setPickerBankCardsLoading(true)
    fetchCards({ bank: pickerSelectedBank, limit: 100 })
      .then(d => setPickerBankCards(d.cards || []))
      .catch(() => {})
      .finally(() => setPickerBankCardsLoading(false))
  }, [pickerSelectedBank])

  const [proceedLoading, setProceedLoading] = useState(false)

  // From Statement Review → pre-fill manual form with parsed category spend
  const proceedToManual = () => {
    if (!currentCardId) {
      setError('Please identify your current card before proceeding — click "+ Add card manually" above.')
      return
    }
    setError('')
    setProceedLoading(true)
    setTimeout(() => {
      if (reviewData?.spend_dict) {
        const filled: Record<string, string> = {}
        for (const [k, v] of Object.entries(reviewData.spend_dict)) {
          const num = Number(v) || 0
          filled[k] = num > 0 ? String(num) : ''
        }
        setSpend(filled)
      }
      setProceedLoading(false)
      setShowReview(false)
      setMode('manual')
      setError('')
    }, 3000)
  }

  // Comparison popup state (shown after scoring, before navigating to results)
  const [comparisonData, setComparisonData] = useState<{
    monthlyDiff:    number
    annualDiff:     number
    currentMonthly: number
    isWinning:      boolean
    categoryGaps:   { label: string; current: number; diff: number }[]
    spendNumbers:   Record<string, number>
  } | null>(null)

  // Manual path
  const handleManual = async () => {
    if (totalMonthly <= 0) return setError('Enter at least one spend category')
    const salaryNum = parseFloat(salary) || 0
    if (salaryNum <= 0) { setSalaryPopup(true); return }
    setLoadingType('score'); setLoading(true); setError('')
    try {
      const spendNumbers = Object.fromEntries(Object.entries(spend).map(([k, v]) => [k, parseFloat(v) || 0]))
      const activeMerchantPrefs = Object.fromEntries(
        Object.entries(merchantPrefs).filter(([, v]) => v.length > 0)
      )
      const [result, walletData] = await Promise.all([
        scoreCards(spendNumbers, Object.keys(activeMerchantPrefs).length > 0 ? activeMerchantPrefs : undefined, salaryNum),
        getOptimalWallet(spendNumbers, salaryNum),
        new Promise(res => setTimeout(res, 7000)),  // minimum 7s hold
      ])
      sessionStorage.setItem('earnn_result', JSON.stringify({
        type: 'manual',
        data: { ...result, current_card_id: currentCardId, current_card_info: currentCardInfo, merchant_prefs: activeMerchantPrefs },
        salary: parseFloat(salary) || 0,
      }))
      sessionStorage.setItem('earnn_wallet', JSON.stringify(walletData))

      // Fire-and-forget image preloads — primes browser cache, doesn't block navigation
      const topIds: string[] = (result.scored_cards || [])
        .slice(0, 20).map((c: any) => c.earnn_card_id).filter(Boolean)
      topIds.forEach(id => { const img = new Image(); img.src = getCardImageUrl(id) })

      // Build comparison popup if we know the user's current card
      if (currentCardId) {
        const scoredCards: any[] = result.scored_cards || []
        const heroCard         = scoredCards[0]
        const currentInResults = scoredCards.find((c: any) => c.earnn_card_id === currentCardId)

        if (heroCard && currentInResults) {
          const heroCatRewards:    Record<string, number> = heroCard.category_monthly_rewards    || {}
          const currentCatRewards: Record<string, number> = currentInResults.category_monthly_rewards || {}
          const catLabelMap: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.key, c.label]))

          const categoryGaps = Object.entries(heroCatRewards)
            .map(([cat, heroAmt]) => ({
              label:   catLabelMap[cat] || cat,
              current: Math.round(currentCatRewards[cat] ?? 0),
              diff:    Math.round((heroAmt ?? 0) - (currentCatRewards[cat] ?? 0)),
            }))
            .filter(g => g.diff > 0 || g.current > 0)
            .sort((a, b) => b.diff - a.diff)

          const heroMonthly    = heroCard.gross_monthly_rewards_aed    ?? 0
          const currentMonthly = currentInResults.gross_monthly_rewards_aed ?? 0
          const monthlyDiff    = heroMonthly - currentMonthly

          setComparisonData({
            monthlyDiff,
            annualDiff:   monthlyDiff * 12,
            currentMonthly,
            isWinning:    monthlyDiff <= 0,
            categoryGaps,
            spendNumbers,
          })
          setLoading(false)
          return
        }
      }

      router.push('/results')
      // Don't setLoading(false) — keep animation visible until navigation unmounts the page
    } catch (e: any) {
      setError('Scoring failed. Please try again.')
      setLoading(false)
    }
  }

  // Split 16 cards into 4 columns of 4, pad with dummy if fewer available
  const colCards = [0, 1, 2, 3].map(col => {
    const slice = animCardIds.slice(col * 4, col * 4 + 4)
    while (slice.length < 4) slice.push('__dummy__')
    // Triple each column for seamless infinite scroll
    return [...slice, ...slice, ...slice]
  })
  // Cols 0 & 2 scroll down, cols 1 & 3 scroll up
  const colDir = ['dn', 'up', 'dn', 'up']
  const colSpeed = [11, 13, 9, 15] // slightly varied speeds

  return (
    <div>

      {/* ── PDF SCAN OVERLAY (upload parsing) ───────────────────────────── */}
      {loading && loadingType === 'upload' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: '#07112B',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* PDF page */}
          <div style={{ position: 'relative', width: 160, height: 210, marginBottom: 40 }}>
            {/* Page body */}
            <div style={{
              width: '100%', height: '100%',
              background: '#F0F4FF',
              borderRadius: 6,
              boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              position: 'relative',
            }}>
              {/* Folded corner */}
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: 0, height: 0,
                borderStyle: 'solid',
                borderWidth: '0 28px 28px 0',
                borderColor: 'transparent #B8C8F0 transparent transparent',
              }} />
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: 28, height: 28,
                background: '#8BA8D8',
                clipPath: 'polygon(100% 0, 100% 100%, 0 0)',
              }} />
              {/* Fake text lines */}
              {[20, 44, 56, 68, 80, 100, 112, 124, 144, 156, 168].map((top, i) => (
                <div key={i} style={{
                  position: 'absolute', left: 18, right: i % 3 === 2 ? 40 : 18, top,
                  height: 6, borderRadius: 3,
                  background: 'rgba(14,55,133,0.15)',
                }} />
              ))}
              {/* Scan beam */}
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 3,
                background: 'linear-gradient(90deg, transparent 0%, #4A8EFF 20%, #A8D0FF 50%, #4A8EFF 80%, transparent 100%)',
                boxShadow: '0 0 12px 4px rgba(74,142,255,0.6)',
                animation: 'pdfScan 1.8s ease-in-out infinite',
              }} />
            </div>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'white', textAlign: 'center', letterSpacing: '-0.3px' }}>
            Analysing your statement
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
            Reading transactions and categorising spend…
          </div>
          <style>{`
            @keyframes pdfScan {
              0%   { top: 0%; }
              50%  { top: calc(100% - 3px); }
              100% { top: 0%; }
            }
          `}</style>
        </div>
      )}

      {/* ── CARD COLUMNS LOADING OVERLAY (scoring) ───────────────────────── */}
      {loading && loadingType === 'score' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: '#07112B',
          display: 'flex', overflow: 'hidden',
        }}>

          {/* 4 scrolling card columns */}
          {colCards.map((cards, col) => (
            <div key={col} style={{ flex: 1, overflow: 'hidden', position: 'relative', opacity: 0.72 }}>
              {/* Fade top & bottom */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 120, zIndex: 2, background: 'linear-gradient(to bottom, #07112B, transparent)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, zIndex: 2, background: 'linear-gradient(to top, #07112B, transparent)', pointerEvents: 'none' }} />
              {/* Scrolling strip */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 10, padding: '0 6px',
                animation: `cardCol${colDir[col]} ${colSpeed[col]}s linear infinite`,
              }}>
                {cards.map((id, i) => (
                  <img
                    key={i}
                    src={id === '__dummy__' ? '/card-dummy.svg' : getCardImageUrl(id)}
                    onError={e => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }}
                    style={{
                      width: '100%', height: 'auto', aspectRatio: '1.586',
                      borderRadius: 8, objectFit: 'cover',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                      display: 'block', flexShrink: 0,
                    }}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Floating spend category chips — 3 copies each, full-screen scatter, gold */}
          {(() => {
            const activeSpend = CATEGORIES.filter(c => parseFloat(spend[c.key] || '0') > 0)
            const allChips: { cat: typeof CATEGORIES[0]; aed: number; copy: number }[] = []
            activeSpend.forEach(cat => {
              for (let copy = 0; copy < 3; copy++) allChips.push({ cat, aed: parseFloat(spend[cat.key] || '0'), copy })
            })
            // Slots interleaved across full screen — each consecutive entry is in a different vertical zone
            const SLOTS = [
              { x: 3,  y: 4  }, { x: 72, y: 62 }, { x: 20, y: 82 }, { x: 55, y: 24 },
              { x: 80, y: 88 }, { x: 38, y: 8  }, { x: 5,  y: 65 }, { x: 65, y: 36 },
              { x: 25, y: 92 }, { x: 82, y: 18 }, { x: 48, y: 70 }, { x: 10, y: 30 },
              { x: 68, y: 84 }, { x: 35, y: 14 }, { x: 78, y: 55 }, { x: 8,  y: 78 },
              { x: 52, y: 6  }, { x: 22, y: 58 }, { x: 85, y: 40 }, { x: 42, y: 88 },
              { x: 15, y: 10 }, { x: 60, y: 75 }, { x: 3,  y: 44 }, { x: 75, y: 8  },
              { x: 30, y: 68 }, { x: 58, y: 20 }, { x: 12, y: 86 }, { x: 70, y: 48 },
              { x: 45, y: 3  }, { x: 88, y: 72 }, { x: 18, y: 38 }, { x: 50, y: 90 },
            ]
            return allChips.map(({ cat, aed, copy }, i) => {
              const slot = SLOTS[i % SLOTS.length]
              const animIdx = i % 6
              const dur = (5 + (i % 5)).toFixed(1)
              const delay = ((i * 0.6) % 5).toFixed(1)
              return (
                <div key={`${cat.key}-${copy}`} style={{
                  position: 'absolute', zIndex: 8,
                  left: `${slot.x}%`, top: `${slot.y}%`,
                  animation: `floatChip${animIdx} ${dur}s ease-in-out ${delay}s infinite`,
                  pointerEvents: 'none',
                }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    background: 'rgba(212,175,55,0.06)',
                    border: '1px solid rgba(212,175,55,0.22)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 999, padding: '7px 16px',
                    fontSize: 14, fontWeight: 600,
                    color: 'rgba(245,217,122,0.55)',
                    whiteSpace: 'nowrap',
                    boxShadow: '0 2px 12px rgba(212,175,55,0.08)',
                  }}>
                    <span style={{ fontSize: 16 }}>{cat.icon}</span>
                    <span>{cat.label}</span>
                    <span style={{ color: 'rgba(255,233,122,0.6)', fontWeight: 700 }}>AED {aed.toLocaleString()}</span>
                  </div>
                </div>
              )
            })
          })()}

          {/* Centre message overlay */}
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            background: 'radial-gradient(ellipse 55% 38% at 50% 50%, rgba(7,17,43,0.92) 60%, transparent 100%)',
            pointerEvents: 'none',
          }}>
            {/* Spinner */}
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.15)',
              borderTopColor: '#4A8EFF',
              animation: 'colSpin 0.9s linear infinite',
              marginBottom: 22,
            }} />
            <div style={{ fontSize: 22, fontWeight: 800, color: 'white', textAlign: 'center', letterSpacing: '-0.3px', lineHeight: 1.35, whiteSpace: 'nowrap' }}>
              Matching best cards for your spending…
            </div>
            <div style={{ marginTop: 10, fontSize: 13, color: 'rgba(255,255,255,0.55)', textAlign: 'center', letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
              Running simulations across thousands of card combinations
            </div>
          </div>

          <style>{`
            @keyframes cardColdn { from { transform: translateY(-33.33%); } to { transform: translateY(0%); } }
            @keyframes cardColup { from { transform: translateY(0%); } to { transform: translateY(-33.33%); } }
            @keyframes colSpin   { to { transform: rotate(360deg); } }
            @keyframes floatChip0 {
              0%   { transform: translate(0px,0px)      rotate(-8deg);  opacity:0.65; }
              30%  { transform: translate(40px,-60px)   rotate(6deg);   opacity:1;    }
              60%  { transform: translate(-30px,-100px) rotate(-4deg);  opacity:0.8;  }
              100% { transform: translate(0px,0px)      rotate(-8deg);  opacity:0.65; }
            }
            @keyframes floatChip1 {
              0%   { transform: translate(0px,0px)     rotate(10deg);  opacity:0.7;  }
              40%  { transform: translate(-50px,70px)  rotate(-12deg); opacity:1;    }
              70%  { transform: translate(30px,110px)  rotate(5deg);   opacity:0.75; }
              100% { transform: translate(0px,0px)     rotate(10deg);  opacity:0.7;  }
            }
            @keyframes floatChip2 {
              0%   { transform: translate(0px,0px)     rotate(-5deg);  opacity:0.6;  }
              25%  { transform: translate(60px,50px)   rotate(14deg);  opacity:1;    }
              55%  { transform: translate(20px,-80px)  rotate(-8deg);  opacity:0.85; }
              80%  { transform: translate(-40px,30px)  rotate(10deg);  opacity:0.9;  }
              100% { transform: translate(0px,0px)     rotate(-5deg);  opacity:0.6;  }
            }
            @keyframes floatChip3 {
              0%   { transform: translate(0px,0px)      rotate(7deg);   opacity:0.7;  }
              35%  { transform: translate(-60px,-90px)  rotate(-15deg); opacity:1;    }
              65%  { transform: translate(50px,-50px)   rotate(9deg);   opacity:0.8;  }
              100% { transform: translate(0px,0px)      rotate(7deg);   opacity:0.7;  }
            }
            @keyframes floatChip4 {
              0%   { transform: translate(0px,0px)    rotate(-12deg); opacity:0.65; }
              45%  { transform: translate(70px,80px)  rotate(8deg);   opacity:1;    }
              100% { transform: translate(0px,0px)    rotate(-12deg); opacity:0.65; }
            }
            @keyframes floatChip5 {
              0%   { transform: translate(0px,0px)     rotate(4deg);   opacity:0.7;  }
              30%  { transform: translate(-70px,60px)  rotate(-10deg); opacity:0.9;  }
              60%  { transform: translate(40px,100px)  rotate(16deg);  opacity:1;    }
              100% { transform: translate(0px,0px)     rotate(4deg);   opacity:0.7;  }
            }
          `}</style>
        </div>
      )}

      {/* HERO — same message as home page */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(14,55,133,0.92) 0%, rgba(10,40,96,0.93) 60%, rgba(7,24,64,0.95) 100%), url(/cover-page.png)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        color: 'white', padding: '28px 24px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '5px 16px', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 14 }}>
            🇦🇪 BUILT EXCLUSIVELY FOR UAE RESIDENTS
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 14, color: 'white' }}>
            Are you leaving<br /><span style={{ color: '#FFD700' }}>AED on the table</span><br />every month?
          </h1>
          <p style={{ fontSize: 'clamp(15px, 2vw, 17px)', color: 'rgba(255,255,255,0.8)', lineHeight: 1.6, marginBottom: 0, maxWidth: 780, margin: '0 auto' }}>
            Upload your UAE credit card statement, we show you exactly which card earns you the most rewards based on your actual spending.
          </p>
        </div>
      </section>

    <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#0E3785', marginBottom: 12 }}>
          Analyse Your Spending
        </h1>
        <p style={{ fontSize: 17, color: '#5A6A85' }}>
          Choose how you want to get started — upload takes 60 seconds, manual takes 2 minutes.
        </p>
      </div>

      {/* PROCEED LOADING SCREEN */}
      {proceedLoading && (
        <div style={{ minHeight: '40vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 24px', textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid #D6E0F5', borderTopColor: '#0E3785', animation: 'colSpin 0.9s linear infinite', marginBottom: 8 }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: '#0E3785' }}>Categorising your spend…</div>
          <div style={{ fontSize: 14, color: '#5A6A85', maxWidth: 360 }}>Feel free to add more expenses which were not part of this statement</div>
          <style>{`@keyframes colSpin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* STATEMENT REVIEW SCREEN — shown after a successful upload */}
      {showReview && reviewData && !proceedLoading && (
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #D6E0F5', padding: 40, boxShadow: '0 4px 24px rgba(14,55,133,0.08)' }}>

          {/* Back to upload */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button
              onClick={() => { setShowReview(false); setReviewData(null); setFile(null); setPasswordMode(null); setPassword(''); setError(''); setMode('upload') }}
              style={{ background: 'none', border: '1px solid #D6E0F5', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, color: '#5A6A85', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              ← Upload another statement
            </button>
          </div>

          {/* Card detection banner */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28,
            padding: '16px 20px', borderRadius: 12, background: '#EEF3FF', border: '1px solid #D6E0F5'
          }}>
            <img src={currentCardId ? getCardImageUrl(currentCardId) : '/card-dummy.svg'} onError={e => { (e.target as HTMLImageElement).src = '/card-dummy.svg' }} alt="" style={{ width: 64, height: 40, borderRadius: 6, flexShrink: 0, objectFit: 'cover' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              {currentCardId && currentCardInfo ? (
                <>
                  <div style={{ fontSize: 12, color: '#5A6A85', fontWeight: 600, marginBottom: 2 }}>WE DETECTED YOUR CARD</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#0D1828' }}>{currentCardInfo.card_name}</div>
                  {currentCardInfo.bank_name && <div style={{ fontSize: 13, color: '#5A6A85' }}>{currentCardInfo.bank_name}</div>}
                </>
              ) : currentCardId ? (
                <div style={{ fontSize: 14, color: '#5A6A85' }}>Loading your card details...</div>
              ) : (
                <>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0D1828', marginBottom: 4 }}>We couldn&apos;t identify your card</div>
                  <div style={{ fontSize: 13, color: '#5A6A85' }}>Add it manually so we can compare it to your best option.</div>
                </>
              )}
            </div>
            <button
              onClick={() => { setCardPickerOpen(v => !v); setPickerSelectedBank('') }}
              style={{
                flexShrink: 0, padding: '9px 16px', borderRadius: 8, border: '1.5px solid #0E3785',
                background: 'white', color: '#0E3785', fontWeight: 700, fontSize: 13, cursor: 'pointer'
              }}
            >
              {currentCardId ? 'Change card' : '+ Add card manually'}
            </button>
          </div>

          {/* Card picker modal */}
          {cardPickerOpen && (
            <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
              onClick={() => { setCardPickerOpen(false); setPickerSelectedBank(''); setPickerCardSearch('') }}
            >
              {/* Backdrop */}
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,17,43,0.5)', backdropFilter: 'blur(4px)' }} />

              {/* Modal */}
              <div style={{ position: 'relative', width: '100%', maxWidth: 480, background: 'white', borderRadius: 16, boxShadow: '0 24px 64px rgba(0,0,0,0.25)', overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid #EEF3FF' }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0D1828' }}>Select your card</div>
                    <div style={{ fontSize: 12, color: '#9DAEC8', marginTop: 2 }}>Choose bank then pick your card</div>
                  </div>
                  <button onClick={() => { setCardPickerOpen(false); setPickerSelectedBank(''); setPickerCardSearch('') }}
                    style={{ background: '#EEF3FF', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 16, color: '#5A6A85', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    ×
                  </button>
                </div>

                {/* Bank dropdown */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #EEF3FF' }}>
                  <select
                    value={pickerSelectedBank}
                    onChange={e => setPickerSelectedBank(e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #D6E0F5', borderRadius: 8, fontSize: 14, color: pickerSelectedBank ? '#0D1828' : '#9DAEC8', outline: 'none', background: 'white', cursor: 'pointer' }}
                  >
                    <option value="">Select bank…</option>
                    {pickerBanks.map(b => <option key={b} value={b}>{formatBankName(b)}</option>)}
                  </select>
                </div>

                {/* Search + card list */}
                {pickerSelectedBank && (
                  <>
                    <div style={{ padding: '10px 20px', borderBottom: '1px solid #EEF3FF', background: '#F8FAFF' }}>
                      <input
                        type="text"
                        placeholder="Search card name…"
                        value={pickerCardSearch}
                        onChange={e => setPickerCardSearch(e.target.value)}
                        autoFocus
                        style={{ width: '100%', padding: '8px 12px', border: '1.5px solid #D6E0F5', borderRadius: 8, fontSize: 13, outline: 'none', color: '#0D1828', background: 'white', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                      {pickerBankCardsLoading ? (
                        <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: '#9DAEC8' }}>Loading cards…</div>
                      ) : pickerBankCards.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: '#9DAEC8' }}>No cards found for this bank</div>
                      ) : (() => {
                        const filtered = pickerBankCards.filter(c => !pickerCardSearch || c.card_name?.toLowerCase().includes(pickerCardSearch.toLowerCase()))
                        return filtered.length === 0
                          ? <div style={{ padding: '24px', textAlign: 'center', fontSize: 13, color: '#9DAEC8' }}>No cards match &ldquo;{pickerCardSearch}&rdquo;</div>
                          : filtered.map((card, i) => (
                            <div key={card.earnn_card_id}
                              onClick={() => { setCurrentCardId(card.earnn_card_id); setCurrentCardInfo({ card_name: card.card_name, bank_name: card.bank_name }); setCardPickerOpen(false); setPickerSelectedBank(''); setPickerCardSearch('') }}
                              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', cursor: 'pointer', borderBottom: i < filtered.length - 1 ? '1px solid #EEF3FF' : 'none', background: 'white', transition: 'background 0.15s' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#EEF3FF')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                            >
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
                )}

                {/* Empty state when no bank selected */}
                {!pickerSelectedBank && (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: '#9DAEC8', fontSize: 13 }}>
                    Select a bank above to see its cards
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#EEF3FF', borderRadius: 12, padding: 4, marginBottom: 24, width: '100%' }}>
            {([
              { key: 'category',  label: '📊 Category Split' },
              { key: 'merchants', label: '🏪 Top Merchants' },
            ] as const).map(t => (
              <button key={t.key} onClick={() => setReviewTab(t.key)} style={{
                flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
                background: reviewTab === t.key ? '#0E3785' : 'transparent',
                color: reviewTab === t.key ? 'white' : '#5A6A85',
                transition: 'all 0.2s'
              }}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab 1 — Category Split */}
          {reviewTab === 'category' && (
            <div style={{ marginBottom: 32 }}>
              {(reviewData.category_split || []).length === 0 ? (
                <div style={{ fontSize: 14, color: '#5A6A85' }}>No categorised spend found in this statement.</div>
              ) : (
                (() => {
                  const split = reviewData.category_split as { category: string; amount_aed: number }[]
                  const max = Math.max(...split.map((s) => s.amount_aed), 1)
                  const labelMap: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.key, c.label]))
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {split.map(s => (
                        <div key={s.category}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                            <span style={{ fontWeight: 600, color: '#0D1828' }}>{labelMap[s.category] || s.category}</span>
                            <span style={{ fontWeight: 700, color: '#0E3785' }}>AED {s.amount_aed.toLocaleString('en-AE', { maximumFractionDigits: 0 })}</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 4, background: '#EEF3FF', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${(s.amount_aed / max) * 100}%`, background: '#8B2E2E', borderRadius: 4 }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()
              )}
            </div>
          )}

          {/* Tab 2 — Top Merchants */}
          {reviewTab === 'merchants' && (
            <div style={{ marginBottom: 32 }}>
              {(reviewData.top_merchants || []).length === 0 ? (
                <div style={{ fontSize: 14, color: '#5A6A85' }}>No merchant data found in this statement.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(reviewData.top_merchants as { merchant_name: string; total_spend_aed: number; transaction_count: number }[]).map((m, i) => (
                    <div key={m.merchant_name} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                      border: '1.5px solid #D6E0F5', borderRadius: 10, background: i % 2 === 0 ? 'white' : '#F8FAFF'
                    }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#0E3785', color: 'white', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {i + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1828' }}>{m.merchant_name}</div>
                        <div style={{ fontSize: 12, color: '#5A6A85' }}>{m.transaction_count} transaction{m.transaction_count === 1 ? '' : 's'}</div>
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#0E3785', flexShrink: 0 }}>
                        AED {m.total_spend_aed.toLocaleString('en-AE', { maximumFractionDigits: 0 })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <div style={{ background: '#FFF3F0', border: '1px solid #FFD0C8', borderRadius: 8, padding: '12px 16px', color: '#C0392B', fontSize: 14, marginBottom: 20 }}>⚠️ {error}</div>}

          {/* Total spend sum */}
          {(() => {
            const total = (reviewData.category_split || []).reduce((s: number, c: any) => s + (c.amount_aed || 0), 0)
            return total > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderRadius: 12, background: '#EEF3FF', border: '1px solid #D6E0F5', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#5A6A85', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 2 }}>Total categorised spend</div>
                  <div style={{ fontSize: 13, color: '#9DAEC8' }}>{(reviewData.category_split || []).length} categories · {reviewData.transaction_count || 0} transactions</div>
                </div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#0E3785', letterSpacing: '-0.5px' }}>
                  AED {total.toLocaleString('en-AE', { maximumFractionDigits: 0 })}
                </div>
              </div>
            ) : null
          })()}

          <button onClick={proceedToManual} disabled={proceedLoading} style={{
            width: '100%', padding: '18px', fontSize: 17, fontWeight: 700, border: 'none', borderRadius: 10,
            background: proceedLoading ? '#6B8EC7' : '#0E3785', color: 'white',
            cursor: proceedLoading ? 'default' : 'pointer', boxShadow: '0 6px 20px rgba(14,55,133,0.25)',
            transition: 'background 0.2s',
          }}>
            Here is your spend — Find the best card for me →
          </button>

          {/* Parse validation debug panel — independent, removable */}
          <ParseDataDebug data={reviewData} />
        </div>
      )}

      {/* Mode Toggle */}
      {!showReview && (
      <>
      <div style={{ display: 'flex', background: '#EEF3FF', borderRadius: 12, padding: 4, maxWidth: 480, margin: '0 auto 20px' }}>
        {(['upload', 'manual'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setError(''); if (m === 'manual') setTimeout(() => manualSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} style={{
            flex: 1, padding: '12px 0', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600,
            background: mode === m ? '#0E3785' : 'transparent',
            color: mode === m ? 'white' : '#5A6A85',
            transition: 'all 0.2s'
          }}>
            {m === 'upload' ? '📄 Upload Statement' : '✏️ Manual Entry'}
          </button>
        ))}
      </div>

      {/* UPLOAD PATH */}
      {mode === 'upload' && (
        <div style={{ background: 'white', borderRadius: 16, border: '0.5px solid #D6E0F5', padding: '20px 24px', boxShadow: '0 2px 12px rgba(14,55,133,0.06)' }}>

          {/* File row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
                border: `1.5px dashed ${dragging ? '#0E3785' : file ? '#00A67E' : '#C8D4E8'}`,
                background: dragging ? '#EEF3FF' : file ? '#F0FDF8' : '#F8FAFF',
                transition: 'all 0.2s',
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
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0E3785' }}>Upload credit card statement</div>
                    <div style={{ fontSize: 11, color: '#9DAEC8' }}>PDF · ENBD, FAB, ADCB, RAK, HSBC, Citi</div>
                  </>
                )}
              </div>
              <button
                onClick={e => { e.stopPropagation(); fileRef.current?.click() }}
                style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 20, border: '1.5px solid #0E3785', background: 'white', color: '#0E3785', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
              >
                Browse
              </button>
            </div>
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setPasswordMode(null); setPassword('') } }} />
          </div>

          {/* Password row — inline, compact */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={{ fontSize: 12, color: '#5A6A85', fontWeight: 500, flexShrink: 0 }}>Password protected?</span>
            {(['none', 'has_password'] as const).map(opt => (
              <button key={opt} onClick={() => { setPasswordMode(opt); if (opt === 'none') setPassword('') }} style={{
                padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer',
                border: `1.5px solid ${passwordMode === opt ? '#0E3785' : '#D6E0F5'}`,
                background: passwordMode === opt ? '#EEF3FF' : 'white',
                color: passwordMode === opt ? '#0E3785' : '#5A6A85',
              }}>
                {opt === 'none' ? 'No' : 'Yes'}
              </button>
            ))}
            {passwordMode === 'has_password' && (
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input type={showPassword ? 'text' : 'password'} placeholder="Enter PDF password" value={password} onChange={e => setPassword(e.target.value)} autoFocus
                  style={{ padding: '5px 36px 5px 12px', border: '1.5px solid #0E3785', borderRadius: 20, fontSize: 12, outline: 'none', color: '#0D1828', minWidth: 180 }} />
                <button onClick={() => setShowPassword(v => !v)} type="button"
                  style={{ position: 'absolute', right: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, display: 'flex', alignItems: 'center' }}>
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A6A85" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5A6A85" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Privacy note */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
            <span style={{ fontSize: 12, flexShrink: 0 }}>🔒</span>
            <span style={{ fontSize: 11, color: '#9DAEC8' }}>Bank-grade encryption · we never store your statement or personal information</span>
          </div>

          {error && <div style={{ background: '#FFF3F0', border: '1px solid #FFD0C8', borderRadius: 8, padding: '10px 14px', color: '#C0392B', fontSize: 13, marginBottom: 14 }}>⚠️ {error}</div>}

          <button onClick={handleUpload} disabled={!uploadReady || loading} style={{
            width: '100%', padding: '13px', fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 10, transition: 'all 0.2s',
            background: uploadReady ? '#0E3785' : '#D6E0F5',
            color: uploadReady ? 'white' : '#9DAEC8',
            cursor: uploadReady ? 'pointer' : 'not-allowed',
          }}>
            {loading ? 'Analysing your statement…' : uploadReady ? 'Analyze my statement →' : 'Select a file to continue'}
          </button>
        </div>
      )}

      {/* MANUAL PATH */}
      {mode === 'manual' && (
        <div>
          {/* Heading */}
          <div ref={manualSectionRef} style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
              <div style={{ width: 4, height: 36, borderRadius: 2, background: '#0E3785', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 22, fontWeight: 500, color: '#0D1828', letterSpacing: '-0.3px' }}>Monthly spending</div>
                <div style={{ fontSize: 13, color: '#5A6A85', marginTop: 2 }}>Set each category · drag or type · skip what doesn&apos;t apply</div>
              </div>
            </div>
          </div>

          {/* Salary + Preference quick row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div
              onClick={() => { if (!salary) setSalaryPopup(true) }}
              style={{ background: 'white', border: `0.5px solid ${salary ? '#00A67E' : '#F0A500'}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: salary ? 'default' : 'pointer' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: salary ? '#00A67E' : '#F0A500', fontWeight: 600 }}>Monthly salary</span>
                  {!salary && <span style={{ fontSize: 10, background: '#FFF3CD', color: '#856404', borderRadius: 4, padding: '1px 6px', fontWeight: 600 }}>REQUIRED</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 12, color: '#9DAEC8' }}>AED</span>
                  <input
                    type="number" min="0" placeholder="e.g. 15000" value={salary}
                    onChange={e => setSalary(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{ border: 'none', outline: 'none', fontSize: 16, fontWeight: 500, color: '#0D1828', width: '100%', background: 'transparent' }}
                  />
                </div>
              </div>
            </div>
            <div style={{ background: 'white', border: '0.5px solid #D6E0F5', borderRadius: 12, padding: '12px 16px' }}>
              <div style={{ fontSize: 12, color: '#9DAEC8', marginBottom: 8 }}>Card type preference</div>
              <div style={{ display: 'flex', gap: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#0D1828' }}>
                  <input type="radio" name="preference" checked={preference === 'cashback'} onChange={() => setPreference('cashback')} style={{ accentColor: '#0E3785' }} />
                  Cashback
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'not-allowed', fontSize: 13, fontWeight: 500, color: '#C8D4E8' }}>
                  <input type="radio" name="preference" checked={false} disabled style={{ accentColor: '#C8D4E8' }} />
                  Miles <span style={{ fontSize: 10, color: '#C8D4E8' }}>(soon)</span>
                </label>
              </div>
            </div>
          </div>

          {/* Unified form card */}
          <div style={{ background: 'white', border: '0.5px solid #D6E0F5', borderRadius: 16, overflow: 'hidden', marginBottom: 24, boxShadow: '0 2px 12px rgba(14,55,133,0.06)' }}>

            {/* Header row: total + reset */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '0.5px solid #D6E0F5', background: '#F8FAFF' }}>
              <div style={{ fontSize: 13, color: '#5A6A85' }}>
                Total: <strong style={{ color: '#0D1828', fontWeight: 600 }}>AED {totalMonthly.toLocaleString('en-AE', { maximumFractionDigits: 0 })}</strong>
              </div>
              <button
                onClick={() => { setSpend({}); setMerchantPrefs({}) }}
                style={{ background: 'none', border: 'none', fontSize: 13, color: '#0E3785', fontWeight: 500, cursor: 'pointer', padding: 0 }}
              >
                Reset all
              </button>
            </div>

            {/* Category rows */}
            {(() => {
              // Non-linear slider: raw 0-1000 maps to AED via 3-segment piecewise curve
              // Seg 1: raw 0-500   → AED 0-5000    (10 AED per raw unit)
              // Seg 2: raw 500-900 → AED 5000-15000 (25 AED per raw unit)
              // Seg 3: raw 900-1000→ AED 15000-30000 (150 AED per raw unit)
              const RAW_MAX = 1000
              const posToAed = (raw: number): number => {
                if (raw <= 500) return raw * 10
                if (raw <= 900) return 5000 + (raw - 500) * 25
                return 15000 + (raw - 900) * 150
              }
              const aedToPos = (aed: number): number => {
                if (aed <= 5000) return aed / 10
                if (aed <= 15000) return 500 + (aed - 5000) / 25
                return 900 + (aed - 15000) / 150
              }
              const TABLER_ICONS: Record<string, string> = {
                dining: 'ti-tools-kitchen-2', grocery: 'ti-shopping-cart', travel: 'ti-plane',
                fuel: 'ti-gas-station', online: 'ti-device-laptop', international: 'ti-world',
                entertainment: 'ti-movie', retail: 'ti-building-store', telecom: 'ti-device-mobile',
                transport: 'ti-car', utility: 'ti-bolt', education: 'ti-school', miscellaneous: 'ti-dots',
              }
              // Breakpoint positions as % of track for tick marks
              const bp1Pct = (500 / RAW_MAX * 100).toFixed(2) // 50%
              const bp2Pct = (900 / RAW_MAX * 100).toFixed(2) // 90%

              return CATEGORIES.map((cat, i) => {
                const val = Math.min(30000, Math.max(0, parseFloat(spend[cat.key] || '0') || 0))
                const rawPos = aedToPos(val)
                const fillPct = (rawPos / RAW_MAX * 100).toFixed(2)
                const sliderBg = val > 0
                  ? `linear-gradient(to right, #0E3785 0%, #0E3785 ${fillPct}%, #D6E0F5 ${fillPct}%, #D6E0F5 100%)`
                  : '#D6E0F5'
                const merchantOpts = MERCHANT_OPTIONS[cat.key]
                const selected = merchantPrefs[cat.key] || []
                const isLast = i === CATEGORIES.length - 1
                const active = val > 0

                return (
                  <div key={cat.key} style={{ borderBottom: isLast ? 'none' : '0.5px solid #D6E0F5', padding: '13px 20px 12px' }}>

                    {/* Row 1: icon + label | AED value */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: active ? '#0E3785' : '#C8D4E8', flexShrink: 0, transition: 'background 0.2s' }} />
                        <i className={`ti ${TABLER_ICONS[cat.key] || 'ti-dots'}`}
                          style={{ fontSize: 20, color: active ? '#0E3785' : '#7A8CA8', transition: 'color 0.2s', lineHeight: 1 }}
                          aria-hidden="true" />
                        <span style={{ fontSize: 14, fontWeight: 600, color: active ? '#0D1828' : '#3D4F68', transition: 'color 0.2s', letterSpacing: '-0.1px' }}>{cat.label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, background: active ? '#E8EEF8' : '#EEF0F5', borderRadius: 8, padding: '4px 10px', transition: 'background 0.2s' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: active ? '#5A6A85' : '#7A8CA8' }}>AED</span>
                        <input
                          type="number" min="0" max={30000} step="100"
                          value={val === 0 ? '' : val}
                          placeholder="0"
                          onChange={e => {
                            const n = Math.min(30000, Math.max(0, parseFloat(e.target.value) || 0))
                            setSpend(prev => ({ ...prev, [cat.key]: String(n) }))
                          }}
                          style={{
                            width: 72, border: 'none', background: 'transparent', outline: 'none',
                            fontSize: 16, fontWeight: 600, textAlign: 'right',
                            color: active ? '#0E3785' : '#7A8CA8',
                            MozAppearance: 'textfield' as any,
                          }}
                        />
                      </div>
                    </div>

                    {/* Row 2: non-linear slider + tick marks */}
                    <div style={{ position: 'relative', marginBottom: merchantOpts ? 10 : 0 }}>
                      <input
                        type="range" min="0" max={RAW_MAX} step="1"
                        value={rawPos}
                        onChange={e => {
                          const aed = posToAed(parseFloat(e.target.value))
                          const rounded = Math.round(aed / 100) * 100
                          setSpend(prev => ({ ...prev, [cat.key]: String(rounded) }))
                        }}
                        className="spend-slider"
                        style={{ width: '100%', background: sliderBg }}
                      />
                      {/* Tick marks at breakpoints */}
                      <div style={{ position: 'relative', height: 14, marginTop: 2 }}>
                        {/* 0 */}
                        <span style={{ position: 'absolute', left: 0, fontSize: 9, color: '#B0BDD4', transform: 'translateX(0)' }}>0</span>
                        {/* 5K */}
                        <span style={{ position: 'absolute', left: `${bp1Pct}%`, fontSize: 9, color: '#B0BDD4', transform: 'translateX(-50%)' }}>5K</span>
                        {/* 15K */}
                        <span style={{ position: 'absolute', left: `${bp2Pct}%`, fontSize: 9, color: '#B0BDD4', transform: 'translateX(-50%)' }}>15K</span>
                        {/* 30K */}
                        <span style={{ position: 'absolute', right: 0, fontSize: 9, color: '#B0BDD4', transform: 'translateX(0)' }}>30K</span>
                      </div>
                    </div>

                    {/* Row 3: merchant preference */}
                    {merchantOpts && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 2 }}>
                        <span style={{ fontSize: 11, fontWeight: 500, color: '#5A6A85', whiteSpace: 'nowrap', flexShrink: 0 }}>Merchant preference, if any</span>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', flex: 1, gap: 4 }}>
                          {merchantOpts.map(m => {
                            const isSel = selected.includes(m.key)
                            return (
                              <div
                                key={m.key}
                                onClick={() => setMerchantPrefs(prev => {
                                  const cur = prev[cat.key] || []
                                  return { ...prev, [cat.key]: cur.includes(m.key) ? cur.filter(x => x !== m.key) : [...cur, m.key] }
                                })}
                                style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
                              >
                                <div style={{
                                  width: 14, height: 14, borderRadius: '50%', flexShrink: 0, transition: 'all 0.15s',
                                  border: `1.5px solid ${isSel ? '#0E3785' : '#C8D4E8'}`,
                                  background: isSel ? '#0E3785' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {isSel && <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'white' }} />}
                                </div>
                                <span style={{ fontSize: 11, fontWeight: isSel ? 600 : 400, color: isSel ? '#0D1828' : '#5A6A85', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {m.label}
                                </span>
                              </div>
                            )
                          })}
                          {Array.from({ length: 5 - merchantOpts.length }).map((_, pi) => <div key={`pad-${pi}`} />)}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            })()}

            {/* Footer: submit */}
            <div style={{ padding: '16px 20px', borderTop: '0.5px solid #D6E0F5', background: '#F8FAFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              {error && <div style={{ fontSize: 13, color: '#C0392B', flex: 1 }}>⚠️ {error}</div>}
              {!error && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ fontSize: 11, color: '#5A6A85', fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' }}>Total Monthly Spend</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: '#0E3785', letterSpacing: '-0.5px', lineHeight: 1 }}>
                    AED {totalMonthly.toLocaleString('en-AE', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              )}
              <button onClick={handleManual} disabled={totalMonthly <= 0 || loading} style={{
                padding: '12px 32px', background: totalMonthly <= 0 ? '#D6E0F5' : '#0E3785',
                color: totalMonthly <= 0 ? '#9DAEC8' : 'white',
                border: 'none', borderRadius: 30, fontSize: 14, fontWeight: 600,
                cursor: totalMonthly <= 0 ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
              }}>
                {loading ? 'Finding best cards…' : 'Find My Best Cards →'}
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>

    {/* Comparison popup */}
    {comparisonData && (
      <ComparisonPopup
        data={comparisonData}
        onContinue={() => { setComparisonData(null); router.push('/results') }}
      />
    )}

    {/* Salary required popup */}
    {salaryPopup && (
      <div style={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        onClick={() => setSalaryPopup(false)}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,17,43,0.5)', backdropFilter: 'blur(4px)' }} />
        <div style={{ position: 'relative', background: 'white', borderRadius: 16, padding: '32px 28px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}
          onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>💰</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#0D1828', marginBottom: 8 }}>Monthly salary required</div>
          <div style={{ fontSize: 14, color: '#5A6A85', lineHeight: 1.6, marginBottom: 24 }}>
            We need your monthly salary to filter out cards you don&apos;t qualify for, so results are accurate for you.
          </div>
          <input
            type="number" min="0" placeholder="Enter monthly salary (AED)"
            value={salary}
            onChange={e => setSalary(e.target.value)}
            autoFocus
            style={{ width: '100%', padding: '12px 16px', border: '2px solid #0E3785', borderRadius: 10, fontSize: 16, outline: 'none', color: '#0D1828', marginBottom: 16, boxSizing: 'border-box', textAlign: 'center' }}
          />
          <button
            onClick={() => { if (parseFloat(salary) > 0) setSalaryPopup(false) }}
            style={{ width: '100%', padding: '13px', background: parseFloat(salary) > 0 ? '#0E3785' : '#D6E0F5', color: parseFloat(salary) > 0 ? 'white' : '#9DAEC8', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: parseFloat(salary) > 0 ? 'pointer' : 'not-allowed' }}>
            Confirm salary
          </button>
        </div>
      </div>
    )}
    </div>
  )
}

export default function AnalysePage() {
  return (
    <Suspense>
      <AnalyseContent />
    </Suspense>
  )
}
