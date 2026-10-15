'use client'

// The Analyse spend-entry form (category cards, the two split sliders, the live summary panel) and its styles, shared by the Analyse
// page and Trip Planner Step 1 so the two forms are one implementation. Moved from app/analyse/page.tsx without changes to markup or CSS.
import type { Dispatch, ReactNode, SetStateAction } from 'react'
import { SIMULATOR_GROUPS, aed } from '@/lib/wallet-simulator/groups'

export const MAX_CATEGORY_AED = 100_000

/** Two related categories, each with its own amount; the card's main box only shows their sum (read-only). */
export type SplitDef = { id: 'grocery' | 'dining'; title: string; icon: string; left: { key: string; label: string; icon: string }; right: { key: string; label: string; icon: string } }
export const SPLITS: SplitDef[] = [
  { id: 'grocery', title: 'Grocery store', icon: '🥬', left: { key: 'grocery_store', label: 'In-store', icon: '🛒' }, right: { key: 'grocery_online', label: 'Online', icon: '📱' } },
  { id: 'dining', title: 'Dining', icon: '🍽️', left: { key: 'dineout', label: 'Dine out', icon: '🍴' }, right: { key: 'food_delivery', label: 'Delivery', icon: '🛵' } },
]
export const SPLIT_KEYS = new Set(SPLITS.flatMap(d => [d.left.key, d.right.key]))
export type SplitState = Record<SplitDef['id'], { left: string; right: string }>

/** Rebuild the two amounts of each pair from saved per-category amounts. */
export function splitFromAmounts(spend: Record<string, number> | undefined): SplitState {
  const out = {} as SplitState
  for (const d of SPLITS) {
    const l = (spend?.[d.left.key] ?? 0) + (d.left.key === 'grocery_store' ? (spend?.grocery ?? 0) : 0) // `grocery` = key used by older saved sessions
    const r = spend?.[d.right.key] ?? 0
    out[d.id] = { left: l > 0 ? String(l) : '', right: r > 0 ? String(r) : '' }
  }
  return out
}

/** The two amounts of a pair as numbers. */
export function splitAmounts(split: { left: string; right: string }): [number, number] {
  return [parseFloat(split.left) || 0, parseFloat(split.right) || 0]
}

/** Per-category monthly amounts (each pair resolved into its two categories). */
export function computeAmounts(spend: Record<string, string>, splits: SplitState): Record<string, number> {
  const amounts: Record<string, number> = Object.fromEntries(SIMULATOR_GROUPS.map(g => [g.key, parseFloat(spend[g.key] || '0') || 0]))
  for (const d of SPLITS) {
    const [l, r] = splitAmounts(splits[d.id])
    amounts[d.left.key] = l
    amounts[d.right.key] = r
  }
  return amounts
}

interface SpendEntryProps {
  spend: Record<string, string>
  setSpend: Dispatch<SetStateAction<Record<string, string>>>
  splits: SplitState
  setSplits: Dispatch<SetStateAction<SplitState>>
  /** The button under the summary panel (Analyse: "Build My Smart Wallet", Trip Planner: "Continue"). */
  cta: ReactNode
  /** Optional control shown on the summary card's top row, right side (the Analyse page puts its Cashback / Miles switch here). */
  summaryAction?: ReactNode
  error?: string
  /** Optional wording for another page that reuses this form (Analyse keeps the defaults; Trip Planner supplies its own). */
  copy?: Partial<SpendEntryCopy>
}

export interface SpendEntryCopy {
  /** Small heading above the category cards; null hides it. */
  spendHeading: string | null
  spendSubtext: string
  summaryTitle: string
  categoryCount: (count: number) => string
}

const DEFAULT_COPY: SpendEntryCopy = {
  spendHeading: 'YOUR MONTHLY SPENDING',
  spendSubtext: 'Add a monthly amount for each category.',
  summaryTitle: 'YOUR SPENDING',
  categoryCount: count => `${count} categor${count === 1 ? 'y' : 'ies'} added`,
}

export function SpendEntryFields({ spend, setSpend, splits, setSplits, cta, summaryAction, error, copy }: SpendEntryProps) {
  const text = { ...DEFAULT_COPY, ...copy }
  const amounts = computeAmounts(spend, splits)
  const totalMonthly = Object.values(amounts).reduce((a, b) => a + b, 0)
  const profileItems = SIMULATOR_GROUPS
    .map(g => ({ ...g, value: amounts[g.key] }))
    .filter(g => g.value > 0)
    .sort((a, b) => b.value - a.value)
  const largest = Math.max(...profileItems.map(g => g.value), 1)
  return (
        <div className="sim-layout">
          <section>
            <div className="sim-spend-heading">
              {text.spendHeading && <div className="sim-eyebrow">{text.spendHeading}</div>}
              <p>{text.spendSubtext}</p>
            </div>
            <div className="sim-pairs">
              {SPLITS.map(d => {
                const [l, r] = splitAmounts(splits[d.id])
                const sum = l + r
                const active = sum > 0
                const setPart = (side: 'left' | 'right', raw: string) => {
                  const parsed = Math.min(MAX_CATEGORY_AED, Math.max(0, parseFloat(raw) || 0))
                  setSplits(prev => ({ ...prev, [d.id]: { ...prev[d.id], [side]: raw === '' ? '' : String(parsed) } }))
                }
                return (
                  <article key={d.id} className={`sim-cat sim-split ${active ? 'is-active' : ''}`}>
                    <div className="sim-split-head">
                      <div className="sim-cat-name">
                        <span className="sim-cat-icon">{d.icon}</span>
                        <div>
                          <h3>{d.title}</h3>
                          <p>{active ? 'Monthly spending' : d.left.label + ' + ' + d.right.label.toLowerCase()}</p>
                        </div>
                      </div>
                      {/* the total is only the sum of the two boxes below: plain text, shown once something is entered */}
                      {active && <div className="sim-split-total" aria-label={`${d.title} total monthly spend`}>{aed(sum)}</div>}
                    </div>
                    <div className="sim-sub-grid">
                      {([['left', d.left, splits[d.id].left], ['right', d.right, splits[d.id].right]] as const).map(([side, part, value]) => (
                        <label key={side} className="sim-sub">
                          <span className="sim-sub-name"><i>{part.icon}</i><b>{part.label}</b></span>
                          <span className="sim-aed">
                            <span>AED</span>
                            <input type="number" inputMode="numeric" min="0" max={MAX_CATEGORY_AED} step="100" placeholder="0"
                              value={value} onChange={e => setPart(side, e.target.value)}
                              aria-label={`${d.title} ${part.label.toLowerCase()} monthly spend in AED`} />
                          </span>
                        </label>
                      ))}
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
            <div className="sim-summary-top"><div className="sim-eyebrow">{text.summaryTitle}</div>{summaryAction}</div>
            <div className="sim-total-row"><div className="sim-total">{aed(totalMonthly)}</div><div className="sim-month">/ month</div></div>
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
            <div className="sim-count">{text.categoryCount(profileItems.length)}</div>
            {error && <div className="sim-error" role="alert">⚠ {error}</div>}
            {cta}
          </aside>
        </div>
  )
}

/** The page styles of the Analyse spend form (global `sim-*` classes). Render once on any page that uses them. */
export function SimulatorStyles() {
  return (
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
        .sim-mode { display:flex; align-items:center; gap:4px; border:1px solid #D6E0F5; background:#F8FAFF; border-radius:9px; padding:3px; }
        .sim-mode > span { color:#5A6A85; font-size:11px; font-weight:700; white-space:nowrap; padding:0 8px; }
        .sim-mode button { border:0; background:transparent; color:#0E3785; font-size:13px; font-weight:700; padding:6px 14px; border-radius:7px; cursor:pointer; }
        .sim-mode button.on { background:#0E3785; color:#fff; }
        .sim-setup-trip { border-color:#dfe7f5; }
        .sim-setup-trip .sim-eyebrow { color:#a8801b; }
        .sim-setup-trip .sim-salary { background:#f6f9ff; border-color:#dfe7f5; }
        .sim-modebox { justify-content:flex-start; margin-top:-6px; }
        .sim-modebox .sim-mode { background:#f6f9ff; border-color:#dfe7f5; }
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
        .sim-sub-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; width:100%; }
        .sim-sub { display:flex; flex-direction:column; gap:6px; background:#F8FAFF; border:1px solid #E0E7F3; border-radius:10px; padding:8px 9px; cursor:text; }
        .sim-sub-name { display:flex; align-items:center; gap:6px; min-width:0; }
        .sim-sub-name i { font-style:normal; font-size:16px; line-height:1; }
        .sim-sub-name b { color:#0D1828; font-size:12px; white-space:nowrap; }
        .sim-sub .sim-aed { width:100%; box-sizing:border-box; background:#fff; border:1px solid #E0E7F3; }
        .sim-sub .sim-aed input { width:100%; }
        .sim-sub:focus-within { border-color:#AFC5E9; box-shadow:0 0 0 2px rgba(57,121,232,.15); }
        .sim-split-total { color:#0E3785; font-size:16px; font-weight:800; white-space:nowrap; font-variant-numeric:tabular-nums; }
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
        .sim-summary-top { display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .sim-summary .sim-mode { background:rgba(255,255,255,.1); border-color:rgba(255,255,255,.22); padding:2px; }
        .sim-summary .sim-mode button { color:#DCE6FA; font-size:11.5px; padding:4px 10px; }
        .sim-summary .sim-mode button.on { background:#FFD76A; color:#092962; }
        .sim-total { font-size:28px; font-weight:850; letter-spacing:-.045em; margin-top:8px; }
        .sim-total-row { display:flex; align-items:baseline; flex-wrap:wrap; gap:0 6px; margin-top:8px; }
        .sim-total-row .sim-total { margin-top:0; }
        .sim-month { font-size:12px; color:#B9C9E7; }
        .sim-bars { display:grid; gap:10px; margin:20px 0; }
        .sim-bars > div > div { display:flex; justify-content:space-between; gap:8px; font-size:11px; color:#EAF0FF; margin-bottom:5px; }
        .sim-bars b { color:#FFD76A; }
        .sim-bars > div > span { display:block; height:5px; background:rgba(255,255,255,.17); border-radius:99px; overflow:hidden; }
        .sim-bars i { display:block; height:100%; border-radius:inherit; background:#55D5B7; transition:width .38s cubic-bezier(.2,.8,.2,1); }
        .sim-empty { color:#B9C9E7; font-size:12px; line-height:1.5; min-height:108px; margin:20px 0; }
        .sim-count { border-top:1px solid rgba(255,255,255,.16); padding-top:12px; color:#C9D7F2; font-size:11px; }
        .sim-error { margin-top:10px; background:rgba(255,219,214,.14); border:1px solid rgba(255,219,214,.35); border-radius:8px; padding:8px; color:#FFE3DF; font-size:11px; line-height:1.45; }
        .sim-cta { width:100%; margin-top:14px; min-height:var(--btn-height); padding:0 24px; border:0; border-radius:var(--btn-radius); background:var(--btn-gold); color:var(--btn-ink); font-size:var(--btn-font-size); font-weight:var(--btn-font-weight); cursor:pointer; transition:background .2s ease; }
        .sim-cta:hover:not(:disabled) { background:var(--btn-gold-hover); }
        .sim-cta:disabled { background:#7F95BD; color:#DCE6FA; cursor:not-allowed; }
        @media (max-width:780px) { .sim-layout { grid-template-columns:minmax(0,1fr); } .sim-summary { position:static; } .sim-pairs { grid-template-columns:minmax(0,1fr); } }
        @media (max-width:560px) {
          .sim-content, .sim-hero { padding-left:16px; padding-right:16px; }
          .sim-grid, .sim-pairs { grid-template-columns:minmax(0,1fr); } .sim-cat { min-width:0; }
          .sim-intro { align-items:flex-start; flex-direction:column; gap:4px; }
        }
    `}</style>
  )
}
