'use client'

import { useEffect, useMemo, useState } from 'react'
import { evaluateWallet, listSimulatorCards, SimulatorApiError, type SimulatorRequest, type SpendGroup, type Wallet } from '@/lib/wallet-simulator/api'
import { aed, groupIcon, groupShort, MAX_WALLET } from '@/lib/wallet-simulator/groups'
import { CardArt, CardChip, type CardInfo } from './card-art'

type CardLookup = (id: string) => CardInfo

// The card list is fetched once per page load and shared by every open of the dialog.
let cardListPromise: Promise<CardInfo[]> | null = null
function loadCardList(): Promise<CardInfo[]> {
  // the simulator's own card list (same cached rules as the engine), with one automatic retry
  cardListPromise ??= listSimulatorCards()
    .catch(() => new Promise(r => setTimeout(r, 1200)).then(() => listSimulatorCards()))
    .then(cards => cards.map(c => ({ id: c.card_id, name: c.card_name, bank: c.bank_name })))
    .catch(e => { cardListPromise = null; throw e })
  return cardListPromise
}

/** Monthly reward per spend group, summed from the backend's allocation (no reward maths here). */
function byGroup(wallet: Wallet) {
  const m = new Map<string, { reward: number; topCard: string | null; topReward: number }>()
  for (const l of wallet.allocation) {
    const g = l.group ?? 'miscellaneous'
    const cur = m.get(g) ?? { reward: 0, topCard: null, topReward: -1 }
    cur.reward += l.monthly_reward_aed
    if (l.monthly_reward_aed > cur.topReward) { cur.topReward = l.monthly_reward_aed; cur.topCard = l.card_id }
    m.set(g, cur)
  }
  return m
}

export function CompareDialog({ request, smart, groups, card, onClose }: {
  request: SimulatorRequest
  smart: Wallet | null
  groups: SpendGroup[]
  card: CardLookup
  onClose: () => void
}) {
  const [cards, setCards] = useState<CardInfo[] | null>(null)
  const [listError, setListError] = useState(false)
  const [bank, setBank] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [picking, setPicking] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existing, setExisting] = useState<Wallet | null>(null)

  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let alive = true
    loadCardList()
      .then(c => { if (alive) { setCards(c); setListError(false) } })
      .catch(() => { if (alive) setListError(true) })
    return () => { alive = false }
  }, [attempt])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  const byId = useMemo(() => new Map((cards ?? []).map(c => [c.id, c])), [cards])
  const banks = useMemo(() => [...new Set((cards ?? []).map(c => c.bank).filter((b): b is string => !!b))].sort(), [cards])
  const bankCards = useMemo(() => (cards ?? []).filter(c => c.bank === bank).sort((a, b) => a.name.localeCompare(b.name)), [cards, bank])
  const info = (id: string) => byId.get(id) ?? card(id)
  const full = selected.length >= MAX_WALLET

  const add = (id: string) => {
    if (selected.includes(id) || full) return
    setSelected(s => [...s, id])
    setPicking(false) // collapse to the "cart"; the user can add another below
    setBank('')
    setError(null)
  }
  const remove = (id: string) => {
    const next = selected.filter(c => c !== id)
    setSelected(next)
    if (next.length === 0) setPicking(true)
    setError(null)
  }

  const compare = () => {
    setRunning(true)
    setError(null)
    // same engine as the simulator: the backend's exact evaluation of this card set on the same spend
    evaluateWallet(request, selected)
      .then(res => setExisting(res.wallet))
      .catch(e => setError(e instanceof SimulatorApiError ? e.message : 'Something went wrong on our side. Please try again.'))
      .finally(() => setRunning(false))
  }

  const showResult = existing && smart
  return (
    <div className="fixed inset-0 z-[1100] grid place-items-end bg-ws-ink/50 backdrop-blur-sm sm:place-items-center sm:p-6"
      onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="ws-compare-title">
      <div onClick={e => e.stopPropagation()}
        className={`ws-animate-rise flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-3xl bg-ws-card shadow-ws-plastic sm:rounded-3xl ${showResult ? 'max-w-[760px]' : 'max-w-[540px]'}`}>
        <div className="flex items-start justify-between gap-4 border-b border-ws-border px-6 pt-5 pb-4">
          <div>
            <h2 id="ws-compare-title" className="font-display text-[20px] font-semibold text-ws-fg">
              {showResult ? 'Your wallet vs the Earnn Smart Wallet' : 'Which cards are actually in your active wallet?'}
            </h2>
            <p className="mt-0.5 text-[13px] text-ws-muted">
              {showResult ? 'Same spending, same calculation for both.' : `You can add up to ${MAX_WALLET} cards.`}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="grid size-9 shrink-0 place-items-center rounded-full text-[20px] text-ws-muted hover:bg-ws-secondary">×</button>
        </div>

        {showResult ? (
          <CompareResult smart={smart} existing={existing} groups={groups} card={info} />
        ) : (
          <div className="ws-scrollbar flex-1 overflow-y-auto px-6 py-5">
            {/* the "cart" */}
            {selected.length > 0 && (
              <div className="space-y-2">
                {selected.map(id => {
                  const c = info(id)
                  return (
                    <div key={id} className="flex items-center gap-3 rounded-xl border border-ws-border bg-ws-bg px-3 py-2">
                      <CardChip card={c} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold text-ws-fg">{c.name}</span>
                        {c.bank && <span className="block truncate text-[11px] text-ws-muted">{c.bank}</span>}
                      </span>
                      <button type="button" onClick={() => remove(id)} aria-label={`Remove ${c.name}`}
                        className="grid size-7 shrink-0 place-items-center rounded-full text-[16px] text-ws-muted hover:bg-ws-secondary hover:text-ws-loss">×</button>
                    </div>
                  )
                })}
              </div>
            )}

            {!picking && !full && (
              <button type="button" onClick={() => setPicking(true)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-ws-primary/40 py-2.5 text-[13px] font-semibold text-ws-primary hover:bg-ws-secondary">
                + Add another card
              </button>
            )}
            {full && <p className="mt-3 text-center text-[12px] text-ws-muted">You can compare up to {MAX_WALLET} cards.</p>}

            {picking && !full && (
              <div className={selected.length ? 'mt-4' : ''}>
                <label htmlFor="ws-compare-bank" className="text-[12px] font-semibold text-ws-muted">Bank</label>
                <div className="relative mt-1.5">
                  <select id="ws-compare-bank" value={bank} onChange={e => setBank(e.target.value)} disabled={!cards}
                    className="h-11 w-full appearance-none rounded-xl border border-ws-border bg-ws-card pr-10 pl-3.5 text-[14px] text-ws-fg outline-none focus:border-ws-primary disabled:opacity-60">
                    <option value="">{cards ? 'Select your bank' : listError ? 'Card list unavailable' : 'Loading banks…'}</option>
                    {banks.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                  <span aria-hidden className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-[12px] text-ws-muted">▼</span>
                </div>
                {listError && !cards && (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-ws-secondary px-3.5 py-2.5" role="alert">
                    <p className="text-[12px] text-ws-fg">We couldn&apos;t load the card list just now.</p>
                    <button type="button" onClick={() => { setListError(false); setAttempt(a => a + 1) }}
                      className="shrink-0 rounded-full bg-ws-primary px-3.5 py-1.5 text-[12px] font-semibold text-white hover:bg-ws-ink">
                      Try again
                    </button>
                  </div>
                )}

                {bank && (
                  <ul className="ws-scrollbar mt-3 max-h-[300px] space-y-2 overflow-y-auto pr-1">
                    {bankCards.map(c => {
                      const added = selected.includes(c.id)
                      return (
                        <li key={c.id} className="flex items-center gap-3 rounded-xl border border-ws-border p-2.5">
                          <div className="w-[76px] shrink-0"><CardArt card={c} size="sm" /></div>
                          <span className="min-w-0 flex-1 text-[13px] font-semibold text-ws-fg">{c.name}</span>
                          <button type="button" onClick={() => add(c.id)} disabled={added} aria-label={added ? `${c.name} added` : `Add ${c.name}`}
                            className="min-h-9 shrink-0 rounded-full bg-ws-primary px-4 text-[12px] font-semibold text-white transition-colors hover:bg-ws-ink disabled:bg-ws-secondary disabled:text-ws-muted">
                            {added ? 'Added' : 'Add'}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-ws-border px-6 py-4">
          {showResult ? (
            <>
              <button type="button" onClick={() => setExisting(null)} className="text-[13px] font-semibold text-ws-primary hover:underline">← Change cards</button>
              <button type="button" onClick={onClose} className="min-h-11 rounded-full bg-ws-ink px-6 text-[14px] font-semibold text-white">Done</button>
            </>
          ) : (
            <>
              <p className="min-w-0 text-[12px] text-ws-loss" role="status">{error}</p>
              <button type="button" onClick={compare} disabled={selected.length === 0 || running || !smart}
                className="min-h-11 shrink-0 rounded-full bg-[#10B981] px-6 text-[14px] font-semibold text-white transition-colors hover:bg-[#059669] disabled:bg-ws-secondary disabled:text-ws-muted">
                {running ? 'Comparing…' : `Compare${selected.length ? ` ${selected.length} card${selected.length > 1 ? 's' : ''}` : ''}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function Stack({ ids, card }: { ids: string[]; card: CardLookup }) {
  return (
    <div className="flex items-center">
      {ids.map((id, i) => (
        <div key={id} className="w-[40px] shrink-0 sm:w-[58px]" style={{ marginLeft: i ? -18 : 0, transform: `rotate(${-6 + i * 6}deg)`, zIndex: i }}>
          <CardArt card={card(id)} size="sm" />
        </div>
      ))}
    </div>
  )
}

const yr = (monthly: number) => monthly * 12 // the backend's monthly figure shown per year

/** Result: the two wallets, the outcome, then category by category. Both wallets are styled the
 *  same — whichever genuinely earns more in a row is marked, including the user's own wallet. */
function CompareResult({ smart, existing, groups, card }: { smart: Wallet; existing: Wallet; groups: SpendGroup[]; card: CardLookup }) {
  const s = byGroup(smart)
  const e = byGroup(existing)
  const rows = groups.filter(g => g.monthly_spend_aed > 0)
  const gap = smart.annual_reward_aed - existing.annual_reward_aed
  const even = Math.abs(gap) < 1
  const grid = 'grid grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]'
  const amount = (v: number, wins: boolean) => (
    <div className="flex items-center justify-end gap-1.5 px-3 py-3 sm:px-5">
      {wins && <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ws-fg" />}
      <span className={`text-[14px] tabular-nums ${wins ? 'font-semibold text-ws-fg' : 'text-ws-muted'}`}>
        {aed(v)}<span className="text-[11px] font-normal text-ws-muted">/yr</span>
      </span>
      {wins && <span className="sr-only">(earns more)</span>}
    </div>
  )
  return (
    <div className="ws-scrollbar flex-1 overflow-y-auto px-5 py-5 sm:px-7">
      {/* the two wallets */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-5">
        <WalletSummary label="Earnn Smart Wallet" ids={smart.cards} annual={smart.annual_reward_aed} card={card} />
        <span className="text-[13px] font-semibold text-ws-muted">vs.</span>
        <WalletSummary label="Your current wallet" ids={existing.cards} annual={existing.annual_reward_aed} card={card} />
      </div>

      {/* the outcome */}
      <div className="mt-5 rounded-2xl bg-ws-ink px-5 py-5 text-center text-white">
        {even ? (
          <p className="font-display text-[20px] leading-snug font-semibold text-balance sm:text-[24px]">
            Your current wallet already earns about the same as ours.
          </p>
        ) : gap > 0 ? (
          <p className="font-display text-[20px] leading-snug font-semibold text-balance sm:text-[24px]">
            You&apos;re potentially leaving <span className="text-[#F7C948]">{aed(gap)}/year</span> on the table
          </p>
        ) : (
          <p className="font-display text-[20px] leading-snug font-semibold text-balance sm:text-[24px]">
            Your current wallet earns <span className="text-[#F7C948]">{aed(-gap)}/year</span> more than ours on this spending
          </p>
        )}
        {!even && gap < 0 && <p className="mt-1.5 text-[13px] text-white/70">Keep what you have — it&apos;s working for you.</p>}
      </div>

      {/* category by category */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-ws-border">
        <div className={`${grid} border-b border-ws-border bg-ws-bg text-[11px] font-semibold tracking-[0.06em] text-ws-muted uppercase`}>
          <div className="px-3 py-2.5 sm:px-5">Your spending</div>
          <div className="px-3 py-2.5 text-right sm:px-5">Earnn wallet</div>
          <div className="px-3 py-2.5 text-right sm:px-5">Current wallet</div>
        </div>
        {rows.map(g => {
          const sr = yr(s.get(g.group)?.reward ?? 0), er = yr(e.get(g.group)?.reward ?? 0)
          return (
            <div key={g.group} className={`${grid} items-center border-b border-ws-border last:border-b-0`}>
              <div className="flex min-w-0 items-center gap-2 px-3 py-3 sm:px-5">
                <span aria-hidden className="text-[15px]">{groupIcon(g.group)}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold text-ws-fg">{groupShort(g.group)}</span>
                  <span className="block text-[11px] text-ws-muted tabular-nums">{aed(g.monthly_spend_aed)}/mo</span>
                </span>
              </div>
              {amount(sr, sr > er + 0.5)}
              {amount(er, er > sr + 0.5)}
            </div>
          )
        })}
      </div>
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ws-muted">
        <span aria-hidden className="size-1.5 rounded-full bg-ws-fg" /> earns more in that category
      </p>

      {/* the decision */}
      {gap >= 1 && (
        <div className="mt-6 rounded-2xl border border-ws-border p-5">
          <p className="font-display text-[18px] font-semibold text-ws-fg">Switching could add {aed(gap)}/year</p>
          <p className="text-[13px] text-ws-muted">without changing how much you spend.</p>
          <dl className="mt-4 space-y-2 border-t border-ws-border pt-4 text-[13px]">
            <div className="flex justify-between gap-4"><dt className="text-ws-muted">Extra rewards</dt><dd className="font-semibold text-ws-fg tabular-nums">+{aed(gap)}</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-ws-muted">Extra annual fees</dt><dd className="text-ws-muted">TBD</dd></div>
            <div className="flex justify-between gap-4 border-t border-ws-border pt-2"><dt className="font-semibold text-ws-fg">Net benefit of switching</dt><dd className="text-ws-muted">TBD — fees coming soon</dd></div>
          </dl>
        </div>
      )}
    </div>
  )
}

function WalletSummary({ label, ids, annual, card }: { label: string; ids: string[]; annual: number; card: CardLookup }) {
  return (
    <div className="flex min-w-0 flex-col items-center rounded-2xl border border-ws-border px-3 py-4 text-center">
      <p className="text-[10px] font-bold tracking-[0.12em] text-ws-muted uppercase">{label}</p>
      <div className="mt-3"><Stack ids={ids} card={card} /></div>
      <p className="mt-3 font-display text-[20px] font-semibold text-ws-fg tabular-nums sm:text-[24px]">{aed(annual)}<span className="text-[13px] font-normal text-ws-muted">/year</span></p>
    </div>
  )
}
