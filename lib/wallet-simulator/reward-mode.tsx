'use client'

// The simulator's two views (cashback / miles) in one place: how a reward amount is written and what the
// words around it say. Components read it with useRewardMode() instead of formatting rewards themselves.

import { createContext, useContext, type ReactNode } from 'react'
import type { RewardMode } from './api'
import { aed, pct } from './groups'

export type RewardFormat = {
  mode: RewardMode
  isMiles: boolean
  /** A reward amount: "AED 1,200" in the cashback view, "1,200 miles" in the miles view. */
  rw: (n: number) => string
  /** The unit alone: "AED" or "miles". */
  unit: string
  /** A reward rate the backend gives per AED spent: "1.5%" (cashback) or "13.6 miles per AED 100" (miles). */
  rate: (r: number) => string
}

const fmtMiles = (n: number) => `${Math.round(n).toLocaleString('en-US')} miles`

export function formatFor(mode: RewardMode): RewardFormat {
  return mode === 'miles'
    ? { mode, isMiles: true, rw: fmtMiles, unit: 'miles', rate: r => `${parseFloat((r * 100).toFixed(1))} miles per AED 100` }
    : { mode: 'cashback', isMiles: false, rw: aed, unit: 'AED', rate: pct }
}

const CASHBACK = formatFor('cashback')
const Ctx = createContext<RewardFormat>(CASHBACK)

export function RewardModeProvider({ mode, children }: { mode: RewardMode | undefined; children: ReactNode }) {
  return <Ctx.Provider value={formatFor(mode === 'miles' ? 'miles' : 'cashback')}>{children}</Ctx.Provider>
}

export function useRewardMode(): RewardFormat {
  return useContext(Ctx)
}
