'use client'

/* eslint-disable @next/next/no-img-element */
// Trip Planner input form: 1 regular monthly spend (Analyse groups) -> 2 big payments (Max Miles rows) -> 3 current cards.
// Step 1 is the Analyse spend form itself (shared component); the payment rows reuse the Max Miles styling.
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BulkPaymentSchedule, BulkSpendTopic } from '@/lib/bulk-spend-miles/api'
import { getBulkSpendTopics } from '@/lib/bulk-spend-miles/api'
import { topicName } from '@/components/bulk-spend-miles/BulkResultView'
import { SPLIT_KEYS, SimulatorStyles, SpendEntryFields, computeAmounts, splitFromAmounts, type SplitState } from '@/components/wallet-simulator/spend-entry'
import { getBanks, type BankOption } from '@/lib/trip-planner/api'
import { AIRLINE_LOGO, bankLogo } from '@/lib/trip-planner/bank-logos'
import { ensureProfileLoaded, patchProfile, readProfile } from '@/lib/profile/storage'
import { readTripForm, saveFromWallet, saveTripSubmission, type BankMode, type TripFormState } from '@/lib/trip-planner/session'
import styles from '../bulk-spend-miles/page.module.css'
import formStyles from '../bulk-spend-miles/compact-spend-form.module.css'
import tp from './trip-planner.module.css'
import lp from './landing.module.css'

const MONTHS = [
  ['Jan', 1], ['Feb', 2], ['Mar', 3], ['Apr', 4], ['May', 5], ['Jun', 6],
  ['Jul', 7], ['Aug', 8], ['Sep', 9], ['Oct', 10], ['Nov', 11], ['Dec', 12],
] as const

const STEPS = ['Monthly Spending', 'Upcoming Expenses', 'Your Cards & Miles'] as const

function blankRow(topics: BulkSpendTopic[]): BulkPaymentSchedule {
  return { topic_code: topics[0]?.topic_code ?? '', amount_aed: 0, due_months: [] }
}

/** A bank's logo, or a generic bank icon when none exists or it fails to load. */
function BankLogo({ code }: { code: string }) {
  const [failed, setFailed] = useState(false)
  const src = bankLogo(code)
  return <span className={tp.bankLogo}>{src && !failed ? <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} /> : <i className="ti ti-building-bank" aria-hidden="true" />}</span>
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
  const [bankMode, setBankMode] = useState<BankMode>('skipped')
  const [banks, setBanks] = useState<string[]>([])
  const [bankOptions, setBankOptions] = useState<BankOption[]>([])
  const [skywards, setSkywards] = useState('')
  const [etihad, setEtihad] = useState('')
  const [bankQuery, setBankQuery] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [draftBanks, setDraftBanks] = useState<string[]>([])
  const [error, setError] = useState('')

  // Coming back from the results page ("Edit my plan"): restore what the user entered.
  const [profileReady, setProfileReady] = useState(false)
  // Opened from the Smart Wallet result ("Turn your everyday spend into a flight ticket"): the spend and salary come from
  // that result (saved to the profile just before), the user lands on step 2, and Back returns to the result.
  const [fromResult, setFromResult] = useState(false)
  useEffect(() => {
    const query = new URLSearchParams(window.location.search)
    const opened = query.get('from') === 'result'
    // The results page remembers the wallet route; "Edit spending" (?edit=1) keeps it, any other way in clears it.
    if (opened || query.get('edit') === '1') setTimeout(() => document.getElementById('plan')?.scrollIntoView(), 0)
    if (opened) saveFromWallet(true)
    else if (query.get('edit') !== '1') saveFromWallet(false)
    // A saved trip is only used when this page was not opened from the result.
    const saved = opened ? null : readTripForm()
    if (opened) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFromResult(true)
      setStep(1)
      // Keep the answers from the last "Your Cards & Miles" step, if any; the spending always comes from the result.
      const held = readTripForm()
      if (held) {
        setBankMode(held.bankMode)
        setBanks(held.banks)
        setSkywards(held.skywards)
        setEtihad(held.etihad)
      }
    }
    if (!saved) {
      // No plan in this tab: fall back to the browser-local details shared by the planners.
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
        setProfileReady(true)
      })
      return () => { alive = false }
    }
    // Browser storage only exists after hydration, so restoring has to happen in an effect.
    /* eslint-disable react-hooks/set-state-in-effect */
    setProfileReady(true)
    // saved.spend holds every category's final amount; the two split sliders are rebuilt from them, as Analyse does.
    setSpend(Object.fromEntries(Object.entries(saved.spend).filter(([key]) => !SPLIT_KEYS.has(key))))
    setSplits(splitFromAmounts(Object.fromEntries(Object.entries(saved.spend).map(([key, value]) => [key, Number(value) || 0]))))
    setSalary(saved.salary)
    if (saved.payments?.length) setPayments(saved.payments)
    setBankMode(saved.bankMode)
    setBanks(saved.banks)
    setSkywards(saved.skywards)
    setEtihad(saved.etihad)
    /* eslint-enable react-hooks/set-state-in-effect */
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
    let current = true
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTopics()
    getBanks().then(response => current && setBankOptions(response.banks)).catch(() => undefined)
    return () => { current = false }
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

  // Everything except the step-3 answers is checked here; returns the step to send the user back to when something is missing.
  const validate = () => {
    if (monthlyTotal <= 0 && !validPayments().length) return { step: 0, message: 'Enter your monthly spending or at least one upcoming expense.' }
    if (Number(salary) <= 0) return { step: 0, message: 'Enter your monthly salary so we only show cards you can apply for.' }
    if (paymentProblem()) return { step: 1, message: 'Each expense needs both an amount and at least one month.' }
    return null
  }

  const go = (held: { bankMode: BankMode, banks: string[], skywards: string, etihad: string }) => {
    setError('')
    const form: TripFormState = { spend: Object.fromEntries(Object.entries(amounts).map(([key, value]) => [key, String(value)])), salary, payments, ...held, existingPicks: readTripForm()?.existingPicks ?? {} }
    const regular = Object.fromEntries(Object.entries(amounts).filter(([, amount]) => amount > 0))
    saveTripSubmission(form, {
      salary_aed: Number(salary),
      regular_spend: regular,
      scheduled_payments: validPayments(),
      banks_held: held.bankMode === 'skipped' ? null : held.bankMode === 'none' ? [] : held.banks,
      skywards_balance: Number(held.skywards) || 0,
      etihad_balance: Number(held.etihad) || 0,
      existing_card_ids: Object.values(form.existingPicks).filter(Boolean),
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
    go({ bankMode, banks, skywards, etihad })
  }

  // "Skip this step": see the trips without adding any cards or miles.
  const skipStep = () => {
    const problem = validate()
    if (problem) {
      setStep(problem.step)
      return setError(problem.message)
    }
    setBankMode('skipped')
    setBanks([])
    setSkywards('')
    setEtihad('')
    go({ bankMode: 'skipped', banks: [], skywards: '', etihad: '' })
  }

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

        {step === 2 && <section className={tp.lastThing}>
          <div className={tp.lastHead}>
            <div className={tp.lastIntro}><span>ONE LAST THING…</span><h2>Already have cards or airline miles?</h2><p>Add them and we’ll see if they can get you there sooner.</p></div>
            <div className={tp.lastArt} aria-hidden="true">
              <i className={`ti ti-plane ${tp.artPlane}`} />
              <span className={`${tp.artCard} ${tp.artCardA}`} /><span className={`${tp.artCard} ${tp.artCardB}`} /><span className={`${tp.artCard} ${tp.artCardC}`}><b /></span>
              <span className={tp.artPassport}><i className="ti ti-world" /></span>
            </div>
          </div>

          <div className={tp.block}>
            <div className={tp.blockHead}>
              <span className={tp.blockNum}>1</span>
              <div><h3>Your cards <small>(optional)</small></h3><p>Select the banks where you hold a card. We won’t count any new-customer bonuses there.</p></div>
            </div>
            <div className={tp.bankGrid}>
              {banks.map(code => <div key={code} className={`${tp.bankOn} ${tp.bankChip}`}><BankLogo code={code} /><span>{bankOptions.find(bank => bank.bank_code === code)?.bank_name ?? code}</span>
                <button type="button" aria-label="Remove this bank" onClick={() => { const next = banks.filter(item => item !== code); setBanks(next); setBankMode(next.length ? 'banks' : 'skipped') }}><i className="ti ti-x" aria-hidden="true" /></button></div>)}
              <button type="button" className={tp.bankAdd} onClick={() => { setDraftBanks(banks); setBankQuery(''); setPickerOpen(true) }}><i className="ti ti-plus" aria-hidden="true" /><span>{banks.length ? 'Add another bank' : 'Add a bank'}</span></button>
            </div>
          </div>

          <div className={`${tp.block} ${tp.blockSplit}`}>
            <div className={tp.blockHead}>
              <span className={tp.blockNum}>2</span>
              <div><h3>Airline miles <small>(optional)</small></h3><p>Add the airline miles you already have. We’ll add these to what your spending could earn.</p></div>
            </div>
            <div className={tp.balances}>
              <label><img src={AIRLINE_LOGO.emirates} alt="" /><strong>Emirates Skywards</strong><div className={formStyles.amountInput}><input inputMode="numeric" type="number" min="0" step="100" value={skywards} onChange={event => setSkywards(event.target.value)} placeholder="0" aria-label="Emirates Skywards miles you already have" /><b>miles</b></div></label>
              <label><img src={AIRLINE_LOGO.etihad} alt="" /><strong>Etihad Guest</strong><div className={formStyles.amountInput}><input inputMode="numeric" type="number" min="0" step="100" value={etihad} onChange={event => setEtihad(event.target.value)} placeholder="0" aria-label="Etihad Guest miles you already have" /><b>miles</b></div></label>
            </div>
          </div>
        </section>}

        {pickerOpen && <div className={tp.bankModalBack} role="dialog" aria-modal="true" aria-label="Choose your banks" onClick={event => { if (event.target === event.currentTarget) setPickerOpen(false) }}>
          <div className={tp.bankModal}>
            <div className={tp.bankModalHead}><h3>Select your banks</h3><button type="button" aria-label="Close" onClick={() => setPickerOpen(false)}><i className="ti ti-x" aria-hidden="true" /></button></div>
            <label className={tp.bankSearch}><i className="ti ti-search" aria-hidden="true" /><input type="search" value={bankQuery} onChange={event => setBankQuery(event.target.value)} placeholder="Search for a bank…" aria-label="Search for a bank" /></label>
            <div className={`${tp.bankGrid} ${tp.bankModalGrid}`}>{bankOptions.filter(bank => bank.bank_name.toLowerCase().includes(bankQuery.trim().toLowerCase())).map(bank => <label key={bank.bank_code} className={draftBanks.includes(bank.bank_code) ? tp.bankOn : ''}>
              <input type="checkbox" checked={draftBanks.includes(bank.bank_code)} onChange={() => setDraftBanks(current => current.includes(bank.bank_code) ? current.filter(code => code !== bank.bank_code) : [...current, bank.bank_code])} /><BankLogo code={bank.bank_code} /><span>{bank.bank_name}</span></label>)}
              {!bankOptions.length && <p className={tp.hint}>Loading banks…</p>}
              {bankOptions.length > 0 && !bankOptions.some(bank => bank.bank_name.toLowerCase().includes(bankQuery.trim().toLowerCase())) && <p className={tp.hint}>No bank matches “{bankQuery}”.</p>}</div>
            <div className={tp.bankModalFoot}><button type="button" onClick={() => setPickerOpen(false)}>Cancel</button><button type="button" className="btn-primary" onClick={() => { setBanks(draftBanks); setBankMode(draftBanks.length ? 'banks' : 'skipped'); setPickerOpen(false) }}>OK</button></div>
          </div>
        </div>}

        {step > 0 && error && <p className={styles.error}><i className="ti ti-alert-circle" /> {error}</p>}
        {step > 0 && <footer className={formStyles.submitFooter}>
          {step > 0 && (fromResult && step === 1
            ? <button type="button" className={tp.back} onClick={() => router.push('/analyse/result')}><i className="ti ti-arrow-left" /> Back to Smart wallet result</button>
            : <button type="button" className={tp.back} onClick={() => { setError(''); setStep(step - 1) }}><i className="ti ti-arrow-left" /> Back</button>)}
          {step < STEPS.length - 1
            // Distinct keys: without them React reuses the one button node, so the click that opens step 3 flips it to type="submit" before the
            // browser finishes the click and the form is submitted at once (step 3 flashes by and the results load immediately).
            ? <button key="continue" className="btn-primary" type="button" onClick={next}>{step === 0 ? 'Next: Upcoming Expenses' : <>Go for step 3:<br />Add Existing Miles</>} <i className="ti ti-arrow-right" /></button>
            : <>
              <button type="button" className={tp.skipLink} onClick={skipStep}>Skip this step</button>
              <button key="submit" className="btn-primary" type="submit">Show my trips <i className="ti ti-arrow-right" /></button>
            </>}
        </footer>}
      </form>
    </main>
    <SimulatorStyles />
  </div>
}
