'use client'

// "A big expense this month?": the user adds one planned expense (for example school fees) to their normal spending and sees the best cards for that
// month. Separate from the normal-month plan. Everything shown comes from the backend (/evaluate-exceptional); nothing is calculated here.
import { useState } from 'react'
import { evaluateExceptionalMonth, SimulatorApiError, type ExceptionalResponse, type SimulatorRequest } from '@/lib/wallet-simulator/api'
import { aed, SIMULATOR_GROUPS } from '@/lib/wallet-simulator/groups'
import { useRewardMode } from '@/lib/wallet-simulator/reward-mode'
import type { CardInfo } from '@/components/wallet-simulator/card-art'

export default function ExceptionalMonth({ request, ids, card }: { request: SimulatorRequest; ids: string[]; card: (id: string) => CardInfo }) {
  const { rw } = useRewardMode()
  const [group, setGroup] = useState('education')
  const [amount, setAmount] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'failed'>('idle')
  const [message, setMessage] = useState('')
  const [result, setResult] = useState<ExceptionalResponse | null>(null)
  const value = Number(amount.replace(/,/g, ''))
  const label = SIMULATOR_GROUPS.find(g => g.key === group)?.label ?? 'Planned expense'

  async function run() {
    if (!(value > 0)) return
    setState('loading'); setMessage('')
    try {
      setResult(await evaluateExceptionalMonth(request, ids, [{ label, group, amount_aed: value }]))
      setState('idle')
    } catch (e) {
      setState('failed'); setMessage(e instanceof SimulatorApiError ? e.message : 'Something went wrong. Please try again.')
    }
  }

  const ch = result?.changes
  return (
    <details className="mt-4 rounded-2xl border border-ws-border bg-white px-4 py-3">
      <summary className="cursor-pointer text-[13.5px] font-semibold text-ws-primary">Have a big expense this month? See the best cards for it</summary>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-[11.5px] font-semibold text-ws-muted">Expense
          <select value={group} onChange={e => setGroup(e.target.value)} className="mt-1 block h-10 rounded-lg border border-ws-border bg-white px-2 text-[13px] text-ws-fg">
            {SIMULATOR_GROUPS.map(g => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </label>
        <label className="text-[11.5px] font-semibold text-ws-muted">Amount this month (AED)
          <input inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 20,000"
            className="mt-1 block h-10 w-40 rounded-lg border border-ws-border bg-white px-2 text-[13px] text-ws-fg" />
        </label>
        <button type="button" onClick={run} disabled={!(value > 0) || state === 'loading'}
          className="h-10 rounded-full bg-ws-ink px-4 text-[13px] font-semibold text-ws-ink-fg disabled:opacity-50">{state === 'loading' ? 'Working it out…' : 'Show me'}</button>
      </div>
      {state === 'failed' && <p className="mt-2 text-[12.5px] font-semibold text-ws-loss">{message}</p>}
      {ch && result && (
        <div className="mt-3 text-[13px] text-ws-fg" aria-live="polite">
          <p>In that month, the best plan earns <b>{rw(ch.reward_exceptional_month_aed)}</b>, against {rw(ch.reward_normal_month_aed)} in a normal month.</p>
          {ch.become_active.length > 0
            ? <p className="mt-1">Bring out <b>{ch.become_active.map(c => card(c).name).join(' and ')}</b> for this month
              {ch.extra_from_using_reserve_cards_aed > 0.5 && <>: it earns <b>{rw(ch.extra_from_using_reserve_cards_aed)}</b> more than staying with your usual cards</>}.</p>
            : <p className="mt-1">Your usual cards are still the best choice for that month.</p>}
          {ch.no_longer_needed.length > 0 && <p className="mt-1 text-ws-muted">{ch.no_longer_needed.map(c => card(c).name).join(', ')} {ch.no_longer_needed.length === 1 ? 'is' : 'are'} not needed that month.</p>}
          <p className="mt-2 text-[11px] font-bold tracking-[0.12em] text-ws-muted uppercase">Put the {label.toLowerCase()} on</p>
          <ul className="mt-1 space-y-0.5 text-[12.5px]">
            {ch.planned_expense_routing.map(r => (
              <li key={r.card_id} className="flex justify-between gap-3"><span><b>{aed(r.amount_aed)}</b> on <b>{card(r.card_id).name}</b></span><span className="text-ws-muted tabular-nums">{rw(r.monthly_reward_aed)}</span></li>
            ))}
          </ul>
          <p className="mt-2 text-[11.5px] text-ws-muted">This does not change your normal-month plan above.</p>
        </div>
      )}
    </details>
  )
}
