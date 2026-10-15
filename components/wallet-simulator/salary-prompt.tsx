'use client'

import { useEffect } from 'react'

/** Friendly pop-up shown instead of an error when someone analyses without a salary. */
export function SalaryPrompt({ salary, setSalary, onConfirm, onClose }: {
  salary: string
  setSalary: (value: string) => void
  onConfirm: (salaryAed: number) => void
  onClose: () => void
}) {
  const value = parseFloat(salary) || 0
  const ready = value > 0
  const go = () => { if (ready) onConfirm(value) }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="salary-prompt-title"
      style={{ position: 'fixed', inset: 0, zIndex: 1300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(7,17,43,0.5)', backdropFilter: 'blur(4px)' }} />
      <div onClick={e => e.stopPropagation()}
        style={{ position: 'relative', background: 'white', borderRadius: 16, padding: '32px 28px', maxWidth: 400, width: '100%', textAlign: 'center', boxShadow: '0 24px 64px rgba(0,0,0,0.25)' }}>
        <div aria-hidden style={{ fontSize: 36, marginBottom: 12 }}>🎯</div>
        <div id="salary-prompt-title" style={{ fontSize: 18, fontWeight: 800, color: '#0D1828', marginBottom: 8 }}>One quick thing</div>
        <div style={{ fontSize: 14, color: '#5A6A85', lineHeight: 1.6, marginBottom: 20 }}>
          Before we move forward, help us know your estimated monthly salary. It helps us check which cards you are eligible for.
        </div>
        <input type="number" inputMode="numeric" min="0" step="100" placeholder="Monthly salary (AED), e.g. 15,000"
          value={salary} onChange={e => setSalary(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') go() }}
          aria-label="Monthly salary in AED" autoFocus
          style={{ width: '100%', padding: '12px 16px', border: '2px solid #0E3785', borderRadius: 10, fontSize: 16, outline: 'none', color: '#0D1828', marginBottom: 16, boxSizing: 'border-box', textAlign: 'center' }} />
        <button type="button" onClick={go} disabled={!ready}
          style={{ width: '100%', padding: 13, background: ready ? '#0E3785' : '#D6E0F5', color: ready ? 'white' : '#9DAEC8', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: ready ? 'pointer' : 'not-allowed' }}>
          Analyze my expenses →
        </button>
      </div>
    </div>
  )
}
