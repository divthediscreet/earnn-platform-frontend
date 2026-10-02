'use client'

// The "Already have cards?" band at the end of the result page: opens the compare-with-your-cards popup.

import type { Wallet } from '@/lib/wallet-simulator/api'
import { aed } from '@/lib/wallet-simulator/groups'
import { CardArt, type CardInfo } from './card-art'

/* "Already have cards?": compact text on the left; dummy cards -> arrow -> your Earnn wallet on the right */

// placeholder look for "your current cards": we don't know them yet, so they stay generic
const DUMMY_CARDS = [
  'from-[#2B3445] to-[#11161F] -rotate-[16deg] left-0 top-[118px]',
  'from-[#3B82F6] to-[#1D4ED8] -rotate-[12deg] left-[16px] top-[134px]',
  'from-[#E9C77B] to-[#B98F3E] -rotate-[8deg] left-[34px] top-[154px]',
]

export function CompareBand({ wallet, card, onCompare }: { wallet: Wallet | null; card: (id: string) => CardInfo; onCompare: () => void }) {
  const ids = wallet?.cards ?? []
  const m = wallet?.monthly_reward_aed ?? 0
  return (
    <section className="overflow-hidden bg-gradient-to-b from-[#0A2A66] to-[#061A42] text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-6 px-5 py-8 sm:px-8 md:grid-cols-[1fr_1fr] md:gap-10">
        <div>
          <h2 className="text-2xl font-semibold text-balance sm:text-[30px]">
            Already have <span className="text-[#F7C948]">cards?</span>
          </h2>
          <p className="mt-2 max-w-[46ch] text-[15px] leading-relaxed text-pretty text-white/70">
            See how your current wallet compares with your Earnn wallet on exactly the same spending.
          </p>
          <button type="button" onClick={onCompare}
            className="group mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#F7C948] px-5 py-3 text-[14px] font-semibold text-[#0D1828] transition-transform hover:-translate-y-0.5">
            Compare my current cards <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </button>
          <p className="mt-4 flex items-center gap-3">
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-white">
              <svg viewBox="0 0 24 24" className="size-[16px]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M13 2 4 14h7l-1 8 9-12h-7z" fill="currentColor" />
              </svg>
            </span>
            <span className="text-[13px] leading-snug text-white/75">See if it&apos;s worth upgrading</span>
          </p>
        </div>

        {/* generic cards -> arrow -> your real Earnn wallet */}
        <div aria-hidden className="relative mx-auto hidden h-[250px] w-full max-w-[480px] sm:block">
          <div className="absolute top-4 right-2 size-[200px] rounded-full bg-white/[0.04]" />
          <svg viewBox="0 0 480 250" className="absolute inset-0 size-full" fill="none">
            <path d="M120 112 C 170 30, 260 18, 330 52" className="ws-dash-flow" stroke="#5DB7FF" strokeWidth={3} strokeDasharray="8 9" strokeLinecap="round" />
            <path d="M318 34 L 332 53 L 311 60" stroke="#5DB7FF" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="absolute top-[2px] right-[24px] rounded-full bg-[#F7C948] px-4 py-1.5 text-[13px] font-semibold text-[#0D1828] shadow-lg">Your Smart Wallet</span>

          {DUMMY_CARDS.map(c => (
            <div key={c} className={`absolute h-[78px] w-[124px] rounded-xl bg-gradient-to-br shadow-xl ${c}`}>
              <span className="absolute top-[26px] left-3 h-4 w-6 rounded-[3px] bg-white/45" />
              <span className="absolute right-3 bottom-2.5 flex"><span className="size-4 rounded-full bg-[#EB001B]/90" /><span className="-ml-1.5 size-4 rounded-full bg-[#F79E1B]/90" /></span>
            </div>
          ))}

          {ids.map((id, i) => (
            <div key={id} className="absolute w-[150px]"
              style={{ right: `${6 + (ids.length - 1 - i) * 16}px`, top: `${64 + i * 26}px`, transform: `rotate(${8 + i * 4}deg)`, zIndex: i }}>
              <CardArt card={card(id)} size="sm" />
            </div>
          ))}
          <span className="absolute right-2 bottom-0 rounded-full bg-white/10 px-3 py-1 text-[12px] font-medium text-white/80 ring-1 ring-white/15">
            Earnn wallet · <span className="font-semibold text-[#F7C948] tabular-nums">{aed(m)}</span> / month
          </span>
        </div>
      </div>
    </section>
  )
}
