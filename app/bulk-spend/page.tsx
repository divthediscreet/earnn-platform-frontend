'use client'

import { useEffect, useState } from 'react'
import PageHero from '@/components/PageHero'
import { useRouter } from 'next/navigation'
import type { BulkPaymentSchedule, BulkSpendTopic } from '@/lib/bulk-spend-miles/api'
import { getBulkSpendTopics } from '@/lib/bulk-spend-miles/api'
import { topicName } from '@/components/bulk-spend-miles/BulkResultView'
import { ensureProfileLoaded, patchProfile, readProfile } from '@/lib/profile/storage'
import { bulkMonthlySpend, saveBulkPath, type BulkPath } from '@/lib/bulk-spend-miles/session'
import BulkSpendPathChoice from '@/components/bulk-spend-miles/BulkSpendPathChoice'
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
  const [monthlySpend, setMonthlySpend] = useState('')
  const [salary, setSalary] = useState('')
  const [topics, setTopics] = useState<BulkSpendTopic[]>([])
  const [topicsLoading, setTopicsLoading] = useState(true)
  const [payments, setPayments] = useState<BulkPaymentSchedule[]>([blankRow([])])
  const [error, setError] = useState('')
  const [choosingPath, setChoosingPath] = useState(false)

  // Everything the user entered lives in the shared profile; this page only reads and updates it.
  const [profileReady, setProfileReady] = useState(false)
  useEffect(() => {
    let alive = true
    ensureProfileLoaded().then(() => {
      if (!alive) return
      const profile = readProfile()
      const monthly = bulkMonthlySpend(profile)
      if (monthly > 0) setMonthlySpend(String(monthly))
      if (profile?.salary) setSalary(profile.salary)
      if (profile?.payments?.length) setPayments(profile.payments)
      setProfileReady(true)
    })
    return () => { alive = false }
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

  const paymentsKey = JSON.stringify(payments.filter(row => Number(row.amount_aed) > 0 && row.due_months.length > 0))
  useEffect(() => {
    if (!profileReady) return
    const timer = setTimeout(() => patchProfile({ salary, monthly_total: monthlySpend || undefined, payments: JSON.parse(paymentsKey) }), 400)
    return () => clearTimeout(timer)
  }, [profileReady, salary, monthlySpend, paymentsKey])

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
      setError('Choose what every expense is for.')
      return
    }
    if (Number(monthlySpend) <= 0 && !validRows.length) {
      setError('Enter your regular monthly spend or at least one upcoming expense.')
      return
    }
    if (Number(salary) <= 0) {
      setError('Enter your monthly salary to see cards you are eligible for.')
      return
    }
    if (payments.some(row => (Number(row.amount_aed) > 0 && !row.due_months.length) || (Number(row.amount_aed) <= 0 && row.due_months.length))) {
      setError('Each expense needs both an amount and at least one month.')
      return
    }
    setError('')
    setChoosingPath(true)
  }
  // The plan is saved only once the user has picked miles or cashback; the results page shows just that path.
  const choosePath = (path: BulkPath) => {
    const validRows = payments.filter(row => Number(row.amount_aed) > 0 && row.due_months.length > 0)
    // The results page builds its plan from the shared profile, so save now rather than wait for the delayed auto-save.
    patchProfile({ salary, monthly_total: monthlySpend || undefined, payments: validRows })
    saveBulkPath(path)
    router.push('/bulk-spend/results')
  }


  return <div className={styles.page}>
    <PageHero tone="dark" gap={40} image="/images/heroes/MaxMile.webp" kicker="BIG SPEND PLANNER"
      title="Big expenses. Big rewards."
      subtitle="Apart from your regular monthly spending, we all have a few big expenses from time to time. These big payments eat a big part of our savings, so let’s plan them in advance and get the most back from them." />

    <main className={styles.content}>
      <form className={styles.formCard} onSubmit={submit}>
        <div className={styles.formHeading}><div><span>YOUR BIG-EXPENSE PLAN</span><h2>Anything extra coming up in the next 12 months?</h2><p className={formStyles.formIntro}>Add the big expenses you have planned. Earnn will show you how to get the most back from them.</p></div></div>
        <section className={formStyles.expensesPanel}>
          <div className={formStyles.expensePanelHead}><h3>Upcoming expenses</h3><p>Choose what you are paying for, the amount and every month when the same payment is due.</p></div>
          <div className={formStyles.schedules}>{payments.map((payment, index) => <div className={formStyles.expenseRow} key={`${index}-${payment.topic_code}`}>
            <label><span>What’s coming up?</span><select value={payment.topic_code} disabled={topicsLoading || !topics.length} onChange={event => updatePayment(index, { topic_code: event.target.value })}><option value="">{topicsLoading ? 'Loading options…' : 'Choose an expense'}</option>{topics.map(topic => <option key={topic.topic_code} value={topic.topic_code}>{topicName(topic.topic_code)}</option>)}</select></label>
            <label><span>Amount</span><div className={formStyles.amountInput}><b>AED</b><input inputMode="decimal" type="number" min="0" step="100" value={payment.amount_aed || ''} onChange={event => updatePayment(index, { amount_aed: Number(event.target.value) || 0 })} placeholder="10,000" /></div></label>
            <fieldset><legend>When?</legend><div className={formStyles.months}>{MONTHS.map(([name, value]) => <label key={value} className={payment.due_months.includes(value) ? formStyles.selectedMonth : ''}><input type="checkbox" checked={payment.due_months.includes(value)} onChange={() => toggleMonth(index, value)} /><span>{name}</span></label>)}</div></fieldset>
            <button type="button" className={formStyles.remove} onClick={() => setPayments(current => current.length === 1 ? [blankRow(topics)] : current.filter((_, rowIndex) => rowIndex !== index))} aria-label="Remove expense"><i className="ti ti-trash" /></button>
          </div>)}</div>
          <button type="button" className={formStyles.addExpense} disabled={topicsLoading || !topics.length} onClick={() => setPayments(current => [...current, blankRow(topics)])}><i className="ti ti-plus" /> Add another expense</button>
        </section>
        <div className={formStyles.profileGrid}>
          <label className={formStyles.monthlyInput}><span><strong>Regular monthly living spend</strong><small>Before we plan, please tell us generally how much you spend monthly on your living.</small></span><div><b>AED</b><input inputMode="decimal" type="number" min="0" step="100" value={monthlySpend} onChange={event => setMonthlySpend(event.target.value)} placeholder="0" /></div></label>
          <label className={formStyles.salaryInput}><span><strong>Monthly salary</strong></span><div><b>AED</b><input inputMode="decimal" type="number" min="0" step="100" required value={salary} onChange={event => setSalary(event.target.value)} placeholder="Eligible cards only" /></div></label>
        </div>
        {error && <p className={styles.error}><i className="ti ti-alert-circle" /> {error}</p>}
        <footer className={formStyles.submitFooter}><button className="btn-primary" type="submit">Get the Most from My Expenses <i className="ti ti-arrow-right" /></button></footer>
      </form>
    </main>
    {choosingPath && <BulkSpendPathChoice onChoose={choosePath} onClose={() => setChoosingPath(false)} />}
  </div>
}
