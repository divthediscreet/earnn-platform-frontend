'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  chatFailureMessage, sendChatMessage, submitFeedback, rateResponse,
  SessionProfile, MerchantQuery, BenefitsWanted, ChatMessage as ApiChatMessage, DiscoveryHint,
  AnswerProvenance,
} from '@/lib/api'
import { provenanceIndicator } from '@/lib/answer-provenance'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role:             'user' | 'assistant'
  text:             string
  cards_found?:     number
  turn_number?:     number
  discovery_hints?: DiscoveryHint[]
  answer_provenance?: AnswerProvenance
  feedback_token?:   string | null
  reported?:         boolean
  rating?:          1 | -1 | null
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED = [
  '🍽️ Best card for dining at restaurants (not delivery)?',
  '⚖️ Compare ENBD Noon and Mashreq Noon cards?',
  '📦 Best card to use on Amazon?',
  '✈️ Best card to use abroad with no FX fee?',
  '🛒 Which card earns most at Carrefour?',
  '🎁 Best welcome bonus card right now?',
  '🆓 Free for life cards with good rewards?',
  '💼 Card for AED 8,000 salary in UAE?',
]

const EMPTY_PROFILE: SessionProfile = {
  salary_aed:              null,
  employment_type:         null,
  is_expat:                null,
  is_new_to_uae:           null,
  is_islamic:              null,
  preferred_reward_type:   null,
  preferred_miles_program: null,
  preferred_banks:         [],
  preferred_network:       null,
  wants_free_for_life:     null,
  wants_premium:           null,
  wants_no_annual_fee:     null,
  willing_salary_transfer: null,
  spend:                   {},
  merchants:               [],
  merchant_queries:        [],
  benefits_wanted:         {
    lounge_access: null, golf: null, cinema: null,
    airport_transfer: null, travel_insurance: null,
    dining_discount: null, welcome_bonus: null, purchase_protection: null,
  },
  existing_cards:          [],
  last_categories:         [],
  last_granular_categories:[],
  last_excluded_granular:  [],
  last_merchants:          [],
  last_question_type:      null,
  last_intent:             {},
  shown_card_ids:          [],
  show_more_count:         0,
}

function genSessionId(): string {
  return Math.random().toString(36).slice(2, 14)
}

function mergeProfile(
  existing:  SessionProfile,
  extracted: Record<string, unknown>,
): SessionProfile {
  const merged = { ...existing }

  if (extracted.salary_aed != null)
    merged.salary_aed = extracted.salary_aed as number
  if (extracted.is_islamic != null)
    merged.is_islamic = extracted.is_islamic as boolean
  if (extracted.spend && typeof extracted.spend === 'object')
    merged.spend = { ...merged.spend, ...(extracted.spend as Record<string, number>) }
  if (Array.isArray(extracted.merchants) && extracted.merchants.length > 0)
    merged.merchants = [...new Set([...merged.merchants, ...extracted.merchants as string[]])]
  if (extracted.preferred_reward_type != null)
    merged.preferred_reward_type = extracted.preferred_reward_type as SessionProfile['preferred_reward_type']
  if (extracted.preferred_network != null)
    merged.preferred_network = extracted.preferred_network as string
  if (Array.isArray(extracted.preferred_banks) && extracted.preferred_banks.length > 0)
    merged.preferred_banks = [...new Set([...merged.preferred_banks, ...extracted.preferred_banks as string[]])]
  if (extracted.employment_type != null)
    merged.employment_type = extracted.employment_type as SessionProfile['employment_type']
  if (extracted.is_expat != null)
    merged.is_expat = extracted.is_expat as boolean
  if (extracted.is_new_to_uae != null)
    merged.is_new_to_uae = extracted.is_new_to_uae as boolean
  if (extracted.preferred_miles_program != null)
    merged.preferred_miles_program = extracted.preferred_miles_program as string
  if (extracted.wants_free_for_life != null)
    merged.wants_free_for_life = extracted.wants_free_for_life as boolean
  if (extracted.wants_premium != null)
    merged.wants_premium = extracted.wants_premium as boolean
  if (extracted.wants_no_annual_fee != null)
    merged.wants_no_annual_fee = extracted.wants_no_annual_fee as boolean
  if (extracted.willing_salary_transfer != null)
    merged.willing_salary_transfer = extracted.willing_salary_transfer as boolean
  if (Array.isArray(extracted.merchant_queries))
    merged.merchant_queries = extracted.merchant_queries as MerchantQuery[]
  if (extracted.benefits_wanted && typeof extracted.benefits_wanted === 'object')
    merged.benefits_wanted = { ...merged.benefits_wanted, ...(extracted.benefits_wanted as BenefitsWanted) }
  if (Array.isArray(extracted.existing_cards) && extracted.existing_cards.length > 0)
    merged.existing_cards = [...new Set([...merged.existing_cards, ...extracted.existing_cards as string[]])]
  if (Array.isArray(extracted.last_merchants))
    merged.last_merchants = extracted.last_merchants as string[]
  if (extracted.last_question_type != null)
    merged.last_question_type = extracted.last_question_type as string
  if (extracted.last_intent && typeof extracted.last_intent === 'object')
    merged.last_intent = extracted.last_intent as Record<string, unknown>
  if (Array.isArray(extracted.shown_card_ids) && extracted.shown_card_ids.length > 0)
    merged.shown_card_ids = extracted.shown_card_ids as string[]
  if (typeof extracted.show_more_count === 'number')
    merged.show_more_count = extracted.show_more_count as number
  if (Array.isArray(extracted.last_categories))
    merged.last_categories = extracted.last_categories as string[]
  if (Array.isArray(extracted.last_granular_categories))
    merged.last_granular_categories = extracted.last_granular_categories as string[]
  if (Array.isArray(extracted.last_excluded_granular))
    merged.last_excluded_granular = extracted.last_excluded_granular as string[]

  // Persist pending state so backend can process it next turn
  if ('pending_discovery' in extracted)
    (merged as Record<string, unknown>)['pending_discovery'] = extracted.pending_discovery
  if ('pending_salary_for_discovery' in extracted)
    (merged as Record<string, unknown>)['pending_salary_for_discovery'] = extracted.pending_salary_for_discovery
  if ('pending_spend_amount' in extracted)
    (merged as Record<string, unknown>)['pending_spend_amount'] = extracted.pending_spend_amount
  if ('pending_spend_category' in extracted)
    (merged as Record<string, unknown>)['pending_spend_category'] = extracted.pending_spend_category

  return merged
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ChatPage() {
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Hi! I'm Earnie. Ask me anything about UAE credit cards, from best cards for your spending to fees, cashback, lounge access and benefits.",
    },
  ])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [sessionProfile, setSessionProfile] = useState<SessionProfile>(EMPTY_PROFILE)
  const [walletNudgeShown, setWalletNudgeShown] = useState(false)
  const [showWalletNudge, setShowWalletNudge]   = useState(false)
  const [reportingIndex, setReportingIndex] = useState<number | null>(null)
  const [reportText, setReportText] = useState('')
  const [reportEmail, setReportEmail] = useState('')
  const [reportPhone, setReportPhone] = useState('')
  const [reportSaving, setReportSaving] = useState(false)
  const [reportError, setReportError] = useState('')

  const sessionIdRef  = useRef<string>(genSessionId())
  const historyRef    = useRef<ApiChatMessage[]>([])
  const bottomRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showWalletNudge])

  // ── Core send ─────────────────────────────────────────────────────────────

  const send = async (text: string, profileOverride?: Partial<SessionProfile>) => {
    if (!text.trim() || loading) return
    const userMsg = text.trim()
    setInput('')

    setMessages(prev => [...prev, { role: 'user', text: userMsg }])

    const apiHistory    = historyRef.current.slice(-6)
    const profileToSend = profileOverride
      ? { ...sessionProfile, ...profileOverride }
      : sessionProfile

    setLoading(true)
    try {
      const res = await sendChatMessage(
        userMsg, apiHistory, profileToSend, sessionIdRef.current,
      )

      // Keep session_id in sync (backend echoes it back)
      if (res.session_id) sessionIdRef.current = res.session_id

      const assistantText = res.answer
      setMessages(prev => [...prev, {
        role:             'assistant',
        text:             assistantText,
        cards_found:      res.cards_found,
        turn_number:      res.turn_number,
        discovery_hints:  res.discovery_hints?.length ? res.discovery_hints : undefined,
        answer_provenance: res.answer_provenance,
        feedback_token:   res.feedback_token,
      }])

      const nextHistory: ApiChatMessage[] = [
        ...historyRef.current,
        { role: 'user',      content: userMsg },
        { role: 'assistant', content: assistantText },
      ]
      historyRef.current = nextHistory.slice(-12)

      if (res.extracted_facts && Object.keys(res.extracted_facts).length > 0) {
        setSessionProfile(prev => {
          const updated = mergeProfile(prev, res.extracted_facts)
          if (!walletNudgeShown && Object.keys(updated.spend).length >= 2) {
            setWalletNudgeShown(true)
            setShowWalletNudge(true)
          }
          return updated
        })
      }
    } catch (err) {
      console.error('sendChatMessage failed:', err)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: chatFailureMessage(err) },
      ])
    } finally {
      setLoading(false)
    }
  }

  // ── Discovery YES / NO ────────────────────────────────────────────────────

  const handleDiscoveryYes = (hint: DiscoveryHint) => {
    // Store hint in session_profile so backend can process it
    const profileWithHint = {
      ...sessionProfile,
      pending_discovery: hint,
    } as SessionProfile & { pending_discovery: DiscoveryHint }
    setSessionProfile(profileWithHint as SessionProfile)
    send('yes', profileWithHint as SessionProfile)
  }

  const handleDiscoveryNo = (hint: DiscoveryHint) => {
    const profileWithHint = {
      ...sessionProfile,
      pending_discovery: hint,
    } as SessionProfile & { pending_discovery: DiscoveryHint }
    send('no', profileWithHint as SessionProfile)
  }

  // ── Emoji rating ──────────────────────────────────────────────────────────

  const handleRate = async (msgIndex: number, rating: 1 | -1) => {
    const msg = messages[msgIndex]
    if (!msg.turn_number) return

    // Optimistic UI update
    setMessages(prev => prev.map((m, i) =>
      i === msgIndex ? { ...m, rating } : m
    ))

    try {
      await rateResponse(sessionIdRef.current, msg.turn_number, rating)
    } catch {
      // Non-fatal — revert optimistic update
      setMessages(prev => prev.map((m, i) =>
        i === msgIndex ? { ...m, rating: null } : m
      ))
    }
  }

  // ── Wallet nudge ──────────────────────────────────────────────────────────

  const submitChatReport = async () => {
    if (reportingIndex === null || !reportText.trim() || reportSaving) return
    const message = messages[reportingIndex]
    if (!message?.feedback_token) return
    setReportSaving(true)
    setReportError('')
    try {
      await submitFeedback({
        source: 'chat_report', message: reportText, email: reportEmail, phone: reportPhone,
        page_path: '/chat', feedback_token: message.feedback_token,
      })
      setMessages(prev => prev.map((entry, index) => index === reportingIndex ? { ...entry, reported: true } : entry))
      setReportingIndex(null)
      setReportText('')
      setReportEmail('')
      setReportPhone('')
    } catch (err) {
      setReportError(err instanceof Error ? err.message : 'We could not save your report right now. Please try again.')
    } finally {
      setReportSaving(false)
    }
  }

  const handleWalletClick = () => {
    if (Object.keys(sessionProfile.spend).length > 0)
      sessionStorage.setItem('prefill_spend', JSON.stringify(sessionProfile.spend))
    router.push('/analyse')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="chat-page" style={{
      maxWidth: 860, margin: '0 auto', padding: '32px 24px',
      display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 130px)',
    }}>
      <style>{`
        @media (max-width: 640px) {
          .chat-page { padding: 20px 16px calc(16px + env(safe-area-inset-bottom)) !important; }
          .chat-page input, .chat-page textarea { font-size: 16px !important; }
          .chat-page .mony-md { overflow-wrap: anywhere; }
          .chat-page .mony-md table { display: block; max-width: 100%; overflow-x: auto; white-space: nowrap; -webkit-overflow-scrolling: touch; }
          .chat-page .chat-message-bubble { max-width: 92% !important; }
          .chat-page .chat-suggestions { gap: 7px !important; }
          .chat-page .chat-suggestions > button { white-space: normal !important; min-height: 44px; text-align: left !important; }
          .chat-page .chat-composer { min-width: 0; gap: 8px !important; }
          .chat-page .chat-input { flex: 1 1 0% !important; width: 0; min-width: 0; }
          .chat-page .chat-send-button { flex: 0 0 auto; padding: 14px 16px !important; }
          .chat-page .chat-report-contact { grid-template-columns: 1fr !important; }
        }
      `}</style>
      {/* Header */}
      <div style={{ marginBottom: 24, flexShrink: 0 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0E3785', marginBottom: 4, letterSpacing: '0.03em' }}>
          ASK EARNIE
        </h1>
        <div style={{ color: '#0D1828', fontSize: 17, fontWeight: 700, marginBottom: 4 }}>
          Your UAE Credit Card Expert
        </div>
        <p style={{ color: '#5A6A85', fontSize: 15, margin: 0 }}>
          Compare cards, understand rewards, or find the right card for how you spend.
        </p>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', display: 'flex',
        flexDirection: 'column', gap: 16, paddingBottom: 16,
      }}>
        {messages.map((msg, i) => (
          <div key={i}>
            <div style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div className="chat-message-bubble" style={{
                maxWidth: '82%',
                padding: '14px 18px',
                borderRadius: msg.role === 'user'
                  ? '18px 18px 4px 18px'
                  : '18px 18px 18px 4px',
                background: msg.role === 'user' ? '#0E3785' : 'white',
                color:      msg.role === 'user' ? 'white' : '#0D1828',
                border:     msg.role === 'assistant' ? '1px solid #D6E0F5' : 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                fontSize: 15, lineHeight: 1.7,
              }}>
                {/* Earnie badge */}
                {msg.role === 'assistant' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <div style={{
                      width: 20, height: 20, background: '#0E3785', borderRadius: 4,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, color: 'white', fontWeight: 700,
                    }}>e</div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0E3785' }}>Earnie 👋</span>
                    {msg.answer_provenance && (
                      <span
                        aria-label={provenanceIndicator(msg.answer_provenance).label}
                        title={provenanceIndicator(msg.answer_provenance).label}
                        style={{
                          width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                          background: provenanceIndicator(msg.answer_provenance).color,
                        }}
                      />
                    )}
                    {(msg.cards_found ?? 0) > 0 && (
                      <span style={{ fontSize: 11, color: '#5A6A85', marginLeft: 4 }}>
                        {msg.cards_found} cards matched
                      </span>
                    )}
                  </div>
                )}

                {/* Message body */}
                {msg.role === 'assistant' ? (
                  <div className="mony-md">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        a: ({ href, children }) => {
                          const isInternal = href?.startsWith('/')
                          return isInternal ? (
                            <a
                              href={href}
                              onClick={e => { e.preventDefault(); router.push(href!) }}
                              style={{ color: '#0E3785', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer' }}
                            >{children}</a>
                          ) : (
                            <a href={href} target="_blank" rel="noopener noreferrer"
                              style={{ color: '#0E3785', fontWeight: 600, textDecoration: 'underline' }}
                            >{children}</a>
                          )
                        }
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <span style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</span>
                )}
              </div>
            </div>

            {/* ── Discovery hints — YES / NO buttons ── */}
            {msg.role === 'assistant' && msg.discovery_hints?.map((hint, hi) => (
              <div
                key={hi}
                style={{
                  maxWidth: '82%',
                  marginTop: 8,
                  padding: '14px 16px',
                  background: '#F5F8FF',
                  border: '1px dashed #B8CCFF',
                  borderRadius: 12,
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: '#0D1828',
                }}
              >
                <div style={{ marginBottom: 10 }}>{hint.message}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => handleDiscoveryYes(hint)}
                    disabled={loading}
                    style={{
                      padding: '7px 18px', background: '#0E3785', color: 'white',
                      border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Yes, show me!
                  </button>
                  <button
                    onClick={() => handleDiscoveryNo(hint)}
                    disabled={loading}
                    style={{
                      padding: '7px 14px', background: 'transparent', color: '#5A6A85',
                      border: '1px solid #D6E0F5', borderRadius: 8, fontSize: 13,
                      cursor: loading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    No thanks
                  </button>
                </div>
              </div>
            ))}

            {/* ── Emoji rating — only on assistant turns that have a turn_number ── */}
            {false && msg.role === 'assistant' && msg.turn_number !== undefined && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                marginTop: 4, marginLeft: 2,
              }}>
                <span style={{ fontSize: 11, color: '#8A9AB8' }}>Was this helpful?</span>

                {/* Happy 😊 */}
                <button
                  onClick={() => msg.rating === 1 ? undefined : handleRate(i, 1)}
                  title="This helped!"
                  style={{
                    background:  msg.rating === 1 ? '#E8F5E9' : 'transparent',
                    border:      msg.rating === 1 ? '1.5px solid #4CAF50' : '1.5px solid #D6E0F5',
                    borderRadius: 8,
                    padding:     '2px 8px',
                    fontSize:    18,
                    cursor:      msg.rating != null ? 'default' : 'pointer',
                    lineHeight:  1.4,
                    transition:  'all 0.15s',
                  }}
                >
                  😊
                </button>

                {/* Confused 🤔 */}
                <button
                  onClick={() => msg.rating === -1 ? undefined : handleRate(i, -1)}
                  title="Didn't quite answer my question"
                  style={{
                    background:  msg.rating === -1 ? '#FFF8E1' : 'transparent',
                    border:      msg.rating === -1 ? '1.5px solid #FFA726' : '1.5px solid #D6E0F5',
                    borderRadius: 8,
                    padding:     '2px 8px',
                    fontSize:    18,
                    cursor:      msg.rating != null ? 'default' : 'pointer',
                    lineHeight:  1.4,
                    transition:  'all 0.15s',
                  }}
                >
                  🤔
                </button>

                {msg.rating === 1 && (
                  <span style={{ fontSize: 11, color: '#4CAF50' }}>Thanks! 🙌</span>
                )}
                {msg.rating === -1 && (
                  <span style={{ fontSize: 11, color: '#FFA726' }}>Got it — we'll do better.</span>
                )}
              </div>
            )}

            {msg.role === 'assistant' && msg.feedback_token && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7, marginLeft: 2 }}>
                {msg.reported ? (
                  <span style={{ color: '#00856A', fontSize: 12, fontWeight: 600 }}>Report sent — thank you.</span>
                ) : (
                  <>
                    <span style={{ color: '#697A99', fontSize: 12 }}>Not satisfied? Help us improve</span>
                    <button
                      onClick={() => { setReportingIndex(i); setReportError('') }}
                      style={{ border: '1px solid #D6E0F5', background: 'white', color: '#0E3785', borderRadius: 7, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
                    >
                      Report
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Suggested questions — shown beneath Earnie's initial greeting */}
        {messages.length === 1 && (
          <div className="chat-suggestions" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0, width: '100%' }}>
            {SUGGESTED.map(q => (
              <button
                key={q}
                onClick={() => send(q)}
                style={{
                padding: '8px 12px', background: '#EEF3FF',
                border: '1px solid #D6E0F5', borderRadius: 100,
                fontSize: 12.5, fontWeight: 500, color: '#0E3785', cursor: 'pointer',
                textAlign: 'center', flex: '0 1 auto', maxWidth: '100%', whiteSpace: 'nowrap',
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Wallet nudge banner */}
        {showWalletNudge && (
          <div style={{
            background: '#EEF3FF', border: '1.5px solid #0E3785',
            borderRadius: 14, padding: '16px 20px',
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ fontWeight: 700, color: '#0E3785', fontSize: 15 }}>
              📊 You're spending across multiple categories
            </div>
            <div style={{ color: '#0D1828', fontSize: 14, lineHeight: 1.6 }}>
              One card can't optimise all of them. Your best move is a 2–3 card wallet —
              earnn calculates the exact combination that maximises your annual return.
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={handleWalletClick}
                style={{
                  padding: '10px 20px', background: '#0E3785', color: 'white',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                }}
              >
                Run your wallet analysis →
              </button>
              <button
                onClick={() => setShowWalletNudge(false)}
                style={{
                  padding: '10px 16px', background: 'transparent', color: '#5A6A85',
                  border: '1px solid #D6E0F5', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '14px 18px', background: 'white',
              borderRadius: '18px 18px 18px 4px',
              border: '1px solid #D6E0F5', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(j => (
                  <div key={j} style={{
                    width: 8, height: 8, background: '#0E3785', borderRadius: '50%',
                    opacity: 0.4, animation: `bounce 1.2s ${j * 0.2}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="chat-composer" style={{
        flexShrink: 0, display: 'flex', gap: 12,
        paddingTop: 16, borderTop: '1px solid #D6E0F5',
      }}>
        <input className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
          placeholder="Ask about any UAE credit card..."
          style={{
            flex: 1, padding: '14px 18px',
            border: '1.5px solid #D6E0F5', borderRadius: 12,
            fontSize: 15, outline: 'none', color: '#0D1828',
          }}
        />
        <button className="chat-send-button"
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          style={{
            padding: '14px 24px',
            background: !input.trim() ? '#D6E0F5' : '#0E3785',
            color: !input.trim() ? '#5A6A85' : 'white',
            border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
            cursor: !input.trim() ? 'not-allowed' : 'pointer', flexShrink: 0,
          }}
        >
          Send →
        </button>
      </div>

      {reportingIndex !== null && (
        <div role="dialog" aria-modal="true" aria-label="Report chat answer" onClick={() => !reportSaving && setReportingIndex(null)} style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(13,24,40,0.55)', display: 'grid', placeItems: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: 'min(460px, 100%)', background: 'white', borderRadius: 16, padding: 22, boxShadow: '0 18px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start' }}>
              <div><h2 style={{ margin: 0, color: '#0D1828', fontSize: 20 }}>Help us improve</h2><p style={{ margin: '5px 0 16px', color: '#5A6A85', fontSize: 13 }}>Tell us what was wrong or what you expected instead.</p></div>
              <button onClick={() => setReportingIndex(null)} disabled={reportSaving} aria-label="Close report" style={{ border: 'none', background: 'transparent', color: '#5A6A85', fontSize: 24, cursor: 'pointer' }}>×</button>
            </div>
            <textarea autoFocus value={reportText} onChange={e => setReportText(e.target.value)} rows={5} placeholder="Describe the issue…" style={{ width: '100%', padding: '11px 12px', border: '1.5px solid #D6E0F5', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' }} />
            <div className="chat-report-contact" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              <input value={reportEmail} onChange={e => setReportEmail(e.target.value)} type="email" placeholder="Email (optional)" style={{ minWidth: 0, padding: '10px 11px', border: '1.5px solid #D6E0F5', borderRadius: 9, fontSize: 13 }} />
              <input value={reportPhone} onChange={e => setReportPhone(e.target.value)} type="tel" placeholder="Phone (optional)" style={{ minWidth: 0, padding: '10px 11px', border: '1.5px solid #D6E0F5', borderRadius: 9, fontSize: 13 }} />
            </div>
            {reportError && <div role="alert" style={{ color: '#C0392B', fontSize: 12, marginTop: 9 }}>{reportError}</div>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 16 }}>
              <button onClick={() => setReportingIndex(null)} disabled={reportSaving} style={{ padding: '10px 14px', border: '1px solid #D6E0F5', borderRadius: 9, background: 'white', color: '#5A6A85', cursor: 'pointer' }}>Cancel</button>
              <button onClick={submitChatReport} disabled={reportSaving || !reportText.trim()} style={{ padding: '10px 16px', border: 'none', borderRadius: 9, background: reportSaving || !reportText.trim() ? '#C2CCDD' : '#0E3785', color: 'white', fontWeight: 700, cursor: reportSaving || !reportText.trim() ? 'not-allowed' : 'pointer' }}>{reportSaving ? 'Sending…' : 'Send report'}</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%,80%,100% { transform: scale(0) }
          40% { transform: scale(1); opacity: 1 }
        }
        .mony-md table {
          border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 14px;
        }
        .mony-md th, .mony-md td {
          border: 1px solid #D6E0F5; padding: 8px 12px; text-align: left;
        }
        .mony-md th { background: #EEF3FF; font-weight: 700; color: #0E3785; }
        .mony-md tr:nth-child(even) td { background: #F9FBFF; }
        .mony-md h3 {
          font-size: 15px; font-weight: 700; color: #0E3785; margin: 16px 0 8px;
        }
        .mony-md ul, .mony-md ol { margin: 8px 0; padding-left: 20px; }
        .mony-md li { margin-bottom: 4px; line-height: 1.6; }
        .mony-md p { margin: 6px 0; }
        .mony-md strong { color: #0D1828; }
        .mony-md a { color: #0E3785; }
        .mony-md code {
          background: #EEF3FF; padding: 2px 6px; border-radius: 4px; font-size: 13px;
        }
        .mony-md hr { border: none; border-top: 1px solid #D6E0F5; margin: 12px 0; }
      `}</style>
    </div>
  )
}
