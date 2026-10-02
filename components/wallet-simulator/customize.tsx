'use client'

import { useEffect, useMemo } from 'react'
import type { CardScore, RecommendResponse, SpendGroup, Wallet } from '@/lib/wallet-simulator/api'
import { MAX_WALLET, aed, groupShort } from '@/lib/wallet-simulator/groups'
import { buildPlaybook, cardGroups } from '@/lib/wallet-simulator/playbook'
import { BuildYourWallet, type CustomScore, type ScoredCard } from '@/components/wallet-builder/BuildYourWallet'
import { CardArt, RollingAed, type CardInfo } from './card-art'

type CardLookup = (id: string) => CardInfo

function Sparkle({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" stroke="#F5C443" strokeWidth={3.5} strokeLinecap="round" aria-hidden>
      <path d="M8 4v10" /><path d="M24 6l-6 9" /><path d="M34 18l-10 3" />
    </svg>
  )
}

const FEATURES: { label: string; tint: string; icon: React.ReactNode }[] = [
  {
    label: 'Swap cards easily', tint: 'bg-[#E4EEFF] text-[#2F6FE4]',
    icon: <><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10" /><path d="M12 9.5a1.5 1.5 0 0 1 3 0V11" /><path d="M15 10.5a1.5 1.5 0 0 1 3 0V14c0 3.5-2 6-5.5 6-2.5 0-3.8-1-5-2.8L4.7 13.6a1.5 1.5 0 0 1 2.4-1.8L9 14" /></>,
  },
  {
    label: 'See rewards update instantly', tint: 'bg-[#DDF6EA] text-[#16A36A]',
    icon: <><path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.5 4.5L20 16" /><path d="M20 20v-4h-4" /></>,
  },
  {
    label: 'Build a wallet that fits you', tint: 'bg-[#EAE6FF] text-[#6D4FE0]',
    icon: <><path d="M4 7h10" /><path d="M18 7h2" /><circle cx="16" cy="7" r="2" /><path d="M4 17h2" /><path d="M10 17h10" /><circle cx="8" cy="17" r="2" /><path d="M4 12h5" /><path d="M13 12h7" /><circle cx="11" cy="12" r="2" /></>,
  },
]

/** "Your Wallet. Your Choice." — the live wallet, with a button that opens the full customiser. */
export function WalletCustomizeBanner({ ids, wallet, bestBySize, card, status, onOpen }: {
  ids: string[]
  wallet: Wallet | null
  bestBySize: RecommendResponse['best_by_size']
  card: CardLookup
  status: 'ready' | 'updating' | 'error'
  onOpen: () => void
}) {
  const monthly = wallet?.monthly_reward_aed ?? 0
  const smaller = ids.length > 1 ? bestBySize[String(ids.length - 1)] : undefined
  const delta = smaller && wallet ? monthly - smaller.annual_reward_aed / 12 : null
  const subtitle = (id: string) => {
    if (!wallet) return ''
    const groups = cardGroups(wallet, id).slice(0, 2).map(g => groupShort(g))
    return groups.join(' & ')
  }

  return (
    <section id="discover" className="relative scroll-mt-20 overflow-hidden border-t border-ws-border bg-gradient-to-br from-white via-[#F8FAFF] to-[#EEF3FF]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-14 sm:px-8 sm:py-16 lg:grid-cols-[0.85fr_1.25fr] lg:gap-6">
        <div className="relative z-10 min-w-0">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#E4ECFF] px-3.5 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-ws-primary uppercase">
            <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
              <path d="M4 7h10M18 7h2M4 17h2M10 17h10M4 12h5M13 12h7" /><circle cx="16" cy="7" r="1.8" /><circle cx="8" cy="17" r="1.8" /><circle cx="11" cy="12" r="1.8" />
            </svg>
            Customise your wallet
          </span>
          <h2 className="mt-6 text-4xl leading-[1.05] font-bold tracking-tight text-ws-fg sm:text-[52px]">
            Your Wallet.{' '}
            <span className="relative inline-block whitespace-nowrap text-[#1747D6]">
              Your Choice.
              <svg aria-hidden viewBox="0 0 300 14" preserveAspectRatio="none" className="absolute inset-x-0 -bottom-2 h-[10px] w-full" fill="none">
                <path d="M3 9 C 60 3, 180 3, 297 7" stroke="#F7C948" strokeWidth={4.5} strokeLinecap="round" />
              </svg>
            </span>
          </h2>
          <p className="mt-6 max-w-[40ch] text-[17px] leading-relaxed text-pretty text-ws-muted">
            Don&apos;t like one of our picks? Tap a card in your wallet to drop it, add another below, and your
            monthly rewards update as you go.
          </p>
          <button type="button" onClick={onOpen}
            className="group mt-8 inline-flex min-h-14 items-center gap-3 rounded-full bg-[#F7C948] px-7 py-3.5 text-[17px] font-semibold text-[#0D1828] shadow-[0_14px_30px_-12px_rgba(247,201,72,0.9)] transition-transform hover:-translate-y-0.5">
            <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="2.5" y="6" width="15" height="11" rx="2" fill="currentColor" fillOpacity={0.9} /><path d="M6.5 3.5h13a2 2 0 0 1 2 2V14" /><path d="M2.5 10h15" stroke="#F7C948" />
            </svg>
            Open wallet customization
            <span aria-hidden className="transition-transform group-hover:translate-x-0.5">→</span>
          </button>
          <ul className="mt-10 grid gap-4 sm:grid-cols-3">
            {FEATURES.map(f => (
              <li key={f.label} className="flex items-center gap-3">
                <span className={`grid size-12 shrink-0 place-items-center rounded-full ${f.tint}`}>
                  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>{f.icon}</svg>
                </span>
                <span className="max-w-[13ch] text-[14px] leading-snug text-ws-muted">{f.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* live wallet illustration */}
        <div className="relative mx-auto w-full min-w-0 max-w-[640px] lg:max-w-none">
          <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 size-[440px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E6EEFF]/70 blur-sm" />


          <div className="relative z-10 mt-14 lg:mt-16 lg:ml-[6%]">
            <Sparkle className="absolute -top-5 -left-5 z-20 hidden size-10 -scale-x-100 lg:block" />
            {/* Estimated monthly rewards */}
            <div className="absolute -top-14 right-0 z-20 w-[250px] rounded-2xl bg-white p-4 shadow-ws-lift ring-1 ring-ws-border/60 sm:w-[270px]">
              <p className="flex items-center gap-2 text-[13px] text-ws-fg">
                <svg viewBox="0 0 24 24" className="size-4 text-[#1747D6]" fill="currentColor" aria-hidden><rect x="4" y="12" width="4" height="8" rx="1" /><rect x="10" y="4" width="4" height="16" rx="1" /><rect x="16" y="9" width="4" height="11" rx="1" /></svg>
                Estimated monthly rewards
              </p>
              <p className={`mt-1 text-center text-[30px] leading-tight font-bold tracking-tight text-ws-fg transition-opacity ${status === 'updating' ? 'opacity-50' : ''}`}>
                AED <RollingAed value={monthly} />
              </p>
              {delta !== null && Math.abs(delta) >= 1 && (
                <p className={`mx-auto mt-2 w-fit rounded-full px-3 py-1 text-[12.5px] font-semibold ${delta > 0 ? 'bg-[#E3F6EC] text-ws-gain' : 'bg-[#FDECEA] text-[#C0392B]'}`}>
                  {delta > 0 ? '↑ +' : '↓ −'}{aed(Math.abs(delta))} vs {ids.length - 1} card{ids.length - 1 === 1 ? '' : 's'}
                </p>
              )}
            </div>

            <div className={`rounded-3xl bg-white p-5 shadow-ws-lift ring-1 ring-ws-border/50 transition-opacity sm:mr-[120px] ${status === 'updating' ? 'opacity-80' : ''}`}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-[22px] font-bold text-ws-fg">Your Wallet</h3>
                <span className="rounded-full bg-[#E4ECFF] px-3 py-1 text-[13px] font-semibold text-ws-primary">
                  {ids.length} card{ids.length === 1 ? '' : 's'}
                </span>
              </div>
              <ul className="mt-4 space-y-3">
                {ids.map(id => {
                  const c = card(id)
                  return (
                    <li key={id} onClick={onOpen}
                      className="flex cursor-pointer items-center gap-3 rounded-2xl bg-white p-2.5 shadow-[0_4px_16px_-8px_rgba(14,55,133,0.25)] ring-1 ring-ws-border/40 transition-shadow hover:shadow-ws-lift">
                      <svg viewBox="0 0 10 16" className="size-4 shrink-0 text-ws-muted/60" fill="currentColor" aria-hidden>
                        {[2, 8, 14].map(y => [2, 8].map(x => <circle key={`${x}${y}`} cx={x} cy={y} r={1.4} />))}
                      </svg>
                      <div className="w-[88px] shrink-0 sm:w-[104px]"><CardArt card={c} size="sm" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[15px] leading-snug font-semibold text-ws-fg">{c.name}</p>
                        <p className="truncate text-[13px] text-ws-muted">{subtitle(id) || c.bank || '\u00a0'}</p>
                      </div>
                      <button type="button" onClick={e => { e.stopPropagation(); onOpen() }} aria-label={`Edit ${c.name} in wallet customization`} title="Customise your wallet"
                        className="grid size-8 shrink-0 place-items-center rounded-full bg-ws-secondary text-[15px] font-bold text-ws-fg transition-colors hover:bg-ws-border">
                        ✕
                      </button>
                    </li>
                  )
                })}
                {ids.length === 0 && (
                  <li className="rounded-2xl border border-dashed border-ws-border p-6 text-center text-[14px] text-ws-muted">Your wallet is empty — add a card.</li>
                )}
              </ul>
              {/* small screens: add-a-card sits inside the panel */}
              <button type="button" onClick={onOpen}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#9DB7F0] py-3 text-[14px] font-semibold text-[#1747D6] sm:hidden">
                <span className="grid size-6 place-items-center rounded-full bg-[#2F6FE4] text-white">+</span> Add a card
              </button>
            </div>

            <button type="button" onClick={onOpen} aria-label="Add a card"
              className="absolute right-0 bottom-3 z-20 hidden h-[130px] w-[135px] rotate-[8deg] flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-[#9DB7F0] bg-white/40 text-[14px] font-semibold text-[#1747D6] backdrop-blur-sm transition-transform hover:rotate-[5deg] sm:flex">
              <span className="grid size-10 place-items-center rounded-full bg-[#2F6FE4] text-[22px] leading-none text-white shadow-ws-lift">+</span>
              Add a card
            </button>
            <svg aria-hidden viewBox="0 0 80 120" className="pointer-events-none absolute top-[34%] right-[70px] hidden h-[110px] w-[70px] sm:block" fill="none" stroke="#3B6FD8" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 112 C 58 96, 66 50, 36 14" /><path d="M24 24 L 36 12 L 46 28" />
            </svg>
          </div>
          <Sparkle className="absolute -right-2 -bottom-4 hidden size-10 sm:block" />
        </div>
      </div>
    </section>
  )
}

/** Simulator per-card scores → the card list the Build-Your-Wallet UI expects (best card first). */
function toScoredCards(scores: CardScore[]): ScoredCard[] {
  return scores.map((c, i) => ({
    earnn_card_id: c.card_id, card_name: c.card_name, bank_name: c.bank_name ?? undefined,
    earnn_score: 0, card_ranking: i + 1,
    expected_annual_return_aed: c.annual_reward_aed, true_annual_fee_aed: c.annual_fee_aed,
    net_annual_value_aed: c.annual_reward_aed - c.annual_fee_aed,
    free_for_life: c.annual_fee_aed === 0, is_islamic: false, network: '',
    card_family: c.card_family, card_summary_tag: c.summary_tag ?? undefined,
    category_monthly_rewards: Object.fromEntries(Object.entries(c.groups).map(([g, v]) => [g, v.monthly_reward_aed])),
    category_effective_rates: Object.fromEntries(Object.entries(c.groups).map(([g, v]) => [g, v.rate])),
  }))
}

/** The evaluated simulator wallet → the routing shape the Spend Split panels read. Amounts and rewards
 *  come straight from the backend; fees are each card's year-2 annual fee. */
function toCustomScore(wallet: Wallet, groups: SpendGroup[], feeOf: (id: string) => number, name: (id: string) => string): CustomScore {
  const category_routing: CustomScore['category_routing'] = {}
  for (const row of buildPlaybook(wallet, groups)) {
    category_routing[row.group] = row.entries.map(e => ({
      card_id: e.cardId, card_name: name(e.cardId), rate: e.rate,
      annual_aed: e.monthlyReward * 12, monthly_spend_chunk: e.amount,
    }))
  }
  const gross = wallet.annual_reward_aed
  const fees = wallet.cards.reduce((sum, id) => sum + feeOf(id), 0)
  const annualSpend = groups.reduce((sum, g) => sum + g.monthly_spend_aed, 0) * 12
  return { gross_annual_aed: gross, total_fee_aed: fees, net_annual_value_aed: gross - fees, effective_rate: annualSpend > 0 ? gross / annualSpend : 0, category_routing }
}

/** The Analyse results page's "Build Your Wallet" step, in a popup, run entirely on the simulator's numbers. */
export function WalletCustomizeDialog({ cardScores, groups, ids, wallet, status, onChange, onRetry, onClose }: {
  cardScores: CardScore[]
  groups: SpendGroup[]
  ids: string[]
  wallet: Wallet | null            // the simulator's evaluation of `ids` (previous one while updating)
  status: 'ready' | 'updating' | 'error'
  onChange: (ids: string[]) => void
  onRetry: () => void
  onClose: () => void
}) {
  const scoredCards = useMemo(() => toScoredCards(cardScores), [cardScores])
  const walletData = useMemo(() => ({
    user_spend: Object.fromEntries(groups.map(g => [g.group, g.monthly_spend_aed])),
    total_monthly: groups.reduce((sum, g) => sum + g.monthly_spend_aed, 0),
    wallets: [],
  }), [groups])
  const categories = useMemo(() => groups.map(g => g.group), [groups])

  const score = useMemo(() => {
    if (!wallet || wallet.cards.length === 0) return null
    const byId = new Map(cardScores.map(c => [c.card_id, c]))
    return toCustomScore(wallet, groups, id => byId.get(id)?.annual_fee_aed ?? 0, id => byId.get(id)?.card_name ?? id)
  }, [wallet, groups, cardScores])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[1060] flex items-start justify-center overflow-y-auto bg-black/45 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Build your wallet"
        className="relative my-auto w-full max-w-6xl rounded-3xl bg-surface-2 p-4 shadow-elevated sm:p-7" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={onClose} aria-label="Close"
          className="absolute top-3 right-3 z-10 grid size-9 place-items-center rounded-full bg-muted text-sm text-foreground hover:bg-muted/70">✕</button>
        <div className="pt-8 sm:pt-0">
          {scoredCards.length > 0 ? (
            <BuildYourWallet scoredCards={scoredCards} walletData={walletData} wallet={ids} setWallet={onChange}
              onNext={onClose} nextLabel="Done" embedded monthly maxCards={MAX_WALLET} categories={categories}
              scoreSource={{ score, loading: status === 'updating', error: status === 'error', refresh: onRetry }} />
          ) : (
            <p className="py-24 text-center text-sm text-muted-foreground">
              These results were saved before wallet customisation existed. Go back, press &ldquo;Edit my spending&rdquo; and rebuild your wallet.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
