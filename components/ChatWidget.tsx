'use client'
import { useState, useRef, useEffect } from 'react'
import { AnswerProvenance, chatFailureMessage, sendChatMessage } from '@/lib/api'
import { provenanceIndicator } from '@/lib/answer-provenance'

interface Message {
  role: 'user' | 'assistant'
  text: string
  answer_provenance?: AnswerProvenance
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', text: "Hi! I'm Earnie — earnn's UAE credit card expert. Ask me anything about UAE credit cards. Which card gives the best rewards for dining? Which has the best lounge access? Which suits your salary? I know them all. 🇦🇪" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])

  const send = async (text: string) => {
    if (!text.trim() || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text: text.trim() }])
    setLoading(true)
    try {
      const res = await sendChatMessage(text.trim())
      setMessages(prev => [...prev, {
        role: 'assistant', text: res.answer, answer_provenance: res.answer_provenance,
      }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: chatFailureMessage(error) }])
    } finally { setLoading(false) }
  }

  return (
    <>
      {/* Floating button */}
      <button onClick={() => setOpen(o => !o)} style={{
        position: 'fixed', bottom: 28, right: 28, zIndex: 1000,
        width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: '#0E3785', color: 'white', fontSize: 26,
        boxShadow: '0 8px 32px rgba(14,55,133,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none'
      }}>
        {open ? '✕' : '💬'}
      </button>

      {/* Chat panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 104, right: 28, zIndex: 999,
          width: 360, height: 500, background: 'white',
          borderRadius: 20, boxShadow: '0 16px 60px rgba(14,55,133,0.2)',
          border: '1px solid #D6E0F5', display: 'flex', flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ background: '#0E3785', padding: '16px 20px', color: 'white' }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>💬 Ask Earnie</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2 }}>UAE credit card expert · 155+ cards</div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '10px 14px', fontSize: 13, lineHeight: 1.6,
                  borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: m.role === 'user' ? '#0E3785' : '#F8FAFF',
                  color: m.role === 'user' ? 'white' : '#0D1828',
                  border: m.role === 'assistant' ? '1px solid #D6E0F5' : 'none',
                  whiteSpace: 'pre-wrap'
                }}>
                  {m.role === 'assistant' && m.answer_provenance && (
                    <span
                      aria-label={provenanceIndicator(m.answer_provenance).label}
                      title={provenanceIndicator(m.answer_provenance).label}
                      style={{
                        width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                        marginRight: 6, background: provenanceIndicator(m.answer_provenance).color,
                      }}
                    />
                  )}
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: '#F8FAFF', borderRadius: '14px 14px 14px 4px', width: 'fit-content', border: '1px solid #D6E0F5' }}>
                {[0,1,2].map(j => <div key={j} style={{ width: 6, height: 6, borderRadius: '50%', background: '#0E3785', opacity: 0.4, animation: `bounce 1.2s ${j*0.2}s infinite` }} />)}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid #D6E0F5', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)}
              placeholder="Ask about any UAE card..." style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #D6E0F5', borderRadius: 8, fontSize: 13, outline: 'none' }} />
            <button onClick={() => send(input)} disabled={!input.trim() || loading} style={{
              padding: '9px 14px', background: '#0E3785', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer'
            }}>→</button>
          </div>
        </div>
      )}
      <style>{`@keyframes bounce{0%,80%,100%{transform:scale(0)}40%{transform:scale(1);opacity:1}}`}</style>
    </>
  )
}
