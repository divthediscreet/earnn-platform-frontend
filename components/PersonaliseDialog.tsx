'use client'

// "Personalize these results" popup for the Compare page: the same manual spend form as Analyze (SpendEntryFields, the
// same granular categories and styles) in a dialog. It only collects the amounts; the Compare page sends them to the
// scoring engine and re-renders the same card list on that spend.
import { useEffect, useState } from 'react'
import { SPLIT_KEYS, SimulatorStyles, SpendEntryFields, computeAmounts, splitFromAmounts, type SplitState } from '@/components/wallet-simulator/spend-entry'
import { ensureProfileLoaded, patchProfile, readProfile } from '@/lib/profile/storage'

export type PersonalSpend = { amounts: Record<string, number>; salary: string }

export default function PersonaliseDialog({ current, mode, notice, onClose, onSubmit }: {
  /** The spend the list is currently personalised to (restored into the form), if any. */
  current: PersonalSpend | null
  mode: 'cashback' | 'miles'
  /** An extra line under the heading, e.g. why the spending is asked first. */
  notice?: string
  onClose: () => void
  onSubmit: (value: PersonalSpend) => void
}) {
  const [spend, setSpend] = useState<Record<string, string>>({})
  const [splits, setSplits] = useState<SplitState>(() => splitFromAmounts(undefined))
  const [salary, setSalary] = useState('')
  const [error, setError] = useState('')

  // Restore order: what is applied now, else the spend and salary saved in this browser.
  useEffect(() => {
    let alive = true
    const apply = (amounts: Record<string, number>, savedSalary?: string) => {
      setSpend(Object.fromEntries(Object.entries(amounts).filter(([k, v]) => v > 0 && !SPLIT_KEYS.has(k)).map(([k, v]) => [k, String(v)])))
      setSplits(splitFromAmounts(amounts))
      if (savedSalary) setSalary(savedSalary)
    }
    if (current) { apply(current.amounts, current.salary); return }
    ensureProfileLoaded().then(() => {
      if (!alive) return
      const saved = readProfile()
      if (saved?.spend) apply(Object.fromEntries(Object.entries(saved.spend).map(([k, v]) => [k, Number(v) || 0])), saved.salary)
      else if (saved?.salary) setSalary(saved.salary)
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const amounts = computeAmounts(spend, splits)
  const total = Object.values(amounts).reduce((a, b) => a + b, 0)

  const submit = () => {
    if (total <= 0) return setError('Enter at least one monthly amount.')
    if (!(Number(salary) > 0)) return setError('Enter your monthly salary to continue.')
    setError('')
    const cleaned = Object.fromEntries(Object.entries(amounts).filter(([, v]) => v > 0))
    // keep the details for Analyze / the other planners, as Analyze itself does
    patchProfile({ salary, spend: Object.fromEntries(Object.entries(cleaned).map(([k, v]) => [k, String(v)])), monthly_total: undefined })
    onSubmit({ amounts: cleaned, salary })
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.6)' }} />
      <section className="sim-page" role="dialog" aria-modal="true" aria-label="Personalize these results" onClick={event => event.stopPropagation()}
        style={{ position: 'relative', width: '96%', maxWidth: 1100, maxHeight: '94vh', overflowY: 'auto', borderRadius: 22, boxShadow: '0 24px 64px rgba(0,0,0,.3)', padding: '20px 22px 24px' }}>
        <button type="button" onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 14, right: 18, border: 0, background: 'none', color: '#5A6A85', fontSize: 24, cursor: 'pointer', lineHeight: 1 }}>×</button>

        <div className="sim-intro">
          <div>
            <div className="sim-eyebrow">PERSONALIZE THESE RESULTS</div>
            <h2>Tell us how you spend each month</h2>
            <p>We re-rank every {mode === 'miles' ? 'miles' : 'cashback'} card on your own spending. Enter only what applies to you.</p>
            {notice && <p style={{ marginTop: 8, padding: '8px 12px', borderRadius: 10, background: '#EEF3FF', color: '#0E3785', fontWeight: 700 }}>{notice}</p>}
          </div>
          <button type="button" className="sim-reset" style={{ marginRight: 30 }} onClick={() => { setSpend({}); setSplits(splitFromAmounts(undefined)); setError('') }}>Reset amounts</button>
        </div>

        <section className="sim-setup sim-setup-trip">
          <div className="sim-setup-heading">
            <div className="sim-eyebrow">YOUR INCOME</div>
            <p>Required: used to calculate your rewards. Cards above your salary stay visible and are marked.</p>
          </div>
          <label className="sim-salary">
            <span>Monthly salary</span>
            <div>
              <b>AED</b>
              <input type="number" inputMode="numeric" min="0" step="100" placeholder="e.g. 15,000"
                value={salary} onChange={event => setSalary(event.target.value)} aria-label="Monthly salary in AED" />
            </div>
          </label>
        </section>

        <SpendEntryFields spend={spend} setSpend={setSpend} splits={splits} setSplits={setSplits} error={error}
          cta={<button type="button" className="sim-cta" onClick={submit} disabled={total <= 0}>Show my customized result</button>} />
        <SimulatorStyles />
      </section>
    </div>
  )
}
