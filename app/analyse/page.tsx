'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHero from '@/components/PageHero'
import { evaluateWallet, recommendWallet, saveSession, SimulatorApiError, useSimulatorSession, type RewardMode, type SimulatorRequest } from '@/lib/wallet-simulator/api'
import { SPLIT_KEYS, SimulatorStyles, SpendEntryFields, computeAmounts, splitFromAmounts, type SplitState } from '@/components/wallet-simulator/spend-entry'
import { StatementUpload, type StatementSubmit } from '@/components/wallet-simulator/statement-upload'
import { ComparisonPopup, buildGapData, type GapData } from '@/components/wallet-simulator/gap-popup'
import { pingBackend } from '@/lib/api'
import ProfileNotice, { useProfilePref } from '@/components/profile/ProfileNotice'
import { ensureProfileLoaded, patchProfile, readProfile } from '@/lib/profile/storage'
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
  const [mode, setMode] = useState<'upload' | 'manual'>(initial?.form_spend ? 'manual' : 'upload') // upload first, as in the old Analyse page
  const [gap, setGap] = useState<GapData | null>(null)
  const [animCardIds, setAnimCardIds] = useState<string[]>([]) // card images for the holding screen

  useEffect(() => {
    pingBackend() // warm the backend before a statement upload
    // fetch the card list and download the images now, so the holding screen shows them instantly
    loadCardIds().then(ids => { preloadCardImages(ids); setAnimCardIds(ids) })
  }, [])

  // Saved details (opt-in, this browser only): restore on first load unless "Edit my spending" supplied a session.
  const profilePref = useProfilePref()
  const [profileReady, setProfileReady] = useState(false)
  useEffect(() => {
    let alive = true
    // waits briefly for another open earnn tab to hand over its details, then restores them
    ensureProfileLoaded().then(() => {
      if (!alive) return
      const saved = initial ? null : readProfile()
      if (saved?.spend) {
        setSpend(Object.fromEntries(Object.entries(saved.spend).filter(([k, v]) => Number(v) > 0 && !SPLIT_KEYS.has(k))))
        setSplits(splitFromAmounts(Object.fromEntries(Object.entries(saved.spend).map(([k, v]) => [k, Number(v) || 0]))))
      }
      if (saved?.salary) setSalary(saved.salary)
      setProfileReady(true)
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const amounts = computeAmounts(spend, splits)
  const amountsKey = JSON.stringify(amounts)
  useEffect(() => {
    if (!profileReady || profilePref === 'skip' || profilePref === 'pending') return
    const timer = setTimeout(() => patchProfile({
      salary,
      spend: Object.fromEntries(Object.entries(amounts).filter(([, v]) => v > 0).map(([k, v]) => [k, String(v)])),
      monthly_total: undefined,
    }), 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileReady, profilePref, salary, amountsKey])

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

  // Statement path: best wallet + (if the user's card is known) that card on the same spend, then the "reward gap" popup.
  const submitStatement = async (s: StatementSubmit) => {
    setError('')
    setLoading(true)
    const request: SimulatorRequest = { spend_summary: s.spend_summary, salary_aed: s.salary_aed, reward_mode: 'cashback' }
    try {
      const [result, current] = await Promise.all([
        recommendWallet(request),
        s.currentCardId ? evaluateWallet(request, [s.currentCardId]).catch(() => null) : Promise.resolve(null),
      ])
      saveSession({ request, result })
      if (current) {
        setGap(buildGapData(result.recommendation.wallet, current.wallet, result.spend.groups))
        return // the popup sits on top of the loading screen; its button continues to the result page
      }
      router.push('/analyse/result')
    } catch (e) {
      setError(e instanceof SimulatorApiError ? e.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="sim-page">
      <PageHero tone="light" tall image="/images/heroes/Analyze-new.webp" width={1112}
        kicker="BEST FOR ME" kickerColor="#5a6a85"
        title={<>Find the cards<br />that pay you <span style={{ color: '#C9972B' }}>most.</span></>}
        subtitle="Tell us how you spend. Earnn finds the cards that earn you the most — and tells you which card to use where." />

      <div className="sim-content">
        <div className="sim-trust">
          {(mode === 'upload'
            ? [{ icon: '🛡️', label: 'No bank login required' }, { icon: '✂️', label: 'Sensitive information automatically masked' }, { icon: '🇦🇪', label: 'No personal info is stored' }, { icon: '🗑️', label: 'Statement deleted after analysis' }]
            : [{ icon: '🔒', label: 'No bank login · No card details required' }]
          ).map(t => <div key={t.label}><span>{t.icon}</span><span>{t.label}</span></div>)}
        </div>

        <div className="sim-method-switch" role="tablist" aria-label="How do you want to enter your spend?">
          {(['upload', 'manual'] as const).map(m => (
            <button key={m} type="button" role="tab" aria-selected={mode === m} className={mode === m ? 'on' : ''}
              onClick={() => { setMode(m); setError('') }}>
              {m === 'upload' ? '📄 Upload Statement' : '✏️ Manual Entry'}
              <small className={m === 'upload' ? 'rec' : ''}>{m === 'upload' ? 'RECOMMENDED' : 'Enter spending yourself'}</small>
            </button>
          ))}
        </div>

        {mode === 'upload' && <StatementUpload onSubmit={submitStatement} submitting={loading} submitError={error} />}

        {mode === 'manual' && (
          <>
            <ProfileNotice />
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
          </>
        )}
      </div>

      {loading && (
        <CardColumnsLoader cardIds={animCardIds} title="Building your smart wallet…"
          subtitle="Testing every combination of up to three UAE cards against your spending" />
      )}

      {gap && <ComparisonPopup data={gap} onContinue={() => { setGap(null); router.push('/analyse/result') }} />}

      <SimulatorStyles />
      <style>{`
        .sim-page .sim-content { padding-top:12px; }
        .sim-trust { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin:10px 0 0; }
        .sim-trust > div { display:flex; align-items:center; gap:6px; background:#EEF3FF; border:1px solid #D6E0F5; border-radius:6px; padding:5px 12px; max-width:100%; }
        .sim-trust > div > span:first-child { font-size:13px; flex-shrink:0; }
        .sim-trust > div > span:last-child { font-size:11px; font-weight:600; color:#0E3785; }
        @media (max-width:560px) { .sim-trust { gap:6px; } .sim-trust > div { padding:4px 9px; } .sim-trust > div > span:last-child { font-size:10.5px; } }
        .sim-method-switch { display:grid; grid-template-columns:1fr 1fr; gap:6px; max-width:640px; margin:16px auto 0; padding:0 6px; border-bottom:2px solid #0E3785; }
        .sim-method-switch button { position:relative; min-height:56px; padding:8px 12px 7px; border:1.5px solid #CBD7EF; border-bottom:0; border-radius:14px 14px 0 0; cursor:pointer; text-align:center; font-size:14px; font-weight:700; background:#E6ECF9; color:#5A6A85; margin-bottom:-2px; transition:background .2s, color .2s, box-shadow .2s; }
        .sim-method-switch button:hover:not(.on) { background:#F1F5FF; color:#0E3785; }
        .sim-method-switch button.on { background:#fff; color:#0E3785; border-color:#0E3785; border-top-width:4px; padding-top:5px; box-shadow:0 -6px 16px rgba(14,55,133,.12); z-index:1; }
        .sim-method-switch button:not(.on)::after { content:'Tap to open'; position:absolute; right:10px; top:6px; font-size:9px; font-weight:700; letter-spacing:.04em; color:#8A9BBA; }
        .sim-method-switch small { display:block; margin-top:1px; font-size:9.5px; line-height:1.1; font-weight:800; color:#7A8CA8; }
        .sim-method-switch button.on small { color:#5A6A85; }
        .sim-method-switch small.rec { letter-spacing:.08em; color:#A8801B; animation:simRecFlash 1.35s ease-in-out infinite; }
        .sim-method-switch button.on small.rec { color:#A8801B; }
        @keyframes simRecFlash { 0%,100% { opacity:.55; } 50% { opacity:1; } }
        @media (max-width:560px) { .sim-method-switch button:not(.on)::after { display:none; } .sim-method-switch button { font-size:13px; } }
      `}</style>
    </div>
  )
}
