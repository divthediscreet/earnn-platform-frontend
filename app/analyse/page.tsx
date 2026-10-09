'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHero from '@/components/PageHero'
import { recommendWallet, saveSession, SimulatorApiError, useSimulatorSession, type RewardMode, type SimulatorRequest } from '@/lib/wallet-simulator/api'
import { SPLIT_KEYS, SimulatorStyles, SpendEntryFields, computeAmounts, splitFromAmounts, type SplitState } from '@/components/wallet-simulator/spend-entry'
import { CardColumnsLoader, loadCardIds, preloadCardImages } from '@/components/wallet-simulator/loading-columns'

export default function SimulatorSpendPage() {
  // "Edit my spending" from the result page: start from what the user entered last time.
  const session = useSimulatorSession()
  return <SpendForm key={session ? 'restored' : 'fresh'} initial={session?.request} />
}

function SpendForm({ initial }: { initial?: SimulatorRequest }) {
  const router = useRouter()
  const [spend, setSpend] = useState<Record<string, string>>(() => Object.fromEntries(
    Object.entries(initial?.form_spend ?? {}).filter(([k, v]) => v > 0 && !SPLIT_KEYS.has(k)).map(([k, v]) => [k, String(v)])))
  const [splits, setSplits] = useState<SplitState>(() => splitFromAmounts(initial?.form_spend))
  const [rewardMode, setRewardMode] = useState<RewardMode>(initial?.reward_mode ?? 'cashback') // cashback unless the user picks miles
  const [salary, setSalary] = useState(initial?.salary_aed ? String(initial.salary_aed) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [animCardIds, setAnimCardIds] = useState<string[]>([]) // card images for the holding screen

  useEffect(() => {
    // fetch the card list and download the images now, so the holding screen shows them instantly
    loadCardIds().then(ids => { preloadCardImages(ids); setAnimCardIds(ids) })
  }, [])

  const amounts = computeAmounts(spend, splits)
  const totalMonthly = Object.values(amounts).reduce((a, b) => a + b, 0)
  const salaryNum = parseFloat(salary) || 0

  const submit = async () => {
    if (totalMonthly <= 0) return setError('Enter at least one monthly amount.')
    if (salaryNum <= 0) return setError('Enter your monthly salary so we only suggest cards you can apply for.')
    setError('')
    setLoading(true)
    const request: SimulatorRequest = { form_spend: amounts, salary_aed: salaryNum, reward_mode: rewardMode }
    try {
      const result = await recommendWallet(request)
      saveSession({ request, result })
      router.push('/analyse/result')
    } catch (e) {
      setError(e instanceof SimulatorApiError ? e.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="sim-page">
      <PageHero tone="light" tall image="/images/heroes/Analyze-new.webp" width={1112}
        kicker="ANALYZE" kickerColor="#5a6a85"
        title={<>Find the cards<br />that pay you <span style={{ color: '#C9972B' }}>most.</span></>}
        subtitle="Tell us how you spend. Earnn finds the cards that earn you the most — and tells you which card to use where." />

      <div className="sim-content">
        <div className="sim-intro">
          <div>
            <div className="sim-eyebrow">BUILD YOUR SPENDING PROFILE</div>
            <h2>Tell us how you spend each month</h2>
            <p>Enter only what applies to you. Leave the rest blank.</p>
          </div>
          <button type="button" className="sim-reset" onClick={() => { setSpend({}); setSplits(splitFromAmounts(undefined)); setError('') }}>Reset amounts</button>
        </div>

        <section className="sim-setup sim-setup-trip">
          <div className="sim-setup-heading">
            <div className="sim-eyebrow">YOUR INCOME</div>
            <p>This helps us find cards that fit your income.</p>
          </div>
          <label className="sim-salary">
            <span>Monthly salary</span>
            <div>
              <b>AED</b>
              <input type="number" inputMode="numeric" min="0" step="100" placeholder="e.g. 15,000"
                value={salary} onChange={e => setSalary(e.target.value)} aria-label="Monthly salary in AED" />
            </div>
          </label>
        </section>

        <SpendEntryFields spend={spend} setSpend={setSpend} splits={splits} setSplits={setSplits} error={error}
          summaryAction={<div className="sim-mode" role="radiogroup" aria-label="Which rewards do you want?">
            {(['cashback', 'miles'] as const).map(m => (
              <button key={m} type="button" role="radio" aria-checked={rewardMode === m} className={rewardMode === m ? 'on' : ''}
                onClick={() => setRewardMode(m)}>{m === 'cashback' ? 'Cashback' : 'Miles'}</button>
            ))}
          </div>} cta={
          <button type="button" className="sim-cta" onClick={submit} disabled={totalMonthly <= 0 || loading}>
            {loading ? 'Building your smart wallet…' : 'Build My Smart Wallet →'}
          </button>} />
      </div>

      {loading && (
        <CardColumnsLoader cardIds={animCardIds} title="Building your smart wallet…"
          subtitle="Testing every combination of up to three UAE cards against your spending" />
      )}

      <SimulatorStyles />
    </div>
  )
}
