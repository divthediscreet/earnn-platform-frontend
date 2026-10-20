'use client'

// The top of the result page: the wallet in one glance — headline, net rewards banner, one tile per card
// with the categories to use it for, and the two next steps (spending plan / change cards).

import { useState } from 'react'
import type { Wallet } from '@/lib/wallet-simulator/api'
import { MAX_WALLET, aed, groupShort } from '@/lib/wallet-simulator/groups'
import { cardGroups } from '@/lib/wallet-simulator/playbook'
import { useRewardMode } from '@/lib/wallet-simulator/reward-mode'
import CardNameLink from '@/components/CardNameLink'
import { CardArt, RollingAed, type CardInfo } from './card-art'
import { FeeMathDialog, NetOfFeesDialog } from './fee-math'
import { CategoryGlyph } from './sections'

export function ResultSummary({ wallet, isPick, moreCardsNote, ids, monthlySpend, card, updating, plan, onChange, onReplace, onRemove, onReset, onDetails, onAllBenefits }: {
  wallet: Wallet | null
  ids: string[]              // the user's card order: tiles keep their slot when a card is swapped
  isPick: boolean            // the recommended cards (not a customised wallet)
  moreCardsNote: boolean     // a bigger wallet earns a bit more, but not enough to be worth the extra card(s)
  monthlySpend: number
  card: (id: string) => CardInfo
  updating: boolean
  plan: React.ReactNode      // the "which card where" playbook, shown inline
  onChange: () => void       // opens wallet customisation
  onReplace: (cardId: string | null, group: string | null) => void // swap one card (null = add to a free slot); list opens on the category it handles
  onRemove: (cardId: string) => void
  onReset: () => void        // back to the cards Earn picked
  onDetails: (id: string) => void
  onAllBenefits: () => void  // opens every benefit on the wallet's cards
}) {
  const { isMiles } = useRewardMode()
  const [explain, setExplain] = useState<'net' | 'fees' | null>(null)
  if (!wallet) {
    return (
      <section className="mx-auto max-w-6xl px-5 pt-8 pb-6 sm:px-8">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ws-fg sm:text-5xl">Your wallet is empty</h1>
        <p className="mt-3 text-[15px] text-ws-muted">Add a card to see what it can earn you.</p>
        <button type="button" onClick={onChange}
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-ws-primary px-5 text-[14px] font-semibold text-white">Add cards</button>
      </section>
    )
  }

  const n = wallet.cards.length
  const monthly = wallet.monthly_reward_aed
  const fees = wallet.total_fee_aed
  const net = isMiles ? monthly : wallet.net_annual_value_aed / 12
  // a card the wallet hasn't calculated yet (mid-swap) sorts by its place in `ids`; unknown ones go last
  const slot = (id: string) => { const i = ids.indexOf(id); return i < 0 ? 99 : i }

  return (
    <section className="mx-auto max-w-6xl px-5 pt-8 pb-8 sm:px-8 sm:pt-12">
      <h1 className="font-display text-[28px] leading-tight font-bold tracking-tight text-ws-fg sm:text-5xl">
        Your spending is unique. So is your card strategy.
      </h1>
      <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed font-medium text-ws-muted sm:text-[18px]">
        Based on your <span className="font-semibold text-ws-fg">{aed(monthlySpend)}</span> monthly spend, we checked millions of UAE card combinations
      </p>
      {!isPick && (
        <p className="mt-8 flex flex-wrap items-center gap-3 sm:mt-10">
          <button type="button" onClick={onReset}
            className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[#E2B93B] bg-[#FFF6D6] px-3.5 py-1 text-[13px] font-semibold text-[#0D1828] transition hover:bg-[#FFE27A]">
            <span aria-hidden>↺</span> Back to Earnn Pick
          </button>
        </p>
      )}
      {isPick && (
        <p className="mt-8 flex flex-wrap items-center gap-3 sm:mt-10">
          <span className="inline-block rounded-xl bg-[#FFE27A] px-4 py-2 font-display text-[18px] font-bold text-[#0D1828] shadow-[0_2px_10px_rgba(201,151,43,0.25)] sm:text-[22px]">
            Earnn recommends you to have {n} {n === 1 ? 'card' : 'cards'}
          </span>
          {moreCardsNote && n < 3 && (
            <span className="block basis-full text-[13px] leading-snug text-ws-muted sm:whitespace-nowrap">
              Though having more cards could generate more rewards, but Earnn doesn&apos;t think it is worth it.
            </span>
          )}
        </p>
      )}

      {/* everything that depends on the calculation blurs until the new numbers arrive */}
      <div className="relative" aria-busy={updating}>
      <div className={`transition duration-200 ${updating ? 'pointer-events-none blur-[6px] select-none' : ''}`}>
      {/* net rewards banner */}
      <div className={`mt-6 grid gap-5 rounded-3xl p-5 text-white shadow-ws-plastic sm:p-6 lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-8`}
        style={{ background: 'linear-gradient(110deg,#091e42 0%,#0A2A66 40%,#12367a 100%)' }}>
        <div className="flex items-center gap-4">
          <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-white/10 text-[26px] ring-1 ring-white/15">🏆</span>
          <div className="min-w-0">
            <p className="text-[14px] font-medium text-white/85">{isMiles ? 'Estimated miles' : 'Estimated net rewards'}</p>
            <p className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
              <span className="font-display text-[44px] leading-none font-bold text-[#F5D76E] sm:text-[56px]">
                {isMiles ? <><RollingAed value={net} /> miles</> : (
                  <button type="button" onClick={() => setExplain('net')} aria-haspopup="dialog" title="How is this calculated?"
                    className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-inherit underline decoration-[#F5D76E] decoration-2 underline-offset-[6px] transition hover:decoration-white">
                    AED <RollingAed value={net} />
                  </button>
                )}
              </span>
              <span className="text-[15px] text-[#F5D76E]/80">/ month</span>
            </p>
          </div>
        </div>

        <dl className="grid gap-4 border-white/15 lg:justify-self-center lg:border-l lg:pl-8">
          <div>
            <dt className="text-[12px] text-white/65">Annual fees</dt>
            <dd className="font-display text-[20px] font-bold tabular-nums">
              <button type="button" onClick={() => setExplain('fees')} aria-haspopup="dialog" title="How are the fees worked out?"
                className="cursor-pointer border-0 bg-transparent p-0 font-[inherit] text-inherit underline decoration-white decoration-2 underline-offset-4 transition hover:decoration-[#F5D76E]">
                {aed(fees)}
              </button>
            </dd>
          </div>
        </dl>

        <div className="flex flex-col items-start gap-2.5 justify-self-start lg:items-end lg:justify-self-end">
        <button type="button" onClick={onAllBenefits} aria-haspopup="dialog"
          className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-2xl border-0 bg-[#F7C948] px-4 py-2 text-[14px] font-bold text-[#0D1828] transition hover:bg-[#FFE27A]">
          See all benefits <span aria-hidden>→</span>
        </button>
        </div>
      </div>

      {/* one tile per card */}
      <ul className="mt-6 mb-4 grid gap-x-4 gap-y-9 md:grid-cols-3">
        {[...wallet.per_card].sort((a, b) => slot(a.card_id) - slot(b.card_id)).map((pc, i) => {
          const groups = cardGroups(wallet, pc.card_id).slice(0, 2)
          const c = card(pc.card_id)
          return (
            <li key={pc.card_id} className="relative flex flex-col rounded-2xl border border-ws-border bg-white p-4 pb-6 shadow-ws-lift sm:p-5 sm:pb-7">
              <span className="absolute top-4 left-4 z-10 grid size-9 place-items-center rounded-full bg-[#EEF2F8] text-[13px] font-bold text-ws-muted sm:top-5 sm:left-5">
                {String(i + 1).padStart(2, '0')}
              </span>
              <button type="button" onClick={() => onDetails(pc.card_id)} aria-haspopup="dialog" title="View card details"
                className="mx-auto block w-[62%] min-w-[150px] max-w-[250px] cursor-pointer border-0 bg-transparent p-0 transition-transform hover:-translate-y-0.5">
                <CardArt card={c} size="md" eager />
              </button>
              <p className="mt-4 line-clamp-2 min-h-[2.75em] text-[17px] leading-snug font-bold text-ws-fg sm:text-[19px]" title={c.name}><CardNameLink cardId={pc.card_id} mode={isMiles ? 'miles' : 'cashback'}>{c.name}</CardNameLink></p>
              <p className="mt-1 font-display text-[22px] font-bold text-ws-gain tabular-nums sm:text-[24px]">
                + {isMiles ? <>{Math.round(pc.monthly_reward_aed).toLocaleString('en-US')} <span className="text-[16px]">miles/mo</span></> : <>AED {Math.round(pc.monthly_reward_aed).toLocaleString('en-US')} <span className="text-[16px] font-semibold">/mo</span></>}
              </p>
              <div className="mt-3 border-t border-ws-border pt-3">
                <p className="mb-2 text-[13px] font-medium text-ws-muted">Use it for</p>
                <div className="flex flex-wrap gap-2">
                  {groups.length === 0
                    ? <span className="rounded-xl bg-[#EEF3FB] px-3 py-2 text-[13px] font-medium text-ws-muted">Backup card</span>
                    : groups.map(g => (
                      <span key={g} className="inline-flex items-center gap-2 rounded-xl bg-[#EEF3FB] py-1.5 pr-3 pl-1.5 text-[13px] font-medium text-ws-fg">
                        <CategoryGlyph group={g} className="size-7" iconClass="size-4" />
                        {groupShort(g)}
                      </span>
                    ))}
                </div>
              </div>
              {/* half on, half below the bottom edge */}
              <div className="absolute inset-x-0 bottom-0 z-10 flex translate-y-1/2 items-center justify-center gap-2">
                <button type="button" onClick={() => onReplace(pc.card_id, cardGroups(wallet, pc.card_id)[0] ?? null)} aria-haspopup="dialog"
                  className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-ws-border bg-white px-3.5 text-[12px] font-semibold text-ws-primary shadow-ws-lift transition hover:bg-[#EEF3FF]">
                  <span aria-hidden>⇄</span> Replace this card
                </button>
                <button type="button" onClick={() => onRemove(pc.card_id)}
                  className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[#F0C8C4] bg-white px-3.5 text-[12px] font-semibold text-[#C0392B] shadow-ws-lift transition hover:bg-[#FDEEEC]">
                  <span aria-hidden>✕</span> Remove this card
                </button>
              </div>
            </li>
          )
        })}
        {n < MAX_WALLET && (
          <li className="flex flex-col items-start justify-end gap-1.5 translate-y-[43px] md:pl-2">
            <button type="button" onClick={() => onReplace(null, null)} aria-haspopup="dialog"
              className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-ws-primary bg-[#F5F8FF] px-4 text-[14px] font-semibold text-ws-primary transition hover:bg-[#EEF3FF]">
              <span aria-hidden className="text-[18px] leading-none">+</span> Add a card
            </button>
            <span className="text-[13px] text-ws-muted">You can add up to {MAX_WALLET - n} more {MAX_WALLET - n === 1 ? 'card' : 'cards'}</span>
          </li>
        )}
      </ul>

      {/* how to use them */}
      <h2 className="mt-10 font-display text-[22px] font-bold text-ws-fg sm:text-[28px]">How to use these cards</h2>
      <p className="mt-1 text-[14px] text-ws-muted sm:text-[15px]">Which card to swipe for each kind of spending, and how much it earns you.</p>
      {plan}
      </div>
      {updating && (
        <div role="status" className="absolute inset-0 z-10 flex items-start justify-center pt-24">
          <span className="flex flex-col items-center gap-3 rounded-3xl bg-white px-8 py-6 text-[15px] font-semibold text-ws-fg shadow-ws-lift">
            <span aria-hidden className="size-14 animate-spin rounded-full border-[5px] border-[#DCE6FA] border-t-ws-primary" />
            Calculating your rewards…
          </span>
        </div>
      )}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-[#E6F6EF] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="text-[15px] font-semibold text-ws-fg">Want to try different cards?</p>
        <button type="button" onClick={onChange} aria-haspopup="dialog"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ws-border bg-white px-6 text-[15px] font-semibold whitespace-nowrap text-ws-fg transition hover:bg-[#F7F9FC]">
          Change cards
        </button>
      </div>

      {explain === 'net' && (
        <NetOfFeesDialog title="This wallet" monthlyReward={monthly} yearlyFee={fees} onClose={() => setExplain(null)} />
      )}
      {explain === 'fees' && (
        <FeeMathDialog title="This wallet" cards={wallet.per_card} nameOf={id => card(id).name} onClose={() => setExplain(null)} />
      )}
    </section>
  )
}
