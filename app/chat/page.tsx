'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  sendChatMessage, rateResponse,
  SessionProfile, MerchantQuery, BenefitsWanted, ChatMessage as ApiChatMessage, DiscoveryHint,
} from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role:             'user' | 'assistant'
  text:             string
  cards_found?:     number
  turn_number?:     number
  discovery_hints?: DiscoveryHint[]
  rating?:          1 | -1 | null   // null = not yet rated
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED = [
  'Best card for dining at restaurants (not delivery)?',
  'Which cards earn Emirates Skywards miles?',
  'Free for life cards with good rewards?',
  'Best card to use abroad with no FX fee?',
  'Card for AED 8,000 salary in UAE?',
  'Which card earns most at Carrefour?',
  'Best welcome bonus card right now?',
  'Islamic card with dining rewards?',
  'Best card combo — 2-card wallet?',
  'Compare FAB Miles vs ENBD Skywards',
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
      text: "Hi! I'm Earnie — earnn's UAE credit card expert. Ask me anything: best card for dining, lounge access, miles, Islamic cards, fee comparisons. I know all 155+ UAE cards. 🇦🇪",
    },
  ])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [sessionProfile, setSessionProfile] = useState<SessionProfile>(EMPTY_PROFILE)
  const [walletNudgeShown, setWalletNudgeShown] = useState(false)
  const [showWalletNudge, setShowWalletNudge]   = useState(false)

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
        rating:           null,
      }])

      historyRef.current = [
        ...historyRef.current,
        { role: 'user',      content: userMsg },
        { role: 'assistant', content: assistantText },
      ].slice(-12)

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
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', text: "Sorry, I'm having trouble connecting. Please try again." },
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

  const handleWalletClick = () => {
    if (Object.keys(sessionProfile.spend).length > 0)
      sessionStorage.setItem('prefill_spend', JSON.stringify(sessionProfile.spend))
    router.push('/analyse')
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      maxWidth: 860, margin: '0 auto', padding: '32px 24px',
      display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 24, flexShrink: 0 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0E3785', marginBottom: 4 }}>
          Ask Earnie
        </h1>
        <p style={{ color: '#5A6A85', fontSize: 15 }}>
          AI-powered UAE credit card expert · 155+ cards · Real-time database
        </p>
      </div>

      {/* Suggested questions — only at start */}
      {messages.length === 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, flexShrink: 0 }}>
          {SUGGESTED.map(q => (
            <button
              key={q}
              onClick={() => send(q)}
              style={{
                padding: '8px 14px', background: '#EEF3FF',
                border: '1px solid #D6E0F5', borderRadius: 100,
                fontSize: 13, fontWeight: 500, color: '#0E3785', cursor: 'pointer',
              }}
            >
              {q}
            </button>
          ))}
        </div>
      )}

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
              <div style={{
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
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0E3785' }}>Earnie</span>
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
            {msg.role === 'assistant' && msg.turn_number !== undefined && (
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
          </div>
        ))}

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
      <div style={{
        flexShrink: 0, display: 'flex', gap: 12,
        paddingTop: 16, borderTop: '1px solid #D6E0F5',
      }}>
        <input
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
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          style={{
            padding: '14px 24px',
            background: !input.trim() ? '#D6E0F5' : '#0E3785',
            color:      !input.trim() ? '#5A6A85' : 'white',
            border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700,
            cursor: !input.trim() ? 'not-allowed' : 'pointer', flexShrink: 0,
          }}
        >
          Send →
        </button>
      </div>

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
