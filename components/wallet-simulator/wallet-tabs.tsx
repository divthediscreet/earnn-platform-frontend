'use client'

// The three ways to carry the result, as tabs at the top of the result page (they replace the "other smart ways" section
// at the bottom): the recommended set first, then the next best choices. Picking a tab swaps the wallet shown below.

import type { Wallet } from '@/lib/wallet-simulator/api'
import { sameCards } from '@/lib/wallet-simulator/playbook'

export type WalletTab = { key: string; title: string; text: string; cards: string[] }

const setKey = (w: Wallet) => [...w.cards].sort().join('|')

/**
 * The tabs for a result. `pick` is Earnn's recommended wallet; `pool` is every wallet the backend has calculated.
 *  3 cards recommended -> best 3, best 2, best single card
 *  2 cards recommended -> best 2, best single card, another single card
 *  1 card recommended  -> best single card, 2nd best, 3rd best
 * `score` ranks wallets of the same size (net of fees; miles when the view is miles).
 */
export function buildWalletTabs(pick: Wallet, pool: Wallet[], score: (w: Wallet) => number): WalletTab[] {
  const seen = new Set<string>()
  const unique = [pick, ...pool].filter(w => w.cards.length > 0 && !seen.has(setKey(w)) && !!seen.add(setKey(w)))
  const ranked = (size: number) => unique.filter(w => w.cards.length === size && setKey(w) !== setKey(pick)).sort((a, b) => score(b) - score(a))
  const tab = (key: string, title: string, text: string, w: Wallet): WalletTab => ({ key, title, text, cards: w.cards })
  const n = pick.cards.length
  const tabs: WalletTab[] = []
  if (n >= 3) {
    tabs.push(tab('best', 'Best 3 cards', 'Earnn’s pick: the most rewards.', pick))
    const two = ranked(2)[0]; if (two) tabs.push(tab('two', 'Best 2 cards', 'Fewer cards, a little less.', two))
    const one = ranked(1)[0]; if (one) tabs.push(tab('one', 'Best single card', 'One card for everything.', one))
  } else if (n === 2) {
    tabs.push(tab('best', 'Best 2 cards', 'Earnn’s pick: the most rewards.', pick))
    const [first, second] = ranked(1)
    if (first) tabs.push(tab('one', 'Best single card', 'Just one card.', first))
    if (second) tabs.push(tab('alt', 'Alternate single card', 'Another one-card option.', second))
  } else {
    tabs.push(tab('best', 'Best single card', 'Earnn’s pick: the most rewards.', pick))
    const [first, second] = ranked(1)
    if (first) tabs.push(tab('second', '2nd best single card', 'Another one-card option.', first))
    if (second) tabs.push(tab('third', '3rd best single card', 'A third one-card option.', second))
  }
  return tabs
}

export function WalletTabs({ tabs, currentIds, onSelect }: { tabs: WalletTab[]; currentIds: string[]; onSelect: (cards: string[]) => void }) {
  if (tabs.length < 2) return null
  // a customised wallet (cards swapped by hand) matches none of the tabs
  const active = tabs.findIndex(t => sameCards(t.cards, currentIds))
  return (
    <>
    <style>{`
      @keyframes wtCrownShine { 0%, 100% { filter: drop-shadow(0 0 1px rgba(0,166,126,.4)) brightness(1); } 50% { filter: drop-shadow(0 0 7px rgba(94,234,192,.95)) brightness(1.3); } }
      .wt-crown { animation: wtCrownShine 2.2s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) { .wt-crown { animation: none; } }
    `}</style>
    <div role="tablist" aria-label="Ways to carry your cards" className="mt-11 flex gap-1 rounded-2xl border border-ws-border bg-ws-secondary p-1">
      {tabs.map((tab, i) => {
        const on = i === active
        const rec = tab.key === 'best' // Earnn's own pick: golden yellow with a crown
        const look = rec
          ? (on ? 'bg-[#FFD76A] text-[#3D2F00] shadow-[0_2px_10px_rgba(201,151,43,0.45)] ring-2 ring-[#E0B13C]' : 'bg-[#FFF1B8] text-[#5A4200] hover:bg-[#FFE79A]')
          : (on ? 'bg-white text-ws-primary shadow-[0_2px_8px_rgba(14,55,133,0.18)]' : 'bg-transparent text-ws-fg hover:bg-white/60')
        return (
          <button key={tab.key} type="button" role="tab" aria-selected={on} onClick={() => onSelect(tab.cards)} title={tab.text}
            className={`relative flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-0 px-2 py-1.5 text-center transition sm:px-3 ${look}`}>
            {rec && (
              // a solid green crown tilted on the left corner; it shines out and in (a glow that swells and fades)
              <svg aria-hidden viewBox="0 0 24 24" className="wt-crown pointer-events-none absolute -top-[24px] -left-[12px] size-10 -rotate-45">
                <path d="M2.5 7.5l4.7 4.2L12 4l4.8 7.7 4.7-4.2L19.6 18H4.4z" fill="#00A67E" stroke="#007A5C" strokeWidth="0.8" strokeLinejoin="round" />
                <rect x="4" y="19" width="16" height="2.2" rx="1" fill="#00A67E" stroke="#007A5C" strokeWidth="0.8" />
                <circle cx="12" cy="4" r="1.5" fill="#7DF0C8" /><circle cx="2.5" cy="7.5" r="1.3" fill="#7DF0C8" /><circle cx="21.5" cy="7.5" r="1.3" fill="#7DF0C8" />
              </svg>
            )}
            <span className="text-[13px] leading-tight font-extrabold sm:text-[15px]">{tab.title}</span>
            <span className={`mt-0.5 text-[11.5px] leading-tight sm:text-[12.5px] ${rec ? 'font-bold' : ''} ${rec ? 'text-[#7A5200]' : 'font-semibold text-[#8FA3C7]'}`}>{rec ? 'Earnn’s recommendation' : 'Alternate strategy'}</span>
          </button>
        )
      })}
    </div>
    </>
  )
}
