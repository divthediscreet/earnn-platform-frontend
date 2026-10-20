'use client'

// The "Are your credit cards giving you the best rewards?" band: opens the compare-with-your-cards popup.

import type { Wallet } from '@/lib/wallet-simulator/api'
import { CardArt, type CardInfo } from './card-art'

/** Generic "your cards" artwork: we don't know the user's cards yet, so they stay plain. */
function PlainCard({ className, from, to, mc = false }: { className: string; from: string; to: string; mc?: boolean }) {
  return (
    <div className={`absolute rounded-xl shadow-xl ring-1 ring-white/20 ${className}`} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <span className="absolute top-[26%] left-[9%] h-[17%] w-[19%] rounded-[3px] bg-white/45" />
      {mc && <span className="absolute right-[8%] bottom-[10%] flex"><span className="size-4 rounded-full bg-[#EB001B]/90" /><span className="-ml-1.5 size-4 rounded-full bg-[#F79E1B]/90" /></span>}
    </div>
  )
}

export function CompareBand({ wallet, card, onCompare }: { wallet: Wallet | null; card: (id: string) => CardInfo; onCompare: () => void }) {
  const ids = wallet?.cards ?? []
  // fan positions for 1-3 real cards (back to front)
  const fan: Record<number, string[]> = {
    1: ['left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6'],
    2: ['left-[6%] top-[14%] -rotate-[8deg]', 'left-[26%] top-[34%] rotate-[5deg]'],
    3: ['left-[4%] top-[8%] -rotate-[10deg]', 'left-[20%] top-[26%] -rotate-[2deg]', 'left-[34%] top-[44%] rotate-[6deg]'],
  }
  return (
    <section className="overflow-hidden text-white" style={{ background: 'radial-gradient(120% 140% at 20% 0%, #0B3A8C 0%, #062760 55%, #041A45 100%)' }}>
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-5 py-10 sm:px-8 md:grid-cols-[1.05fr_1fr] md:gap-10 md:py-14">
        <div>
          <h2 className="font-display text-[28px] leading-[1.12] font-bold text-balance sm:text-[40px]">
            Are your credit cards giving you the <span className="text-[#F7C948]">best rewards?</span>
          </h2>
          <p className="mt-4 max-w-[46ch] text-[15px] leading-relaxed text-white/75 sm:text-[17px]">
            Select the cards you already have.<br />
            We&apos;ll show you if other cards could earn you more.
          </p>
          <button type="button" onClick={onCompare} aria-haspopup="dialog"
            className="group mt-6 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-full border-0 bg-[#F7C948] px-7 py-3 text-[16px] font-bold text-[#0D1828] shadow-[0_6px_20px_rgba(247,201,72,0.25)] transition-transform hover:-translate-y-0.5">
            Compare my cards
          </button>
        </div>

        {/* your cards  vs  recommended cards */}
        <div aria-hidden className="mx-auto grid w-full max-w-[520px] grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
          <div className="flex flex-col items-center gap-3">
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-[13px] font-semibold ring-1 ring-white/15">Your cards</span>
            <div className="relative h-[150px] w-full max-w-[190px] sm:h-[180px]">
              <div className="absolute inset-0 rounded-full bg-white/[0.04] ring-1 ring-white/10" />
              <PlainCard className="top-[16%] left-[6%] h-[48%] w-[66%] -rotate-[8deg]" from="#4C8DFF" to="#1D4ED8" />
              <PlainCard className="top-[34%] left-[24%] h-[48%] w-[66%] rotate-[4deg]" from="#F2D88B" to="#C79A3F" mc />
            </div>
          </div>

          <span className="grid size-11 place-items-center rounded-full bg-[#0A2A66] text-[14px] font-bold ring-1 ring-white/20 sm:size-12">VS</span>

          <div className="flex flex-col items-center gap-3">
            <span className="rounded-full bg-white/10 px-4 py-1.5 text-[13px] font-semibold ring-1 ring-white/15">Recommended cards</span>
            <div className="relative h-[150px] w-full max-w-[190px] sm:h-[180px]">
              <div className="absolute inset-0 rounded-full bg-white/[0.04] ring-1 ring-white/10" />
              {ids.map((id, i) => (
                <div key={id} className={`absolute w-[64%] ${fan[ids.length]?.[i] ?? ''}`} style={{ zIndex: i }}>
                  <CardArt card={card(id)} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
