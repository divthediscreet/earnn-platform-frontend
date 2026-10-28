'use client'

// One reusable view of what this browser has saved: monthly spend, salary and owned cards.
// Loading and validation live here; showing the "using your saved details" snapshot is up to each page.
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CatalogueCard } from '@/lib/life-moments/api'
import { PROFILE_EVENT, ensureProfileLoaded, patchProfile, readProfile, type SavedProfile } from './storage'

export interface SavedProfileView {
  /** False until the browser's saved details have been read (they only exist after hydration). */
  ready: boolean
  /** Valid per-category monthly AED. Null when there is no category split: a lone monthly total is never reverse-split. */
  spend: Record<string, number> | null
  totalMonthly: number
  /** Digits only, e.g. "15000"; empty when no valid salary is saved. */
  salary: string
  ownedCardIds: string[]
  ownedCards: CatalogueCard[]
  /** Scheduled big payments, as saved by the Big Spend Planner. */
  paymentCount: number
  /** When the details were last saved, or null. */
  savedAt: number | null
  saveOwnedCards: (cards: CatalogueCard[]) => void
}

function validSpend(raw: SavedProfile['spend']): Record<string, number> | null {
  const entries = Object.entries(raw ?? {})
    .map(([key, value]) => [key, Number(value)] as const)
    .filter(([key, value]) => key && Number.isFinite(value) && value > 0)
  return entries.length ? Object.fromEntries(entries) : null
}

function validSalary(raw: string | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '').slice(0, 7)
  return Number(digits) > 0 ? digits : ''
}

export function useSavedProfile(): SavedProfileView {
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<SavedProfile | null>(null)

  useEffect(() => {
    let alive = true
    const refresh = () => { if (alive) setProfile(readProfile()) }
    ensureProfileLoaded().then(() => { refresh(); if (alive) setReady(true) })
    window.addEventListener(PROFILE_EVENT, refresh)
    window.addEventListener('storage', refresh) // another tab saved
    return () => {
      alive = false
      window.removeEventListener(PROFILE_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  const saveOwnedCards = useCallback((cards: CatalogueCard[]) => {
    patchProfile({ owned_cards: cards })
  }, [])

  return useMemo<SavedProfileView>(() => {
    const spend = validSpend(profile?.spend)
    const ownedCards = (profile?.owned_cards ?? []).filter(card => card && typeof card.earnn_card_id === 'string' && card.earnn_card_id)
    return {
      ready,
      spend,
      totalMonthly: spend ? Object.values(spend).reduce((a, b) => a + b, 0) : 0,
      salary: validSalary(profile?.salary),
      ownedCardIds: ownedCards.map(card => card.earnn_card_id),
      ownedCards,
      paymentCount: profile?.payments?.length ?? 0,
      savedAt: profile?.savedAt ?? null,
      saveOwnedCards,
    }
  }, [ready, profile, saveOwnedCards])
}
