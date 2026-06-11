'use client'
import { useState } from 'react'

export default function FeedbackWidget() {
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)

  const submit = () => {
    if (!text.trim() && rating === null) return
    // MVP: no backend endpoint yet — just acknowledge locally.
    // TODO: wire to POST /api/feedback once available.
    setSent(true)
    setTimeout(() => {
      setOpen(false)
      setSent(false)
      setRating(null)
      setText('')
    }, 1800)
  }

  return (
    <>
      {/* Floating button + label */}
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <button onClick={() => setOpen(o => !o)} style={{
          width: 60, height: 60, borderRadius: '50%', border: 'none', cursor: 'pointer',
          background: '#0E3785', color: 'white', fontSize: 24,
          boxShadow: '0 8px 32px rgba(14,55,133,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s', transform: open ? 'rotate(45deg)' : 'none'
        }}>
          {open ? '✕' : '💡'}
        </button>
        {!open && (
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0E3785', background: 'white', padding: '4px 10px', borderRadius: 100, boxShadow: '0 2px 10px rgba(14,55,133,0.15)', whiteSpace: 'nowrap' }}>
            Feedback Please
          </span>
        )}
      </div>

      {/* Feedback panel */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 104, right: 28, zIndex: 999,
          width: 340, background: 'white',
          borderRadius: 20, boxShadow: '0 16px 60px rgba(14,55,133,0.2)',
          border: '1px solid #D6E0F5', overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{ background: '#0E3785', padding: '16px 20px', color: 'white', position: 'relative' }}>
            <button onClick={() => setOpen(false)} aria-label="Close feedback" style={{
              position: 'absolute', top: 12, right: 14, background: 'rgba(255,255,255,0.12)', border: 'none',
              color: 'white', width: 26, height: 26, borderRadius: '50%', cursor: 'pointer', fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>✕</button>
            <div style={{ fontWeight: 700, fontSize: 16, paddingRight: 28 }}>💡 Help us improve earnn</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 2, paddingRight: 28 }}>We're in early access — your feedback shapes what we build next.</div>
          </div>

          <div style={{ padding: 20 }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '24px 8px' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🙏</div>
                <div style={{ fontWeight: 700, color: '#0D1828', marginBottom: 4 }}>Thank you!</div>
                <div style={{ fontSize: 13, color: '#5A6A85' }}>Your feedback has been noted.</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0D1828', marginBottom: 10 }}>How's your experience so far?</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  {['😞', '😐', '🙂', '😄', '🤩'].map((emoji, i) => (
                    <button key={i} onClick={() => setRating(i)} style={{
                      flex: 1, padding: '8px 0', borderRadius: 10, cursor: 'pointer', fontSize: 20,
                      border: rating === i ? '2px solid #0E3785' : '1.5px solid #D6E0F5',
                      background: rating === i ? '#EEF3FF' : 'white',
                      transition: 'all 0.15s'
                    }}>{emoji}</button>
                  ))}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#0D1828', marginBottom: 8 }}>What should we fix or build next?</div>
                <textarea value={text} onChange={e => setText(e.target.value)}
                  placeholder="Tell us what's working, what's confusing, or what you wish earnn could do..."
                  rows={4}
                  style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #D6E0F5', borderRadius: 10, fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', marginBottom: 14 }} />
                <button onClick={submit} disabled={!text.trim() && rating === null} style={{
                  width: '100%', padding: '11px 0', background: (!text.trim() && rating === null) ? '#C2CCDD' : '#0E3785',
                  color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  cursor: (!text.trim() && rating === null) ? 'not-allowed' : 'pointer'
                }}>Send Feedback →</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
