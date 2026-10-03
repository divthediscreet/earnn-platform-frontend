'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { BulkPaymentSchedule, BulkSpendTopic } from '@/lib/bulk-spend-miles/api'
import { getBulkSpendTopics } from '@/lib/bulk-spend-miles/api'
import { readBulkForm, saveBulkSubmission } from '@/lib/bulk-spend-miles/session'
import styles from './page.module.css'
import formStyles from './compact-spend-form.module.css'

const MONTHS = [
  ['Jan', 1], ['Feb', 2], ['Mar', 3], ['Apr', 4], ['May', 5], ['Jun', 6],
  ['Jul', 7], ['Aug', 8], ['Sep', 9], ['Oct', 10], ['Nov', 11], ['Dec', 12],
] as const

function blankRow(topics: BulkSpendTopic[]): BulkPaymentSchedule {
  return { topic_code: topics[0]?.topic_code ?? '', amount_aed: 0, due_months: [] }
}

export default function BulkSpendMilesPage() {
  const router = useRouter()
  const [monthlySpend, setMonthlySpend] = useState('8000')
  const [salary, setSalary] = useState('')
  const [topics, setTopics] = useState<BulkSpendTopic[]>([])
  const [topicsLoading, setTopicsLoading] = useState(true)
  const [payments, setPayments] = useState<BulkPaymentSchedule[]>([blankRow([])])
  const [error, setError] = useState('')

  // Coming back from the results page ("Edit my plan"): restore what the user entered.
  useEffect(() => {
    const saved = readBulkForm()
    if (!saved) return
    // sessionStorage only exists after hydration, so restoring has to happen in an effect.
    /* eslint-disable react-hooks/set-state-in-effect */
    setMonthlySpend(saved.monthlySpend)
    setSalary(saved.salary)
    if (saved.payments?.length) setPayments(saved.payments)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [])

  useEffect(() => {
    let current = true
    getBulkSpendTopics()
      .then(response => {
        if (!current) return
        setTopics(response.topics)
        setPayments(rows => rows.map(row => row.topic_code ? row : { ...row, topic_code: response.topics[0]?.topic_code ?? '' }))
      })
      .catch(reason => current && setError(reason instanceof Error ? reason.message : 'We could not load payment topics right now.'))
      .finally(() => current && setTopicsLoading(false))
    return () => { current = false }
  }, [])

  const updatePayment = (index: number, update: Partial<BulkPaymentSchedule>) => {
    setPayments(current => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...update } : row))
  }
  const toggleMonth = (index: number, month: number) => {
    const row = payments[index]
    updatePayment(index, { due_months: row.due_months.includes(month) ? row.due_months.filter(value => value !== month) : [...row.due_months, month].sort((a, b) => a - b) })
  }
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    const validRows = payments.filter(row => Number(row.amount_aed) > 0 && row.due_months.length > 0)
    if (validRows.some(row => !row.topic_code)) {
      setError('Choose a category for every scheduled payment.')
      return
    }
    if (Number(monthlySpend) <= 0 && !validRows.length) {
      setError('Enter your regular monthly spend or at least one scheduled payment.')
      return
    }
    if (Number(salary) <= 0) {
      setError('Enter your monthly salary to see cards you are eligible for.')
      return
    }
    if (payments.some(row => (Number(row.amount_aed) > 0 && !row.due_months.length) || (Number(row.amount_aed) <= 0 && row.due_months.length))) {
      setError('Each scheduled payment needs both an amount and at least one due month.')
      return
    }
    setError('')
    saveBulkSubmission(
      { monthlySpend, salary, payments },
      { monthly_spend_aed: Number(monthlySpend) || 0, salary_aed: Number(salary), scheduled_payments: validRows },
    )
    router.push('/bulk-spend-miles/results')
  }

  return <div className={styles.page}>
    <section className={styles.hero}>
      <div><span className={styles.kicker}>MAXIMISE A BIG PAYMENT</span><h1>Big expenses. Big rewards.</h1><p>Earnn will turn your upcoming big payments into rewards worth getting excited about.</p></div>
      <aside><i className="ti ti-sparkles" /><span>Spending you already planned can unlock more value.</span></aside>
    </section>

    <main className={styles.content}>
      <form className={styles.formCard} onSubmit={submit}>
        <div className={styles.formHeading}><div><span>YOUR BIG-EXPENSE PLAN</span><h2>What big payments are coming up?</h2><p className={formStyles.formIntro}>Add the payments you already expect to make. We will find the card that makes them work harder for you.</p></div></div>
        <section className={formStyles.expensesPanel}>
          <div className={formStyles.expensePanelHead}><h3>Upcoming big expenses</h3><p>Choose what you are paying for, the amount and every month when the same payment is due.</p></div>
          <div className={formStyles.schedules}>{payments.map((payment, index) => <div className={formStyles.expenseRow} key={`${index}-${payment.topic_code}`}>
            <label><span>What are you paying for?</span><select value={payment.topic_code} disabled={topicsLoading || !topics.length} onChange={event => updatePayment(index, { topic_code: event.target.value })}><option value="">{topicsLoading ? 'Loading options…' : 'Choose an expense'}</option>{topics.map(topic => <option key={topic.topic_code} value={topic.topic_code}>{topic.topic_label}</option>)}</select></label>
            <label><span>Amount due</span><div className={formStyles.amountInput}><b>AED</b><input inputMode="decimal" type="number" min="0" step="100" value={payment.amount_aed || ''} onChange={event => updatePayment(index, { amount_aed: Number(event.target.value) || 0 })} placeholder="10,000" /></div></label>
            <fieldset><legend>Due in</legend><div className={formStyles.months}>{MONTHS.map(([name, value]) => <label key={value} className={payment.due_months.includes(value) ? formStyles.selectedMonth : ''}><input type="checkbox" checked={payment.due_months.includes(value)} onChange={() => toggleMonth(index, value)} /><span>{name}</span></label>)}</div></fieldset>
            <button type="button" className={formStyles.remove} onClick={() => setPayments(current => current.length === 1 ? [blankRow(topics)] : current.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove scheduled payment"><i className="ti ti-trash" /></button>
          </div>)}</div>
          <button type="button" className={formStyles.addExpense} disabled={topicsLoading || !topics.length} onClick={() => setPayments(current => [...current, blankRow(topics)])}><i className="ti ti-plus" /> Add another expense</button>
        </section>
        <div className={formStyles.profileGrid}>
          <label className={formStyles.monthlyInput}><span><strong>Regular monthly living spend</strong><small>Before we plan, please tell us generally how much you spend monthly on your living.</small></span><div><b>AED</b><input inputMode="decimal" type="number" min="0" step="100" value={monthlySpend} onChange={event => setMonthlySpend(event.target.value)} placeholder="8,000" /></div></label>
          <label className={formStyles.salaryInput}><span><strong>Monthly salary</strong></span><div><b>AED</b><input inputMode="decimal" type="number" min="0" step="100" required value={salary} onChange={event => setSalary(event.target.value)} placeholder="Eligible cards only" /></div></label>
        </div>
        {error && <p className={styles.error}><i className="ti ti-alert-circle" /> {error}</p>}
        <footer className={formStyles.submitFooter}><button className="btn-primary" type="submit">Turn My Expense into Deal <i className="ti ti-arrow-right" /></button></footer>
      </form>
    </main>
  </div>
}
