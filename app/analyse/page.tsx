'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { recommendWallet, saveSession, SimulatorApiError, useSimulatorSession, type SimulatorRequest } from '@/lib/wallet-simulator/api'
import { SIMULATOR_GROUPS, aed } from '@/lib/wallet-simulator/groups'
import { CardColumnsLoader, loadCardIds, preloadCardImages } from '@/components/wallet-simulator/loading-columns'

const MAX_CATEGORY_AED = 100_000

/** Two related categories entered as one total plus a slider: 0 = all on the left option, 10 = all on the right. */
type SplitDef = { id: 'grocery' | 'dining'; title: string; icon: string; left: { key: string; label: string; icon: string }; right: { key: string; label: string; icon: string } }
const SPLITS: SplitDef[] = [
  { id: 'grocery', title: 'Grocery store', icon: '🥬', left: { key: 'grocery_store', label: 'In-store', icon: '🛒' }, right: { key: 'grocery_online', label: 'Online', icon: '📱' } },
  { id: 'dining', title: 'Dining', icon: '🍽️', left: { key: 'dineout', label: 'Dine out', icon: '🍴' }, right: { key: 'food_delivery', label: 'Food delivery', icon: '🛵' } },
]
const SPLIT_KEYS = new Set(SPLITS.flatMap(d => [d.left.key, d.right.key]))
type SplitState = Record<SplitDef['id'], { total: string; step: number }>

/** Rebuild the slider state from saved per-category amounts (share rounded to the nearest 10%). */
function splitFromAmounts(spend: Record<string, number> | undefined): SplitState {
  const out = {} as SplitState
  for (const d of SPLITS) {
    const l = (spend?.[d.left.key] ?? 0) + (d.left.key === 'grocery_store' ? (spend?.grocery ?? 0) : 0) // `grocery` = key used by older saved sessions
    const r = spend?.[d.right.key] ?? 0
    const total = l + r
    out[d.id] = { total: total > 0 ? String(total) : '', step: total > 0 ? Math.round((r / total) * 10) : 5 }
  }
  return out
}

function splitAmounts(total: string, step: number): [number, number] {
  const t = parseFloat(total) || 0
  const left = Math.round((t * (10 - step)) / 10)
  return [left, t - left]
}

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
  const [salary, setSalary] = useState(initial?.salary_aed ? String(initial.salary_aed) : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [animCardIds, setAnimCardIds] = useState<string[]>([]) // card images for the holding screen

  useEffect(() => {
    // fetch the card list and download the images now, so the holding screen shows them instantly
    loadCardIds().then(ids => { preloadCardImages(ids); setAnimCardIds(ids) })
  }, [])

  const amounts: Record<string, number> = Object.fromEntries(SIMULATOR_GROUPS.map(g => [g.key, parseFloat(spend[g.key] || '0') || 0]))
  for (const d of SPLITS) {
    const [l, r] = splitAmounts(splits[d.id].total, splits[d.id].step)
    amounts[d.left.key] = l
    amounts[d.right.key] = r
  }
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
      router.push('/analyse/result')
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
          <button type="button" className="sim-reset" onClick={() => { setSpend({}); setSplits(splitFromAmounts(undefined)); setError('') }}>Reset amounts</button>
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
            <div className="sim-pairs">
              {SPLITS.map(d => {
                const { total, step } = splits[d.id]
                const [l, r] = splitAmounts(total, step)
                const active = (parseFloat(total) || 0) > 0
                const leftPct = (10 - step) * 10
                return (
                  <article key={d.id} className={`sim-cat sim-split ${active ? 'is-active' : ''}`}>
                    <div className="sim-split-head">
                      <div className="sim-cat-name">
                        <span className="sim-cat-icon">{d.icon}</span>
                        <div>
                          <h3>{d.title}</h3>
                          <p>{active ? 'Monthly spending' : 'Total, then slide to split'}</p>
                        </div>
                      </div>
                      <label className="sim-aed">
                        <span>AED</span>
                        <input type="number" inputMode="numeric" min="0" max={MAX_CATEGORY_AED} step="100" placeholder="0"
                          value={total}
                          onChange={e => {
                            const raw = e.target.value
                            const parsed = Math.min(MAX_CATEGORY_AED, Math.max(0, parseFloat(raw) || 0))
                            setSplits(prev => ({ ...prev, [d.id]: { ...prev[d.id], total: raw === '' ? '' : String(parsed) } }))
                          }}
                          aria-label={`${d.title} total monthly spend in AED`} />
                      </label>
                    </div>
                    <input type="range" min={0} max={10} step={1} value={step} className="sim-range"
                      style={{ ['--pos' as string]: `${step * 10}%` }}
                      onChange={e => { const v = Number(e.target.value); setSplits(prev => ({ ...prev, [d.id]: { ...prev[d.id], step: v } })) }}
                      aria-label={`${d.title}: share spent ${d.left.label.toLowerCase()} versus ${d.right.label.toLowerCase()}`}
                      aria-valuetext={`${leftPct}% ${d.left.label}, ${100 - leftPct}% ${d.right.label}`} />
                    <div className="sim-slide-labels">
                      <span className="sim-slide-end">
                        <i>{d.left.icon}</i>
                        <span><b>{d.left.label}</b><em>{leftPct}%{active ? ` · ${aed(l)}` : ''}</em></span>
                      </span>
                      <span className="sim-slide-end is-right">
                        <span><b>{d.right.label}</b><em>{100 - leftPct}%{active ? ` · ${aed(r)}` : ''}</em></span>
                        <i>{d.right.icon}</i>
                      </span>
                    </div>
                  </article>
                )
              })}
            </div>
            <div className="sim-grid">
              {SIMULATOR_GROUPS.filter(g => !SPLIT_KEYS.has(g.key)).map(g => {
                const value = amounts[g.key]
                const active = value > 0
                return (
                  <article key={g.key} className={`sim-cat ${g.key === 'miscellaneous' ? 'sim-cat-wide' : ''} ${active ? 'is-active' : ''}`}>
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
        <CardColumnsLoader cardIds={animCardIds} title="Building your smart wallet…"
          subtitle="Testing every combination of up to three UAE cards against your spending" />
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
        .sim-setup { background:#fff; border:1px solid #D6E0F5; border-radius:12px; padding:8px 14px; display:flex; flex-wrap:wrap; gap:6px 18px; box-shadow:0 3px 10px rgba(14,55,133,.04); margin-bottom:16px; align-items:center; justify-content:space-between; }
        .sim-setup-heading { display:flex; align-items:baseline; flex-wrap:wrap; gap:2px 12px; }
        .sim-setup-heading p { margin-top:0; line-height:1.4; }
        .sim-salary { display:flex; align-items:center; gap:10px; border:1px solid #D6E0F5; background:#F8FAFF; border-radius:9px; padding:5px 11px; }
        .sim-salary > span { color:#5A6A85; font-size:11px; font-weight:700; white-space:nowrap; }
        .sim-salary > div { display:flex; align-items:center; gap:6px; }
        .sim-salary b { color:#0E3785; font-size:12px; }
        .sim-salary input { width:130px; border:0; outline:0; background:transparent; color:#0D1828; font-size:14px; font-weight:750; }
        .sim-layout { display:grid; grid-template-columns:minmax(0,1fr) 292px; gap:22px; align-items:start; }
        .sim-spend-heading { margin-bottom:12px; }
        .sim-spend-heading p { margin-top:5px; }
        .sim-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; }
        .sim-cat-wide { grid-column:1 / -1; }
        .sim-pairs { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px; margin-bottom:12px; }
        .sim-split { flex-direction:column; align-items:stretch; justify-content:flex-start; gap:12px; padding:12px 14px; }
        .sim-split-head { display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%; }
        .sim-slide-labels { display:flex; align-items:center; justify-content:space-between; gap:10px; width:100%; margin-top:-2px; }
        .sim-slide-end { display:inline-flex; align-items:center; gap:5px; min-width:0; white-space:nowrap; }
        .sim-slide-end i { font-style:normal; font-size:18px; line-height:1; }
        .sim-slide-end > span { display:flex; flex-direction:column; gap:1px; line-height:1.2; }
        .sim-slide-end.is-right > span { text-align:right; align-items:flex-end; }
        .sim-slide-end b { color:#0D1828; font-size:12px; }
        .sim-slide-end em { font-style:normal; color:#0E3785; font-size:10.5px; font-weight:750; }
        .sim-range { -webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:99px; outline:0; cursor:pointer;
          background:linear-gradient(90deg,#AFC5E9 0 var(--pos),#E0E7F3 var(--pos) 100%); }
        .sim-range::-webkit-slider-thumb { -webkit-appearance:none; width:22px; height:22px; border-radius:50%; background:#0E3785; border:3px solid #fff; box-shadow:0 2px 8px rgba(14,55,133,.4); }
        .sim-range::-moz-range-thumb { width:18px; height:18px; border-radius:50%; background:#0E3785; border:3px solid #fff; box-shadow:0 2px 8px rgba(14,55,133,.4); }
        .sim-range:focus-visible { outline:2px solid rgba(57,121,232,.5); outline-offset:6px; }
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
        @media (max-width:780px) { .sim-layout { grid-template-columns:1fr; } .sim-summary { position:static; } .sim-pairs { grid-template-columns:1fr; } }
        @media (max-width:560px) {
          .sim-content, .sim-hero { padding-left:16px; padding-right:16px; }
          .sim-grid, .sim-pairs { grid-template-columns:1fr; }
          .sim-intro { align-items:flex-start; flex-direction:column; gap:4px; }
        }
      `}</style>
    </div>
  )
}
