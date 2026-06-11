'use client'
import { useState, useRef, useEffect } from 'react'
import { sendChatMessage } from '@/lib/api'

interface Message { role: 'user' | 'assistant'; text: string; cards_found?: number }

const SUGGESTED = [
  'Best card for dining in Dubai?',
  'Which cards give lounge access?',
  'Best cashback card with no annual fee?',
  'I earn AED 15,000 — what card suits me?',
  'Compare ENBD Skywards vs FAB Cashback',
  'Best miles card for Emirates flights?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: "Hi! I'm Mony — an AI brain of earnn. Ask me anything about UAE credit cards. Which card gives the best rewards for dining? Which has the best lounge access? Which suits your salary? I know them all. 🇦🇪" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg = text.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: userMsg }])
    setLoading(true)
    try {
      const res = await sendChatMessage(userMsg)
      setMessages(prev => [...prev, { role: 'assistant', text: res.answer, cards_found: res.cards_found }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: "Sorry, I'm having trouble connecting. Please try again." }])
    } finally { setLoading(false) }
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 24, flexShrink: 0 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, color: '#0E3785', marginBottom: 4 }}>Ask earnn</h1>
        <p style={{ color: '#5A6A85', fontSize: 15 }}>AI-powered UAE credit card expert · 155+ cards · Real-time database</p>
      </div>

      {/* Suggested questions — only show at start */}
      {messages.length === 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20, flexShrink: 0 }}>
          {SUGGESTED.map(q => (
            <button key={q} onClick={() => send(q)} style={{
              padding: '8px 14px', background: '#EEF3FF', border: '1px solid #D6E0F5',
              borderRadius: 100, fontSize: 13, fontWeight: 500, color: '#0E3785', cursor: 'pointer'
            }}>{q}</button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 16 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '14px 18px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? '#0E3785' : 'white',
              color: msg.role === 'user' ? 'white' : '#0D1828',
              border: msg.role === 'assistant' ? '1px solid #D6E0F5' : 'none',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              fontSize: 15, lineHeight: 1.7,
              whiteSpace: 'pre-wrap'
            }}>
              {msg.role === 'assistant' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 20, height: 20, background: '#0E3785', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'white', fontWeight: 700 }}>e</div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#0E3785' }}>earnn</span>
                  {msg.cards_found !== undefined && msg.cards_found > 0 && (
                    <span style={{ fontSize: 11, color: '#5A6A85', marginLeft: 4 }}>{msg.cards_found} cards matched</span>
                  )}
                </div>
              )}
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '14px 18px', background: 'white', borderRadius: '18px 18px 18px 4px', border: '1px solid #D6E0F5', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {[0, 1, 2].map(j => (
                  <div key={j} style={{ width: 8, height: 8, background: '#0E3785', borderRadius: '50%', opacity: 0.4, animation: `bounce 1.2s ${j * 0.2}s infinite` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 12, paddingTop: 16, borderTop: '1px solid #D6E0F5' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
          placeholder="Ask about any UAE credit card..."
          style={{ flex: 1, padding: '14px 18px', border: '1.5px solid #D6E0F5', borderRadius: 12, fontSize: 15, outline: 'none', color: '#0D1828' }}
        />
        <button onClick={() => send(input)} disabled={!input.trim() || loading} style={{
          padding: '14px 24px', background: !input.trim() ? '#D6E0F5' : '#0E3785', color: !input.trim() ? '#5A6A85' : 'white',
          border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: !input.trim() ? 'not-allowed' : 'pointer', flexShrink: 0
        }}>
          Send →
        </button>
      </div>

      <style>{`@keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1); opacity:1} }`}</style>
    </div>
  )
}
