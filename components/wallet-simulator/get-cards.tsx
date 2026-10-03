'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CardScore, SpendGroup, Wallet } from '@/lib/wallet-simulator/api'
import { aed, groupIcon, groupShort } from '@/lib/wallet-simulator/groups'
import { buildPlaybook } from '@/lib/wallet-simulator/playbook'
import { useRewardMode } from '@/lib/wallet-simulator/reward-mode'
import { CardArt, type CardInfo } from './card-art'

type CardLookup = (id: string) => CardInfo

/** "Get these cards" — the final-plan screen of the old Analyse flow (summary, selected cards, apply,
 *  download), run on the simulator's wallet. Opens as a popup the same size as the customise popup. */
export function GetCardsDialog({ wallet, groups, cardScores, card, onDetails, onClose }: {
  wallet: Wallet
  groups: SpendGroup[]
  cardScores: CardScore[]
  card: CardLookup
  onDetails: (cardId: string) => void
  onClose: () => void
}) {
  const { rw, rate, isMiles } = useRewardMode()
  const [pdfLoading, setPdfLoading] = useState(false)
  const scoreById = useMemo(() => new Map(cardScores.map(c => [c.card_id, c])), [cardScores])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  // each card's best rate per spend group, for the little category chips
  const chips = (cardId: string) => {
    const best = new Map<string, number>()
    for (const a of wallet.allocation) {
      if (a.card_id !== cardId || a.rate <= 0) continue
      const g = a.group ?? 'miscellaneous'
      best.set(g, Math.max(best.get(g) ?? 0, a.rate))
    }
    return [...best.entries()].sort(([, x], [, y]) => y - x).slice(0, 4)
  }

  const annualSpend = groups.reduce((sum, g) => sum + g.monthly_spend_aed, 0) * 12
  const net = wallet.annual_reward_aed - wallet.total_fee_aed
  const multiplier = annualSpend > 0 ? (net / (annualSpend * 0.01)).toFixed(1) : '–'   // vs a 1% average cardholder, as in the old flow

  const downloadPdf = async () => {
    if (isMiles) { alert('The PDF report for the miles view is coming soon'); return }
    setPdfLoading(true)
    try {
      const { downloadEarnnReport } = await import('@/lib/earnn-report')
      const category_routing: Record<string, { card_id: string; card_name: string; rate: number; annual_aed: number; monthly_spend_chunk: number }[]> = {}
      for (const row of buildPlaybook(wallet, groups)) {
        category_routing[row.group] = row.entries.map(e => ({
          card_id: e.cardId, card_name: card(e.cardId).name, rate: e.rate, annual_aed: e.monthlyReward * 12, monthly_spend_chunk: e.amount,
        }))
      }
      await downloadEarnnReport({
        cards: wallet.per_card.map(pc => ({
          earnn_card_id: pc.card_id, card_name: pc.card_name, bank_name: pc.bank_name ?? undefined,
          expected_annual_return_aed: pc.annual_reward_aed, true_annual_fee_aed: pc.annual_fee_aed,
          net_annual_value_aed: pc.annual_reward_aed - pc.annual_fee_aed,
          category_effective_rates: Object.fromEntries(Object.entries(scoreById.get(pc.card_id)?.groups ?? {}).map(([g, v]) => [g, v.rate])),
          card_summary_tag: scoreById.get(pc.card_id)?.summary_tag ?? undefined,
        })),
        wallet: null,
        userSpend: Object.fromEntries(groups.map(g => [g.group, g.monthly_spend_aed])),
        totalMonthly: groups.reduce((sum, g) => sum + g.monthly_spend_aed, 0),
        categoryRouting: category_routing,
        generatedDate: new Date().toLocaleDateString('en-AE', { day: 'numeric', month: 'long', year: 'numeric' }),
        net, gross: wallet.annual_reward_aed, fees: wallet.total_fee_aed,
      })
    } catch (e) { console.error(e) }
    finally { setPdfLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-[1060] flex items-start justify-center overflow-y-auto bg-black/45 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Get these cards"
        className="relative my-auto w-full max-w-6xl rounded-3xl bg-surface-2 p-4 shadow-elevated sm:p-7" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-muted text-sm text-foreground hover:bg-muted/70">✕</button>

        <section className="space-y-6 pt-8 sm:pt-0">
          <div className="space-y-3 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-soft px-3 py-1 text-xs font-semibold text-emerald">✓ Plan locked in</span>
            <h1 className="font-display text-4xl font-bold tracking-tight text-primary sm:text-5xl">You&apos;re ready</h1>
            <p className="mx-auto max-w-xl text-base text-muted-foreground">
              Here&apos;s your final wallet and what it earns you. Apply in a few minutes — most cards approve same-day in the UAE.
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-[#0d1f4a] p-6 text-primary-foreground shadow-card sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:items-center">
              <div>
                <div className="text-xs tracking-widest text-primary-foreground/70 uppercase">You could earn</div>
                <div className="mt-2 font-display text-5xl font-bold tabular-nums text-emerald sm:text-6xl">{rw(wallet.monthly_reward_aed)}</div>
                <div className="mt-1 text-sm text-primary-foreground/80">per month</div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-primary-foreground/10 p-4">
                    <div className="text-xs text-primary-foreground/70">Annual fees</div>
                    <div className="mt-1 font-display text-xl font-bold">{aed(wallet.total_fee_aed)}</div>
                  </div>
                  <div className="rounded-2xl bg-primary-foreground/10 p-4">
                    {isMiles ? (
                      <>
                        <div className="text-xs text-primary-foreground/70">Cards in wallet</div>
                        <div className="mt-1 font-display text-xl font-bold text-emerald">{wallet.cards.length}</div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-primary-foreground/70">vs. average UAE cardholder</div>
                        <div className="mt-1 font-display text-xl font-bold">{multiplier}× more rewards</div>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="flex items-center justify-center -space-x-10 py-2">
                  {wallet.cards.map((id, i) => (
                    <div key={id} className="w-[170px] sm:w-[210px]" style={{ transform: `rotate(${(i - (wallet.cards.length - 1) / 2) * 7}deg)`, zIndex: i }}>
                      <CardArt card={card(id)} size="lg" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 rounded-3xl border border-border/60 bg-card p-6 shadow-soft">
            <div className="text-sm font-semibold text-primary">Your Selected Cards</div>
            <ul className="divide-y divide-border/60">
              {wallet.per_card.map(pc => {
                const c = card(pc.card_id)
                const tag = scoreById.get(pc.card_id)?.summary_tag
                return (
                  <li key={pc.card_id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 py-3">
                    <div className="w-[88px] sm:w-[104px]"><CardArt card={c} size="sm" /></div>
                    <div className="min-w-0">
                      <button onClick={() => onDetails(pc.card_id)} className="truncate text-left font-semibold text-primary underline-offset-2 hover:underline">{c.name}</button>
                      <div className="text-xs text-muted-foreground">{c.bank ?? ''}</div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {chips(pc.card_id).map(([g, r]) => (
                          <span key={g} className="inline-flex items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[12px] whitespace-nowrap text-muted-foreground">
                            <span aria-hidden>{groupIcon(g)}</span>{groupShort(g)} <span className="font-semibold text-primary">{rate(r)}</span>
                          </span>
                        ))}
                      </div>
                      {tag && tag.trim() && (
                        <span className="mt-1.5 inline-flex items-center rounded-full bg-[#EEF3FF] px-2 py-px text-[10px] font-medium text-[#0E3785]">{tag.trim()}</span>
                      )}
                    </div>
                    <div className="flex flex-col items-end justify-between gap-2 self-stretch py-0.5">
                      <div className="text-right">
                        <div className="font-display text-sm font-bold tabular-nums text-emerald">+{rw(pc.monthly_reward_aed)}/mo</div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">Fee {aed(pc.annual_fee_aed)}</div>
                      </div>
                      <button onClick={() => alert('Coming soon')}
                        className="rounded-full border border-[#0E3785] px-3 py-1 text-[11px] font-semibold text-[#0E3785] transition-colors hover:bg-[#EEF3FF]">
                        View &amp; Apply
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <button onClick={() => alert('Coming soon')}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald px-5 py-3.5 text-sm font-semibold text-primary shadow-soft transition hover:opacity-90 sm:col-span-3">
              Apply for selected cards →
            </button>
            <button onClick={downloadPdf} disabled={pdfLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-primary transition hover:bg-surface-2 disabled:opacity-50">
              {pdfLoading ? '⏳ Generating…' : '⬇ Download PDF report'}
            </button>
            <button onClick={() => alert('Functionality coming soon')}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-primary transition hover:bg-surface-2">
              ✉ Email me this plan
            </button>
            <button onClick={onClose}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-semibold text-muted-foreground transition hover:bg-surface-2">
              ← Back to wallet
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
