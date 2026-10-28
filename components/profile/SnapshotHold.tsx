'use client'

// The holding screen for pages that start from the saved profile (Trip Planner, Big Spend Planner):
// the same full-page spending snapshot as the card lists, shown for a few seconds, then the page continues.
import { useEffect } from 'react'
import SpendHoldingScreen from '@/components/profile/SpendHoldingScreen'
import type { SavedProfileView } from '@/lib/profile/useSavedProfile'

export default function SnapshotHold({ profile, title, subtitle, onDone, ms = 3000 }: {
  profile: SavedProfileView
  title: string
  subtitle: string
  onDone: () => void
  ms?: number
}) {
  useEffect(() => {
    const timer = setTimeout(onDone, ms)
    return () => clearTimeout(timer)
  }, [onDone, ms])
  return <SpendHoldingScreen amounts={profile.spend} salary={profile.salary} ownedCount={profile.ownedCardIds.length} title={title} subtitle={subtitle} />
}
