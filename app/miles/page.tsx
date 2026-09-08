'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import WorldRegionMap from '@/components/miles-goal/WorldRegionMap'
import MilesDisclosure from '@/components/miles-goal/MilesDisclosure'
import type { MilesRegion, MilesRegionId } from '@/lib/miles-goal/regions'
import styles from './MilesLanding.module.css'
import love from './results/LoveableMilesResult.module.css'
import heading from './results/HeroHeadingOverride.module.css'
import heroLift from './results/HeroLift.module.css'

export default function MilesLandingPage() {
  const router = useRouter()
  const [previewRegionId, setPreviewRegionId] = useState<MilesRegionId | null>(null)
  // Strategy selection is purely UI. Generic flight/card calculations begin only
  // when the user asks to see what their selected trip takes.
  const selectRegion = (region: MilesRegion) => router.push(`/miles/results?region=${encodeURIComponent(region.id)}&view=current`)

  return <div className={styles.page}>
    <section className={`${love.hero} ${heroLift.hero} ${styles.landingHero}`}>
      <div className={`${love.heroCopy} ${heading.heroCopy} ${styles.landingHeroCopy}`}>
        <span className={love.kicker}>MILES GOAL PLANNER</span>
        <h1 className={`${heading.heading} ${heading.walletHeading} ${styles.landingHeading}`}><span className={styles.heroLine}>Your next Business Class flight</span><span className={styles.heroLine}>may already be in your</span><em className={`${heading.walletWord} ${styles.heroLine}`}>wallet.</em></h1>
        <p className={love.heroIntroduction}>Earnn shows you how to turn your everyday spending into your next flight.</p>
      </div>
    </section>
    <section id="destinations" className={styles.destinations}>
      <div className={styles.sectionHeading}>
        <h2>Choose where do you want to fly?</h2>
      </div>
      <div className={styles.mapWrap}>
        <WorldRegionMap selectedRegionId={null} previewRegionId={previewRegionId} onPreview={setPreviewRegionId} onSelect={selectRegion} />
      </div>
    </section>
    <div className={styles.disclosureWrap}><MilesDisclosure /></div>
  </div>
}
