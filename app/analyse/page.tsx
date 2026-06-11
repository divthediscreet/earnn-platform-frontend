'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { uploadStatement, scoreCards, fetchCardDetail, searchCards } from '@/lib/api'
import { Suspense } from 'react'

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

function AnalyseContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultMode = searchParams.get('mode') === 'manual' ? 'manual' : 'upload'

  const [mode, setMode] = useState<'upload' | 'manual'>(defaultMode)
  const [file, setFile] = useState<File | null>(null)
  const [passwordMode, setPasswordMode] = useState<'none' | 'has_password' | null>(null)
  const [password, setPassword] = useState('')
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [spend, setSpend] = useState<Record<string, string>>({})
  const [salary, setSalary] = useState('')
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
  const [cardSearch, setCardSearch] = useState('')
  const [cardSearchResults, setCardSearchResults] = useState<any[]>([])
  const [cardSearchLoading, setCardSearchLoading] = useState(false)

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

  // Upload path
  const handleUpload = async () => {
    if (!file) return setError('Please select a PDF file first')
    if (passwordMode === null) return setError('Please confirm if your PDF has a password')
    if (passwordMode === 'has_password' && !password.trim()) return setError('Please enter your PDF password')
    setLoading(true); setError('')
    try {
      const result = await uploadStatement(file, passwordMode === 'has_password' ? password.trim() : undefined)
      if (result.success) {
        setReviewData(result)
        setCurrentCardId(result.earnn_card_id || null)
        setCurrentCardInfo(null)
        setReviewTab('category')
        setShowReview(true)
      } else {
        setError(result.error_message || 'Could not parse this statement. Try manual entry.')
      }
    } catch (e: any) {
      setError('Upload failed. Please try again or use manual entry.')
    } finally { setLoading(false) }
  }

  // Fetch detected card's name once we know its earnn_card_id
  useEffect(() => {
    if (!currentCardId) { setCurrentCardInfo(null); return }
    let cancelled = false
    fetchCardDetail(currentCardId)
      .then(d => { if (!cancelled) setCurrentCardInfo({ card_name: d.card?.card_name, bank_name: d.card?.bank_name }) })
      .catch(() => { if (!cancelled) setCurrentCardInfo(null) })
    return () => { cancelled = true }
  }, [currentCardId])

  // Debounced card search for "Add card manually" picker
  useEffect(() => {
    if (!cardPickerOpen || !cardSearch.trim()) { setCardSearchResults([]); return }
    setCardSearchLoading(true)
    const t = setTimeout(() => {
      searchCards(cardSearch)
        .then(d => setCardSearchResults(d.cards || []))
        .finally(() => setCardSearchLoading(false))
    }, 300)
    return () => clearTimeout(t)
  }, [cardSearch, cardPickerOpen])

  // From Statement Review → pre-fill manual form with parsed category spend
  const proceedToManual = () => {
    if (reviewData?.spend_dict) {
      const filled: Record<string, string> = {}
      for (const [k, v] of Object.entries(reviewData.spend_dict)) {
        const num = Number(v) || 0
        filled[k] = num > 0 ? String(num) : ''
      }
      setSpend(filled)
    }
    setShowReview(false)
    setMode('manual')
    setError('')
  }

  // Manual path
  const handleManual = async () => {
    if (totalMonthly <= 0) return setError('Enter at least one spend category')
    setLoading(true); setError('')
    try {
      const spendNumbers = Object.fromEntries(Object.entries(spend).map(([k, v]) => [k, parseFloat(v) || 0]))
      const result = await scoreCards(spendNumbers)
      sessionStorage.setItem('earnn_result', JSON.stringify({
        type: 'manual',
        data: { ...result, current_card_id: currentCardId, current_card_info: currentCardInfo },
      }))
      router.push('/results')
    } catch (e: any) {
      setError('Scoring failed. Please try again.')
    } finally { setLoading(false) }
  }

  return (
    <div>
      {/* HERO — same message as home page */}
      <section style={{
        background: 'linear-gradient(135deg, rgba(14,55,133,0.92) 0%, rgba(10,40,96,0.93) 60%, rgba(7,24,64,0.95) 100%), url(/cover-page.png)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        color: 'white', padding: '72px 24px 64px', textAlign: 'center', position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.04, backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
        <div style={{ maxWidth: 800, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 100, padding: '6px 18px', fontSize: 13, fontWeight: 600, letterSpacing: '0.05em', marginBottom: 28 }}>
            🇦🇪 BUILT EXCLUSIVELY FOR UAE RESIDENTS
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24, color: 'white' }}>
            Are you leaving<br /><span style={{ color: '#FFD700' }}>AED on the table</span><br />every month?
          </h1>
          <p style={{ fontSize: 'clamp(17px, 2.5vw, 21px)', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7, marginBottom: 0, maxWidth: 620, margin: '0 auto' }}>
            Upload your UAE credit card statement. In 60 seconds, we show you exactly which card earns you the most rewards — based on <em>your actual spending</em>.
          </p>
        </div>
      </section>

    <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 48 }}>
        <h1 style={{ fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, color: '#0E3785', marginBottom: 12 }}>
          Analyse Your Spending
        </h1>
        <p style={{ fontSize: 17, color: '#5A6A85' }}>
          Choose how you want to get started — upload takes 60 seconds, manual takes 2 minutes.
        </p>
      </div>

      {/* STATEMENT REVIEW SCREEN — shown after a successful upload */}
      {showReview && reviewData && (
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #D6E0F5', padding: 40, boxShadow: '0 4px 24px rgba(14,55,133,0.08)' }}>

          {/* Card detection banner */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28,
            padding: '16px 20px', borderRadius: 12, background: '#EEF3FF', border: '1px solid #D6E0F5'
          }}>
            <img src="/card-dummy.svg" alt="" style={{ width: 64, height: 40, borderRadius: 6, flexShrink: 0, objectFit: 'cover' }} />
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
              onClick={() => { setCardPickerOpen(v => !v); setCardSearch(''); setCardSearchResults([]) }}
              style={{
                flexShrink: 0, padding: '9px 16px', borderRadius: 8, border: '1.5px solid #0E3785',
                background: 'white', color: '#0E3785', fontWeight: 700, fontSize: 13, cursor: 'pointer'
              }}
            >
              {currentCardId ? 'Change card' : '+ Add card manually'}
            </button>
          </div>

          {/* Card picker */}
          {cardPickerOpen && (
            <div style={{ marginBottom: 28, padding: '16px 20px', background: '#F8FAFF', borderRadius: 12, border: '1.5px solid #D6E0F5' }}>
              <input
                type="text"
                placeholder="Search by card name or bank..."
                value={cardSearch}
                onChange={e => setCardSearch(e.target.value)}
                autoFocus
                style={{ width: '100%', padding: '11px 16px', border: '1.5px solid #0E3785', borderRadius: 8, fontSize: 15, outline: 'none', color: '#0D1828', marginBottom: 12 }}
              />
              {cardSearchLoading && <div style={{ fontSize: 13, color: '#5A6A85' }}>Searching...</div>}
              {!cardSearchLoading && cardSearch.trim() && cardSearchResults.length === 0 && (
                <div style={{ fontSize: 13, color: '#5A6A85' }}>No cards found.</div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 240, overflowY: 'auto' }}>
                {cardSearchResults.map(c => (
                  <button
                    key={c.earnn_card_id}
                    onClick={() => {
                      setCurrentCardId(c.earnn_card_id)
                      setCurrentCardInfo({ card_name: c.card_name, bank_name: c.bank_name })
                      setCardPickerOpen(false)
                    }}
                    style={{
                      textAlign: 'left', padding: '10px 14px', borderRadius: 8, border: '1px solid #D6E0F5',
                      background: 'white', cursor: 'pointer', fontSize: 14
                    }}
                  >
                    <span style={{ fontWeight: 700, color: '#0D1828' }}>{c.card_name}</span>
                    {c.bank_name && <span style={{ color: '#5A6A85' }}> — {c.bank_name}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: 'flex', background: '#EEF3FF', borderRadius: 12, padding: 4, marginBottom: 24, maxWidth: 420 }}>
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

          <button onClick={proceedToManual} style={{
            width: '100%', padding: '18px', fontSize: 17, fontWeight: 700, border: 'none', borderRadius: 10,
            background: '#0E3785', color: 'white', cursor: 'pointer', boxShadow: '0 6px 20px rgba(14,55,133,0.25)'
          }}>
            Here&apos;s your spend — find my best card →
          </button>
        </div>
      )}

      {/* Mode Toggle */}
      {!showReview && (
      <>
      <div style={{ display: 'flex', background: '#EEF3FF', borderRadius: 12, padding: 4, marginBottom: 40, maxWidth: 480, margin: '0 auto 40px' }}>
        {(['upload', 'manual'] as const).map(m => (
          <button key={m} onClick={() => { setMode(m); setError('') }} style={{
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
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #D6E0F5', padding: 40, boxShadow: '0 4px 24px rgba(14,55,133,0.08)' }}>

          {/* Compliance line — thin, ABOVE drop zone */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24,
            padding: '10px 16px', borderRadius: 10, background: '#F8FAFF', border: '1px solid #EEF3FF'
          }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>🔒</span>
            <span style={{ fontSize: 12.5, color: '#5A6A85', lineHeight: 1.5 }}>
              Bank-grade encryption, built to CBUAE guidelines. We never store your statement, card number or personal information.
            </span>
          </div>

          {/* Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${dragging ? '#0E3785' : file ? '#00A67E' : '#D6E0F5'}`,
              borderRadius: 16, padding: '48px 24px', textAlign: 'center', cursor: 'pointer',
              background: dragging ? '#EEF3FF' : file ? '#F0FDF8' : '#F8FAFF',
              transition: 'all 0.2s', marginBottom: 28
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>{file ? '✅' : '📄'}</div>
            {file ? (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#00A67E' }}>{file.name}</div>
                <div style={{ fontSize: 14, color: '#5A6A85', marginTop: 8 }}>{(file.size / 1024).toFixed(0)} KB · Click to change</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0E3785' }}>Drop your PDF here</div>
                <div style={{ fontSize: 14, color: '#5A6A85', marginTop: 8 }}>or click to browse · ENBD, FAB, ADCB, RAK, HSBC, Citi supported</div>
              </>
            )}
            <input ref={fileRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setPasswordMode(null); setPassword('') } }} />
          </div>

          {/* Password section */}
          <div style={{ marginBottom: 28, padding: '20px 24px', background: '#F8FAFF', borderRadius: 12, border: '1.5px solid #D6E0F5' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#0D1828', marginBottom: 16 }}>
              Is your statement PDF password-protected?
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {/* No password option */}
              <button
                onClick={() => { setPasswordMode('none'); setPassword('') }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                  borderRadius: 8, border: `2px solid ${passwordMode === 'none' ? '#0E3785' : '#D6E0F5'}`,
                  background: passwordMode === 'none' ? '#EEF3FF' : 'white',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  color: passwordMode === 'none' ? '#0E3785' : '#5A6A85'
                }}
              >
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${passwordMode === 'none' ? '#0E3785' : '#D6E0F5'}`, background: passwordMode === 'none' ? '#0E3785' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {passwordMode === 'none' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', display: 'block' }} />}
                </span>
                No password
              </button>

              {/* Has password option */}
              <button
                onClick={() => setPasswordMode('has_password')}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
                  borderRadius: 8, border: `2px solid ${passwordMode === 'has_password' ? '#0E3785' : '#D6E0F5'}`,
                  background: passwordMode === 'has_password' ? '#EEF3FF' : 'white',
                  cursor: 'pointer', fontSize: 14, fontWeight: 600,
                  color: passwordMode === 'has_password' ? '#0E3785' : '#5A6A85'
                }}
              >
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${passwordMode === 'has_password' ? '#0E3785' : '#D6E0F5'}`, background: passwordMode === 'has_password' ? '#0E3785' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {passwordMode === 'has_password' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'white', display: 'block' }} />}
                </span>
                Yes, it has a password
              </button>
            </div>

            {/* Password input — only shown when has_password selected */}
            {passwordMode === 'has_password' && (
              <div style={{ marginTop: 16 }}>
                <input
                  type="password"
                  placeholder="Enter your PDF password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                  style={{ padding: '11px 16px', border: '1.5px solid #0E3785', borderRadius: 8, fontSize: 15, outline: 'none', width: '100%', maxWidth: 320, color: '#0D1828' }}
                />
              </div>
            )}
          </div>

          {error && <div style={{ background: '#FFF3F0', border: '1px solid #FFD0C8', borderRadius: 8, padding: '12px 16px', color: '#C0392B', fontSize: 14, marginBottom: 20 }}>⚠️ {error}</div>}

          <button onClick={handleUpload} disabled={!uploadReady || loading} style={{
            width: '100%', padding: '18px', fontSize: 17, fontWeight: 700, border: 'none', borderRadius: 10, transition: 'all 0.2s',
            background: uploadReady ? '#0E3785' : '#D6E0F5',
            color: uploadReady ? 'white' : '#5A6A85',
            cursor: uploadReady ? 'pointer' : 'not-allowed',
            boxShadow: uploadReady ? '0 6px 20px rgba(14,55,133,0.25)' : 'none'
          }}>
            {loading ? '⏳ Analysing your statement...' : uploadReady ? '🔍 Am I Using The Right Card?' : '← Select file & confirm password to continue'}
          </button>
        </div>
      )}

      {/* MANUAL PATH */}
      {mode === 'manual' && (
        <div style={{ background: 'white', borderRadius: 20, border: '1px solid #D6E0F5', padding: 40, boxShadow: '0 4px 24px rgba(14,55,133,0.08)' }}>
          <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: '1.5px solid #D6E0F5', borderRadius: 10, background: parseFloat(salary || '0') > 0 ? '#EEF3FF' : 'white' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>💰</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0D1828' }}>Your salary</div>
                <div style={{ fontSize: 12, color: '#5A6A85' }}>Monthly take-home income</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 13, color: '#5A6A85', fontWeight: 600 }}>AED</span>
                <input
                  type="number" min="0" placeholder="0"
                  value={salary}
                  onChange={e => setSalary(e.target.value)}
                  style={{ width: 80, padding: '6px 8px', border: '1.5px solid #D6E0F5', borderRadius: 6, fontSize: 14, fontWeight: 600, textAlign: 'right', outline: 'none', color: '#0E3785' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: '1.5px solid #D6E0F5', borderRadius: 10, background: 'white' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>⭐</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#0D1828', marginBottom: 6 }}>Your preference</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#0D1828', fontWeight: 600 }}>
                    <input type="radio" name="preference" checked={preference === 'cashback'} onChange={() => setPreference('cashback')} style={{ accentColor: '#0E3785', width: 16, height: 16 }} />
                    Cashback card
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'not-allowed', fontSize: 13, color: '#A8B3C7', fontWeight: 600 }}>
                    <input type="radio" name="preference" checked={false} disabled style={{ accentColor: '#A8B3C7', width: 16, height: 16, cursor: 'not-allowed' }} />
                    Miles card <span style={{ fontSize: 11, fontWeight: 600, color: '#A8B3C7', border: '1px solid #E7ECF5', borderRadius: 100, padding: '1px 8px' }}>coming soon</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Your average monthly spend in AED</h3>
            <p style={{ fontSize: 14, color: '#5A6A85' }}>Enter 0 for categories that don&apos;t apply. We&apos;ll find the best card for your exact spending pattern.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16, marginBottom: 32 }}>
            {CATEGORIES.map(cat => (
              <div key={cat.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', border: '1.5px solid #D6E0F5', borderRadius: 10, background: parseFloat(spend[cat.key] || '0') > 0 ? '#EEF3FF' : 'white', transition: 'all 0.2s' }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{cat.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0D1828' }}>{cat.label}</div>
                  <div style={{ fontSize: 12, color: '#5A6A85', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat.hint}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 13, color: '#5A6A85', fontWeight: 600 }}>AED</span>
                  <input
                    type="number" min="0" placeholder="0"
                    value={spend[cat.key] || ''}
                    onChange={e => setSpend(prev => ({ ...prev, [cat.key]: e.target.value }))}
                    style={{ width: 80, padding: '6px 8px', border: '1.5px solid #D6E0F5', borderRadius: 6, fontSize: 14, fontWeight: 600, textAlign: 'right', outline: 'none', color: '#0E3785' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div style={{ background: '#0E3785', borderRadius: 12, padding: '20px 24px', marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Total Monthly Spend</span>
            <span style={{ color: 'white', fontSize: 26, fontWeight: 800 }}>AED {totalMonthly.toLocaleString('en-AE', { maximumFractionDigits: 0 })}</span>
          </div>

          {error && <div style={{ background: '#FFF3F0', border: '1px solid #FFD0C8', borderRadius: 8, padding: '12px 16px', color: '#C0392B', fontSize: 14, marginBottom: 20 }}>⚠️ {error}</div>}

          <button onClick={handleManual} disabled={totalMonthly <= 0 || loading} style={{
            width: '100%', padding: '16px', background: totalMonthly <= 0 ? '#D6E0F5' : '#0E3785', color: totalMonthly <= 0 ? '#5A6A85' : 'white',
            border: 'none', borderRadius: 10, fontSize: 17, fontWeight: 700, cursor: totalMonthly <= 0 ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
          }}>
            {loading ? '⏳ Finding best cards...' : '🏆 Find My Best Cards →'}
          </button>
        </div>
      )}
      </>
      )}
    </div>
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
