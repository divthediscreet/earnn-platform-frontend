'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ExploreStage from '@/components/explore/ExploreStage'
import heroStyles from '@/components/explore/explore.module.css'
import { evaluateWallet, recommendWallet, saveSession, SimulatorApiError, useSimulatorSession, type RewardMode, type SimulatorRequest } from '@/lib/wallet-simulator/api'
import { SPLIT_KEYS, SimulatorStyles, SpendEntryFields, computeAmounts, splitFromAmounts, type SplitState } from '@/components/wallet-simulator/spend-entry'
import { StatementUpload, type StatementSubmit } from '@/components/wallet-simulator/statement-upload'
import { ComparisonPopup, buildGapData, type GapData } from '@/components/wallet-simulator/gap-popup'
import { pingBackend } from '@/lib/api'
import { ensureProfileLoaded, patchProfile, readProfile } from '@/lib/profile/storage'
import { SalaryPrompt } from '@/components/wallet-simulator/salary-prompt'
import { useSavedProfile } from '@/lib/profile/useSavedProfile'
import SnapshotToast from '@/components/profile/SnapshotToast'
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
  // null = the page with the two choices (opening the page never starts on a form); 'upload' / 'manual' open that way of sharing spending in a pop-up
  const [mode, setMode] = useState<'upload' | 'manual' | null>(null)
  // Spending saved in this browser: ask once whether to use it, then calculate straight away (no re-entry).
  const saved = useSavedProfile()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [savedChecked, setSavedChecked] = useState(false)
  // /analyse?mode=manual (e.g. the Compare page's "Let Earnn choose for you") opens Manual Entry instead of the saved-spending question.
  useEffect(() => {
    if (!saved.ready || savedChecked) return
    /* eslint-disable react-hooks/set-state-in-effect */
    setSavedChecked(true)
    if (new URLSearchParams(window.location.search).get('mode') === 'manual') setMode('manual')
    else if (!initial && saved.spend && saved.salary) setConfirmOpen(true)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [saved.ready, saved.spend, saved.salary, savedChecked, initial])
  const [gap, setGap] = useState<GapData | null>(null)
  const [askSalary, setAskSalary] = useState(false) // friendly prompt instead of an error when salary is empty
  const [animCardIds, setAnimCardIds] = useState<string[]>([]) // card images for the holding screen

  useEffect(() => {
    pingBackend() // warm the backend before a statement upload
    // fetch the card list and download the images now, so the holding screen shows them instantly
    loadCardIds().then(ids => { preloadCardImages(ids); setAnimCardIds(ids) })
  }, [])

  // Saved details: restore the browser-local profile unless "Edit my spending" supplied a session.
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
    if (!profileReady) return
    const timer = setTimeout(() => patchProfile({
      salary,
      spend: Object.fromEntries(Object.entries(amounts).filter(([, v]) => v > 0).map(([k, v]) => [k, String(v)])),
      monthly_total: undefined,
    }), 400)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileReady, salary, amountsKey])

  const totalMonthly = Object.values(amounts).reduce((a, b) => a + b, 0)
  const salaryNum = parseFloat(salary) || 0

  const submit = async (salaryOverride?: number) => {
    const salaryValue = salaryOverride ?? salaryNum
    if (totalMonthly <= 0) return setError('Enter at least one monthly amount.')
    if (salaryValue <= 0) { setError(''); return setAskSalary(true) }
    setError('')
    setLoading(true)
    const request: SimulatorRequest = { form_spend: amounts, salary_aed: salaryValue, reward_mode: rewardMode }
    try {
      const result = await recommendWallet(request)
      saveSession({ request, result })
      router.push('/analyse/result')
    } catch (e) {
      setError(e instanceof SimulatorApiError ? e.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  // The saved spending and salary, confirmed by the user: same request as the manual form, without typing anything again.
  const runSaved = async () => {
    if (!saved.spend || !saved.salary) return
    setConfirmOpen(false)
    setError('')
    setLoading(true)
    const request: SimulatorRequest = { form_spend: saved.spend, salary_aed: Number(saved.salary), reward_mode: rewardMode }
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
      <div className={heroStyles.page}>
        <div className={heroStyles.wrap}>
          <section className={heroStyles.hero}>
            <div className={heroStyles.heroText}>
              <span className={heroStyles.kicker}>Explore UAE credit cards</span>
              <h1><em>Get more back</em>from every dirham<br />you spend.</h1>
              <p>The right credit cards could help you earn 4–6% back in rewards on eligible spending. Earnn helps you find the best combination and shows you which card to use, and where.</p>
              <div className={heroStyles.heroCtas}>
                <button type="button" className={heroStyles.primary} style={{ border: 0, font: 'inherit', cursor: 'pointer' }} onClick={() => { setError(''); setMode('upload') }}>
                  <span><b>Upload statement</b></span>
                  <i className="ti ti-arrow-right" aria-hidden />
                </button>
                <button type="button" className={heroStyles.secondary} style={{ font: 'inherit', cursor: 'pointer' }} onClick={() => { setError(''); setMode('manual') }}>
                  <span><b>Manual entry</b></span>
                  <i className="ti ti-arrow-right" aria-hidden />
                </button>
              </div>
              <p className={heroStyles.footnote}>Your rewards depend on spending categories, card conditions, fees and limits.</p>
            </div>
            <ExploreStage />
          </section>
        </div>
      </div>

      <div className="sim-content">
        {!mode && (
          <div className="ex-choice">
            <h2>How would you like to share your spending?</h2>
            <p>Pick one. Either way, Earnn finds the best set of cards for you.</p>
            <div className="ex-boxes">
              <button type="button" className="ex-box ex-box-rec" onClick={() => { setError(''); setMode('upload') }}>
                <span className="ex-crown"><span aria-hidden>👑</span> Recommended</span>
                <span className="ex-icon" aria-hidden>📄</span>
                <b>Upload my statement</b>
                <small>Upload one credit card statement (PDF). Earnn reads it and sorts your spending for you. Nothing to type, and the most accurate.</small>
                <span className="ex-go">Upload a statement →</span>
              </button>
              <button type="button" className="ex-box" onClick={() => { setError(''); setMode('manual') }}>
                <span className="ex-icon" aria-hidden>✏️</span>
                <b>Enter manually</b>
                <small>Type roughly how much you spend each month in each category. Takes about two minutes. Estimates are fine.</small>
                <span className="ex-go">Enter my spending →</span>
              </button>
            </div>
          </div>
        )}

        {mode && (
          <div className="ex-overlay" onClick={() => { setMode(null); setError('') }}>
          <section className="sim-page ex-panel" role="dialog" aria-modal="true" aria-label={mode === 'upload' ? 'Upload my statement' : 'Enter my spending'} onClick={e => e.stopPropagation()}>
          <button type="button" className="ex-close" onClick={() => { setMode(null); setError('') }} aria-label="Close">×</button>
        <div className="sim-trust">
          {(mode === 'upload'
            ? [{ icon: '🛡️', label: 'No bank login required' }, { icon: '✂️', label: 'Sensitive information automatically masked' }, { icon: '🇦🇪', label: 'No personal info is stored' }, { icon: '🤝', label: 'Your data is never shared with third parties' }]
            : [{ icon: '🔒', label: 'No bank login · No card details required' }]
          ).map(t => <div key={t.label}><span>{t.icon}</span><span>{t.label}</span></div>)}
        </div>


        {mode === 'upload' && <StatementUpload onSubmit={submitStatement} submitting={loading} submitError={error} onManual={() => { setMode('manual'); setError('') }} />}

        {mode === 'manual' && (
          <>
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
                  value={salary} onChange={e => setSalary(e.target.value)} aria-label="Monthly salary in AED" />
              </div>
            </label>
            <div className="sim-mode sim-mode-cta" role="radiogroup" aria-label="Which rewards do you want?">
              <span>I want</span>
              {(['cashback', 'miles'] as const).map(m => (
                <button key={m} type="button" role="radio" aria-checked={rewardMode === m} className={rewardMode === m ? 'on' : ''}
                  onClick={() => setRewardMode(m)}>{m === 'cashback' ? 'Cashback' : 'Miles'}</button>
              ))}
            </div>
            <button type="button" className="sim-cta" onClick={() => submit()} disabled={totalMonthly <= 0 || loading}>
              {loading ? 'Building your smart wallet…' : 'Find My Best Cards →'}
            </button>
          </>} />
          {askSalary && (
            <SalaryPrompt salary={salary} setSalary={setSalary} onClose={() => setAskSalary(false)}
              onConfirm={value => { setAskSalary(false); submit(value) }} />
          )}
          </>
        )}
          </section>
          </div>
        )}
      </div>

      {confirmOpen && !loading && <SnapshotToast profile={saved} onConfirm={runSaved} onEdit={() => { setConfirmOpen(false); setMode('manual') }} onDone={() => {}} />}

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
        .ex-choice { max-width:860px; margin:26px auto 0; padding:0 6px; text-align:center; }
        .ex-choice h2 { margin:0; font-size:24px; font-weight:800; color:#0D1828; }
        .ex-choice > p { margin:6px 0 0; font-size:14.5px; color:#5A6A85; }
        .ex-boxes { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin-top:34px; }
        .ex-box { position:relative; display:flex; flex-direction:column; align-items:center; gap:8px; padding:30px 22px 22px; border:1.5px solid #CBD7EF; border-radius:18px; background:#fff; cursor:pointer; text-align:center; font-family:inherit; transition:box-shadow .15s, border-color .15s, transform .15s; }
        .ex-box:hover { border-color:#0E3785; box-shadow:0 12px 30px rgba(14,55,133,.14); transform:translateY(-2px); }
        .ex-box-rec { border-color:#E0B13C; background:linear-gradient(180deg,#FFFBEF,#fff); }
        .ex-crown { position:absolute; top:-14px; left:50%; transform:translateX(-50%); white-space:nowrap; padding:4px 14px; border-radius:999px; background:#F7C948; color:#5A4200; font-size:12px; font-weight:800; box-shadow:0 4px 12px rgba(247,201,72,.45); }
        .ex-icon { font-size:30px; }
        .ex-box b { font-size:18px; color:#0D1828; }
        .ex-box small { font-size:13.5px; line-height:1.5; color:#5A6A85; }
        .ex-go { margin-top:6px; font-size:14px; font-weight:800; color:#0E3785; }
        .ex-overlay { position:fixed; inset:0; z-index:1200; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,.6); }
        .ex-panel { position:relative; width:96%; max-width:1100px; max-height:94vh; overflow-y:auto; border-radius:22px; box-shadow:0 24px 64px rgba(0,0,0,.3); padding:20px 22px 24px; background:#fff; }
        .ex-close { position:absolute; top:12px; right:18px; z-index:2; border:0; background:none; color:#5A6A85; font-size:26px; line-height:1; cursor:pointer; }
        @media (max-width:640px) { .ex-boxes { grid-template-columns:1fr; gap:26px; } .ex-panel { padding:16px 12px 20px; } }
        @media (max-width:560px) { .sim-method-switch button:not(.on)::after { display:none; } .sim-method-switch button { font-size:13px; } }
      `}</style>
    </div>
  )
}
