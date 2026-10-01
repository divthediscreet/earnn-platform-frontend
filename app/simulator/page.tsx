'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { recommendWallet, saveSession, SimulatorApiError, useSimulatorSession, type SimulatorRequest } from '@/lib/wallet-simulator/api'
import { SIMULATOR_GROUPS, aed } from '@/lib/wallet-simulator/groups'

const MAX_CATEGORY_AED = 100_000

export default function SimulatorSpendPage() {
  // "Edit my spending" from the result page: start from what the user entered last time.
  const session = useSimulatorSession()
  return <SpendForm key={session ? 'restored' : 'fresh'} initial={session?.request} />
}

function SpendForm({ initial }: { initial?: SimulatorRequest }) {
  const router = useRouter()
  const [spend, setSpend] = useState<Record<string, string>>(() => Object.fromEntries(
    Object.entries(initial?.form_spend ?? {}).filter(([, v]) => v > 0).map(([k, v]) => [k, String(v)])))
  const [salary, setSalary] = useState(initial?.salary_aed ? String(initial.salary_aed) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const amounts = Object.fromEntries(SIMULATOR_GROUPS.map(g => [g.key, parseFloat(spend[g.key] || '0') || 0]))
  const totalMonthly = Object.values(amounts).reduce((a, b) => a + b, 0)
  const salaryNum = parseFloat(salary) || 0
  const profileItems = SIMULATOR_GROUPS
    .map(g => ({ ...g, value: amounts[g.key] }))
    .filter(g => g.value > 0)
    .sort((a, b) => b.value - a.value)
  const largest = Math.max(...profileItems.map(g => g.value), 1)

  const submit = async () => {
    if (totalMonthly <= 0) return setError('Enter at least one monthly amount.')
    if (salaryNum <= 0) return setError('Enter your monthly salary so we only suggest cards you can apply for.')
    setError('')
    setLoading(true)
    const request = { form_spend: amounts, salary_aed: salaryNum }
    try {
      const result = await recommendWallet(request)
      saveSession({ request, result })
      router.push('/simulator/result')
    } catch (e) {
      setError(e instanceof SimulatorApiError ? e.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="sim-page">
      <section className="sim-hero">
        <div className="sim-hero-grid" />
        <div className="sim-hero-inner">
          <div className="sim-hero-badge">UAE&apos;s smartest credit card rewards engine</div>
          <div className="sim-hero-eyebrow">YOUR SMART WALLET</div>
          <h1>Find the cards that pay you most</h1>
          <p>Tell us how you spend. Earnn will build the wallet of up to three cards that earns you the most — and tell you which card to use for what.</p>
        </div>
      </section>

      <div className="sim-content">
        <div className="sim-intro">
          <div>
            <div className="sim-eyebrow">BUILD YOUR SPENDING PROFILE</div>
            <h2>Tell us how you spend each month</h2>
            <p>Enter only what applies to you. Leave the rest blank.</p>
          </div>
          <button type="button" className="sim-reset" onClick={() => { setSpend({}); setError('') }}>Reset amounts</button>
        </div>

        <section className="sim-setup">
          <div className="sim-setup-heading">
            <div className="sim-eyebrow">A LITTLE ABOUT YOU</div>
            <p>This helps us check which cards you could be eligible for.</p>
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

        <div className="sim-layout">
          <section>
            <div className="sim-spend-heading">
              <div className="sim-eyebrow">YOUR MONTHLY SPENDING</div>
              <p>Add a monthly amount for each category.</p>
            </div>
            <div className="sim-grid">
              {SIMULATOR_GROUPS.map(g => {
                const value = amounts[g.key]
                const active = value > 0
                return (
                  <article key={g.key} className={`sim-cat ${active ? 'is-active' : ''}`}>
                    <div className="sim-cat-name">
                      <span className="sim-cat-icon">{g.icon}</span>
                      <div>
                        <h3>{g.label}</h3>
                        <p>{active ? 'Monthly spending' : g.hint}</p>
                      </div>
                    </div>
                    <label className="sim-aed">
                      <span>AED</span>
                      <input type="number" inputMode="numeric" min="0" max={MAX_CATEGORY_AED} step="100" placeholder="0"
                        value={spend[g.key] ?? ''}
                        onChange={e => {
                          const raw = e.target.value
                          const parsed = Math.min(MAX_CATEGORY_AED, Math.max(0, parseFloat(raw) || 0))
                          setSpend(prev => ({ ...prev, [g.key]: raw === '' ? '' : String(parsed) }))
                        }}
                        aria-label={`${g.label} monthly spend in AED`} />
                    </label>
                  </article>
                )
              })}
            </div>
          </section>

          <aside className="sim-summary">
            <div className="sim-eyebrow">YOUR SPENDING</div>
            <div className="sim-total">{aed(totalMonthly)}</div>
            <div className="sim-month">/ month</div>
            {profileItems.length > 0 ? (
              <div className="sim-bars">
                {profileItems.slice(0, 6).map(g => (
                  <div key={g.key}>
                    <div><span>{g.icon} {g.label}</span><b>{aed(g.value)}</b></div>
                    <span><i style={{ width: `${(g.value / largest) * 100}%` }} /></span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="sim-empty">Your spending mix will appear here as you add amounts.</p>
            )}
            <div className="sim-count">{profileItems.length} categor{profileItems.length === 1 ? 'y' : 'ies'} added</div>
            {error && <div className="sim-error" role="alert">⚠ {error}</div>}
            <button type="button" className="sim-cta" onClick={submit} disabled={totalMonthly <= 0 || loading}>
              {loading ? 'Building your smart wallet…' : 'Build My Smart Wallet →'}
            </button>
          </aside>
        </div>
      </div>

      {loading && (
        <div className="sim-loading" role="status" aria-live="polite">
          <div className="sim-loading-cards"><i /><i /><i /></div>
          <p className="sim-loading-title">Building your smart wallet…</p>
          <p className="sim-loading-sub">Testing every combination of up to three UAE cards against your spending</p>
        </div>
      )}

      <style>{`
        .sim-page { background:#F8FAFF; }
        .sim-hero { background:linear-gradient(135deg,#0E3785 0%,#092962 100%); color:white; padding:34px 24px 30px; text-align:center; position:relative; overflow:hidden; }
        .sim-hero-grid { position:absolute; inset:0; opacity:.04; background-image:linear-gradient(white 1px,transparent 1px),linear-gradient(90deg,white 1px,transparent 1px); background-size:48px 48px; }
        .sim-hero-inner { max-width:780px; margin:0 auto; position:relative; }
        .sim-hero-badge { display:inline-block; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.2); border-radius:99px; padding:5px 13px; font-size:11px; font-weight:700; letter-spacing:.04em; margin-bottom:12px; }
        .sim-hero-eyebrow { color:#FFD76A; font-size:11px; font-weight:800; letter-spacing:.16em; margin-bottom:8px; }
        .sim-hero h1 { font-size:clamp(30px,4vw,42px); font-weight:800; line-height:1.1; margin:0 0 10px; color:white; letter-spacing:-.04em; }
        .sim-hero p { font-size:clamp(14px,1.8vw,16px); color:rgba(255,255,255,.82); line-height:1.55; max-width:660px; margin:0 auto; }
        .sim-content { max-width:1160px; margin:0 auto; padding:24px 24px 44px; }
        .sim-intro { display:flex; align-items:flex-end; justify-content:space-between; gap:20px; margin:10px 0 16px; }
        .sim-eyebrow { color:#58709E; font-size:10px; font-weight:800; letter-spacing:.13em; }
        .sim-intro h2 { margin:5px 0 4px; color:#0D1828; font-size:25px; letter-spacing:-.035em; }
        .sim-intro p, .sim-setup-heading p, .sim-spend-heading p { margin:0; color:#5A6A85; font-size:13px; }
        .sim-reset { background:transparent; border:0; color:#0E3785; font-size:13px; font-weight:700; cursor:pointer; padding:8px 0; }
        .sim-setup { background:#fff; border:1px solid #D6E0F5; border-radius:18px; padding:18px 20px; display:grid; grid-template-columns:minmax(190px,.9fr) minmax(0,1.8fr); gap:24px; box-shadow:0 5px 18px rgba(14,55,133,.05); margin-bottom:22px; align-items:center; }
        .sim-setup-heading p { margin-top:6px; max-width:240px; line-height:1.45; }
        .sim-salary { border:1px solid #D6E0F5; background:#F8FAFF; border-radius:12px; padding:11px 13px; max-width:360px; }
        .sim-salary > span { display:block; color:#5A6A85; font-size:11px; font-weight:700; margin-bottom:8px; }
        .sim-salary > div { display:flex; align-items:center; gap:7px; }
        .sim-salary b { color:#0E3785; font-size:12px; }
        .sim-salary input { width:100%; border:0; outline:0; background:transparent; color:#0D1828; font-size:16px; font-weight:750; }
        .sim-layout { display:grid; grid-template-columns:minmax(0,1fr) 292px; gap:22px; align-items:start; }
        .sim-spend-heading { margin-bottom:12px; }
        .sim-spend-heading p { margin-top:5px; }
        .sim-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .sim-cat { background:#fff; border:1px solid #E0E7F3; border-radius:14px; padding:14px; min-height:72px; display:flex; align-items:center; justify-content:space-between; gap:10px; transition:background .2s,border-color .2s,box-shadow .2s; }
        .sim-cat.is-active { background:#FAFCFF; border-color:#AFC5E9; box-shadow:0 5px 15px rgba(14,55,133,.07); }
        .sim-cat-name { display:flex; align-items:center; gap:9px; min-width:0; }
        .sim-cat-icon { width:34px; height:34px; display:grid; place-items:center; border-radius:10px; background:#EEF3FF; font-size:17px; flex:0 0 auto; }
        .sim-cat.is-active .sim-cat-icon { background:#E5EEFF; }
        .sim-cat-name h3 { margin:0; color:#0D1828; font-size:13px; line-height:1.25; }
        .sim-cat-name p { margin:3px 0 0; color:#7A8CA8; font-size:10px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:150px; }
        .sim-aed { width:112px; display:flex; align-items:center; justify-content:flex-end; gap:4px; background:#F2F5FA; border-radius:9px; padding:9px 8px; flex:0 0 auto; }
        .sim-cat.is-active .sim-aed { background:#E8EEF8; }
        .sim-aed span { color:#58709E; font-size:10px; font-weight:750; }
        .sim-aed input { min-width:0; width:70px; border:0; outline:0; background:transparent; text-align:right; color:#0E3785; font-size:14px; font-weight:800; }
        .sim-aed:focus-within { outline:2px solid rgba(57,121,232,.32); background:#fff; }
        .sim-aed input::placeholder { color:#7A8CA8; }
        .sim-summary { position:sticky; top:94px; background:linear-gradient(160deg,#0E3785,#08255C); color:white; border-radius:18px; padding:19px; box-shadow:0 14px 28px rgba(10,40,96,.18); }
        .sim-summary .sim-eyebrow { color:#AFC7F6; }
        .sim-total { font-size:28px; font-weight:850; letter-spacing:-.045em; margin-top:8px; }
        .sim-month { font-size:12px; color:#B9C9E7; margin-top:1px; }
        .sim-bars { display:grid; gap:10px; margin:20px 0; }
        .sim-bars > div > div { display:flex; justify-content:space-between; gap:8px; font-size:11px; color:#EAF0FF; margin-bottom:5px; }
        .sim-bars b { color:#FFD76A; }
        .sim-bars > div > span { display:block; height:5px; background:rgba(255,255,255,.17); border-radius:99px; overflow:hidden; }
        .sim-bars i { display:block; height:100%; border-radius:inherit; background:#55D5B7; transition:width .38s cubic-bezier(.2,.8,.2,1); }
        .sim-empty { color:#B9C9E7; font-size:12px; line-height:1.5; min-height:108px; margin:20px 0; }
        .sim-count { border-top:1px solid rgba(255,255,255,.16); padding-top:12px; color:#C9D7F2; font-size:11px; }
        .sim-error { margin-top:10px; background:rgba(255,219,214,.14); border:1px solid rgba(255,219,214,.35); border-radius:8px; padding:8px; color:#FFE3DF; font-size:11px; line-height:1.45; }
        .sim-cta { width:100%; margin-top:14px; min-height:44px; padding:12px; border:0; border-radius:10px; background:#FFD76A; color:#092962; font-size:13px; font-weight:850; cursor:pointer; }
        .sim-cta:disabled { background:#7F95BD; color:#DCE6FA; cursor:not-allowed; }
        .sim-loading { position:fixed; inset:0; z-index:1200; background:rgba(8,37,92,.92); backdrop-filter:blur(6px); display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; padding:24px; color:white; }
        .sim-loading-cards { position:relative; width:120px; height:80px; perspective:600px; margin-bottom:26px; }
        .sim-loading-cards i { position:absolute; inset:0; border-radius:10px; background:linear-gradient(135deg,#2553A8,#0E3785 55%,#06183F); box-shadow:0 12px 30px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.15); animation:sim-spin 2.4s cubic-bezier(.45,.05,.55,.95) infinite; }
        .sim-loading-cards i:nth-child(2) { animation-delay:.4s; background:linear-gradient(135deg,#e6c47a,#c9a24b 45%,#94712f); }
        .sim-loading-cards i:nth-child(3) { animation-delay:.8s; background:linear-gradient(135deg,#1DAA86,#0A7A60 48%,#04392D); }
        @keyframes sim-spin { 0% { transform:rotateY(0) translateX(0); } 50% { transform:rotateY(180deg) translateX(8px); } 100% { transform:rotateY(360deg) translateX(0); } }
        .sim-loading-title { font-size:20px; font-weight:800; margin:0; letter-spacing:-.02em; }
        .sim-loading-sub { margin:8px 0 0; color:#B9C9E7; font-size:14px; max-width:360px; }
        @media (max-width:780px) { .sim-setup, .sim-layout { grid-template-columns:1fr; } .sim-summary { position:static; } .sim-salary { max-width:none; } }
        @media (max-width:560px) {
          .sim-content, .sim-hero { padding-left:16px; padding-right:16px; }
          .sim-grid { grid-template-columns:1fr; }
          .sim-intro { align-items:flex-start; flex-direction:column; gap:4px; }
        }
      `}</style>
    </div>
  )
}
