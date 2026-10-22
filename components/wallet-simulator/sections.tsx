'use client'

import { useRewardMode } from '@/lib/wallet-simulator/reward-mode'
import RewardConditionLabel from '@/components/RewardConditionLabel'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import type { BestOfSize, SpendGroup, Strategy, Wallet } from '@/lib/wallet-simulator/api'
import { aed, groupIcon, groupShort } from '@/lib/wallet-simulator/groups'
import { buildPlaybook, cardGroups, sameCards, type PlaybookEntry, type PlaybookRow } from '@/lib/wallet-simulator/playbook'
import { CardArt, CardChip, RollingAed, type CardInfo } from './card-art'
import { FeeMathDialog, NetOfFeesDialog } from './fee-math'

type CardLookup = (id: string) => CardInfo
type CardDetails = (id: string) => void   // opens the card-information popup

/** A card name (or photo) that opens the card's information popup. */
export function CardLink({ id, onDetails, className = '', children }: { id: string; onDetails: CardDetails; className?: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={() => onDetails(id)} aria-haspopup="dialog" title="View card details"
      className={`cursor-pointer border-0 bg-transparent p-0 text-left underline-offset-2 hover:underline ${className}`}>
      {children}
    </button>
  )
}

const NUMBER_WORD = ['', 'One', 'Two', 'Three']
const cardName = (c: CardInfo) => c.name

/* ---------------- Section 1: hero ---------------- */

export function Hero({ pick, strategies, monthlySpend, card, onCustomize, onHowTo, onDetails }: {
  pick: Wallet              // the recommended strategy's wallet
  strategies: Strategy[]    // recommended, second, third (as in the Analyse results); the first gives the headline
  monthlySpend: number
  card: CardLookup
  onCustomize: () => void   // opens the wallet customization popup
  onHowTo: () => void       // opens the "how to use your wallet" panel
  onDetails: CardDetails
}) {
  const { rw, isMiles } = useRewardMode()
  const transforms: Record<number, string[]> = {
    1: ['left-1/2 top-8 -translate-x-1/2 -rotate-3'],
    2: ['left-0 bottom-0 -rotate-6', 'left-[22%] top-0 rotate-4'],
    3: ['left-0 bottom-0 -rotate-8', 'left-[14%] top-[18%] -rotate-2', 'left-[28%] top-0 rotate-5'],
  }
  const ids = pick.cards
  const headline = strategies[0]?.title ?? (ids.length === 1
    ? 'One card. Everything you spend on, covered.'
    : `${NUMBER_WORD[ids.length]} cards. Everything you spend on, covered.`)
  const monthly = pick.monthly_reward_aed
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-5 pt-10 pb-6 sm:px-8 sm:pt-14">
        <h1 className="font-display text-3xl font-bold tracking-tight text-ws-primary sm:text-5xl">
          Your spending is unique. So is your card strategy.
        </h1>
        <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-ws-muted sm:text-[17px]">
          Based on your <span className="text-[19px] font-semibold text-ws-fg sm:text-[22px]">{aed(monthlySpend)} monthly spend</span>, we tested thousands of
          UAE card combinations to find {isMiles ? 'the wallet that earns you the most miles.' : 'your highest-value wallet.'}
        </p>

        {/* the recommended strategy, in the Analyse result style */}
        <div className="relative mt-7 overflow-hidden rounded-3xl p-5 text-white shadow-ws-plastic sm:p-8"
          style={{ background: 'linear-gradient(110deg,#091e42 0%,#0A2A66 35%,#143a7a 70%,#1b4080 100%)' }}>
          <div aria-hidden className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #00A870 0%, transparent 70%)' }} />

          <div className="relative grid min-w-0 gap-8 lg:grid-cols-[1.45fr_0.85fr] lg:items-center">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-[16px] font-bold">
                <span aria-hidden className="text-[18px] leading-none">🏆</span>
                {headline}
              </p>

              <p className="mt-5 text-[12px] font-medium tracking-[0.1em] text-white/70 uppercase">Potential monthly rewards</p>
              <p className="mt-1 flex items-baseline gap-2 tabular-nums">
                <span className="font-display text-5xl font-bold text-[#F5D76E] sm:text-6xl">
                  {isMiles ? <><RollingAed value={monthly} /> miles</> : <>AED <RollingAed value={monthly} /></>}
                </span>
                <span className="text-[16px] text-[#F5D76E]/75">/ month</span>
              </p>
              <p className="mt-3 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-medium text-white/80">
                  On {aed(monthlySpend)} spent / month
                </span>
                <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 font-medium text-white/80">
                  Annual fees {aed(pick.total_fee_aed)}
                </span>
                <span className="rounded-full border border-[#6EF0BF]/30 bg-[#6EF0BF]/10 px-3 py-1 font-semibold text-[#6EF0BF]">
                  {isMiles ? `${rw(pick.annual_reward_aed)} a year` : `Net ${rw(pick.net_annual_value_aed / 12)} / month`}
                </span>
              </p>

              <p className="mt-6 mb-3 text-[14px] text-white/70">Recommended Cards</p>
              <ul className="flex flex-col gap-1.5">
                {pick.per_card.map(pc => {
                  const groups = cardGroups(pick, pc.card_id)
                  const c = card(pc.card_id)
                  return (
                    <li key={pc.card_id}>
                      <button type="button" onClick={() => onDetails(pc.card_id)} aria-haspopup="dialog" title="View card details"
                        className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-white/10">
                        <span aria-hidden className="shrink-0 text-[17px] leading-none">{groupIcon(groups[0])}</span>
                        <span className="min-w-0 flex-1 text-[13px] leading-tight text-white/90">
                          <span className="font-bold">{cardName(c)}</span>
                          <span className="text-white/60"> — {groups.slice(0, 2).map(g => groupShort(g)).join(' & ') || 'Backup card'}</span>
                        </span>
                        <span className="shrink-0 text-[12px] font-bold tabular-nums text-[#6EF0BF]">+{rw(pc.monthly_reward_aed)}/mo</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            <div className="relative flex min-w-0 flex-col items-center gap-5">
              <div className="relative h-[200px] w-full max-w-[340px] sm:h-[250px] sm:max-w-[400px]">
                {ids.map((id, i) => (
                  <div key={id}
                    className={`ws-animate-settle absolute w-[190px] sm:w-[250px] ${transforms[ids.length]?.[i] ?? ''}`}
                    style={{ animationDelay: `${i * 0.1}s`, zIndex: i === 1 ? 3 : 2 }}>
                    <CardArt card={card(id)} size="lg" eager />
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-center gap-2">
                <span className="text-[12px] text-white/65">Want to try different cards?</span>
                <div className="flex flex-nowrap justify-center gap-2">
                  <button onClick={onCustomize}
                    className="inline-flex min-h-10 items-center gap-1.5 whitespace-nowrap rounded-2xl border border-white/15 bg-[#2D8C6A] px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-[0_2px_12px_rgba(45,140,106,0.35)] transition hover:brightness-110 active:scale-95">
                    Customize my wallet
                  </button>
                  <button onClick={onHowTo} aria-haspopup="dialog"
                    className="inline-flex min-h-10 items-center whitespace-nowrap rounded-2xl border border-white/20 px-3.5 py-2 text-[12.5px] font-semibold text-white/90 transition hover:bg-white/10">
                    How do I use them?
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  )
}

// real cards fanned over a soft circle
const STRATEGY_FAN: Record<number, string[]> = {
  1: ['left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6'],
  2: ['left-[14px] top-[14px] -rotate-[10deg]', 'left-[62px] top-[30px] rotate-[4deg]'],
  3: ['left-[6px] top-[10px] -rotate-[12deg]', 'left-[48px] top-[26px] -rotate-[3deg]', 'left-[90px] top-[42px] rotate-[6deg]'],
}

/** "2nd Best Single Card" with the "nd" / "rd" set small and raised. */
function Ordinals({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\d+(?:st|nd|rd|th))/).map((part, i) => {
        const m = /^(\d+)(st|nd|rd|th)$/.exec(part)
        return m ? <span key={i}>{m[1]}<sup className="ml-px align-super text-[0.55em] font-semibold">{m[2]}</sup></span> : part
      })}
    </>
  )
}

/** A secondary strategy (second / third best): a light header with the net value and the fanned cards,
 *  a white body with the numbers behind it, and a one-tap switch. */
function StrategyBox({ strategy, lessBy, card, inUse, onUse, onDetails }: {
  strategy: Strategy
  lessBy: number            // net value a month below the recommended strategy
  card: CardLookup
  inUse: boolean
  onUse: () => void
  onDetails: CardDetails
}) {
  const { rw, isMiles } = useRewardMode()
  const ids = strategy.wallet.cards
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-ws-border bg-white shadow-ws-lift">
      {/* header */}
      <div className="relative overflow-hidden border-b border-ws-border bg-gradient-to-br from-[#F7F9FC] to-[#EEF2F8] p-5 text-ws-fg">
        <p className={`${strategy.message ? 'min-h-[2.5em]' : ''} font-display text-[20px] leading-tight font-semibold text-balance`}><Ordinals text={strategy.title} /></p>
        {strategy.message && <p className="mt-1.5 min-h-[2.8em] text-[13px] leading-snug text-ws-muted">{strategy.message}</p>}

        {/* the cards, on their own band so they never sit over the text */}
        <div aria-hidden className="relative mx-auto mt-3 h-[128px] w-[200px]">
          <div className="absolute top-1/2 left-1/2 size-[118px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ws-fg/[0.05]" />
          <Sparkle className="absolute top-0 right-2 z-10 size-6" />
          {ids.map((id, i) => (
            <div key={id} className={`absolute w-[104px] ${STRATEGY_FAN[ids.length]?.[i] ?? ''}`} style={{ zIndex: i }}>
              <CardArt card={card(id)} size="sm" />
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-display text-[34px] leading-none font-semibold tracking-tight whitespace-nowrap text-ws-fg">{isMiles ? rw(strategy.annual_reward_aed / 12) : rw(strategy.net_annual_value_aed / 12)}</p>
            <p className="mt-1.5 text-[12px] text-ws-muted">{isMiles ? 'earned per month' : 'net per month, after fees'}</p>
          </div>
          {Math.abs(lessBy) > 0.5 && (
            <span title={isMiles ? 'Miles a month compared with the recommended wallet' : 'Net value a month compared with the recommended wallet'}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-right leading-tight tabular-nums ${lessBy > 0 ? 'bg-[#FFF1DB] text-[#B45309]' : 'bg-[#E3F6EC] text-ws-gain'}`}>
              <span className="block text-[13px] font-bold whitespace-nowrap">
                {Math.round(Math.abs(lessBy)).toLocaleString('en-US')} {isMiles ? 'miles' : 'AED'}/mo {lessBy > 0 ? 'less' : 'more'}
              </span>
              <span className="block text-[11px] font-medium opacity-80">{lessBy > 0 ? 'from' : 'than'} best selection</span>
            </span>
          )}
        </div>
      </div>

      {/* body */}
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[10px] font-semibold tracking-[0.14em] text-ws-muted uppercase">
          {ids.length === 1 ? 'The card' : `The ${ids.length} cards`}
        </p>
        <ul className="mt-2 flex-1 space-y-2">
          {ids.map(id => (
            <li key={id} className="flex items-center gap-2.5">
              <CardChip card={card(id)} className="!h-[30px] !w-[48px]" />
              <span className="min-w-0 text-[13px] leading-tight font-semibold text-ws-fg">
                <CardLink id={id} onDetails={onDetails} className="hover:text-ws-primary">{cardName(card(id))}</CardLink>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid shrink-0 grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-[#F3F5F9] px-2 py-2.5">
            <p className="text-[9px] font-semibold tracking-[0.12em] text-ws-muted uppercase">Rewards / mo</p>
            <p className="mt-0.5 font-display text-[15px] font-semibold text-ws-fg tabular-nums">{rw(strategy.annual_reward_aed / 12)}</p>
          </div>
          <div className="rounded-xl bg-[#FFF3E0] px-2 py-2.5">
            <p className="text-[9px] font-semibold tracking-[0.12em] text-ws-muted uppercase">Annual fees</p>
            <p className="mt-0.5 font-display text-[15px] font-semibold text-[#B45309] tabular-nums">{aed(strategy.total_fee_aed)}</p>
          </div>
          <div className="rounded-xl bg-[#E3F6EC] px-2 py-2.5">
            <p className="text-[9px] font-semibold tracking-[0.12em] text-ws-muted uppercase">{isMiles ? 'Miles / year' : 'Net / mo'}</p>
            <p className="mt-0.5 font-display text-[15px] font-semibold text-ws-gain tabular-nums">{isMiles ? rw(strategy.annual_reward_aed) : rw(strategy.net_annual_value_aed / 12)}</p>
          </div>
        </div>

        <div className="shrink-0 pt-5">
          <button onClick={onUse} disabled={inUse}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full border border-ws-fg/25 bg-white px-4 py-2 text-[13px] font-semibold text-ws-fg transition-all hover:border-ws-fg/50 hover:bg-[#F7F9FC] disabled:cursor-default disabled:opacity-60">
            {inUse ? 'In your wallet' : <>Try {ids.length === 1 ? 'this card' : 'these cards'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}


/* ---------------- Section 2: why this many cards ---------------- */

type LadderFeature = { title: string; sub: string; icon: keyof typeof LADDER_ICONS; tint: string }

const LADDER_FEATURES: Record<number, LadderFeature[]> = {
  1: [
    { title: 'Keep it simple', sub: 'One card, one habit.', icon: 'check', tint: 'bg-[#E8F1FF] text-[#2F6FE4]' },
    { title: 'Easy to manage', sub: 'Fewer cards to track.', icon: 'wallet', tint: 'bg-[#EFEAFF] text-[#7C5CE0]' },
  ],
  2: [
    { title: 'Smart balance', sub: 'Covers most of your month.', icon: 'bars', tint: 'bg-[#E6F7EF] text-[#16A36A]' },
    { title: 'Better category coverage', sub: 'Earn more where you spend.', icon: 'cart', tint: 'bg-[#FDEBEC] text-[#E5484D]' },
  ],
  3: [
    { title: 'Maximise rewards', sub: 'Get the highest total value.', icon: 'star', tint: 'bg-[#FFF3D6] text-[#E2A100]' },
    { title: 'Wider coverage', sub: 'More categories at a top rate.', icon: 'grid', tint: 'bg-[#EFEAFF] text-[#7C5CE0]' },
    { title: 'Still easy to manage', sub: 'Just the right balance.', icon: 'check', tint: 'bg-[#E6F7EF] text-[#16A36A]' },
  ],
}

const LADDER_ICONS = {
  check: <path d="M5 12.5l4.2 4L19 7" strokeWidth={2.6} />,
  wallet: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M16 12.5h2.5" strokeWidth={2.6} /><path d="M6 6l9-3 1 3" /></>,
  bars: <><path d="M6 19v-5" strokeWidth={3} /><path d="M12 19V9" strokeWidth={3} /><path d="M18 19V5" strokeWidth={3} /></>,
  cart: <><path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H7" /><circle cx="9.5" cy="19" r="1.4" /><circle cx="16.5" cy="19" r="1.4" /></>,
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8z" fill="currentColor" />,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.8" fill="currentColor" /><rect x="13" y="4" width="7" height="7" rx="1.8" fill="currentColor" /><rect x="4" y="13" width="7" height="7" rx="1.8" fill="currentColor" /><rect x="13" y="13" width="7" height="7" rx="1.8" fill="currentColor" /></>,
}

function LadderIcon({ name }: { name: keyof typeof LADDER_ICONS }) {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {LADDER_ICONS[name]}
    </svg>
  )
}

/** Little "shine" strokes used as decoration next to the card fans and the tip arrow. */
function Sparkle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" stroke="#F5C443" strokeWidth={3.5} strokeLinecap="round" aria-hidden>
      <path d="M8 4v10" /><path d="M24 6l-6 9" /><path d="M34 18l-10 3" />
    </svg>
  )
}

// fanned positions for 1–3 real card images inside a tile
const FAN: Record<number, string[]> = {
  1: ['left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-12'],
  2: ['left-[2px] top-[10px] -rotate-[16deg]', 'left-[24px] top-[26px] -rotate-[4deg]'],
  3: ['left-0 top-[6px] -rotate-[18deg]', 'left-[13px] top-[19px] -rotate-[9deg]', 'left-[26px] top-[32px] -rotate-[3deg]'],
}

export function Ladder({ bestBySize, increments, pickSize, currentIds, card, onUse, feeOf }: {
  bestBySize: Record<string, BestOfSize>
  increments: Record<string, number>
  pickSize: number
  currentIds: string[]
  card: CardLookup
  onUse: (ids: string[]) => void
  feeOf?: (ids: string[]) => number | null   // the wallet's total annual fee in AED (null when unknown)
}) {
  const { rw, isMiles } = useRewardMode()
  const sizes = Object.keys(bestBySize).map(Number).filter(n => n >= 1 && n <= 3).sort((a, b) => a - b)
  if (sizes.length < 2) return null
  const titleWord = NUMBER_WORD[pickSize]?.toLowerCase() ?? String(pickSize)
  // "% more" is measured against the smallest wallet shown (the 1-card baseline when present)
  const base = bestBySize[String(sizes[0])].annual_reward_aed
  const pickIsLast = pickSize === sizes[sizes.length - 1]
  return (
    <section className="relative overflow-hidden border-t border-ws-border bg-gradient-to-b from-ws-bg to-ws-secondary/40">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <div>
            <h2 className="text-3xl font-semibold text-balance text-ws-fg sm:text-[46px] sm:leading-[1.06]">
              Why {titleWord} card{pickSize === 1 ? '' : 's'}?
            </h2>
            <p className="mt-4 max-w-[52ch] text-[17px] leading-relaxed text-pretty text-ws-muted">
              Each card you add can earn you a little more. Here&apos;s exactly how much, so you can decide
              whether it&apos;s worth carrying.
            </p>
          </div>
          <div className="relative lg:pr-28">
            <div className="flex max-w-[360px] items-start gap-3 rounded-3xl border border-ws-border bg-ws-card/80 px-5 py-4 shadow-ws-lift backdrop-blur">
              <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-[#FFF5DB] text-[17px]">💡</span>
              <p className="text-[14px] leading-snug text-ws-fg">
                Most people get the best rewards with 2–3 cards, without complicating their wallet.
              </p>
            </div>
            {pickIsLast && (
              <div aria-hidden className="pointer-events-none absolute -top-4 right-0 hidden h-[150px] w-[110px] lg:block">
                <Sparkle className="absolute top-0 right-0 size-9" />
                <svg viewBox="0 0 110 150" className="absolute inset-0 size-full" fill="none" stroke="#3B6FD8" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M8 56 C 40 30, 92 42, 84 94 C 81 112, 74 124, 64 136" />
                  <path d="M58 120 L 63 138 L 81 131" />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* all tiles share one height (grid rows stretch); the pick stands out by colour, not size */}
        <div className={`mt-10 grid gap-4 ${sizes.length === 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2'}`}>
          {sizes.map(s => {
            const rung = bestBySize[String(s)]
            const isPick = s === pickSize
            const gain = increments[`${s}_vs_${s - 1}`]
            const more = s !== sizes[0] && base > 0 ? Math.round(((rung.annual_reward_aed - base) / base) * 100) : null
            const inUse = sameCards(rung.cards, currentIds)
            const fee = feeOf?.(rung.cards) ?? null
            const features = (LADDER_FEATURES[s] ?? []).map(f => (isMiles && f.title === 'Maximise rewards' ? { ...f, sub: 'Earn the most miles.' } : f))
            return (
              <div key={s}
                className={`relative flex flex-col rounded-2xl p-5 ${
                  isPick
                    ? 'bg-gradient-to-br from-[#123B86] to-[#0B2559] text-white shadow-ws-plastic'
                    : 'border border-ws-border bg-ws-card text-ws-fg shadow-ws-lift'
                }`}>
                {isPick && (
                  <span className="absolute -top-3 right-5 flex items-center gap-1 rounded-full bg-[#F7C948] px-3 py-1 text-[10px] font-bold tracking-[0.1em] text-[#0D1828] uppercase shadow-ws-lift">
                    <span aria-hidden>👑</span> Earnn Pick
                  </span>
                )}

                <div className="flex h-9 items-center justify-between gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase ${isPick ? 'bg-white/12 text-white/85' : 'bg-ws-secondary text-ws-muted'}`}>
                    {s} card{s > 1 ? 's' : ''}
                  </span>
                  {more !== null && more > 0 && (isPick ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-white/10 py-1 pr-3 pl-1 ring-1 ring-white/15">
                      <span aria-hidden className="grid size-6 place-items-center rounded-full bg-white text-[13px] font-bold text-ws-primary">↑</span>
                      <span className="whitespace-nowrap">
                        <span className="font-display text-[15px] font-semibold">{more}%</span>
                        <span className="ml-1 text-[11px] text-white/70">more</span>
                      </span>
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#E3F6EC] px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-ws-gain">+{more}% more</span>
                  ))}
                </div>

                {/* big yearly amount, with the gain and the wallet's real cards fanned beneath it */}
                <div className="mt-2">
                  <p className="font-display text-[40px] leading-none font-semibold tracking-tight whitespace-nowrap sm:text-[44px]">
                    {rw(rung.annual_reward_aed)}
                  </p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`h-[22px] text-[16px] font-semibold whitespace-nowrap ${isPick ? 'text-[#F7C948]' : 'text-ws-gain'}`}>
                        {gain === undefined ? '' : gain >= 0 ? `+ ${rw(gain)} a year` : `${rw(-gain)} a year less`}
                      </p>
                      <p className={`text-[12px] whitespace-nowrap ${isPick ? 'text-white/70' : 'text-ws-muted'}`}>estimated rewards per year</p>
                      {fee !== null && (
                        <p className={`mt-0.5 text-[10px] whitespace-nowrap tabular-nums ${isPick ? 'text-white/55' : 'text-ws-muted/80'}`}>Annual fees {aed(fee)}</p>
                      )}
                    </div>
                    <div aria-hidden className="relative h-[78px] w-[92px] shrink-0">
                      <div className={`absolute top-1/2 left-1/2 size-[78px] -translate-x-1/2 -translate-y-1/2 rounded-full ${isPick ? 'bg-white/[0.07]' : 'bg-ws-secondary/80'}`} />
                      <Sparkle className="absolute -top-2 -right-1 z-10 size-5" />
                      {rung.cards.map((id, i) => (
                        <div key={id} className={`absolute w-[64px] ${FAN[rung.cards.length]?.[i] ?? ''}`} style={{ zIndex: i }}>
                          <CardArt card={card(id)} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <ul className="mt-5 mb-5 space-y-3">
                  {features.map(f => (
                    <li key={f.title} className="flex items-center gap-2.5">
                      <span className={`grid size-8 shrink-0 place-items-center rounded-full ${isPick ? 'bg-white/12 text-[#F7C948]' : f.tint}`}>
                        <LadderIcon name={f.icon} />
                      </span>
                      <span className="min-w-0 leading-tight">
                        <span className="block truncate text-[13px] font-semibold">{f.title}</span>
                        <span className={`block truncate text-[12px] ${isPick ? 'text-white/65' : 'text-ws-muted'}`}>{f.sub}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                <button onClick={() => onUse(rung.cards)} disabled={inUse}
                  className={`mt-auto inline-flex min-h-10 w-fit items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${
                      isPick
                        ? 'bg-white text-[#0D1828] hover:-translate-y-0.5'
                        : 'border border-ws-fg/25 bg-ws-card text-ws-fg hover:-translate-y-0.5 hover:border-ws-primary'
                    } disabled:translate-y-0 disabled:cursor-default disabled:opacity-60`}>
                    {inUse ? 'In your wallet' : <>Try this wallet</>}
                  </button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Section 3: playbook ---------------- */


type PlaybookProps = {
  onDetails: CardDetails
  wallet: Wallet | null
  groups: SpendGroup[]
  monthlySpend: number
  card: CardLookup
  updating: boolean
  hideSummary?: boolean // the page already shows the totals above
  heading?: React.ReactNode // shown on the left of the view switch, on the same line
}

// Bold, coloured line icons per spending category (used on the wallet illustration chips).
const CATEGORY_STYLE: Record<string, { fg: string; bg: string; icon: React.ReactNode }> = {
  grocery_store: { fg: '#16A34A', bg: '#DCFCE7', icon: <><path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H7" /><circle cx="9.5" cy="19.5" r="1.5" /><circle cx="16.5" cy="19.5" r="1.5" /></> },
  dineout: { fg: '#EF4444', bg: '#FEE2E2', icon: <><path d="M6 3v6a2.5 2.5 0 0 0 5 0V3" /><path d="M8.5 3v18" /><path d="M18 21V3c-2.2 1.6-3 4.4-3 8h3" /></> },
  food_delivery: { fg: '#F97316', bg: '#FFEDD5', icon: <><circle cx="6" cy="17" r="2.5" /><circle cx="18" cy="17" r="2.5" /><path d="M8.5 17h7l1.5-6h-4" /><path d="M3.5 13.5 6 9h4" /><path d="M17 11l-1.5-5H13" /></> },
  travel: { fg: '#6366F1', bg: '#E0E7FF', icon: <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" /> },
  taxi: { fg: '#D97706', bg: '#FEF3C7', icon: <><path d="M4 16.5V12l2-5h12l2 5v4.5z" /><path d="M4 12h16" /><circle cx="7.5" cy="16.5" r="1.8" /><circle cx="16.5" cy="16.5" r="1.8" /><path d="M10 4h4" /></> },
  online: { fg: '#0EA5E9', bg: '#E0F2FE', icon: <><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5" /><path d="M12 13v8" /></> },
  retail: { fg: '#EAB308', bg: '#FEF9C3', icon: <><path d="M5.5 8h13l-1 12.5h-11z" /><path d="M9 10V7a3 3 0 0 1 6 0v3" /></> },
  fuel: { fg: '#2563EB', bg: '#DBEAFE', icon: <><path d="M3 21h12" /><path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" /><path d="M4 10h10" /><path d="M14 13h2a2 2 0 0 1 2 2v2a2 2 0 0 0 4 0V9l-3-3" /></> },
  telecom: { fg: '#8B5CF6', bg: '#EDE9FE', icon: <><rect x="6" y="2.5" width="12" height="19" rx="3" /><path d="M11 18h2" /></> },
  utility: { fg: '#F59E0B', bg: '#FEF3C7', icon: <path d="M13 2 4 14h7l-1 8 9-12h-7z" /> },
  education: { fg: '#0D9488', bg: '#CCFBF1', icon: <><path d="M22 10 12 5 2 10l10 5z" /><path d="M6 12v5c3 2 9 2 12 0v-5" /></> },
  miscellaneous: { fg: '#EC4899', bg: '#FCE7F3', icon: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /> },
}

CATEGORY_STYLE.grocery_online = CATEGORY_STYLE.grocery_store
CATEGORY_STYLE.grocery = CATEGORY_STYLE.grocery_store // results saved before the key was renamed

export function CategoryGlyph({ group, className = 'size-12', iconClass = 'size-6' }: { group: string | null; className?: string; iconClass?: string }) {
  const st = CATEGORY_STYLE[group ?? ''] ?? CATEGORY_STYLE.miscellaneous
  return (
    <span className={`grid shrink-0 place-items-center rounded-full ${className}`} style={{ backgroundColor: st.bg, color: st.fg }}>
      <svg viewBox="0 0 24 24" className={iconClass} fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        {st.icon}
      </svg>
    </span>
  )
}

// Where each chip's centre sits around the wallet for 1–5 categories (% of the box). Deliberately
// irregular — some hug the wallet, some float further out — and lighter on the right, next to the text.
type Spot = { x: number; y: number }
const CHIP_LAYOUTS: Record<number, Spot[]> = {
  1: [{ x: 71, y: 30 }],
  2: [{ x: 25, y: 20 }, { x: 70, y: 76 }],
  3: [{ x: 26, y: 17 }, { x: 17, y: 60 }, { x: 72, y: 30 }],
  4: [{ x: 27, y: 15 }, { x: 17, y: 50 }, { x: 31, y: 86 }, { x: 72, y: 26 }],
  5: [{ x: 27, y: 15 }, { x: 17, y: 50 }, { x: 31, y: 86 }, { x: 72, y: 24 }, { x: 69, y: 77 }],
}

export function Playbook({ onOpen, wallet, groups, card }: {
  onOpen: () => void
  wallet: Wallet | null
  groups: SpendGroup[]
  card: CardLookup
}) {
  const { rw } = useRewardMode()
  // top categories by reward (up to 5), only those that actually earn — amounts from the backend allocation
  const chips = buildPlaybook(wallet, groups).filter(r => r.monthlyReward > 0.005).slice(0, 5)
  return (
    <section id="playbook" className="scroll-mt-20 overflow-hidden bg-gradient-to-b from-[#0A2A66] to-[#061A42] text-ws-ink-fg">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-16 xl:grid-cols-[1.05fr_1fr]">
        <div className="xl:order-2">
          <h2 className="text-3xl font-semibold text-balance text-white sm:text-[44px] sm:leading-[1.08]">Which card should I use?</h2>
          <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-pretty text-white/70">
            See where to use each card and how much it can earn you.
          </p>
          <button type="button" onClick={onOpen}
            className="group mt-8 flex w-full max-w-[460px] items-center gap-4 rounded-3xl bg-ws-card p-4 text-left shadow-ws-plastic transition-transform hover:-translate-y-0.5">
            <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-full bg-[#E8EFFF] text-[#2F5BEA]">
              <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5z" /><path d="M12 6.5v13" />
              </svg>
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[11px] font-bold tracking-[0.14em] text-ws-primary uppercase">Quick guide</span>
              <span className="mt-0.5 block font-display text-[18px] font-semibold text-ws-primary sm:text-[20px]">See which card to use where</span>
            </span>
            <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-full bg-[#10B981] text-[20px] text-white shadow-ws-lift transition-colors group-hover:bg-[#059669]">→</span>
          </button>
        </div>

        <div className="xl:order-1 xl:-ml-14"><WalletIllustration ids={wallet?.cards ?? []} chips={chips} card={card} /></div>

        {/* small screens: the same chips as a simple grid under the illustration */}
        {chips.length > 0 && (
          <div className="-mt-4 grid grid-cols-2 gap-2 md:hidden">
            {chips.map(row => (
              <div key={row.group} className="flex items-center gap-2 rounded-2xl bg-ws-card p-2 shadow-ws-lift">
                <CategoryGlyph group={row.group} className="size-10" iconClass="size-5" />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-semibold text-ws-fg">{groupShort(row.group)}</span>
                  <span className="block text-[12px] text-ws-muted">Earn {rw(row.monthlyReward)}/mo</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

/** The user's real cards in a tilted wallet, with animated dashed lines flowing out to their top
 *  categories. Lines are drawn from the measured positions of the wallet and each chip. */
function WalletIllustration({ ids, chips, card }: { ids: string[]; chips: PlaybookRow[]; card: CardLookup }) {
  const { rw } = useRewardMode()
  const boxRef = useRef<HTMLDivElement>(null)
  const walletRef = useRef<HTMLDivElement>(null)
  const chipRefs = useRef<(HTMLDivElement | null)[]>([])
  const [paths, setPaths] = useState<string[]>([])
  const spots = CHIP_LAYOUTS[chips.length] ?? []
  const chipKey = chips.map(c => c.group).join('|')

  const measure = useCallback(() => {
    const box = boxRef.current?.getBoundingClientRect()
    const w = walletRef.current?.getBoundingClientRect()
    if (!box || !w || box.width === 0) return
    const sx = w.left + w.width / 2 - box.left
    const sy = w.top + w.height * 0.45 - box.top
    const next: string[] = []
    chipRefs.current.slice(0, chips.length).forEach((el, i) => {
      if (!el || getComputedStyle(el).display === 'none') return
      const c = el.getBoundingClientRect()
      const left = c.left + c.width / 2 - box.left < sx   // chips left of the wallet take the line on their right edge
      const ex = (left ? c.right : c.left) - box.left
      const ey = c.top + c.height / 2 - box.top
      // a gentle S-curve: leave the wallet horizontally, arrive at the chip horizontally
      const mx = (sx + ex) / 2
      const bend = (i % 2 === 0 ? -1 : 1) * 18
      next.push(`M ${sx} ${sy} C ${mx} ${sy + bend}, ${mx} ${ey - bend}, ${ex} ${ey}`)
    })
    setPaths(next)
    // spots is derived from chips.length; chipKey covers chip changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chipKey])

  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    chipRefs.current.forEach(el => el && ro.observe(el)) // chips change width when the web font loads
    const first = setTimeout(measure, 0)
    let alive = true
    document.fonts?.ready.then(() => { if (alive) measure() })
    window.addEventListener('resize', measure)
    return () => { alive = false; ro.disconnect(); clearTimeout(first); window.removeEventListener('resize', measure) }
  }, [measure])

  return (
    <div ref={boxRef} className="relative mx-auto h-[300px] w-full max-w-[620px] sm:h-[340px]" aria-hidden>

      {/* animated dashed connectors (behind the wallet, so they appear to come out of it) */}
      <svg className="pointer-events-none absolute inset-0 hidden h-full w-full md:block" fill="none">
        {paths.map((d, i) => (
          <path key={i} d={d} stroke="#A9C1F2" strokeOpacity={0.7} strokeWidth={2}
            strokeDasharray="6 8" strokeLinecap="round" />
        ))}
      </svg>

      {/* wallet, tilted like the reference, with the user's real cards inside */}
      <div ref={walletRef} className="absolute top-1/2 left-[46%] z-10 h-[170px] w-[190px] -translate-x-1/2 -translate-y-[42%] rotate-[30deg] scale-[0.8]">
        {ids.map((id, i) => (
          <div key={id} className="absolute w-[128px]"
            style={{ left: `${14 + i * 18}px`, top: `${-6 + i * 12}px`, transform: `rotate(${-14 + i * 9}deg)`, zIndex: i }}>
            <CardArt card={card(id)} size="sm" />
          </div>
        ))}
        <div className="absolute inset-x-0 bottom-0 z-10 h-[104px] rounded-[26px] bg-gradient-to-br from-[#D9935A] via-[#B4672F] to-[#7A3F19] shadow-ws-plastic ring-1 ring-white/25">
          <div className="absolute inset-2 rounded-[20px] border border-dashed border-[#F6D9B5]/60" />
          <div className="absolute top-1/2 right-[-6px] h-[46px] w-[64px] -translate-y-1/2 rounded-l-[18px] rounded-r-[10px] bg-gradient-to-br from-[#C57A41] to-[#83461E] shadow-ws-lift">
            <span className="absolute top-1/2 left-3 size-4 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#F5D98A] to-[#C9A24B] shadow" />
          </div>
        </div>
      </div>

      {chips.map((row, i) => {
        const spot = spots[i]
        return (
          <div key={row.group} ref={el => { chipRefs.current[i] = el }}
            className="absolute z-20 hidden items-center gap-2.5 rounded-full bg-ws-card py-[5px] pr-[18px] pl-[5px] shadow-ws-lift md:flex"
            style={{ left: `${spot.x}%`, top: `${spot.y}%`, transform: 'translate(-50%, -50%)' }}>
            <CategoryGlyph group={row.group} className="size-[43px]" iconClass="size-[22px]" />
            <span className="whitespace-nowrap">
              <span className="block font-display text-[13.5px] font-semibold text-ws-fg">{groupShort(row.group)}</span>
              <span className="block text-[12px] text-ws-muted">Earn {rw(row.monthlyReward)}/mo</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** The playbook itself (summary strip + where to use each card). Also shown in the expanded wallet. */
export function PlaybookBody({ wallet, groups, monthlySpend, card, updating, onDetails, hideSummary = false, heading }: PlaybookProps) {
  const { rw, isMiles } = useRewardMode()
  const [view, setView] = useState<'card' | 'category'>('category')
  const [explain, setExplain] = useState<'fees' | 'net' | null>(null)
  const rows = buildPlaybook(wallet, groups)
  const monthlyReward = wallet?.monthly_reward_aed ?? 0
  if (rows.length === 0) {
    return (
      <>
        {heading && <div className="mt-10">{heading}</div>}
        <p className="mt-4 rounded-2xl border border-dashed border-ws-border p-8 text-center text-[14px] text-ws-muted">
          Add a card to your wallet to see your playbook.
        </p>
      </>
    )
  }
  return (
    <div className={`${hideSummary ? 'mt-2' : 'mt-8'} transition-opacity ${updating ? 'opacity-60' : ''}`}>
      {!hideSummary && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryTile label="Monthly spend" value={aed(monthlySpend)} />
        <SummaryTile label="Your rewards" value={`${rw(monthlyReward)} / mo`} tone="gain" />
        <SummaryTile label="Annual fees" value={aed(wallet?.total_fee_aed ?? 0)} tone="highlight" onInfo={() => setExplain('fees')} />
        {!isMiles && <SummaryTile label="After annual fees" value={`${rw((wallet?.net_annual_value_aed ?? 0) / 12)} / mo`} tone="emerald" onInfo={() => setExplain('net')} />}
      </div>}
      {explain === 'fees' && wallet && (
        <FeeMathDialog title="This wallet" cards={wallet.per_card} nameOf={id => card(id).name} onClose={() => setExplain(null)} />
      )}
      {explain === 'net' && wallet && (
        <NetOfFeesDialog title="This wallet" monthlyReward={monthlyReward} yearlyFee={wallet.total_fee_aed} onClose={() => setExplain(null)} />
      )}

      <div className={`${heading ? 'mt-10' : hideSummary ? 'mt-2' : 'mt-8'} flex flex-wrap items-start gap-3 ${heading ? 'justify-between' : 'justify-end'}`}>
        {heading}
        <div role="tablist" aria-label="Playbook view" className={`flex shrink-0 gap-0.5 rounded-[9px] bg-ws-secondary p-[3px] ${heading ? 'sm:mt-0.5' : ''}`}>
          {([['category', 'Category view'], ['card', 'Card view']] as const).map(([id, label]) => (
            <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => setView(id)}
              className={`rounded-md px-3 py-1.5 text-[11px] font-bold transition-colors ${view === id ? 'bg-white text-ws-primary shadow-[0_1px_3px_rgba(14,55,133,0.12)]' : 'text-ws-muted hover:text-ws-fg'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {view === 'card' ? (
        <PlaybookByCard wallet={wallet} rows={rows} card={card} onDetails={onDetails} />
      ) : (
        <PlaybookSnapshot rows={rows} card={card} onDetails={onDetails} />
      )}
    </div>
  )
}

/** A total figure in a green box, so totals stand apart from the per-card amounts. */
function TotalBox({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-block rounded-lg border border-[#9ED8B6] bg-[#DDF3E6] px-3 py-1 font-display text-[17px] leading-tight font-bold text-[#1E7A4E] tabular-nums ${className}`}>{children}</span>
  )
}

/** Category view as a quick snapshot, read top to bottom: one line per category with the card to swipe and what it earns.
 *  A category that moves to a second card shows both steps in order with the switch point; spend that only helps a card
 *  reach its monthly minimum is flagged on its own line. Every figure comes from the playbook rows (no maths here). */
function PlaybookSnapshot({ rows: playbookRows, card, onDetails }: { rows: PlaybookRow[]; card: CardLookup; onDetails: CardDetails }) {
  const { rw } = useRewardMode()
  // categories that switch cards come first (they need the most attention); "Everything else" closes the list unless it
  // is one of those. Within each part the order stays most rewarding first (Array.sort is stable).
  const place = (r: PlaybookRow) => r.entries.length > 1 ? 0 : r.group === 'miscellaneous' ? 2 : 1
  const rows = [...playbookRows].sort((a, b) => place(a) - place(b))
  const total = rows.reduce((sum, r) => sum + r.monthlyReward, 0)
  const topUp = (e: PlaybookEntry) => e.threshold && (
    <p className="mt-1.5 inline-flex max-w-full items-start gap-1.5 rounded-lg border border-[#B9A2FF] bg-[#EFE9FF] px-2 py-0.5 text-[11px] leading-snug font-medium text-[#3B2380]">
      <span aria-hidden>⚑</span>
      <span>Earns less here, but needed to meet the {aed(e.threshold.minSpend)}/mo minimum spend. The higher rewards in {groupShort(e.threshold.unlockGroup)} make up for it.</span>
    </p>
  )
  const cardBlock = (e: PlaybookEntry) => {
    const info = card(e.cardId)
    return (
      <div className="flex min-w-0 items-start gap-3">
        <CardChip card={info} className="!h-[33px] !w-[52px] shrink-0" />
        <div className="min-w-0">
          <p className="line-clamp-2 text-[14px] leading-snug font-semibold text-ws-fg">
            <CardLink id={e.cardId} onDetails={onDetails} className="hover:text-ws-primary">{cardName(info)}</CardLink>
          </p>
          <RewardConditionLabel paymentCondition={e.paymentCondition} merchantList={e.merchantList} cardName={cardName(info)} />
          {topUp(e)}
        </div>
      </div>
    )
  }
  const amount = (value: number) => (
    <p className="font-display text-[17px] leading-tight font-semibold text-ws-gain tabular-nums md:text-right">
      {rw(value)}<span className="text-[11px] font-medium text-ws-muted"> /mo</span>
    </p>
  )
  return (
    <div className="mt-3">
      <div className="overflow-hidden rounded-2xl border border-ws-border bg-ws-card shadow-ws-lift">
        {rows.map((row, idx) => {
          const split = row.entries.length > 1
          return (
            <section key={row.group} className={`px-4 py-4 sm:px-5 ${idx > 0 ? 'border-t border-ws-border' : ''} ${split ? 'bg-[#FFFBEF]' : ''}`}>
              <div className={`grid gap-x-4 gap-y-3 md:items-start ${split ? 'md:grid-cols-[1fr_auto]' : 'md:grid-cols-[220px_1fr_110px]'}`}>
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-ws-secondary text-[19px]">{groupIcon(row.group)}</span>
                  <div className="min-w-0">
                    <p className="font-display text-[15px] leading-tight font-semibold text-ws-fg">{groupShort(row.group)}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="text-[12px] whitespace-nowrap text-ws-muted tabular-nums">{aed(row.monthlySpend)} / month</p>
                      {split && <span className="rounded-full bg-[#FFE27A] px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap text-[#0D1828]">Uses {row.entries.length} cards</span>}
                    </div>
                  </div>
                </div>

                {!split ? (
                  <>
                    <div>
                      {cardBlock(row.entries[0])}
                      {row.entries[0].limitReached && !row.entries[0].threshold && (
                        <p className="mt-1.5 text-[11.5px] text-ws-muted">Part of this spend is past the bonus limit and earns the standard rate.</p>
                      )}
                    </div>
                    <div className="md:pt-1">{amount(row.entries[0].monthlyReward)}</div>
                  </>
                ) : (
                  <>
                    <div className="md:text-right">
                      <p className="mb-1 text-[10px] font-semibold tracking-[0.12em] text-ws-muted uppercase">Category total</p>
                      <TotalBox>{rw(row.monthlyReward)}<span className="text-[11px] font-medium text-[#4C8F6C]"> /mo</span></TotalBox>
                    </div>
                    <div className="flex flex-col gap-2 md:col-span-2 md:flex-row md:items-stretch md:gap-0">
                      {row.entries.map((e, i) => {
                        const last = i === row.entries.length - 1
                        const lead = i === 0 ? 'First' : last ? 'Remaining' : 'Next'
                        return (
                          <Fragment key={e.cardId}>
                            {i > 0 && (
                              <div aria-hidden className="flex shrink-0 flex-row items-center justify-center gap-2 text-ws-accent-fg md:w-[130px] md:flex-col md:gap-1.5 md:px-2">
                                <span className="grid size-7 place-items-center rounded-full bg-ws-primary text-[15px] text-white"><span className="md:hidden">↓</span><span className="hidden md:inline">→</span></span>
                                <span className="rounded-md border border-ws-accent/60 bg-ws-accent/15 px-1.5 py-0.5 text-center text-[9.5px] leading-tight font-bold tracking-wide uppercase">Bonus limit reached, switch card</span>
                              </div>
                            )}
                            <div className="min-w-0 flex-1 rounded-xl border border-ws-border bg-white px-3 py-2.5">
                              <div className="mb-1.5 flex items-center gap-2">
                                <span className="grid size-5 place-items-center rounded-full bg-ws-primary text-[11px] font-bold text-white">{i + 1}</span>
                                <p className="text-[11px] font-bold tracking-wide text-ws-primary uppercase">
                                  {lead} <span className="rounded bg-[#FFE27A] px-1.5 py-0.5 text-[#0D1828] tabular-nums">{aed(e.amount)}/mo</span>
                                </p>
                              </div>
                              {cardBlock(e)}
                              <p className="mt-2.5 text-[14px] font-medium text-[#4B5A73] tabular-nums">
                                This card earns {rw(e.monthlyReward)}/mo
                              </p>
                            </div>
                          </Fragment>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            </section>
          )
        })}
        <div className="flex items-center justify-between gap-3 border-t border-ws-border bg-ws-gain/10 px-4 py-3 sm:px-5">
          <p className="text-[13px] font-semibold text-ws-fg">Total rewards across all categories</p>
          <TotalBox className="!text-[18px]">{rw(total)}<span className="text-[12px] font-medium text-[#4C8F6C]"> / month</span></TotalBox>
        </div>
      </div>
    </div>
  )
}

/** Card view, read top to bottom: one block per card (best earner first) with that card's categories listed under it.
 *  A category shared with another card appears under each card it uses, tagged with its share of the spend and where it
 *  switches. Same look as the category snapshot; every figure comes from the playbook rows (no maths here). */
export function PlaybookByCard({ wallet, rows, card, onDetails, embedded = false, order, actions }: {
  wallet: Wallet | null; rows: PlaybookRow[]; card: CardLookup; onDetails: CardDetails
  /** Inside the result page's card-set frame: each card is its own tile, joined by + signs, with the wallet actions. */
  embedded?: boolean
  order?: string[]                                   // card order to keep (the wallet's own slots); default: best earner first
  actions?: { onReplace: (cardId: string | null, group: string | null) => void; onRemove: (cardId: string) => void; canAdd: boolean }
}) {
  const { rw } = useRewardMode()
  const slot = (id: string) => { const i = order?.indexOf(id) ?? -1; return i < 0 ? 99 : i }
  const cards = [...(wallet?.per_card ?? [])].sort((a, b) => order ? slot(a.card_id) - slot(b.card_id) : b.monthly_reward_aed - a.monthly_reward_aed)
  const total = rows.reduce((sum, r) => sum + r.monthlyReward, 0)
  return (
    <div className={embedded ? 'space-y-14' : 'mt-3 overflow-hidden rounded-2xl border border-ws-border bg-ws-card shadow-ws-lift'}>
      {cards.map((pc, idx) => {
        const info = card(pc.card_id)
        // this card's lines: whole categories first, shared ones (switch cases) after, each most rewarding first
        const lines = rows.flatMap(row => {
          const at = row.entries.findIndex(e => e.cardId === pc.card_id)
          return at < 0 ? [] : [{ row, e: row.entries[at], at, split: row.entries.length > 1 }]
        }).sort((a, b) => Number(b.split) - Number(a.split) || b.e.monthlyReward - a.e.monthlyReward)
        return (
          <section key={pc.card_id} className={embedded
            ? 'relative rounded-2xl border border-ws-border bg-white px-4 py-5 shadow-ws-lift sm:px-5'
            : `px-4 py-5 sm:px-5 ${idx > 0 ? 'border-t border-ws-border' : ''}`}>
            {actions && (
              <div className="absolute inset-x-0 bottom-0 z-10 flex translate-y-1/2 items-center justify-center gap-10">
                <button type="button" onClick={() => actions.onReplace(pc.card_id, lines[0]?.row.group ?? null)} aria-haspopup="dialog"
                  className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[#8FC8F0] bg-[#B4DBF7] px-4 text-[12px] font-semibold text-[#0E3785] shadow-ws-lift transition hover:bg-[#A3D2F4]">
                  <span aria-hidden>⇄</span> Replace this card
                </button>
                <button type="button" onClick={() => actions.onRemove(pc.card_id)}
                  className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-[#C0392B] bg-[#D9453A] px-4 text-[12px] font-semibold text-white shadow-ws-lift transition hover:bg-[#C0392B]">
                  <span aria-hidden>✕</span> Remove this card
                </button>
              </div>
            )}
            {embedded && idx < cards.length - 1 && (
              <span aria-hidden className="absolute -bottom-[52px] left-1/2 z-20 grid size-8 -translate-x-1/2 place-items-center rounded-full border border-[#C9D8F5] bg-white text-[20px] leading-none font-semibold text-ws-primary shadow-ws-lift">+</span>
            )}
            <div className="grid gap-x-5 gap-y-3 md:grid-cols-[220px_1fr]">
              <div className="flex flex-col items-start gap-3 text-left md:self-center">
                <CardLink id={pc.card_id} onDetails={onDetails} className="block w-[150px] shrink-0 !no-underline"><CardArt card={info} size="sm" /></CardLink>
                <div className="min-w-0">
                  <p className="font-display text-[15px] leading-snug font-semibold text-ws-fg">
                    <CardLink id={pc.card_id} onDetails={onDetails} className="hover:text-ws-primary">{cardName(info)}</CardLink>
                  </p>
                  <p className="mt-1.5 text-[11px] font-semibold tracking-[0.12em] text-ws-muted uppercase">Card total</p>
                  <TotalBox className="mt-1">{rw(pc.monthly_reward_aed)}<span className="text-[11px] font-medium text-[#4C8F6C]"> /mo</span></TotalBox>
                </div>
              </div>

              <div className="min-w-0 divide-y divide-dashed divide-ws-border rounded-xl border border-ws-border bg-white">
                {lines.length === 0 && <p className="px-3 py-3 text-[12.5px] text-ws-muted">This card is a backup. It does not take any category on its own.</p>}
                {lines.map(({ row, e, at, split }) => {
                  const next = row.entries[at + 1]
                  const prev = row.entries[at - 1]
                  const last = at === row.entries.length - 1
                  const lead = at === 0 ? 'First' : last ? 'Remaining' : 'Next'
                  return (
                    <div key={row.group} className={`grid items-start gap-x-3 gap-y-1 px-3 py-3 sm:grid-cols-[170px_1fr_auto] ${split ? 'bg-[#FFFBEF]' : ''}`}>
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ws-secondary text-[17px]">{groupIcon(row.group)}</span>
                        <div className="min-w-0">
                          <p className="text-[14px] leading-tight font-semibold text-ws-fg">{groupShort(row.group)}</p>
                          <p className="text-[12px] text-ws-muted tabular-nums">{aed(row.monthlySpend)} / month</p>
                        </div>
                      </div>
                      <div className="min-w-0">
                        {split ? (
                          <>
                            <p className="text-[11px] font-bold tracking-wide text-ws-primary uppercase">
                              {lead} <span className="rounded bg-[#FFE27A] px-1.5 py-0.5 text-[#0D1828] tabular-nums">{aed(e.amount)}/mo</span> on this card
                            </p>
                            <p className="mt-1 text-[12px] text-ws-muted">
                              {prev ? `Use it after ${cardName(card(prev.cardId))} reaches its bonus limit.` : ''}
                              {next ? `When its bonus limit is reached, switch to ${cardName(card(next.cardId))}.` : ''}
                            </p>
                          </>
                        ) : (
                          <p className="text-[12.5px] text-ws-muted">Use this card for all of it.</p>
                        )}
                        <RewardConditionLabel paymentCondition={e.paymentCondition} merchantList={e.merchantList} cardName={cardName(info)} />
                        {e.threshold && (
                          <p className="mt-1.5 inline-flex max-w-full items-start gap-1.5 rounded-lg border border-[#B9A2FF] bg-[#EFE9FF] px-2 py-0.5 text-[11px] leading-snug font-medium text-[#3B2380]">
                            <span aria-hidden>⚑</span>
                            <span>Earns less here, but needed to meet the {aed(e.threshold.minSpend)}/mo minimum spend. The higher rewards in {groupShort(e.threshold.unlockGroup)} make up for it.</span>
                          </p>
                        )}
                      </div>
                      <p className="font-display text-[16px] leading-tight font-semibold text-ws-gain tabular-nums sm:text-right">
                        {rw(e.monthlyReward)}<span className="text-[11px] font-medium text-ws-muted"> /mo</span>
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        )
      })}
      {!embedded && <div className="flex items-center justify-between gap-3 border-t border-ws-border bg-ws-gain/10 px-4 py-3 sm:px-5">
        <p className="text-[13px] font-semibold text-ws-fg">Total rewards across all cards</p>
        <TotalBox className="!text-[18px]">{rw(total)}<span className="text-[12px] font-medium text-[#4C8F6C]"> / month</span></TotalBox>
      </div>}
    </div>
  )
}

/** A light bulb with rays and a "?" inside: opens the explanation for a figure. */
function IdeaBulb({ tone }: { tone: 'amber' | 'light' }) {
  const ray = tone === 'light' ? '#FFFFFF' : '#F59E0B'
  const glass = tone === 'light' ? '#FFFFFF' : '#FEF3C7'
  const edge = tone === 'light' ? '#FFFFFF' : '#D97706'
  const mark = tone === 'light' ? '#059669' : '#B45309'
  return (
    <svg viewBox="0 0 40 40" className="size-9" aria-hidden>
      <g stroke={ray} strokeWidth="2.4" strokeLinecap="round">
        <line x1="20" y1="1.5" x2="20" y2="5" />
        <line x1="6" y1="7" x2="8.6" y2="9.6" />
        <line x1="34" y1="7" x2="31.4" y2="9.6" />
        <line x1="1.5" y1="19" x2="5" y2="19" />
        <line x1="38.5" y1="19" x2="35" y2="19" />
      </g>
      <path d="M20 6.5c-6.4 0-11 4.6-11 10.6 0 3.6 1.8 5.9 3.7 7.9 1.2 1.3 1.8 2.5 1.8 3.9v.6h11v-.6c0-1.4.6-2.6 1.8-3.9 1.9-2 3.7-4.3 3.7-7.9 0-6-4.6-10.6-11-10.6z"
        fill={glass} stroke={edge} strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="14.6" y="30" width="10.8" height="3" rx="1.5" fill={edge} />
      <rect x="16.4" y="33.6" width="7.2" height="2.6" rx="1.3" fill={edge} />
      <text x="20" y="22.6" textAnchor="middle" fontSize="15" fontWeight="900" fontFamily="system-ui, sans-serif" fill={mark}>?</text>
    </svg>
  )
}

function SummaryTile({ label, value, tone, className = '', onInfo }: { label: string; value: string; tone?: 'gain' | 'highlight' | 'emerald'; className?: string; onInfo?: () => void }) {
  const emerald = tone === 'emerald'
  return (
    <div className={`relative rounded-2xl border px-4 py-3 ${emerald ? 'border-[#059669] bg-[#10B981]' : tone === 'highlight' ? 'border-ws-gain/30 bg-ws-gain/10' : 'border-ws-border bg-ws-card'} ${className}`}>
      {onInfo && (
        <button type="button" onClick={onInfo} aria-label={`How "${label}" is calculated`}
          className="absolute top-1 right-1 grid size-10 place-items-center rounded-full transition-transform hover:scale-110">
          <IdeaBulb tone={emerald ? 'light' : 'amber'} />
        </button>
      )}
      <p className={`pr-10 text-[10px] font-semibold tracking-[0.14em] uppercase ${emerald ? 'text-white/85' : 'text-ws-muted'}`}>{label}</p>
      <p className={`mt-1 font-display text-[18px] font-semibold tabular-nums sm:text-[20px] ${emerald ? 'text-white' : tone === 'gain' ? 'text-ws-gain' : 'text-ws-fg'}`}>{value}</p>
    </div>
  )
}

/* ---------------- Section 6: other ways to build your wallet ---------------- */

/** Three strategies side by side: the two alternatives (second and third strategy) and the first
 *  different mix the simulator found. All three are already calculated; nothing is computed here. */
export function Alternatives({ strategies, alternatives, topBySize, pick, currentIds, card, onUse, onDetails }: {
  strategies: Strategy[]
  topBySize?: Record<string, Wallet[]>
  alternatives: Wallet[]
  pick: Wallet
  currentIds: string[]
  card: CardLookup
  onUse: (ids: string[]) => void
  onDetails: CardDetails
}) {
  const { isMiles } = useRewardMode()
  const [slide, setSlide] = useState(0)
  // "N other ways": way k holds the k-th best 3-, 2- and 1-card wallet (needs the backend's top_by_size)
  const ways = Array.from({ length: Math.max(0, ...Object.values(topBySize ?? {}).map(l => l.length)) }, (_, k) =>
    [3, 2, 1].flatMap(size => { const w = topBySize?.[String(size)]?.[k]; return w ? [{ strategy: walletStrategy(w, k), size }] : [] }))
  const tiles: { strategy: Strategy }[] = strategies.slice(1, 3).map(st => ({ strategy: st }))
  // the first different mix: a wallet not already shown, preferring the recommended wallet's size
  const shown = new Set([pick, ...tiles.map(t => t.strategy.wallet)].map(w => [...w.cards].sort().join('|')))
  const fresh = alternatives.filter(w => !shown.has([...w.cards].sort().join('|')))
  const mix = fresh.find(w => w.cards.length === pick.cards.length) ?? fresh[0]
  if (mix) {
    tiles.push({
      strategy: {
        key: 'third', title: `${mix.cards.length} Card${mix.cards.length === 1 ? '' : 's'}, a Different Mix`,
        message: 'Prefer different banks? Try another combination.', n_cards: mix.cards.length,
        annual_reward_aed: mix.annual_reward_aed, total_fee_aed: mix.total_fee_aed, net_annual_value_aed: mix.net_annual_value_aed, wallet: mix,
      },
    })
  }
  if (ways.length === 0 && tiles.length === 0) return null
  tiles.sort((a, b) => b.strategy.wallet.cards.length - a.strategy.wallet.cards.length)   // 3 cards, then 2, then 1
  const best = strategies[0]?.net_annual_value_aed ?? pick.net_annual_value_aed
  return (
    <section className="border-t border-ws-border">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="text-2xl font-semibold text-balance text-ws-fg sm:text-3xl">Other smart ways to build your wallet</h2>
        {ways.length > 0 ? (() => {
          const at = Math.min(slide, ways.length - 1)
          const arrow = (dir: -1 | 1) => {
            const to = at + dir
            const off = to < 0 || to >= ways.length
            return (
              <button type="button" onClick={() => setSlide(to)} disabled={off} aria-label={dir < 0 ? 'Previous way' : 'Next way'}
                className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full border-2 border-ws-primary bg-ws-primary text-[24px] leading-none font-bold text-white shadow-ws-lift transition hover:brightness-110 active:scale-95 disabled:cursor-default disabled:border-ws-border disabled:bg-white disabled:text-ws-muted/50 disabled:shadow-none">
                <span aria-hidden>{dir < 0 ? '‹' : '›'}</span>
              </button>
            )
          }
          return (
            <>
              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-[14px] font-semibold text-ws-muted">Way {at + 1} of {ways.length} — the {at === 0 ? 'best' : Ordinal(at + 1) + ' best'} 3, 2 and 1 card wallets</p>
                <div className="flex gap-2">{arrow(-1)}{arrow(1)}</div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {ways[at].map(({ strategy }) => (
                  <StrategyBox key={strategy.wallet.cards.join('|')} strategy={strategy} card={card}
                    lessBy={isMiles ? ((strategies[0]?.annual_reward_aed ?? pick.annual_reward_aed) - strategy.annual_reward_aed) / 12 : (best - strategy.net_annual_value_aed) / 12}
                    inUse={sameCards(strategy.wallet.cards, currentIds)} onUse={() => onUse(strategy.wallet.cards)} onDetails={onDetails} />
                ))}
              </div>
              <div className="mt-5 flex justify-center gap-2" role="tablist" aria-label="Other ways">
                {ways.map((_, i) => (
                  <button key={i} type="button" role="tab" aria-selected={i === at} aria-label={`Way ${i + 1}`} onClick={() => setSlide(i)}
                    className={`h-2.5 cursor-pointer rounded-full border-0 transition-all ${i === at ? 'w-7 bg-ws-primary' : 'w-2.5 bg-ws-border hover:bg-ws-muted/50'}`} />
                ))}
              </div>
            </>
          )
        })() : (
        <div className="mt-8 grid gap-3 lg:grid-cols-3">
          {tiles.map(({ strategy }) => (
            <StrategyBox key={strategy.wallet.cards.join('|')} strategy={strategy} card={card}
              lessBy={isMiles ? ((strategies[0]?.annual_reward_aed ?? pick.annual_reward_aed) - strategy.annual_reward_aed) / 12 : (best - strategy.net_annual_value_aed) / 12}
              inUse={sameCards(strategy.wallet.cards, currentIds)} onUse={() => onUse(strategy.wallet.cards)} onDetails={onDetails} />
          ))}
        </div>
        )}
      </div>
    </section>
  )
}

const ORDINAL_SUFFIX = ['th', 'st', 'nd', 'rd']
function Ordinal(n: number) {
  const v = n % 100
  return `${n}${ORDINAL_SUFFIX[(v - 20) % 10] ?? ORDINAL_SUFFIX[v] ?? ORDINAL_SUFFIX[0]}`
}

/** A wallet from the top-by-size lists, as a tile ("Best 3 cards", "2nd best single card", ...). */
function walletStrategy(w: Wallet, rank: number): Strategy {
  const n = w.cards.length
  const what = n === 1 ? 'Single Card' : `${n} Cards`
  return {
    key: 'third', title: rank === 0 ? `Best ${what}` : `${Ordinal(rank + 1)} Best ${what}`, message: null, n_cards: n,
    annual_reward_aed: w.annual_reward_aed, total_fee_aed: w.total_fee_aed, net_annual_value_aed: w.net_annual_value_aed, wallet: w,
  }
}
