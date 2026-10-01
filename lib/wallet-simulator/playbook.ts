// lib/wallet-simulator/playbook.ts — turns the backend's allocation into "which card do I use?" rows.
// Pure presentation: every amount and reward comes straight from the API (only summed per group for
// display); no reward is calculated here.

import type { AllocationLine, SpendGroup, Wallet } from './api'

/** Spend placed on a card mainly to reach that card's monthly minimum (it earns a low rate here, but
 *  reaching the minimum unlocks the card's higher rate elsewhere). Derived only from API fields. */
export type ThresholdNote = { minSpend: number; unlockRate: number; unlockGroup: string }

export type PlaybookEntry = {
  cardId: string
  amount: number        // monthly spend on this card for the group
  monthlyReward: number // backend reward for that spend
  rate: number          // headline rate of the rule earning it
  limitReached: boolean // part of this spend is past the rule's bonus limit
  threshold?: ThresholdNote
}

export type PlaybookRow = {
  group: string
  monthlySpend: number
  monthlyReward: number
  /**
   * single   — the whole group goes to one card.
   * sequence — a cap-style split the backend output itself supports: use `entries[0]` for the
   *            first `entries[0].amount` a month, then `entries[1]` (see `isCapSequence`).
   * split    — the backend splits the spend across cards; show the amounts, no implied order.
   */
  kind: 'single' | 'sequence' | 'split'
  entries: PlaybookEntry[]
}

const EPS = 1e-9
const groupOf = (a: AllocationLine) => a.group ?? 'miscellaneous'

/**
 * A two-card split is shown as a sequence only when the API output supports it:
 *   - the first card earns a strictly higher rate on this spend than the second,
 *   - its whole share earns that bonus rate (nothing past its limit on this line), and
 *   - the backend reports a reward limit reached on that card (caps_hit / card_cap_hit).
 * Otherwise the split is shown as amounts only — we never invent an order.
 */
function isCapSequence(wallet: Wallet, group: string, first: string, second: string): boolean {
  const rows = wallet.allocation.filter(a => groupOf(a) === group)
  const a = rows.filter(r => r.card_id === first)
  const b = rows.filter(r => r.card_id === second)
  if (a.length !== 1 || b.length !== 1) return false
  const card = wallet.per_card.find(c => c.card_id === first)
  const limitReached = !!card && (card.caps_hit.length > 0 || card.card_cap_hit)
  return a[0].rate > b[0].rate + EPS && a[0].post_cap_spend_aed <= EPS && limitReached
}

/** The card's best-rate spend, when this spend sits on the card at a lower rate and the card's
 *  current rates depend on a monthly minimum (band_min_spend_aed > 0). */
function thresholdNote(wallet: Wallet, cardId: string, group: string, rate: number): ThresholdNote | undefined {
  const card = wallet.per_card.find(c => c.card_id === cardId)
  if (!card || card.band_min_spend_aed <= 0) return undefined
  const best = wallet.allocation
    .filter(a => a.card_id === cardId && groupOf(a) !== group)
    .sort((x, y) => y.rate - x.rate)[0]
  if (!best || best.rate <= rate + EPS) return undefined
  return { minSpend: card.band_min_spend_aed, unlockRate: best.rate, unlockGroup: groupOf(best) }
}

export function buildPlaybook(wallet: Wallet | null, groups: SpendGroup[]): PlaybookRow[] {
  if (!wallet || wallet.cards.length === 0) return []
  const rows: PlaybookRow[] = []
  for (const g of groups) {
    const perCard = new Map<string, AllocationLine[]>()
    for (const a of wallet.allocation) {
      if (groupOf(a) !== g.group) continue
      perCard.set(a.card_id, [...(perCard.get(a.card_id) ?? []), a])
    }
    if (perCard.size === 0) continue
    const entries: PlaybookEntry[] = [...perCard.entries()].map(([cardId, lines]) => {
      const amount = lines.reduce((s, l) => s + l.amount_aed, 0)
      const monthlyReward = lines.reduce((s, l) => s + l.monthly_reward_aed, 0)
      const rate = Math.max(...lines.map(l => l.rate))
      return {
        cardId, amount, monthlyReward, rate,
        limitReached: lines.some(l => l.post_cap_spend_aed > 0.005),
        threshold: thresholdNote(wallet, cardId, g.group, rate),
      }
    }).sort((x, y) => y.monthlyReward - x.monthlyReward || y.amount - x.amount || x.cardId.localeCompare(y.cardId))
    let kind: PlaybookRow['kind'] = entries.length === 1 ? 'single' : 'split'
    if (entries.length === 2) {
      // the sequence starts with the higher-rate card, not necessarily the larger share
      for (const [f, s] of [[0, 1], [1, 0]] as const) {
        if (isCapSequence(wallet, g.group, entries[f].cardId, entries[s].cardId)) {
          kind = 'sequence'
          if (f === 1) entries.reverse()
          break
        }
      }
    }
    rows.push({
      group: g.group,
      monthlySpend: g.monthly_spend_aed,
      monthlyReward: entries.reduce((s, e) => s + e.monthlyReward, 0),
      kind,
      entries,
    })
  }
  // most rewarding categories first (founder, 2026-09-30)
  return rows.sort((x, y) => y.monthlyReward - x.monthlyReward || y.monthlySpend - x.monthlySpend)
}

/** Spend groups a card handles in this wallet, most rewarding first (for "what each card is doing"). */
export function cardGroups(wallet: Wallet, cardId: string): string[] {
  const byGroup = new Map<string, number>()
  for (const a of wallet.allocation) {
    if (a.card_id !== cardId) continue
    const g = groupOf(a)
    byGroup.set(g, (byGroup.get(g) ?? 0) + a.monthly_reward_aed)
  }
  return [...byGroup.entries()].sort((x, y) => y[1] - x[1]).map(([g]) => g)
}

export function sameCards(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every(id => b.includes(id))
}

export function walletKey(ids: string[]): string {
  return [...ids].sort().join('|')
}
