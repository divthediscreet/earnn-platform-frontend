'use client'

import { useEffect, useRef } from 'react'
import type { Wallet } from '@/lib/wallet-simulator/api'
import { MAX_WALLET } from '@/lib/wallet-simulator/groups'
import { useRewardMode } from '@/lib/wallet-simulator/reward-mode'
import { CardChip, RollingAed, type CardInfo } from './card-art'

type CardLookup = (id: string) => CardInfo
const cardName = (c: CardInfo) => c.name

export function WalletDock({ ids, wallet, pick, isPick, status, card, onRemove, onAdd, onGetCards, onReset, onRetry, open, onOpenChange, children }: {
  children?: React.ReactNode // shown when the dock is expanded (the wallet's playbook)
  open: boolean
  onOpenChange: (open: boolean) => void
  ids: string[]
  wallet: Wallet | null // evaluated wallet for `ids` (null while the first evaluation is pending)
  pick: Wallet
  isPick: boolean
  status: 'ready' | 'updating' | 'error'
  card: CardLookup
  onRemove: (id: string) => void
  onAdd: () => void // opens the wallet customisation screen
  onGetCards: () => void // opens the "get these cards" screen for the current wallet
  onReset: () => void
  onRetry: () => void
}) {
  const { rw, isMiles } = useRewardMode()
  const total = ids.length === 0 ? 0 : wallet?.monthly_reward_aed ?? 0
  const delta = total - pick.monthly_reward_aed
  const fewer = pick.cards.length - ids.length

  let headline = 'This is Earnn Pick'
  if (ids.length === 0) headline = 'Add a card to start building'
  else if (!isPick && wallet) {
    if (Math.abs(delta) < 0.5) headline = 'Same rewards as Earnn Pick'
    else if (delta > 0) headline = `${rw(delta)}/month more than Earnn Pick`
    else if (fewer > 0) headline = `You're giving up ${rw(-delta)}/month to carry ${fewer === 1 ? 'one less card' : `${fewer} fewer cards`}`
    else headline = `${rw(-delta)}/month less than Earnn Pick`
  }
  if (status === 'error') headline = "We couldn't update your wallet"
  const tone = status === 'error' ? 'text-ws-loss' : isPick || delta >= -0.5 || ids.length === 0 ? 'text-ws-gain' : 'text-ws-loss'

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
    {open && (
      // the page stays visible (dimmed) above the sheet; tapping it closes the sheet
      <div aria-hidden onClick={() => setOpen(false)} className="fixed inset-0 z-[1040] bg-ws-ink/35 backdrop-blur-[1px]" />
    )}
    <div ref={dockRef} role={open ? 'dialog' : undefined} aria-modal={open || undefined} aria-label={open ? 'My wallet' : undefined}
      className={`fixed inset-x-0 bottom-0 flex flex-col border-t pb-[env(safe-area-inset-bottom)] shadow-ws-dock backdrop-blur-xl transition-[top] ${
        open
          ? 'top-[10vh] z-[1050] rounded-t-3xl border-ws-border bg-ws-card'
          // collapsed: a light golden tint so the wallet bar stands apart from the blue-white page
          : 'z-[900] border-[#E9C46A]/50 bg-gradient-to-b from-[#FFF9EA]/95 to-[#FBEFCF]/95'
      }`}>
      {open && <span aria-hidden className="mx-auto mt-2 block h-1.5 w-12 shrink-0 rounded-full bg-ws-border" />}
      {/* pull-up tab on the dock's top edge */}
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className="absolute -top-4 left-1/2 z-10 flex min-h-8 -translate-x-1/2 items-center gap-1.5 rounded-full bg-ws-primary px-4 text-[12px] font-semibold text-white shadow-ws-plastic ring-2 ring-white transition-colors hover:bg-ws-ink">
        <span aria-hidden className="text-[13px] leading-none">{open ? '↓' : '↑'}</span>
        {open ? 'Close' : 'How to use this wallet'}
      </button>
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 pt-4 pb-3 sm:px-8">
        <div className="flex items-start gap-2">
          {ids.map(id => (
            <div key={id} className="flex w-[60px] flex-col items-center gap-1">
              <CardChip card={card(id)} className="!h-[35px] !w-[56px]" />
              <button onClick={() => onRemove(id)} aria-label={`Remove ${cardName(card(id))} from your wallet`}
                className="min-h-7 w-full rounded-md text-[10px] font-semibold text-ws-muted transition-colors hover:bg-ws-secondary hover:text-ws-fg">
                Remove
              </button>
            </div>
          ))}
          {Array.from({ length: MAX_WALLET - ids.length }).map((_, i) => (
            <button key={i} type="button" aria-label="Add a card" onClick={() => { setOpen(false); onAdd() }}
              className="flex w-[60px] flex-col items-center gap-1 text-ws-muted">
              <span className="grid h-[35px] w-[56px] place-items-center rounded-[6px] border border-dashed border-ws-border text-[16px]">+</span>
              <span className="grid min-h-7 place-items-center text-[10px] font-semibold">Add</span>
            </button>
          ))}
        </div>

        <div className="hidden h-9 w-px bg-ws-border sm:block" />

        <div className="min-w-0">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-ws-muted uppercase">
            My wallet{status === 'updating' && <span className="ws-animate-pulse ml-2 normal-case tracking-normal">updating…</span>}
          </p>
          <p className={`font-display text-[19px] leading-tight font-semibold tracking-tight text-ws-fg ${status !== 'ready' ? 'opacity-60' : ''}`}>
            {isMiles ? <><RollingAed value={total} /> miles</> : <>AED <RollingAed value={total} /></>}
            <span className="ml-1 text-[12px] font-medium text-ws-muted">/month</span>
          </p>
        </div>

        <div className="flex w-full items-center justify-between gap-3 md:min-w-0 md:flex-1">
          <div className="flex min-w-0 flex-col items-start gap-1 md:ml-4">
            <p className={`text-[12px] leading-snug font-semibold md:text-[13px] ${tone}`}>{headline}</p>
            {status === 'error' ? (
              <button onClick={onRetry} className="rounded-full bg-ws-ink px-2.5 py-0.5 text-[10px] font-semibold text-ws-ink-fg">
                Try again
              </button>
            ) : !isPick && (
              // only shown once the user has moved away from Earnn Pick
              <button onClick={onReset}
                className="rounded-full border border-ws-border bg-white/60 px-2.5 py-0.5 text-[10px] font-semibold text-ws-primary transition-colors hover:bg-ws-ink hover:text-ws-ink-fg">
                Back to Earnn Pick
              </button>
            )}
          </div>
          <button type="button" onClick={() => { setOpen(false); onGetCards() }} disabled={ids.length === 0 || !wallet}
            className="min-h-10 shrink-0 rounded-full bg-ws-ink px-4 py-2 text-[13px] font-semibold text-ws-ink-fg hover:bg-ws-primary disabled:cursor-not-allowed disabled:opacity-50">
            Get these cards
          </button>
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
