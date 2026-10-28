'use client'

// The top of the result page: the wallet in one glance — headline, net rewards banner, one tile per card
// with the categories to use it for, and the two next steps (spending plan / change cards).

import type { SpendGroup, Wallet } from '@/lib/wallet-simulator/api'
import { MAX_WALLET, aed, groupShort } from '@/lib/wallet-simulator/groups'
import { cardGroups } from '@/lib/wallet-simulator/playbook'
import { useRewardMode } from '@/lib/wallet-simulator/reward-mode'
import CardNameLink from '@/components/CardNameLink'
import RewardConditionLabel from '@/components/RewardConditionLabel'
import { CardArt, RollingAed, type CardInfo } from './card-art'
import { FeeMathContent, NetOfFeesContent } from './fee-math'
import { InfoHover } from './info-hover'
import { CategoryGlyph } from './sections'

/** A card's own limits: minimum monthly spend (0 = none) and monthly reward cap (null = no cap). */
export type CardLimit = { min: number; cap: number | null }

export function ResultSummary({ limits, tabs, wallet, isPick, pick, moreCardsNote, ids, monthlySpend, card, updating, plan, onChange, onReplace, onRemove, onReset, onDetails }: {
  limits?: Record<string, CardLimit> | null // each card's minimum spend and cap (null while loading)
  tabs?: React.ReactNode     // the three ways to carry the result, shown under the headline
  wallet: Wallet | null
  groups: SpendGroup[]       // the spend categories (for the card-by-card list in view 2)
  ids: string[]              // the user's card order: tiles keep their slot when a card is swapped
  isPick: boolean            // the recommended cards (not a customised wallet)
  pick: Wallet               // Earnn's recommended wallet, to show how the current cards differ
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
  onAllBenefits?: () => void // no longer shown here (the banner button was removed)
}) {
  const { isMiles, rw } = useRewardMode()
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
  // how the current cards differ from Earnn's pick (same wording as the wallet bar)
  const delta = wallet.monthly_reward_aed - pick.monthly_reward_aed
  const diff = Math.abs(delta) < 0.5 ? 'Same rewards as Earnn Recommendation'
    : delta > 0 ? `You will be earning ${rw(delta)}/mo more`
    : `You will be earning ${rw(-delta)}/mo less`
  // more rewards than Earnn's pick, but only by carrying extra cards the pick judged not worth it
  const extraCardNote = delta > 0.5 && n > pick.cards.length
  const monthly = wallet.monthly_reward_aed
  const fees = wallet.total_fee_aed
  const net = isMiles ? monthly : wallet.net_annual_value_aed / 12
  // a card the wallet hasn't calculated yet (mid-swap) sorts by its place in `ids`; unknown ones go last
  const slot = (id: string) => { const i = ids.indexOf(id); return i < 0 ? 99 : i }

  return (
    <section className="mx-auto max-w-6xl px-5 pt-8 pb-8 sm:px-8 sm:pt-12">
      <h1 className="font-display text-[28px] leading-tight font-bold tracking-tight text-ws-fg sm:text-5xl">
        You spend <span className="text-ws-primary">{aed(monthlySpend)}</span>{' '}a month. Here&apos;s how Earnn would make it more rewarding.
      </h1>

      {isPick && (
        <p className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
          <span className="block basis-full max-w-[70ch] text-[16px] leading-relaxed font-medium text-ws-muted sm:text-[18px]">
            We found that {n === 1 ? 'a single card' : <>a combination of <span className="rounded bg-[#FFE27A] px-1.5 py-0.5 font-bold text-[#0D1828]">{n} cards</span></>} could work best for you. Take a look, swap any card you don&apos;t like, and see what changes.
          </span>
        </p>
      )}

      {/* everything that depends on the calculation blurs until the new numbers arrive */}
      <div className="relative" aria-busy={updating}>
      <div className={`transition duration-200 ${updating ? 'pointer-events-none blur-[6px] select-none' : ''}`}>
      {/* the answer first: what you keep is the hero; total rewards and yearly card fees sit beside it.
          "Check" links open how the net figure and the fees are worked out. */}
      {(() => {
        const icon = (bg: string, children: React.ReactNode) => (
          <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full" style={{ background: bg }}>{children}</span>
        )
        return (
      <div className="mt-6 grid rounded-3xl border border-ws-border bg-white p-2 shadow-ws-lift lg:grid-cols-[1.1fr_1fr] lg:items-stretch lg:gap-0">
        <div className="flex min-w-0 items-center gap-5 rounded-2xl px-6 py-6 text-white sm:px-8 lg:[clip-path:polygon(0_0,calc(100%_-_22px)_0,100%_100%,0_100%)] lg:pr-14"
          style={{ background: 'linear-gradient(120deg,#091e42 0%,#0A2A66 55%,#12367a 100%)' }}>
          <span aria-hidden className="grid size-[72px] shrink-0 place-items-center rounded-full bg-white/10 ring-1 ring-white/10">
            <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="#5EEAC0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 7V5.5A1.5 1.5 0 0 0 17.5 4h-11A2.5 2.5 0 0 0 4 6.5v11A2.5 2.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V17" />
              <path d="M4 6.5A2.5 2.5 0 0 0 6.5 9H19.5a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-.5.5H16a2 2 0 0 1 0-4h4" />
              <circle cx="16" cy="13" r=".6" fill="#5EEAC0" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[17px] font-medium text-white/90">{isMiles ? 'Estimated miles each month' : 'You keep each month'}</p>
            <p className="mt-1 flex flex-nowrap items-baseline gap-x-2.5 whitespace-nowrap tabular-nums">
              <span className="font-display text-[44px] leading-none font-bold text-[#5EEAC0] sm:text-[56px]">
                {isMiles ? <><RollingAed value={net} /> miles</> : <>AED <RollingAed value={net} /></>}
              </span>
              <span className="text-[18px] text-[#5EEAC0]/80">/ month</span>
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col justify-center gap-5 rounded-2xl px-4 py-4 sm:flex-row sm:items-center sm:gap-0 sm:px-6 lg:-ml-[18px] lg:pl-12 lg:[clip-path:polygon(0_0,100%_0,100%_100%,22px_100%)]" style={{ background: 'linear-gradient(120deg,#FFF3D1 0%,#FFF9E8 100%)' }}>
          {!isMiles && (
            <InfoHover className="flex min-w-0 flex-1 items-center gap-4 sm:pr-5" label="How your rewards after fees are worked out"
              panelTitle="How rewards after fees are worked out" panelSub="This wallet" tone="gain"
              panel={<NetOfFeesContent monthlyReward={monthly} yearlyFee={fees}
                cards={[...wallet.per_card].sort((a, b) => slot(a.card_id) - slot(b.card_id)).map(pc => ({ name: pc.card_name || card(pc.card_id).name, monthly: pc.monthly_reward_aed }))} />}>
              {eye => (<>
                {icon('#FFE08A', <span className="text-[26px]">🎁</span>)}
                <div className="min-w-0">
                  <p className="mb-2 text-[15px] font-semibold tracking-wide text-ws-muted uppercase">Total rewards</p>
                  <p className="font-display text-[28px] leading-tight font-bold whitespace-nowrap text-ws-fg tabular-nums">AED <RollingAed value={monthly} /></p>
                  <p className="flex items-center gap-1.5 text-[12.5px] text-ws-muted">{`from ${n} ${n === 1 ? 'card' : 'cards'}`}{eye}</p>
                </div>
              </>)}
            </InfoHover>
          )}
          <InfoHover align="right" className={`flex min-w-0 flex-1 items-center gap-4 sm:pl-5 ${isMiles ? '' : 'sm:border-l sm:border-[#E8D5A0]'}`} label="How the annual fees are estimated"
            panelTitle="How the annual fee is estimated" panelSub="This wallet" tone="fee"
            panel={<FeeMathContent cards={wallet.per_card} nameOf={id => card(id).name} />}>
            {eye => (<>
              {icon('#FFFFFF', <span className="text-[26px]">💳</span>)}
              <div className="min-w-0">
                <p className="mb-2 text-[15px] font-semibold tracking-wide text-ws-muted uppercase">Card fees</p>
                <p className="font-display text-[28px] leading-tight font-bold whitespace-nowrap text-ws-fg tabular-nums">{aed(fees)}<span className="ml-1 text-[13px] font-medium text-ws-muted">/ yr</span></p>
                <p className="flex items-center gap-1.5 text-[12.5px] text-ws-muted tabular-nums">≈ {aed(fees / 12)} / month{eye}</p>
              </div>
            </>)}
          </InfoHover>
        </div>
      </div>
        )
      })()}
      {isPick && moreCardsNote && n < 3 && (
        <p className="mt-2 px-2 text-[13px] leading-snug text-ws-muted">
          Though having more cards could generate more rewards, but Earnn doesn&apos;t think it is worth it.
        </p>
      )}

      {tabs}

      {/* one tile per card */}
      {/* one set: the cards share a single tinted frame and are joined by + signs, so they read as one wallet */}
      <div className="mt-3 mb-4 rounded-3xl border border-[#C9D8F5] bg-gradient-to-b from-[#EAF1FF] to-[#F5F8FF] px-4 pt-5 pb-12 sm:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <p className="font-display text-[18px] font-bold text-ws-primary sm:text-[20px]">
              Your {n === 1 ? 'best card' : `set of ${n} cards`}
            </p>
            {!isPick && (
              <button type="button" onClick={onReset}
                className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[#E2B93B] bg-[#FFF6D6] px-3.5 py-1 text-[13px] font-semibold text-[#0D1828] transition hover:bg-[#FFE27A]">
                <span aria-hidden>↺</span> Show Earnn Recommendation
              </button>
            )}
          </div>
          {!isPick
            ? <p className={`ml-auto max-w-[400px] text-right text-[14px] leading-snug font-semibold sm:text-[15px] ${delta >= -0.5 ? 'text-ws-gain' : 'text-ws-loss'}`}>{diff}{extraCardNote && <span className="block whitespace-nowrap">but Earnn thinks not worth to have an extra card</span>}</p>
            : n > 1 && <p className="text-[13px] text-ws-muted">Use them together. Each one covers different spending.</p>}
        </div>
      <ul className={`grid gap-x-0 gap-y-9 md:grid-cols-3 md:gap-x-6`}>
        {[...wallet.per_card].sort((a, b) => slot(a.card_id) - slot(b.card_id)).map((pc, i) => {
          const groups = cardGroups(wallet, pc.card_id)
          const c = card(pc.card_id)
          return (
            <li key={pc.card_id} className={`relative flex flex-col rounded-2xl border border-ws-border bg-white p-4 pb-6 shadow-ws-lift sm:p-5 sm:pb-7`}>
              {i < n - 1 && (
                <span aria-hidden className="absolute top-1/2 left-full z-30 -ml-[11px] hidden size-[46px] -translate-y-1/2 place-items-center rounded-full border-[3px] border-white bg-gradient-to-br from-[#00A67E] to-[#2DD4A0] pb-0.5 text-[34px] leading-none font-black text-white shadow-[0_8px_20px_rgba(0,166,126,0.45)] md:grid">+</span>
              )}
              <span className="absolute -top-3.5 -left-3.5 z-20 grid size-9 place-items-center rounded-full border-2 border-white bg-[#0A2A66] text-[13px] font-bold text-white shadow-[0_3px_8px_rgba(10,42,102,0.35)]">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="mt-2 mb-3 line-clamp-2 min-h-[2.75em] text-[15px] leading-snug font-bold text-ws-fg sm:text-[16px]" title={c.name}><CardNameLink cardId={pc.card_id} mode={isMiles ? 'miles' : 'cashback'}>{c.name}</CardNameLink></p>
              <button type="button" onClick={() => onDetails(pc.card_id)} aria-haspopup="dialog" title="View card details"
                className="mx-auto block w-[62%] min-w-[150px] max-w-[250px] cursor-pointer border-0 bg-transparent p-0 transition-transform hover:-translate-y-0.5">
                <CardArt card={c} size="md" eager />
              </button>
              {/* always shown, below the card image: minimum spend on the left, the card's monthly cap on the right, each in its own small box */}
              {(() => {
                const lim = limits?.[pc.card_id]
                const money = (n: number) => (isMiles ? `${Math.round(n).toLocaleString('en-US')} miles` : `AED ${Math.round(n).toLocaleString('en-US')}`)
                const cell = (label: string, value: string, right = false) => (
                  <div className={`w-fit max-w-[48%] min-w-0 grow-0 rounded-lg border border-[#D6E0F5] bg-[#F3F7FF] px-2.5 py-1.5 ${right ? 'text-right' : ''}`}>
                    <p className="text-[8.5px] font-bold tracking-wide text-ws-muted uppercase">{label}</p>
                    <p className="text-[10.5px] leading-tight font-bold text-ws-fg tabular-nums">{value}</p>
                  </div>
                )
                return (
                  <div className="mt-3 flex items-stretch justify-between gap-2">
                    {cell('Min. spend', lim ? `${money(lim.min)}${lim.min > 0 ? ' / mo' : ''}` : '–')}
                    {cell('Card cap', lim ? (lim.cap !== null ? `${money(lim.cap)} / mo` : 'No cap') : '–', true)}
                  </div>
                )
              })()}
              <p className="mx-auto mt-2 rounded-full bg-[#E3F6EE] px-4 py-1.5 text-center font-display text-[18px] font-bold text-ws-gain tabular-nums sm:text-[20px]">
                <span className="text-[13px] font-semibold text-ws-muted">Reward </span>
                {isMiles ? <>{Math.round(pc.monthly_reward_aed).toLocaleString('en-US')}<span className="text-[13px] font-medium text-ws-muted"> miles/mo</span></> : <>AED {Math.round(pc.monthly_reward_aed).toLocaleString('en-US')}<span className="text-[13px] font-medium text-ws-muted">/mo</span></>}
              </p>
              {/* each category this card takes, with that category's own condition under it (same wording as the detailed view) */}
              <div className="mt-3 border-t border-ws-border pt-3">
                <p className="mb-2 text-[12px] font-medium text-ws-muted">Use it for</p>
                {groups.length === 0
                  ? <span className="rounded-xl bg-[#EEF3FB] px-3 py-2 text-[12px] font-medium text-ws-muted">Backup card</span>
                  : (
                    <ul className="space-y-4">
                      {groups.map(g => {
                        const line = wallet.allocation
                          .filter(a => a.card_id === pc.card_id && (a.group ?? 'miscellaneous') === g)
                          .sort((x, y) => y.monthly_reward_aed - x.monthly_reward_aed)[0]
                        const text = (line?.payment_condition_and_other_restrictions ?? '').trim() || null
                        const list = (line?.merchant_list ?? '').trim() || null
                        return (
                          <li key={g}>
                            <span className="inline-flex items-center gap-2 rounded-xl bg-[#D3DEF5] py-1 pr-2.5 pl-1 text-[12px] font-semibold text-ws-fg">
                              <CategoryGlyph group={g} className="size-6" iconClass="size-3.5" />
                              {groupShort(g)}
                            </span>
                            {(text || list) && <div className="-mt-1.5 pl-1 [&_button]:!text-[11px] [&_button]:!font-medium [&_div]:!text-[11px] [&_div]:!font-normal [&_div]:!leading-snug [&_div]:!text-[#8593AB]"><RewardConditionLabel paymentCondition={text} merchantList={list} cardName={c.name} /></div>}
                          </li>
                        )
                      })}
                    </ul>
                  )}
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

      </div>

      {plan}
      </div>
      {updating && (
        <div role="status" className="absolute inset-0 z-10">
          {/* sticky: the spinner stays in the middle of the visible screen wherever the user has scrolled */}
          <div className="sticky top-[38vh] flex justify-center">
            <span className="flex flex-col items-center gap-3 rounded-3xl bg-white px-8 py-6 text-[15px] font-semibold text-ws-fg shadow-ws-lift">
              <span aria-hidden className="size-14 animate-spin rounded-full border-[5px] border-[#DCE6FA] border-t-ws-primary" />
              Calculating your rewards…
            </span>
          </div>
        </div>
      )}
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#8FB8FF] bg-[#CFE2FF] p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <p className="text-[15px] font-semibold text-ws-fg">Want to try different cards?</p>
        <button type="button" onClick={onChange} aria-haspopup="dialog"
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-ws-border bg-white px-6 text-[15px] font-semibold whitespace-nowrap text-ws-fg transition hover:bg-[#F7F9FC]">
          Change cards
        </button>
      </div>

    </section>
  )
}
