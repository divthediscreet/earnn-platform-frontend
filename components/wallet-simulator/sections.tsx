'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { BestOfSize, DiscoveryBlock, SpendGroup, Wallet } from '@/lib/wallet-simulator/api'
import { aed, groupIcon, groupShort, pct } from '@/lib/wallet-simulator/groups'
import { buildPlaybook, cardGroups, sameCards, type PlaybookEntry, type PlaybookRow } from '@/lib/wallet-simulator/playbook'
import { CardArt, CardChip, RollingAed, type CardInfo } from './card-art'
import { Ribbon } from './ribbon'

type CardLookup = (id: string) => CardInfo

const NUMBER_WORD = ['', 'One', 'Two', 'Three']
const cardName = (c: CardInfo) => c.name

/* ---------------- Section 1: hero ---------------- */

export function Hero({ pick, monthlySpend, card, onScrollToWallet }: {
  pick: Wallet
  monthlySpend: number
  card: CardLookup
  onScrollToWallet: () => void
}) {
  const transforms: Record<number, string[]> = {
    1: ['left-1/2 top-10 -translate-x-1/2 -rotate-3'],
    2: ['left-0 bottom-2 -rotate-6', 'right-0 top-2 rotate-6'],
    3: ['left-0 bottom-0 -rotate-8', 'left-1/2 top-12 -translate-x-1/2 -rotate-1', 'right-0 top-0 rotate-8'],
  }
  const ids = pick.cards
  const headline = ids.length === 1
    ? 'One card. Everything you spend on, covered.'
    : `${NUMBER_WORD[ids.length]} cards. Everything you spend on, covered.`
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-24 size-[520px] rounded-full bg-ws-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute top-40 -left-32 size-[420px] rounded-full bg-ws-accent/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pt-14 pb-14 sm:px-8 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:pt-20">
        <div className="ws-animate-rise">
          <p className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-ws-primary uppercase">
            <span className="size-1.5 rounded-full bg-ws-primary" />
            Earnn Pick · Your smart wallet
          </p>
          <h1 className="mt-5 text-4xl leading-[1.05] font-semibold text-balance text-ws-fg sm:text-5xl">{headline}</h1>
          <div className="mt-9">
            <p className="text-[14px] font-medium text-ws-muted">You could earn</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-2xl font-semibold text-ws-muted">AED</span>
              <span className="font-display text-[62px] leading-none font-semibold tracking-tighter text-ws-fg sm:text-[84px]">
                <RollingAed value={pick.annual_reward_aed} />
              </span>
            </div>
            <p className="mt-2 text-[15px] text-ws-muted">
              in rewards per year, on {aed(monthlySpend)} of monthly spending
            </p>
          </div>
          <p className="mt-6 max-w-[46ch] text-[15px] leading-relaxed text-pretty text-ws-muted">
            We matched your spending to the cards that pay you back the most — then worked out which
            card to reach for in every situation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={onScrollToWallet}
              className="min-h-11 rounded-full bg-ws-ink px-5 py-3 text-[14px] font-semibold text-ws-ink-fg transition-transform hover:-translate-y-0.5">
              Make this wallet yours
            </button>
            <a href="#playbook"
              className="min-h-11 rounded-full border border-ws-border bg-ws-card px-5 py-3 text-[14px] font-semibold text-ws-fg transition-colors hover:bg-ws-secondary">
              How do I use them?
            </a>
          </div>
        </div>

        <div className="relative mx-auto h-[250px] w-full max-w-[520px] sm:h-[380px]">
          {ids.map((id, i) => (
            <div key={id}
              className={`ws-animate-settle absolute w-[190px] sm:w-[290px] ${transforms[ids.length]?.[i] ?? ''}`}
              style={{ animationDelay: `${i * 0.1}s`, zIndex: i === 1 ? 3 : 2 }}>
              <CardArt card={card(id)} size="lg" eager />
            </div>
          ))}
        </div>
      </div>

      <div className={`mx-auto grid max-w-6xl gap-3 px-5 pb-8 sm:px-8 ${ids.length === 3 ? 'md:grid-cols-3' : ids.length === 2 ? 'md:grid-cols-2' : ''}`}>
        {pick.per_card.map((pc, i) => {
          const groups = cardGroups(pick, pc.card_id)
          const c = card(pc.card_id)
          return (
            <div key={pc.card_id} className="ws-animate-rise rounded-2xl border border-ws-border bg-ws-card p-5 shadow-ws-lift"
              style={{ animationDelay: `${0.25 + i * 0.08}s` }}>
              <p className="text-[11px] font-semibold tracking-[0.16em] text-ws-primary uppercase">
                {groups.length ? `Your ${groupShort(groups[0]).toLowerCase()} card` : 'Backup card'}
              </p>
              <p className="mt-2 font-display text-[15px] font-semibold text-ws-fg">{cardName(c)}</p>
              {c.bank && <p className="text-[12px] text-ws-muted">{c.bank}</p>}
              <p className="mt-1 text-[13px] text-ws-muted">{groups.slice(0, 3).map(g => groupShort(g)).join(' · ')}</p>
              <p className="mt-3 text-[13px] font-semibold text-ws-gain">
                {ids.length === 1 ? `Earns ${aed(pc.annual_reward_aed)}/year` : `This card adds ${aed(pc.contribution_annual_aed)}/year`}
              </p>
            </div>
          )
        })}
      </div>
    </section>
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

export function Ladder({ bestBySize, increments, pickSize, currentIds, card, onUse }: {
  bestBySize: Record<string, BestOfSize>
  increments: Record<string, number>
  pickSize: number
  currentIds: string[]
  card: CardLookup
  onUse: (ids: string[]) => void
}) {
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
            const features = LADDER_FEATURES[s] ?? []
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

                {/* amount block, with the wallet's real cards fanned beside it */}
                <div className="mt-2 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-display text-[28px] leading-none font-semibold tracking-tight whitespace-nowrap">
                      {aed(rung.annual_reward_aed)}
                    </p>
                    <p className={`mt-1.5 h-[18px] text-[13px] font-semibold whitespace-nowrap ${isPick ? 'text-[#F7C948]' : 'text-ws-gain'}`}>
                      {gain === undefined ? '' : gain >= 0 ? `+ ${aed(gain)} a year` : `${aed(-gain)} a year less`}
                    </p>
                    <p className={`text-[12px] whitespace-nowrap ${isPick ? 'text-white/70' : 'text-ws-muted'}`}>estimated rewards per year</p>
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
                  {inUse ? 'In your wallet' : <>Try this wallet <span aria-hidden>→</span></>}
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

const FULL_ROWS = 4 // most rewarding categories get a full card; the rest are listed compactly

type PlaybookProps = {
  wallet: Wallet | null
  groups: SpendGroup[]
  monthlySpend: number
  card: CardLookup
  updating: boolean
}

// Bold, coloured line icons per spending category (used on the wallet illustration chips).
const CATEGORY_STYLE: Record<string, { fg: string; bg: string; icon: React.ReactNode }> = {
  grocery: { fg: '#16A34A', bg: '#DCFCE7', icon: <><path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H7" /><circle cx="9.5" cy="19.5" r="1.5" /><circle cx="16.5" cy="19.5" r="1.5" /></> },
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

function CategoryGlyph({ group, className = 'size-12', iconClass = 'size-6' }: { group: string | null; className?: string; iconClass?: string }) {
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
  // top categories by reward (up to 5), only those that actually earn — amounts from the backend allocation
  const chips = buildPlaybook(wallet, groups).filter(r => r.monthlyReward > 0.005).slice(0, 5)
  return (
    <section id="playbook" className="scroll-mt-20 overflow-hidden bg-gradient-to-b from-[#0A2A66] to-[#061A42] text-ws-ink-fg">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:px-8 sm:py-16 xl:grid-cols-[1.05fr_1fr]">
        <div className="xl:order-2">
          <h2 className="text-3xl font-semibold text-balance text-white sm:text-[44px] sm:leading-[1.08]">How to use your wallet</h2>
          <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-pretty text-white/70">
            Your personal spending playbook: which card to reach for in every category, and what each one earns you.
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
              <span className="mt-0.5 block font-display text-[18px] font-semibold text-ws-primary sm:text-[20px]">See how to use this wallet</span>
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
                  <span className="block text-[12px] text-ws-muted">Earn {aed(row.monthlyReward)}/mo</span>
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
          <path key={i} d={d} className="ws-dash-flow" stroke="#A9C1F2" strokeOpacity={0.7} strokeWidth={2}
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
              <span className="block text-[12px] text-ws-muted">Earn {aed(row.monthlyReward)}/mo</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

/** The playbook itself (summary strip + where to use each card). Also shown in the expanded wallet. */
export function PlaybookBody({ wallet, groups, monthlySpend, card, updating }: PlaybookProps) {
  const rows = buildPlaybook(wallet, groups)
  const full = rows.filter((r, i) => i < FULL_ROWS || r.kind !== 'single' || r.entries.some(e => e.threshold))
  const compact = rows.filter(r => !full.includes(r))
  const monthlyReward = wallet?.monthly_reward_aed ?? 0
  if (rows.length === 0) {
    return (
      <p className="mt-10 rounded-2xl border border-dashed border-ws-border p-8 text-center text-[14px] text-ws-muted">
        Add a card to your wallet to see your playbook.
      </p>
    )
  }
  return (
    <div className={`mt-8 transition-opacity ${updating ? 'opacity-60' : ''}`}>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <SummaryTile label="Monthly spend" value={aed(monthlySpend)} />
        <SummaryTile label="Your rewards" value={`${aed(monthlyReward)} / mo`} tone="gain" />
        <SummaryTile label="Every year" value={`${aed(wallet?.annual_reward_aed ?? 0)} / year`} tone="highlight" className="col-span-2 sm:col-span-1" />
      </div>

      <p className="mt-8 text-[11px] font-semibold tracking-[0.16em] text-ws-muted uppercase">Where to use each card</p>
      <div className="mt-3 grid items-start gap-3 md:grid-cols-2">
        {full.map(row => <PlaybookCard key={row.group} row={row} card={card} />)}
      </div>

      {compact.length > 0 && (
        <div className="mt-3 rounded-2xl border border-ws-border bg-ws-card p-4 shadow-ws-lift">
          <p className="font-display text-[14px] font-semibold text-ws-fg">Your other categories</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {compact.map(row => (
              <div key={row.group} className="flex items-center gap-3 rounded-xl border border-ws-border px-3 py-2.5">
                <span className="text-[16px]">{groupIcon(row.group)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-ws-fg">
                    {groupShort(row.group)} <span className="font-normal text-ws-muted">· {aed(row.monthlySpend)}/mo</span>
                  </p>
                  <p className="truncate text-[12px] text-ws-muted">Use {cardName(card(row.entries[0].cardId))}</p>
                </div>
                <span className="shrink-0 text-[13px] font-semibold text-ws-gain tabular-nums">{aed(row.monthlyReward)}/mo</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SummaryTile({ label, value, tone, className = '' }: { label: string; value: string; tone?: 'gain' | 'highlight'; className?: string }) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone === 'highlight' ? 'border-ws-gain/30 bg-ws-gain/10' : 'border-ws-border bg-ws-card'} ${className}`}>
      <p className="text-[10px] font-semibold tracking-[0.14em] text-ws-muted uppercase">{label}</p>
      <p className={`mt-1 font-display text-[18px] font-semibold tabular-nums sm:text-[20px] ${tone === 'gain' ? 'text-ws-gain' : 'text-ws-fg'}`}>{value}</p>
    </div>
  )
}

function PlaybookCard({ row, card }: { row: PlaybookRow; card: CardLookup }) {
  const multi = row.entries.length > 1
  return (
    <div className="overflow-hidden rounded-2xl border border-ws-border bg-ws-card shadow-ws-lift">
      <div className="flex items-center justify-between gap-3 border-b border-ws-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-ws-secondary text-[17px]">{groupIcon(row.group)}</span>
          <p className="truncate font-display text-[15px] font-semibold text-ws-fg">{groupShort(row.group)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-ws-muted uppercase">You spend</p>
          <p className="text-[13px] font-semibold text-ws-fg tabular-nums">{aed(row.monthlySpend)} / month</p>
        </div>
      </div>

      <div className="px-4 py-1">
        {row.kind === 'split' && (
          <p className="pt-2.5 text-[12px] text-ws-muted">Split this spend across {row.entries.length} cards:</p>
        )}
        {row.entries.map((e, i) => {
          const label = row.kind === 'sequence'
            ? (i === 0 ? `First ${aed(e.amount)} / month` : `Remaining ${aed(e.amount)} / month`)
            : row.kind === 'split' ? `${aed(e.amount)} / month on this card` : null
          return (
            <div key={e.cardId}>
              {row.kind === 'sequence' && i === 1 && (
                <div className="my-1 space-y-1">
                  <p className="rounded-md border border-ws-accent/60 bg-ws-accent/15 px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-ws-accent-fg uppercase">
                    Bonus limit reached on this card
                  </p>
                  <p className="flex items-center gap-2 rounded-md bg-ws-secondary px-2.5 py-1.5 text-[12px] font-semibold text-ws-primary">
                    <span aria-hidden>↓</span> Then switch to
                  </p>
                </div>
              )}
              <PlaybookEntryRow entry={e} label={label} info={card(e.cardId)} bordered={row.kind === 'split' && i > 0} />
            </div>
          )
        })}
      </div>

      {multi && (
        <div className="flex items-center justify-between gap-3 border-t border-ws-border bg-ws-gain/10 px-4 py-2.5">
          <p className="text-[12px] font-semibold text-ws-fg">Total {groupShort(row.group).toLowerCase()} rewards</p>
          <p className="font-display text-[15px] font-semibold text-ws-gain tabular-nums">{aed(row.monthlyReward)} / month</p>
        </div>
      )}
    </div>
  )
}

function PlaybookEntryRow({ entry, label, info, bordered }: { entry: PlaybookEntry; label: string | null; info: CardInfo; bordered: boolean }) {
  return (
    <div className={`py-2.5 ${bordered ? 'border-t border-dashed border-ws-border' : ''}`}>
      {label && <p className="mb-1.5 text-[10px] font-semibold tracking-[0.12em] text-ws-muted uppercase">{label}</p>}
      <div className="flex items-center gap-3">
        <CardChip card={info} className="!h-[33px] !w-[52px]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-ws-fg">{cardName(info)}</p>
          {info.bank && <p className="truncate text-[11px] text-ws-muted">{info.bank}</p>}
        </div>
        <div className="shrink-0 border-l border-ws-border pl-3 text-right">
          <p className="text-[9px] font-semibold tracking-[0.12em] text-ws-muted uppercase">You could earn</p>
          <p className="font-display text-[16px] leading-tight font-semibold text-ws-gain tabular-nums">{aed(entry.monthlyReward)}</p>
          <p className="text-[10px] text-ws-muted">/ month</p>
        </div>
      </div>
      {entry.threshold && (
        <p className="mt-1.5 rounded-md bg-ws-secondary px-2 py-1 text-[10px] leading-tight text-ws-primary/80">
          <span aria-hidden>ⓘ </span>Earns little here, but helps this card reach its {aed(entry.threshold.minSpend)}/month
          minimum, which unlocks its higher rate on {groupShort(entry.threshold.unlockGroup).toLowerCase()}.
        </p>
      )}
      {!entry.threshold && entry.limitReached && (
        <p className="mt-1.5 text-[11px] text-ws-muted">Part of this spend is past the card&apos;s bonus limit and earns its standard rate.</p>
      )}
    </div>
  )
}

/* ---------------- Section 4: make it yours ---------------- */

const COMPARE_POINTS: { label: string; icon: React.ReactNode }[] = [
  { label: 'See actual difference', icon: <><path d="M6 19v-5" strokeWidth={3} /><path d="M12 19V9" strokeWidth={3} /><path d="M18 19V5" strokeWidth={3} /></> },
  { label: 'Same spending profile', icon: <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" /><path d="m9 12 2 2 4-4" /></> },
  { label: "Know if it's worth upgrading", icon: <path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" /> },
]

// placeholder look for "your current cards": we don't know them yet, so they stay generic
const GENERIC_CARDS = [
  'from-[#2B3445] to-[#11161F] -rotate-[16deg] left-0 top-[96px]',
  'from-[#3B82F6] to-[#1D4ED8] -rotate-[12deg] left-[18px] top-[112px]',
  'from-[#E9C77B] to-[#B98F3E] -rotate-[8deg] left-[38px] top-[132px]',
]

export function MakeItYours({ wallet, groups, card, onCompare }: { wallet: Wallet | null; groups: SpendGroup[]; card: CardLookup; onCompare: () => void }) {
  // the Smart Wallet's real top categories (backend allocation), shown on the result card
  const rows = buildPlaybook(wallet, groups).filter(r => r.monthlyReward > 0.005).slice(0, 3)
  const ids = wallet?.cards ?? []
  return (
    <section className="overflow-hidden bg-gradient-to-b from-[#0A2A66] to-[#061A42] text-ws-ink-fg">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-16 xl:grid-cols-[1fr_1.05fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-white/85 uppercase">
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeLinecap="round" aria-hidden>
              <path d="M6 19v-5" strokeWidth={3.5} /><path d="M12 19V9" strokeWidth={3.5} /><path d="M18 19V5" strokeWidth={3.5} />
            </svg>
            Compare &amp; optimise
          </span>
          <h2 className="mt-5 text-3xl leading-[1.08] font-semibold text-balance text-white sm:text-[42px]">
            Want to compare against your <span className="text-[#F7C948]">existing cards?</span>
          </h2>
          <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-pretty text-white/70">
            See how the cards you already carry stack up against your Smart Wallet on the same spending.
          </p>
          <button type="button" onClick={onCompare}
            className="group mt-8 inline-flex min-h-12 items-center gap-3 rounded-full bg-[#F7C948] px-6 py-3 text-[15px] font-semibold text-[#0D1828] shadow-ws-lift transition-transform hover:-translate-y-0.5">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2.5" y="6" width="15" height="11" rx="2" /><path d="M6.5 3.5h13a2 2 0 0 1 2 2V14" /><path d="M2.5 10h15" />
            </svg>
            Compare against your current cards
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </button>
          <ul className="mt-9 flex flex-wrap gap-x-5 gap-y-4 sm:flex-nowrap">
            {COMPARE_POINTS.map(p => (
              <li key={p.label} className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-white">
                  <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{p.icon}</svg>
                </span>
                <span className="max-w-[15ch] text-[13px] leading-snug text-white/75">{p.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* illustration: generic "current cards" → result card → the user's real Smart Wallet cards */}
        <div aria-hidden className="relative mx-auto hidden h-[360px] w-full max-w-[580px] sm:block">
          <div className="absolute top-8 right-4 size-[300px] rounded-full bg-white/[0.04]" />
          <div className="absolute bottom-0 left-6 size-[220px] rounded-full bg-white/[0.03]" />

          <svg viewBox="0 0 580 360" className="absolute inset-0 size-full" fill="none">
            <path d="M188 64 C 250 0, 360 -6, 430 50" className="ws-dash-flow" stroke="#5DB7FF" strokeWidth={3} strokeDasharray="8 9" strokeLinecap="round" />
            <path d="M420 34 L 432 52 L 412 58" stroke="#5DB7FF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="absolute top-[52px] left-[20px] -rotate-3 rounded-full bg-white/15 px-4 py-2 text-[14px] font-medium text-white backdrop-blur">Your current cards</span>
          <span className="absolute top-[4px] right-[30px] rounded-full bg-[#F7C948] px-4 py-2 text-[14px] font-semibold text-[#0D1828] shadow-ws-lift">Your Smart Wallet</span>
          <Sparkle className="absolute top-[96px] left-[-6px] size-8 -scale-x-100" />
          <Sparkle className="absolute top-[34px] right-[-10px] size-9" />

          {/* current cards (generic) */}
          {GENERIC_CARDS.map(c => (
            <div key={c} className={`absolute h-[96px] w-[152px] rounded-xl bg-gradient-to-br shadow-ws-plastic ${c}`}>
              <span className="absolute top-[34px] left-4 h-5 w-7 rounded-[4px] bg-white/45" />
              <span className="absolute right-4 bottom-3 flex"><span className="size-5 rounded-full bg-[#EB001B]/90" /><span className="-ml-2 size-5 rounded-full bg-[#F79E1B]/90" /></span>
            </div>
          ))}

          {/* the user's real Smart Wallet cards */}
          {ids.map((id, i) => (
            <div key={id} className="absolute w-[150px]"
              style={{ right: `${4 + (ids.length - 1 - i) * 14}px`, top: `${78 + i * 26}px`, transform: `rotate(${8 + i * 4}deg)`, zIndex: i }}>
              <CardArt card={card(id)} size="sm" />
            </div>
          ))}

          {/* result card: what the Smart Wallet earns in its top categories */}
          {rows.length > 0 && (
            <div className="absolute top-[96px] left-[170px] z-20 w-[272px] -rotate-3 rounded-2xl bg-white p-4 text-ws-fg shadow-ws-plastic">
              <p className="font-display text-[15px] font-semibold text-ws-primary">Your Smart Wallet earns</p>
              <ul className="mt-3 space-y-2.5">
                {rows.map(r => (
                  <li key={r.group} className="flex items-center gap-2.5">
                    <CategoryGlyph group={r.group} className="size-9" iconClass="size-[18px]" />
                    <span className="min-w-0 flex-1 text-[13px] whitespace-nowrap text-ws-fg">{groupShort(r.group)}</span>
                    <span className="rounded-full bg-[#E3F6EC] px-2.5 py-1 text-[12px] font-semibold whitespace-nowrap text-ws-gain">{aed(r.monthlyReward)}/mo</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Section 5: discovery ---------------- */

export function Discovery({ blocks, walletIds, wallet, card, onAdd, onRemove, onDetails }: {
  blocks: DiscoveryBlock[]
  walletIds: string[]
  wallet: Wallet | null // the current (evaluated) wallet: its per-card totals label in-wallet tiles
  card: CardLookup
  onAdd: (id: string) => void
  onRemove: (id: string) => void
  onDetails: (id: string) => void
}) {
  return (
    <section id="discover" className="scroll-mt-20 border-t border-ws-border bg-ws-card">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="max-w-[36ch] text-3xl font-semibold text-balance text-ws-fg sm:text-4xl">Your Wallet. Your Choice.</h2>
        <p className="mt-3 max-w-[56ch] text-[16px] text-pretty text-ws-muted">
          Don&apos;t like one of our picks? Tap a card in your wallet to drop it, add another below, and
          your yearly rewards update as you go.
        </p>

        <div className="mt-12 space-y-12">
          {blocks.map(block => {
            const isCategory = block.kind === 'category'
            const where = isCategory ? `on your ${groupShort(block.group).toLowerCase()} spend`
              : block.label.includes('rest') ? 'on the rest of your spend' : 'on all your spend'
            return (
              <div key={`${block.kind}-${block.group ?? 'all'}`}>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="font-display text-[19px] font-semibold text-ws-fg">
                    <span className="mr-2">{isCategory ? groupIcon(block.group) : '💳'}</span>
                    {isCategory ? groupShort(block.group) : 'Everyday all-rounders'}
                  </h3>
                  <p className="text-[14px] font-medium text-ws-primary">
                    {isCategory
                      ? `Your spending could earn up to ${aed(block.potential_annual_aed)}/year here`
                      : `Strong choices for ${block.label.includes('rest') ? 'everything else' : 'all your spending'} (${aed(block.monthly_spend_aed)}/month)`}
                  </p>
                </div>
                <Ribbon label={isCategory ? groupShort(block.group) : 'Everyday all-rounders'}>
                  {block.cards.map(bc => (
                    <DiscoveryTile key={bc.card_id} info={card(bc.card_id)} reward={bc.annual_reward_aed} where={where}
                      walletTotal={wallet?.per_card.find(p => p.card_id === bc.card_id)?.annual_reward_aed ?? null}
                      minSpend={bc.min_card_spend_aed} inWallet={walletIds.includes(bc.card_id)}
                      onAdd={() => onAdd(bc.card_id)} onRemove={() => onRemove(bc.card_id)}
                      onDetails={() => onDetails(bc.card_id)} />
                  ))}
                </Ribbon>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function DiscoveryTile({ info, reward, walletTotal, where, minSpend, inWallet, onAdd, onRemove, onDetails }: {
  info: CardInfo
  reward: number
  walletTotal: number | null // this card's total across all categories in the current wallet
  where: string
  minSpend: number | null
  inWallet: boolean
  onAdd: () => void
  onRemove: () => void
  onDetails: () => void
}) {
  return (
    <div className={`flex w-[236px] shrink-0 snap-start flex-col rounded-2xl border bg-ws-bg p-4 shadow-ws-lift ${inWallet ? 'border-ws-primary/50 ring-1 ring-ws-primary/20' : 'border-ws-border'}`}>
      <div className="relative">
        <CardArt card={info} size="sm" />
        {inWallet && (
          <span className="absolute top-2 left-2 z-20 rounded-full bg-ws-ink px-2 py-0.5 text-[10px] font-semibold text-ws-ink-fg shadow-ws-lift">
            ✓ In your wallet
          </span>
        )}
      </div>
      <p className="mt-3 font-display text-[14px] leading-tight font-semibold text-ws-fg">{cardName(info)}</p>
      {info.bank && <p className="mt-0.5 text-[12px] text-ws-muted">{info.bank}</p>}
      {inWallet && walletTotal !== null ? (
        <>
          <p className="mt-1.5 text-[13px] font-semibold text-ws-gain">Earns {aed(walletTotal)}/year</p>
          <p className="mt-1 text-[13px] leading-snug text-ws-muted">in your wallet, across all categories</p>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-[13px] font-semibold text-ws-gain">Earns {aed(reward)}/year</p>
          <p className="mt-1 text-[13px] leading-snug text-ws-muted">{where}</p>
        </>
      )}
      {!inWallet && minSpend !== null && (
        <p className="mt-1 text-[12px] leading-snug text-ws-muted">Needs {aed(minSpend)}/month on this card</p>
      )}
      {/* actions pinned to the tile's bottom edge, two equal halves, same place on every tile */}
      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
        {inWallet ? (
          <span className="relative inline-flex min-h-11 items-center justify-center rounded-full border border-ws-border text-[13px] font-semibold text-ws-muted">
            In wallet
            {/* small solid-blue badge on the pill's top-right edge; padded hit area for touch */}
            <button onClick={onRemove} aria-label={`Remove ${cardName(info)} from wallet`} title="Remove from wallet"
              className="group absolute -top-4 -right-4 grid size-8 place-items-center">
              <span className="grid size-5 place-items-center rounded-full bg-ws-primary text-[14px] leading-none font-bold text-white shadow-ws-lift transition-colors group-hover:bg-ws-ink">
                −
              </span>
            </button>
          </span>
        ) : (
          <button onClick={onAdd}
            className="min-h-11 rounded-full bg-ws-ink px-2 text-[13px] font-semibold whitespace-nowrap text-ws-ink-fg transition-colors hover:bg-ws-primary">
            Add to wallet
          </button>
        )}
        <button onClick={onDetails} aria-haspopup="dialog"
          className="min-h-11 rounded-full border border-ws-border text-[13px] font-medium text-ws-fg transition-colors hover:bg-ws-secondary">
          Details
        </button>
      </div>
    </div>
  )
}

/* ---------------- Section 6: alternative wallets ---------------- */

export function Alternatives({ alternatives, pick, currentIds, card, onUse }: {
  alternatives: Wallet[]
  pick: Wallet
  currentIds: string[]
  card: CardLookup
  onUse: (w: Wallet) => void
}) {
  if (!alternatives.length) return null
  return (
    <section className="border-t border-ws-border">
      <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
        <h2 className="text-2xl font-semibold text-balance text-ws-fg sm:text-3xl">Other smart ways to build your wallet</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {alternatives.map(alt => {
            const fewer = alt.cards.length < pick.cards.length
            const below = pick.annual_reward_aed - alt.annual_reward_aed
            const inUse = sameCards(alt.cards, currentIds)
            return (
              <div key={alt.cards.join('|')} className="rounded-2xl border border-ws-border bg-ws-card p-6 shadow-ws-lift">
                <p className="font-display text-[16px] font-semibold text-ws-fg">
                  {fewer ? 'Fewer cards' : alt.cards.length === 1 ? 'Another single card' : 'A different mix'}
                </p>
                <p className="mt-1 text-[13px] text-ws-muted">
                  {fewer
                    ? `${NUMBER_WORD[alt.cards.length]} card${alt.cards.length > 1 ? 's' : ''}, close to the same rewards.`
                    : alt.cards.length === 1 ? 'One card, a different choice.' : 'Same number of cards, a different combination.'}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {alt.cards.map(id => <CardChip key={id} card={card(id)} />)}
                </div>
                <p className="mt-2 text-[12px] text-ws-muted">{alt.cards.map(id => cardName(card(id))).join(' + ')}</p>
                <p className="mt-5 font-display text-[22px] font-semibold tracking-tight text-ws-fg">
                  {aed(alt.annual_reward_aed)}
                  <span className="ml-1 text-[13px] font-medium text-ws-muted">/year</span>
                </p>
                <p className="mt-1 text-[13px] text-ws-loss">
                  {below > 0.5 ? `${aed(below)} a year below Earnn Pick` : 'Same rewards as Earnn Pick'}
                </p>
                <button onClick={() => onUse(alt)} disabled={inUse}
                  className="mt-5 min-h-10 rounded-full border border-ws-border px-4 py-2 text-[13px] font-semibold text-ws-fg transition-colors hover:bg-ws-secondary disabled:cursor-default disabled:opacity-60">
                  {inUse ? 'In your wallet' : 'Use this wallet'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ---------------- Section 7: details on demand ---------------- */

export function Details({ wallet, monthlySpend, card }: {
  wallet: Wallet | null
  monthlySpend: number
  card: CardLookup
}) {
  const [open, setOpen] = useState(false)
  return (
    <section className="border-t border-ws-border bg-ws-card">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <button onClick={() => setOpen(v => !v)} aria-expanded={open}
          className="flex min-h-12 w-full items-center justify-between gap-4 rounded-2xl border border-ws-border bg-ws-bg px-5 py-4 text-left shadow-ws-lift">
          <span className="font-display text-[15px] font-semibold text-ws-fg">See how we calculated this</span>
          <span className="text-[13px] text-ws-muted">{open ? 'Hide' : 'Open'}</span>
        </button>

        {open && (
          <div className="ws-animate-rise mt-4 space-y-4">
            {(!wallet || wallet.cards.length === 0) && (
              <p className="text-[13px] text-ws-muted">Add a card to your wallet to see the details.</p>
            )}
            {wallet?.per_card.map(pc => {
              const c = card(pc.card_id)
              const lines = wallet.allocation.filter(a => a.card_id === pc.card_id)
              return (
                <div key={pc.card_id} className="rounded-2xl border border-ws-border bg-ws-bg p-5">
                  <div className="flex items-center gap-3">
                    <CardChip card={c} />
                    <div className="min-w-0">
                      <p className="font-display text-[15px] font-semibold text-ws-fg">{cardName(c)}</p>
                      <p className="text-[13px] text-ws-muted">
                        {aed(pc.routed_spend_aed)}/month goes on this card · earns {aed(pc.annual_reward_aed)}/year
                        {wallet.cards.length > 1 && ` · adds ${aed(pc.contribution_annual_aed)}/year to your wallet`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {lines.map(l => (
                      <div key={l.line_id} className="flex items-center justify-between gap-3 rounded-xl bg-ws-secondary px-3 py-2 text-[13px] text-ws-fg">
                        <span className="min-w-0">
                          {groupIcon(l.group)} {groupShort(l.group)}
                          <span className="block text-[12px] text-ws-muted">
                            {aed(l.amount_aed)}/month · est. rate {pct(l.rate)}
                            {l.post_cap_spend_aed > 0.005 && ` · bonus limit reached, ${aed(l.post_cap_spend_aed)} at the standard rate`}
                          </span>
                        </span>
                        <span className="shrink-0 text-ws-muted tabular-nums">{aed(l.monthly_reward_aed * 12)}/yr</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 space-y-0.5 text-[12px] text-ws-muted">
                    {pc.band_min_spend_aed > 0 && <p>These rates need at least {aed(pc.band_min_spend_aed)}/month on this card.</p>}
                    {pc.card_cap_hit && <p>This card&apos;s monthly reward limit is reached.</p>}
                    {pc.salary_eligible === false && <p>Your salary may be below this card&apos;s minimum — check with the bank.</p>}
                  </div>
                </div>
              )
            })}
            <p className="text-[12px] text-ws-muted">
              Estimates based on the monthly spending you entered ({aed(monthlySpend)} a month) and current
              published reward rates. Rewards only — annual fees are not included. Actual rewards depend on
              where you spend and the bank&apos;s terms.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
