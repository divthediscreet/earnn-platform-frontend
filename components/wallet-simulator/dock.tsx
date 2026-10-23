'use client'

import { useEffect, useRef } from 'react'
import type { Wallet } from '@/lib/wallet-simulator/api'
import { MAX_WALLET } from '@/lib/wallet-simulator/groups'
import { useRewardMode } from '@/lib/wallet-simulator/reward-mode'
import { CardChip, RollingAed, type CardInfo } from './card-art'

type CardLookup = (id: string) => CardInfo
const cardName = (c: CardInfo) => c.name

export function WalletDock({ ids, wallet, status, card, onRemove, onAdd, onCompare, onReset, onAskEarnn, onRetry, open, onOpenChange, children }: {
  children?: React.ReactNode // shown when the dock is expanded (the wallet's playbook)
  open: boolean
  onOpenChange: (open: boolean) => void
  ids: string[]
  wallet: Wallet | null // evaluated wallet for `ids` (null while the first evaluation is pending)
  pick: Wallet
  isPick?: boolean // no longer drives the dock; kept so existing callers still type-check
  status: 'ready' | 'updating' | 'error'
  card: CardLookup
  onRemove: (id: string) => void
  onAdd: () => void // opens the wallet customisation screen
  onCompare?: () => void // opens "compare with the cards I already hold" for the current wallet (button hidden when omitted)
  onReset: () => void
  onAskEarnn?: () => void // "Ask Earnn to find best cards for you": when omitted it just resets the wallet to Earnn's pick
  onRetry: () => void
}) {
  const { isMiles } = useRewardMode()
  const total = ids.length === 0 ? 0 : wallet?.monthly_reward_aed ?? 0

  // no comparison against Earnn's recommended set here: just the empty and error states
  let headline = ''
  if (ids.length === 0) headline = 'Add a card to start testing'
  if (status === 'error') headline = "We couldn't update your wallet"
  const tone = status === 'error' ? 'text-ws-loss' : 'text-ws-gain'

  const setOpen = onOpenChange
  const openRef = useRef(open)
  useEffect(() => { openRef.current = open }, [open])

  // Publish the collapsed dock's height so floating site widgets (feedback button) can sit above it.
  const dockRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = dockRef.current
    if (!el) return
    const root = document.documentElement
    const ro = new ResizeObserver(() => {
      if (!openRef.current) root.style.setProperty('--ws-dock-h', `${Math.ceil(el.getBoundingClientRect().height)}px`)
    })
    ro.observe(el)
    return () => { ro.disconnect(); root.style.removeProperty('--ws-dock-h') }
  }, [])

  // Expanded: the page behind doesn't scroll; Escape closes.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onOpenChange(false) }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [open, onOpenChange])

  return (
    <>
    {/* a very light, slow glow on the "Ask Earnn" pill: enough to catch the eye, not to distract */}
    <style>{`
      @keyframes ws-ask-blink { 0%, 70%, 100% { box-shadow: 0 3px 12px rgba(236,72,153,0.5); filter: brightness(1); } 85% { box-shadow: 0 3px 16px rgba(236,72,153,0.8), 0 0 0 3px rgba(236,72,153,0.16); filter: brightness(1.08); } }
      .ws-ask-blink { animation: ws-ask-blink 2s ease-in-out infinite; }
      @media (prefers-reduced-motion: reduce) { .ws-ask-blink { animation: none; } }
    `}</style>
    {open && (
      // the page stays visible (dimmed) above the sheet; tapping it closes the sheet
      <div aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-[1040] bg-ws-ink/35 backdrop-blur-[1px]" />
    )}
    <div ref={dockRef} role={open ? 'dialog' : undefined} aria-modal={open || undefined} aria-label={open ? 'My wallet' : undefined}
      className={`fixed inset-x-0 bottom-0 flex flex-col border-t pb-[env(safe-area-inset-bottom)] shadow-ws-dock backdrop-blur-xl transition-[top] ${
        open
          ? 'top-[10vh] z-[1050] rounded-t-3xl border-ws-border bg-ws-card'
          // collapsed: a light beige bar with a very light border and shadow
          : 'z-[900] border-[#E8DFC8] bg-[#FAF6EC]'
      }`}>
      {open && <span aria-hidden className="mx-auto mt-2 block h-1.5 w-12 shrink-0 rounded-full bg-ws-border" />}
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-2.5 sm:px-8 md:min-h-[72px]">
        {/* 1. my selected cards */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            {ids.map(id => (
              <div key={id} className="group relative">
                <CardChip card={card(id)} className="!h-[32px] !w-[50px]" />
                <button onClick={() => onRemove(id)} aria-label={`Remove ${cardName(card(id))} from your test wallet`}
                  className="absolute -top-1.5 -right-1.5 grid size-[18px] place-items-center rounded-full bg-ws-ink text-[12px] leading-none text-ws-ink-fg shadow transition-opacity hover:bg-ws-loss sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100">
                  ×
                </button>
              </div>
            ))}
            {Array.from({ length: MAX_WALLET - ids.length }).map((_, i) => (
              <button key={i} type="button" aria-label="Add a card" onClick={() => { setOpen(false); onAdd() }}
                className="grid h-[32px] w-[50px] place-items-center rounded-[6px] border border-dashed border-ws-border text-[17px] text-ws-muted transition-colors hover:border-ws-primary hover:text-ws-primary">
                +
              </button>
            ))}
          </div>
          {status !== 'error' && (
            <button type="button" onClick={onAskEarnn ?? onReset}
              className="ws-ask-blink inline-flex shrink-0 items-center gap-1.5 self-start whitespace-nowrap rounded-full bg-gradient-to-r from-[#7C3AED] to-[#EC4899] px-3 py-1 text-[11px] font-extrabold text-white shadow-[0_3px_12px_rgba(236,72,153,0.5)] transition hover:-translate-y-px hover:brightness-110">
              <svg aria-hidden viewBox="0 0 24 24" width="13" height="13" fill="#FFD400"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6z" /></svg>
              Ask Earnn to find best cards for you
            </button>
          )}
        </div>

        <div className="hidden h-10 w-px bg-ws-border sm:block" />

        {/* 2. my rewards */}
        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-ws-muted uppercase">
            Test wallet · {ids.length}/{MAX_WALLET} cards{status === 'updating' && <span className="ws-animate-pulse ml-2 normal-case tracking-normal">updating…</span>}
          </p>
          <p className={`font-display leading-none font-semibold tracking-tight text-ws-fg ${status !== 'ready' ? 'opacity-60' : ''}`}>
            <span className="text-[28px]">{isMiles ? <><RollingAed value={total} /> miles</> : <>AED <RollingAed value={total} /></>}</span>
            <span className="ml-1 text-[13px] font-medium text-ws-muted">/month</span>
            {ids.length > 0 && <span className="ml-2 hidden text-[11px] font-medium text-ws-muted lg:inline">Estimated rewards</span>}
          </p>
          {headline && <p className={`mt-0.5 text-[12px] leading-snug font-semibold ${tone}`}>{headline}</p>}
        </div>

        {/* 3. what can I do next */}
        <div className="ml-auto flex items-center gap-2">
          {status === 'error' && (
            <button onClick={onRetry} className="min-h-9 rounded-full border border-ws-border px-3.5 text-[13px] font-semibold text-ws-loss">Try again</button>
          )}
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
            className="min-h-10 shrink-0 rounded-full border border-ws-border bg-white px-4 text-[13px] font-semibold text-ws-fg transition-colors hover:border-ws-primary hover:text-ws-primary">
            {open ? 'Close' : 'How to use'}
          </button>
          {onCompare && (
            <button type="button" onClick={() => { setOpen(false); onCompare() }} disabled={ids.length === 0 || !wallet} aria-haspopup="dialog"
              className="min-h-10 shrink-0 rounded-full bg-ws-ink px-5 text-[13px] font-semibold text-ws-ink-fg transition-colors hover:bg-ws-primary disabled:cursor-not-allowed disabled:opacity-50">
              Compare with my cards
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="ws-scrollbar ws-animate-rise min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-ws-border">
          <div className="mx-auto max-w-6xl px-5 pb-10 sm:px-8">
            <h2 className="pt-6 font-display text-[22px] font-semibold text-ws-fg">Which card should I use?</h2>
            <p className="mt-1 text-[13px] text-ws-muted">See where to use each card and how much it can earn you. Scroll for more · tap outside or ↓ Close to hide.</p>
            {children}
          </div>
        </div>
      )}
    </div>
    </>
  )
}

/** Wallet is full: the user removes a card themselves before adding another. Nothing is removed for them. */
export function WalletFullDialog({ ids, wallet, card, onRemove, onClose }: {
  ids: string[]
  wallet: Wallet | null
  card: CardLookup
  onRemove: (id: string) => void
  onClose: () => void
}) {
  const { rw } = useRewardMode()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[1100] grid place-items-end bg-ws-ink/40 backdrop-blur-sm sm:place-items-center"
      onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="ws-full-title">
      <div className="ws-animate-rise w-full max-w-md rounded-t-3xl bg-ws-card p-6 shadow-ws-plastic sm:rounded-3xl"
        onClick={e => e.stopPropagation()}>
        <h2 id="ws-full-title" className="font-display text-[22px] font-semibold text-ws-fg">Your wallet is full</h2>
        <p className="mt-1 text-[14px] text-ws-muted">
          You can have a maximum of {MAX_WALLET} cards. Remove one first before adding a new one.
        </p>
        <div className="mt-5 space-y-2">
          {ids.map(id => {
            const c = card(id)
            const pc = wallet?.per_card.find(p => p.card_id === id)
            return (
              <div key={id} className="flex min-h-14 items-center gap-3 rounded-2xl border border-ws-border p-3">
                <CardChip card={c} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-[14px] font-semibold text-ws-fg">{cardName(c)}</span>
                  {pc && <span className="block text-[12px] text-ws-muted">adds {rw(pc.contribution_annual_aed / 12)}/month to your wallet</span>}
                </span>
                <button onClick={() => onRemove(id)}
                  className="min-h-10 shrink-0 rounded-full border border-ws-border px-3 text-[12px] font-semibold text-ws-fg hover:bg-ws-secondary">
                  Remove from wallet
                </button>
              </div>
            )
          })}
        </div>
        <button onClick={onClose} className="mt-4 min-h-11 w-full rounded-full bg-ws-ink text-[14px] font-semibold text-ws-ink-fg hover:bg-ws-primary">
          OK
        </button>
      </div>
    </div>
  )
}
