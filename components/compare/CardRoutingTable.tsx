'use client'

// The Simulate page's strategy: which cards to use this month, which to keep in reserve, how much of each category goes on each card,
// where to switch cards, whether each minimum spend is met and which rewards are conditional.
// Every number and every decision (the order of cards, where to switch, which plan) comes from the backend (evaluate-large's
// instructions). This file only lays them out; it calculates and decides nothing.
import type { EvaluateLargeResponse, InstructionCard, InstructionCategory, InstructionStep, LargeCardInWallet, Plan, SimulatorRequest } from '@/lib/wallet-simulator/api'
import ExceptionalMonth from '@/components/compare/ExceptionalMonth'
import { aed } from '@/lib/wallet-simulator/groups'
import { useRewardMode } from '@/lib/wallet-simulator/reward-mode'
import { CardChip, type CardInfo } from '@/components/wallet-simulator/card-art'

const REASON: Record<LargeCardInWallet['role_reason'], string> = {
  carries_spend: '',
  not_used: 'Even the maximum-reward plan does not use it: at this spend your other cards earn more on every category.',
  left_out_for_simplicity: 'Adds a little in the maximum-reward plan; not needed for the recommended strategy.',
  no_rewards: 'No card in this wallet earns a meaningful reward on this spend.',
}

export function planOf(r: EvaluateLargeResponse, kind: 'maximum' | 'simpler'): Plan {
  if (kind === 'simpler' && r.simpler_plan) return r.simpler_plan
  return { kind: 'maximum', wallet: r.wallet, per_card: r.per_card, active_cards: r.active_cards, reserve_cards: r.reserve_cards, instructions: r.instructions, rewards_by_currency: r.rewards_by_currency, reward_vs_maximum_annual_aed: 0 }
}

function minimumText(card: InstructionCard, rw: (n: number) => string) {
  const m = card.minimum
  const next = m.next_min_spend_aed
  const higher = next != null && m.next_reachable
    ? (m.next_effect_monthly_aed != null && m.next_effect_monthly_aed < -0.005
      ? ` The higher tier at ${aed(next)}/mo is within reach, but using it would earn ${rw(-m.next_effect_monthly_aed)} a month less overall, so it is left alone.`
      : ` The higher tier starts at ${aed(next)}/mo.`)
    : next != null ? ` A higher tier starts at ${aed(next)}/mo, more than your total spend, so it cannot be unlocked.` : ''
  if (m.status === 'none' || (m.status === 'not_reached' && next == null)) return { tone: 'muted' as const, text: 'This card has no minimum spend.' }
  if (m.status === 'met') {
    const dependent = card.reward_conditional_on_minimum_aed > 0.005 ? ` ${rw(card.reward_conditional_on_minimum_aed)}/mo of its reward depends on reaching it.` : ''
    return { tone: 'good' as const, text: `Minimum spend met: ${aed(m.required_aed ?? 0)}/mo needed, ${aed(m.routed_aed)} routed here.${dependent}${higher}` }
  }
  return { tone: 'warn' as const, text: `Not reached. Its higher rates need ${aed(next ?? 0)}/mo on this card${card.role === 'active' ? `, and ${aed(m.routed_aed)} is routed here` : ''}.${higher}` }
}

function stepText(s: InstructionStep, name: string) {
  const amount = aed(s.amount_aed)
  if (s.position === 'only') return <>All <b>{amount}</b> on <b>{name}</b></>
  if (s.position === 'first') return <>First <b>{amount}</b> on <b>{name}</b>{s.limit_reached && <span className="text-ws-muted"> (up to its reward limit)</span>}</>
  if (s.position === 'next') return <>Then <b>{amount}</b> on <b>{name}</b>{s.limit_reached && <span className="text-ws-muted"> (up to its reward limit)</span>}</>
  return <>The remaining <b>{amount}</b> on <b>{name}</b></>
}

export default function StrategyPanel({ response, request, ids, kind, onKind, card, onDetails, updating }: {
  response: EvaluateLargeResponse | null
  request: SimulatorRequest
  ids: string[]
  kind: 'maximum' | 'simpler'
  onKind: (k: 'maximum' | 'simpler') => void
  card: (id: string) => CardInfo
  onDetails: (id: string) => void
  updating: boolean
}) {
  const { rw, isMiles } = useRewardMode()
  if (!response || response.per_card.length === 0) return null
  const effective = response.simpler_plan ? kind : 'maximum'          // 'simpler' is the recommended strategy when one exists
  const plan = planOf(response, effective)
  const maxActive = response.active_cards.length
  const total = response.wallet.cards.length
  const active = plan.per_card.filter(pc => pc.role === 'active').sort((a, b) => b.monthly_reward_aed - a.monthly_reward_aed)
  const reserve = plan.per_card.filter(pc => pc.role === 'reserve').sort((a, b) => a.card_name.localeCompare(b.card_name))
  const instrCard = (id: string) => plan.instructions.cards.find(c => c.card_id === id)!
  const tone = { good: 'text-[#1E7A4E]', warn: 'text-[#8A6100]', muted: 'text-ws-muted' }
  const maxAnnual = response.wallet.annual_reward_aed

  const extra = response.extra_effort
  const viewingMax = effective === 'maximum' && !!response.simpler_plan          // the user asked to see the maximum-reward plan instead of the recommended one
  const extraIds = new Set((extra?.cards ?? []).map(c => c.card_id))
  const reserveShown = (viewingMax ? reserve : reserve.filter(pc => !extraIds.has(pc.card_id)))
  const sectionLabel = 'mt-7 text-[11px] font-bold tracking-[0.14em] text-ws-muted uppercase'

  return (
    <section className={`mt-6 transition-opacity ${updating ? 'opacity-60' : ''}`} aria-labelledby="strategy-title">
      <p className="text-[11px] font-bold tracking-[0.14em] text-ws-muted uppercase">1 · {viewingMax ? 'Maximum-reward plan' : 'Recommended strategy'}</p>
      <h3 id="strategy-title" className="mt-0.5 font-display text-[17px] font-semibold text-ws-fg">
        Use {plan.active_cards.length === 1 ? '1 card' : `${plan.active_cards.length} cards`} this month
      </h3>
      <p className="mt-0.5 text-[14px] font-semibold text-[#1E7A4E]">
        Expected rewards: {rw(plan.wallet.monthly_reward_aed)} a month · {rw(plan.wallet.annual_reward_aed)} a year
      </p>
      <p className="mt-1 text-[13px] text-ws-muted">
        {response.no_meaningful_rewards
          ? 'None of these cards earns a meaningful reward on this spend, so one card simply carries it.'
          : viewingMax
            ? <>This is the most your {total} cards can earn on this spending, using {plan.active_cards.length} of them.</>
            : extra
              ? <>The simplest way to use your cards and still earn almost everything they can, with fewer cards to carry and remember.</>
              : <>This is the most your {total} cards can earn on this spending{maxActive === 1 ? ', and one card does it' : ''}. It updates whenever your spending changes.</>}
      </p>
      {response.mode === 'miles' && (
        <p className="mt-1 text-[12px] text-ws-muted">Miles are converted from each card&apos;s reward at its own stored rate, and a mile from any programme counts the same.</p>
      )}
      {viewingMax && (
        <button type="button" onClick={() => onKind('simpler')} className="mt-2 rounded-full border border-ws-primary px-3 py-1.5 text-[12px] font-bold text-ws-primary">← Back to the recommended strategy</button>
      )}
      <ExceptionalMonth request={request} ids={ids} card={card} />

      <h4 className="mt-5 text-[11px] font-bold tracking-[0.14em] text-ws-muted uppercase">By category</h4>
      <div className="mt-2 overflow-hidden rounded-2xl border border-ws-border bg-white">
        {plan.instructions.categories.map((cat: InstructionCategory, i: number) => (
          <div key={cat.group} className={`px-4 py-3 ${i > 0 ? 'border-t border-ws-border' : ''}`}>
            <p className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13.5px] font-semibold text-ws-fg">
              <span>{cat.label} <span className="font-normal text-ws-muted">· {aed(cat.monthly_spend_aed)}/mo</span></span>
              <span className="text-[12.5px] font-medium text-[#1E7A4E]">earns {rw(cat.monthly_reward_aed)}/mo</span>
            </p>
            <ol className="mt-1.5 space-y-1">
              {cat.steps.map(s => (
                <li key={s.card_id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12.5px] text-ws-fg">
                  <span>{stepText(s, card(s.card_id).name)}
                    {s.post_cap_spend_aed > 0.5 && <span className="text-ws-muted"> · {aed(s.post_cap_spend_aed)} of it is past the reward limit and earns the lower rate</span>}
                    {s.condition && <span className="block text-[11.5px] text-ws-muted">Condition: {s.condition}</span>}</span>
                  <span className="tabular-nums text-ws-muted">{rw(s.monthly_reward_aed)}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <h4 className="mt-5 text-[11px] font-bold tracking-[0.14em] text-ws-muted uppercase">By card</h4>
      <div className="mt-2 overflow-hidden rounded-2xl border border-ws-border bg-white">
        {active.map((pc, i) => {
          const ic = instrCard(pc.card_id)
          const ms = minimumText(ic, rw)
          return (
            <div key={pc.card_id} className={`grid gap-x-5 gap-y-2 px-4 py-4 md:grid-cols-[230px_1fr_1fr] ${i > 0 ? 'border-t border-ws-border' : ''}`}>
              <div className="flex min-w-0 items-start gap-3">
                <CardChip card={card(pc.card_id)} className="!h-[33px] !w-[52px]" />
                <div className="min-w-0">
                  <span className="mb-1 inline-block rounded-md bg-[#DDF3E6] px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide text-[#1E7A4E] uppercase">Active</span>
                  <button type="button" onClick={() => onDetails(pc.card_id)} className="block text-left font-display text-[14px] leading-snug font-semibold text-ws-fg hover:text-ws-primary">{pc.card_name}</button>
                  <p className="mt-0.5 text-[12px] text-ws-muted">{aed(ic.monthly_spend_aed)}/mo routed · <b className="text-[#1E7A4E]">{rw(ic.monthly_reward_aed)}/mo</b></p>
                  {plan.active_cards.length > 1 && <p className="mt-0.5 text-[11.5px] text-ws-muted">The plan earns {rw(pc.contribution_annual_aed / 12)}/mo less without it.</p>}
                  {!isMiles && pc.annual_fee_aed > 0 && pc.annual_fee_aed > pc.annual_reward_aed - 0.5 && (
                    <p className="mt-1 inline-block rounded-md bg-[#FFF6E0] px-1.5 py-0.5 text-[11px] font-semibold text-[#8A6100]">Its annual fee ({aed(pc.annual_fee_aed)}) is more than the {aed(pc.annual_reward_aed)} it earns</p>
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-[10.5px] font-bold tracking-[0.12em] text-ws-muted uppercase">Use it for</p>
                <ul className="mt-1 space-y-0.5 text-[12.5px] text-ws-fg">
                  {ic.use_for.map(u => {
                    const cat = plan.instructions.categories.find(c => c.group === u.group)
                    return <li key={u.group} className="flex justify-between gap-3"><span className="truncate">{cat?.label ?? u.group}</span><span className="shrink-0 tabular-nums text-ws-muted">{aed(u.amount_aed)}</span></li>
                  })}
                </ul>
              </div>
              <div className="min-w-0 space-y-2 text-[12.5px]">
                <div>
                  <p className="text-[10.5px] font-bold tracking-[0.12em] text-ws-muted uppercase">Reward cap</p>
                  <p className="mt-1 text-ws-fg">
                    {ic.reward_cap.limits_reached_on.length === 0 && !ic.reward_cap.card_cap_reached && ic.reward_cap.spend_past_cap_aed < 0.5 ? <span className="text-ws-muted">Not reached at this spend.</span> : <>
                      {ic.reward_cap.limits_reached_on.length > 0 && <>Reward limit reached on {ic.reward_cap.limits_reached_on.map(id => plan.instructions.categories.find(c => c.group === id)?.label ?? id).join(', ')}. </>}
                      {ic.reward_cap.spend_past_cap_aed >= 0.5 && <>{aed(ic.reward_cap.spend_past_cap_aed)}/mo is past the cap and earns the lower rate. </>}
                      {ic.reward_cap.card_cap_reached && <>The card&apos;s total monthly reward limit is reached.</>}</>}
                  </p>
                </div>
                <div>
                  <p className="text-[10.5px] font-bold tracking-[0.12em] text-ws-muted uppercase">Minimum spend</p>
                  <p className={`mt-1 ${tone[ms.tone]}`}>{ms.text}</p>
                  {ic.reward_conditional_on_merchant_aed > 0.005 && <p className="mt-1 text-[11.5px] text-ws-muted">{rw(ic.reward_conditional_on_merchant_aed)}/mo of its reward is on spend with a merchant or channel condition (see the conditions above). Check them before relying on it.</p>}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <p className={sectionLabel}>2 · Extra effort, extra rewards</p>
      {extra && !viewingMax ? (
        <div className="mt-2 rounded-2xl border border-ws-border bg-white px-4 py-3 text-[13px] text-ws-fg">
          <p>You could earn <b>{rw(extra.all_annual_aed)} more per year</b> by using {extra.cards.length === 1 ? 'one additional card' : `${extra.cards.length} additional cards`}
            {extra.replaced_cards.length > 0 && <>, and you would no longer need {extra.replaced_cards.map(c => card(c).name).join(' or ')}</>}.
            We recommend the simpler strategy because you&apos;ll earn almost the same rewards with less effort.</p>
          <p className="mt-3 text-[10.5px] font-bold tracking-[0.12em] text-ws-muted uppercase">{extra.cards.length === 1 ? 'Additional card' : 'Additional cards'}</p>
          <ul className="mt-1 space-y-1">
            {extra.cards.map(c => (
              <li key={c.card_id} className="flex items-center justify-between gap-3 text-[12.5px]">
                <span className="flex min-w-0 items-center gap-2"><CardChip card={card(c.card_id)} className="!h-[24px] !w-[38px]" /><button type="button" onClick={() => onDetails(c.card_id)} className="truncate text-left font-semibold hover:text-ws-primary">{card(c.card_id).name}</button></span>
                <span className="shrink-0 tabular-nums text-[#1E7A4E]">up to {rw(c.adds_annual_aed)} more a year</span>
              </li>
            ))}
          </ul>
          {extra.replaced_cards.length > 0 && <>
            <p className="mt-3 text-[10.5px] font-bold tracking-[0.12em] text-ws-muted uppercase">No longer needed</p>
            <ul className="mt-1 space-y-1">
              {extra.replaced_cards.map(id => <li key={id} className="flex items-center gap-2 text-[12.5px]"><CardChip card={card(id)} className="!h-[24px] !w-[38px]" />{card(id).name}</li>)}
            </ul></>}
          <button type="button" onClick={() => onKind('maximum')} className="mt-3 rounded-full border border-ws-border px-3 py-1.5 text-[12px] font-bold text-ws-primary">Explore the maximum-reward plan</button>
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-ws-muted">
          {viewingMax ? 'You are looking at the maximum-reward plan, which includes the extra cards.' : "You're already earning the most these cards can earn on your spending."}
        </p>
      )}

      <p className={sectionLabel}>3 · Reserve cards{reserveShown.length > 0 && <span className="font-normal normal-case tracking-normal"> · {reserveShown.length}</span>}</p>
      {reserveShown.length === 0 ? (
        <p className="mt-2 text-[13px] text-ws-muted">None: every card you chose is part of the plan{extra && !viewingMax ? ' above, or listed under extra effort' : ''}.</p>
      ) : (
        <>
          <p className="mt-1 text-[13px] text-ws-muted">Not needed for {viewingMax ? 'the maximum-reward plan' : 'the recommended strategy'}. A card you don&apos;t use in a normal month can still earn well on a big one-off expense: try the box at the top.
            {!viewingMax && extra && ' Cards listed under extra effort are not here.'}</p>
          <div className="mt-2 overflow-hidden rounded-2xl border border-ws-border bg-[#FBFCFE]">
            {reserveShown.map((pc, i) => {
              return (
                <div key={pc.card_id} className={`grid gap-x-5 gap-y-1 px-4 py-3 md:grid-cols-[230px_1fr] ${i > 0 ? 'border-t border-ws-border' : ''}`}>
                  <div className="flex min-w-0 items-center gap-3">
                    <CardChip card={card(pc.card_id)} className="!h-[30px] !w-[48px]" />
                    <div className="min-w-0">
                      <span className="mb-0.5 inline-block rounded-md bg-ws-secondary px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide text-ws-muted uppercase">Reserve</span>
                      <button type="button" onClick={() => onDetails(pc.card_id)} className="block text-left font-display text-[13.5px] leading-snug font-semibold text-ws-fg hover:text-ws-primary">{pc.card_name}</button>
                    </div>
                  </div>
                  <div className="min-w-0 text-[12.5px]">
                    <p className="text-ws-fg">{REASON[pc.role_reason]}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}
