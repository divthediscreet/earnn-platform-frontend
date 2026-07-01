'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { sendChatMessage, SessionProfile, ChatMessage as ApiChatMessage } from '@/lib/api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  role: 'user' | 'assistant'
  text: string
  cards_found?: number
}

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
  salary_aed:            null,
  is_islamic:            null,
  spend:                 {},
  merchants:             [],
  preferred_reward_type: null,
  preferred_banks:       [],
  preferred_network:     null,
  shown_card_ids:        [],
}

function mergeProfile(
  existing: SessionProfile,
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
  if (Array.isArray(extracted.shown_card_ids) && extracted.shown_card_ids.length > 0)
    merged.shown_card_ids = extracted.shown_card_ids as string[]

  return merged
}

export default function ChatPage() {
  const router = useRouter()

  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: "Hi! I'm Earnie — earnn's UAE credit card expert. Ask me anything: best card for dining, lounge access, miles, Islamic cards, fee comparisons. I know all 155+ UAE cards. 🇦🇪",
    },
  ])
  const [input, setInput]               = useState('')
  const [loading, setLoading]           = useState(false)
  const [sessionProfile, setSessionProfile] = useState<SessionProfile>(EMPTY_PROFILE)
  const [walletNudgeShown, setWalletNudgeShown] = useState(false)
  const [showWalletNudge, setShowWalletNudge]   = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // History in the API format (last 6 turns)
  const historyRef = useRef<ApiChatMessage[]>([])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, showWalletNudge])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg = text.trim()
    setInput('')

    // Add to messages display
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])

    // Build history for API (last 6 turns)
    const apiHistory = historyRef.current.slice(-6)

    setLoading(true)
    try {
      const res = await sendChatMessage(userMsg, apiHistory, sessionProfile)

      const assistantText = res.answer as string
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: assistantText,
        cards_found: res.cards_found,
      }])

      // Update history ref
      historyRef.current = [
        ...historyRef.current,
        { role: 'user',      content: userMsg },
        { role: 'assistant', content: assistantText },
      ].slice(-12) // keep last 12 messages = 6 exchanges

      // Merge extracted facts into session profile
      if (res.extracted_facts && Object.keys(res.extracted_facts).length > 0) {
        setSessionProfile(prev => {
          const updated = mergeProfile(prev, res.extracted_facts)

          // Check wallet nudge trigger: 2+ spend categories known
          if (
            !walletNudgeShown &&
            Object.keys(updated.spend).length >= 2
          ) {
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

  const handleWalletClick = () => {
    // Pre-fill analyse page with known spend values
    if (Object.keys(sessionProfile.spend).length > 0) {
      sessionStorage.setItem('prefill_spend', JSON.stringify(sessionProfile.spend))
    }
    router.push('/analyse')
  }

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
          <div
            key={i}
            style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}
          >
            <div style={{
              maxWidth: '82%',
              padding: '14px 18px',
              borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? '#0E3785' : 'white',
              color: msg.role === 'user' ? 'white' : '#0D1828',
              border: msg.role === 'assistant' ? '1px solid #D6E0F5' : 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              fontSize: 15, lineHeight: 1.7,
            }}>
              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{
                    width: 20, height: 20, background: '#0E3785', borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: 'white', fontWeight: 700,
                  }}>e</div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0E3785' }}>Earnie</span>
                  {msg.cards_found !== undefined && msg.cards_found > 0 && (
                    <span style={{ fontSize: 11, color: '#5A6A85', marginLeft: 4 }}>
                      {msg.cards_found} cards matched
                    </span>
                  )}
                </div>
              )}
              {msg.role === 'assistant' ? (
                <div className="mony-md">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      a: ({ href, children }) => {
                        const isInternal = href && href.startsWith('/')
                        return isInternal ? (
                          <a
                            href={href}
                            onClick={e => { e.preventDefault(); router.push(href) }}
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
              One card can't optimise all of them.
              Your best move is a 2–3 card wallet — earnn calculates the exact combination
              that maximises your annual return across all your spend.
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button
                onClick={handleWalletClick}
                style={{
                  padding: '10px 20px', background: '#0E3785', color: 'white',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer',
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
                  <div
                    key={j}
                    style={{
                      width: 8, height: 8, background: '#0E3785', borderRadius: '50%',
                      opacity: 0.4, animation: `bounce 1.2s ${j * 0.2}s infinite`,
                    }}
                  />
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
            color: !input.trim() ? '#5A6A85' : 'white',
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
          border-collapse: collapse;
          width: 100%;
          margin: 12px 0;
          font-size: 14px;
        }
        .mony-md th, .mony-md td {
          border: 1px solid #D6E0F5;
          padding: 8px 12px;
          text-align: left;
        }
        .mony-md th {
          background: #EEF3FF;
          font-weight: 700;
          color: #0E3785;
        }
        .mony-md tr:nth-child(even) td { background: #F9FBFF; }
        .mony-md h3 {
          font-size: 15px;
          font-weight: 700;
          color: #0E3785;
          margin: 16px 0 8px;
        }
        .mony-md ul, .mony-md ol {
          margin: 8px 0;
          padding-left: 20px;
        }
        .mony-md li { margin-bottom: 4px; line-height: 1.6; }
        .mony-md p { margin: 6px 0; }
        .mony-md strong { color: #0D1828; }
        .mony-md a { color: #0E3785; }
        .mony-md code {
          background: #EEF3FF;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 13px;
        }
        .mony-md hr { border: none; border-top: 1px solid #D6E0F5; margin: 12px 0; }
      `}</style>
    </div>
  )
}
