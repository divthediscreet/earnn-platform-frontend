'use client'

/* eslint-disable @next/next/no-img-element */
// Trip Planner input form: 1 regular monthly spend (Analyse groups) -> 2 big payments (Max Miles rows). Cards held are chosen on the results page.
// Step 1 is the Analyse spend form itself (shared component); the payment rows reuse the Max Miles styling.
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BulkPaymentSchedule, BulkSpendTopic } from '@/lib/bulk-spend-miles/api'
import { getBulkSpendTopics } from '@/lib/bulk-spend-miles/api'
import { topicName } from '@/components/bulk-spend-miles/BulkResultView'
import { SPLIT_KEYS, SimulatorStyles, SpendEntryFields, computeAmounts, splitFromAmounts, type SplitState } from '@/components/wallet-simulator/spend-entry'
import { ensureProfileLoaded, patchProfile, readProfile } from '@/lib/profile/storage'
import { saveFromWallet } from '@/lib/trip-planner/session'
import { useSavedProfile } from '@/lib/profile/useSavedProfile'
import SnapshotHold from '@/components/profile/SnapshotHold'
import styles from '../bulk-spend/page.module.css'
import formStyles from '../bulk-spend/compact-spend-form.module.css'
import tp from './trip-planner.module.css'
import lp from './landing.module.css'

const MONTHS = [
  ['Jan', 1], ['Feb', 2], ['Mar', 3], ['Apr', 4], ['May', 5], ['Jun', 6],
  ['Jul', 7], ['Aug', 8], ['Sep', 9], ['Oct', 10], ['Nov', 11], ['Dec', 12],
] as const

const STEPS = ['Monthly Spending', 'Upcoming Expenses'] as const

function blankRow(topics: BulkSpendTopic[]): BulkPaymentSchedule {
  return { topic_code: topics[0]?.topic_code ?? '', amount_aed: 0, due_months: [] }
}

export default function TripPlannerPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [spend, setSpend] = useState<Record<string, string>>({})
  const [splits, setSplits] = useState<SplitState>(() => splitFromAmounts(undefined))
  const [salary, setSalary] = useState('')
  const [topics, setTopics] = useState<BulkSpendTopic[]>([])
  const [topicsLoading, setTopicsLoading] = useState(true)
  const [topicsError, setTopicsError] = useState('')
  const [payments, setPayments] = useState<BulkPaymentSchedule[]>([blankRow([])])
  const [error, setError] = useState('')

  // Everything the user entered lives in the shared profile; this page only reads and updates it.
  const [profileReady, setProfileReady] = useState(false)
  const saved = useSavedProfile()
  const [snapshotOpen, setSnapshotOpen] = useState(false)
  // Opened from the Smart Wallet result ("Turn your everyday spend into a flight ticket"): the spend and salary come from
  // that result (saved to the profile just before), the user lands on step 2, and Back returns to the result.
  const [fromResult, setFromResult] = useState(false)
  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const opened = query.get('from') === 'result'
    const editing = query.get('edit') === '1'
    // The results page remembers the wallet route; "Edit spending" (?edit=1) keeps it, any other way in clears it.
    if (opened || editing) setTimeout(() => document.getElementById('plan')?.scrollIntoView(), 0)
    if (opened) saveFromWallet(true)
    else if (!editing) saveFromWallet(false)
    if (opened) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFromResult(true)
    }
    let alive = true
    ensureProfileLoaded().then(() => {
      if (!alive) return
      const profile = readProfile()
      if (profile?.spend) {
        setSpend(Object.fromEntries(Object.entries(profile.spend).filter(([key, value]) => Number(value) > 0 && !SPLIT_KEYS.has(key))))
        setSplits(splitFromAmounts(Object.fromEntries(Object.entries(profile.spend).map(([key, value]) => [key, Number(value) || 0]))))
      }
      if (profile?.salary) setSalary(profile.salary)
      if (profile?.payments?.length) setPayments(profile.payments)
      // Spend and salary already saved: go straight to the upcoming expenses (not when the user came to edit them).
      // A result read from a statement saves nothing, so the page then starts at step 1 and asks.
      const hasSpend = Object.values(profile?.spend ?? {}).some(value => Number(value) > 0)
      if (!editing && hasSpend && Number(profile?.salary) > 0) { setStep(1); if (!opened) setSnapshotOpen(true) }
      setProfileReady(true)
    })
    return () => { alive = false }
  }, [])

  // The payment categories come from the Max Miles topic list. If that call fails the step shows its own message and a Retry
  // button (it must not block the rest of the form), and the controls come back as soon as the list arrives.
  const loadTopics = useCallback(() => {
    setTopicsLoading(true)
    setTopicsError('')
    return getBulkSpendTopics()
      .then(response => {
        setTopics(response.topics)
        setPayments(rows => rows.map(row => row.topic_code ? row : { ...row, topic_code: response.topics[0]?.topic_code ?? '' }))
      })
      .catch(reason => setTopicsError(reason instanceof Error ? reason.message : 'We could not load the payment categories right now.'))
      .finally(() => setTopicsLoading(false))
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTopics()
  }, [loadTopics])

  const amounts = computeAmounts(spend, splits)
  const amountsKey = JSON.stringify(amounts)
  const paymentsKey = JSON.stringify(payments.filter(row => Number(row.amount_aed) > 0 && row.due_months.length > 0))
  useEffect(() => {
    if (!profileReady) return
    const timer = setTimeout(() => patchProfile({
      salary,
      spend: Object.fromEntries(Object.entries(amounts).filter(([, v]) => v > 0).map(([k, v]) => [k, String(v)])),
      monthly_total: undefined,
      payments: JSON.parse(paymentsKey),
    }), 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileReady, salary, amountsKey, paymentsKey])
  const monthlyTotal = Object.values(amounts).reduce((sum, value) => sum + value, 0)
  const updatePayment = (index: number, update: Partial<BulkPaymentSchedule>) => {
    setPayments(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...update } : row))
  }
  const toggleMonth = (index: number, month: number) => {
    const row = payments[index]
    updatePayment(index, { due_months: row.due_months.includes(month) ? row.due_months.filter(value => value !== month) : [...row.due_months, month].sort((a, b) => a - b) })
  }
  const paymentProblem = () => payments.some(row => (Number(row.amount_aed) > 0 && !row.due_months.length) || (Number(row.amount_aed) <= 0 && row.due_months.length))
  const validPayments = () => payments.filter(row => Number(row.amount_aed) > 0 && row.due_months.length > 0)

  const next = () => {
    if (step === 0 && Number(salary) <= 0) return setError('Enter your monthly salary so we only show cards you can apply for.')
    if (step === 1 && paymentProblem()) return setError('Each expense needs both an amount and at least one month.')
    if (step === 1 && validPayments().some(row => !row.topic_code)) return setError('Choose a category for every big payment.')
    setError('')
    setStep(step + 1)
  }

  // Everything is checked here; returns the step to send the user back to when something is missing.
  const validate = () => {
    if (monthlyTotal <= 0 && !validPayments().length) return { step: 0, message: 'Enter your monthly spending or at least one upcoming expense.' }
    if (Number(salary) <= 0) return { step: 0, message: 'Enter your monthly salary so we only show cards you can apply for.' }
    if (paymentProblem()) return { step: 1, message: 'Each expense needs both an amount and at least one month.' }
    return null
  }

  const go = () => {
    setError('')
    // The results page builds its request from the shared profile, so save now rather than wait for the delayed auto-save.
    patchProfile({
      salary,
      spend: Object.fromEntries(Object.entries(amounts).filter(([, v]) => v > 0).map(([k, v]) => [k, String(v)])),
      monthly_total: undefined,
      payments: validPayments(),
    })
    router.push('/trip-planner/results')
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (step < STEPS.length - 1) return next() // Enter inside an earlier step moves on; it never skips ahead
    const problem = validate()
    if (problem) {
      setStep(problem.step)
      return setError(problem.message)
    }
    go()
  }

  if (snapshotOpen) return <SnapshotHold profile={saved} title="Getting your trip ready" subtitle="Planning your flights on the spending below" onDone={() => setSnapshotOpen(false)} />

  return <div className={styles.page}>
    <section className={lp.landing}>
      <div className={lp.hero}>
        <div className={lp.heroText}>
          <span className={lp.kicker}>FLY BETTER WITH EARNN</span>
          <h1>Business Class Is Closer <em>Than You Think.</em></h1>
          <p>Your everyday spending could unlock extraordinary journeys. Discover what’s possible with the right credit cards.</p>
          <a href="#plan" className={lp.cta} onClick={event => { event.preventDefault(); document.getElementById('plan')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}>Explore My Travel Possibilities <i className="ti ti-arrow-down" aria-hidden="true" /></a>
          <small className={lp.note}>Takes about two minutes. Estimates are fine.</small>
        </div>

        <ol className={lp.journey} aria-label="How it works">
          <svg className={lp.trail} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M 72 14 C 100 24, 100 34, 62 42 S 6 58, 36 70 S 96 82, 62 92" vectorEffect="non-scaling-stroke" />
          </svg>
          <i className={`ti ti-plane ${lp.plane}`} aria-hidden="true" />

          <li className={`${lp.stop} ${lp.stopA}`}>
            <div className={lp.photo}>
              <img src="/images/home/journey-spend-324.webp" alt="" loading="lazy" />
              <span className={lp.chip} style={{ left: 12, top: 12 }}><i className="ti ti-coffee" /> Dining</span>
              <span className={lp.chip} style={{ right: 12, top: 40 }}><i className="ti ti-shopping-cart" /> Groceries</span>
              <span className={lp.chip} style={{ left: 28, bottom: 12 }}><i className="ti ti-gas-station" /> Fuel</span>
            </div>
            <div className={lp.body}><span className={lp.num}>1</span><div><h2>Tell Us Your Spending</h2><p>Share how much you spend each month.</p></div></div>
          </li>

          <li className={`${lp.stop} ${lp.stopB}`}>
            <div className={`${lp.photo} ${lp.collage}`}>
              <figure><img src="/trip-planner/destinations/business-class/maldives.webp" alt="" loading="lazy" /><figcaption>Maldives</figcaption></figure>
              <figure><img src="/trip-planner/destinations/business-class/london.webp" alt="" loading="lazy" /><figcaption>London</figcaption></figure>
              <figure><img src="/trip-planner/destinations/business-class/japan.webp" alt="" loading="lazy" /><figcaption>Tokyo</figcaption></figure>
            </div>
            <div className={lp.body}><span className={lp.num}>2</span><div><h2>Discover Your Destinations</h2><p>See where your spending could take you.</p></div></div>
          </li>

          <li className={`${lp.stop} ${lp.stopC}`}>
            <div className={lp.photo}>
              <img src="/images/home/outcome-flight-cabin.webp" alt="" loading="lazy" />
              <span className={lp.gold}><i className="ti ti-diamond" /> Business Class</span>
            </div>
            <div className={lp.body}><span className={lp.num}>3</span><div><h2>Unlock Your Dream Flight</h2><p>Find your path to miles, upgrades and Business Class.</p></div></div>
          </li>
        </ol>
      </div>
    </section>

    <main className={`${styles.content} ${lp.formWrap}`} id="plan">
      <form className={styles.formCard} onSubmit={submit}>
        <ol className={tp.stepper} aria-label="Steps">{STEPS.map((label, index) => <li key={label} className={index === step ? tp.stepOn : index < step ? tp.stepDone : ''}><button type="button" onClick={() => index <= step && setStep(index)}><b>{index + 1}</b>{label}</button></li>)}</ol>

        {step === 0 && <section className={`sim-page ${tp.stepPanel}`}>
          <div className="sim-intro">
            <div>
              <div className="sim-eyebrow">BUILD YOUR SPENDING PROFILE</div>
              <h2>Tell us how you spend each month</h2>
              <p>Enter only what applies to you. Leave the rest blank.</p>
            </div>
            <button type="button" className="sim-reset" onClick={() => { setSpend({}); setSplits(splitFromAmounts(undefined)); setError('') }}>Reset amounts</button>
          </div>
          <SpendEntryFields spend={spend} setSpend={setSpend} splits={splits} setSplits={setSplits} error={error}
            hideBreakdown copy={{ summaryTitle: 'YOUR MONTHLY SPENDING' }}
            cta={<>
              <label className="sim-summary-salary">
                <span>Monthly salary<small>To check which cards you qualify for</small></span>
                <div>
                  <b>AED</b>
                  <input type="number" inputMode="numeric" min="0" step="100" placeholder="e.g. 15,000"
                    value={salary} onChange={event => setSalary(event.target.value)} aria-label="Monthly salary in AED" />
                </div>
              </label>
              <button type="button" className="sim-cta" onClick={next} disabled={monthlyTotal <= 0}>Go for step 2:<br />Upcoming Expenses →</button>
            </>} />
        </section>}

        {step === 1 && <section className={tp.stepPanel}>
          <div className={styles.formHeading}><div><span className={tp.kicker}>NEXT, WHAT’S COMING UP…</span><h2>Sometimes we don’t realise how big our occasional expenses are.</h2><p className={formStyles.formIntro}>Big, irregular expenses are a large part of what we spend. Add any upcoming big expenses — this will help you fly faster.</p></div></div>
          <section className={formStyles.expensesPanel}>
            {topicsError && <p className={styles.error} role="alert"><i className="ti ti-alert-circle" /> {topicsError} <button type="button" className={tp.back} onClick={() => void loadTopics()} disabled={topicsLoading}>Retry</button></p>}
            <div className={formStyles.schedules}>{payments.map((payment, index) => <div className={formStyles.expenseRow} key={`${index}-${payment.topic_code}`}>
              <label><span>What’s coming up?</span><select value={payment.topic_code} disabled={topicsLoading || !topics.length} onChange={event => updatePayment(index, { topic_code: event.target.value })}><option value="">{topicsLoading ? 'Loading options…' : 'Choose an expense'}</option>{topics.map(topic => <option key={topic.topic_code} value={topic.topic_code}>{topicName(topic.topic_code)}</option>)}</select></label>
              <label><span>Amount</span><div className={formStyles.amountInput}><b>AED</b><input inputMode="decimal" type="number" min="0" step="100" value={payment.amount_aed || ''} onChange={event => updatePayment(index, { amount_aed: Number(event.target.value) || 0 })} placeholder="10,000" /></div></label>
              <fieldset><legend>When?</legend><div className={formStyles.months}>{MONTHS.map(([name, value]) => <label key={value} className={payment.due_months.includes(value) ? formStyles.selectedMonth : ''}><input type="checkbox" checked={payment.due_months.includes(value)} onChange={() => toggleMonth(index, value)} /><span>{name}</span></label>)}</div></fieldset>
              <button type="button" className={formStyles.remove} onClick={() => setPayments(current => current.length === 1 ? [blankRow(topics)] : current.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove expense"><i className="ti ti-trash" /></button>
            </div>)}</div>
            <button type="button" className={formStyles.addExpense} onClick={() => setPayments(current => [...current, blankRow(topics)])}><i className="ti ti-plus" /> Add another expense</button>
          </section>
        </section>}

        {step > 0 && error && <p className={styles.error}><i className="ti ti-alert-circle" /> {error}</p>}
        {step > 0 && <footer className={formStyles.submitFooter}>
          {step > 0 && (fromResult && step === 1
            ? <button type="button" className={tp.back} onClick={() => router.push('/analyse/result')}><i className="ti ti-arrow-left" /> Back to Smart wallet result</button>
            : <button type="button" className={tp.back} onClick={() => { setError(''); setStep(step - 1) }}><i className="ti ti-arrow-left" /> Back</button>)}
          <button key="submit" className="btn-primary" type="submit">Show my trips <i className="ti ti-arrow-right" /></button>
        </footer>}
      </form>
    </main>
    <SimulatorStyles />
  </div>
}
