'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import WorldRegionMap from '@/components/miles-goal/WorldRegionMap'
import MilesDisclosure from '@/components/miles-goal/MilesDisclosure'
import type { MilesRegion, MilesRegionId } from '@/lib/miles-goal/regions'
import styles from './MilesLanding.module.css'

export default function MilesLandingPage() {
  const router = useRouter()
  const [previewRegionId, setPreviewRegionId] = useState<MilesRegionId | null>(null)
  const selectRegion = (region: MilesRegion) => router.push(`/miles/results?region=${encodeURIComponent(region.id)}`)

  return <div className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <div className={styles.eyebrow}><span /> MILES GOAL PLANNER</div>
        <h1>Where could your spending <em>take you?</em></h1>
        <p>Your everyday spending could be taking you closer to your next flight.</p>
        <a href="#destinations" className="btn-primary">Pick a part of the world <i className="ti ti-arrow-down" /></a>
      </div>
      <div className={styles.heroVisual} aria-hidden="true">
        <div className={styles.ticket}>
          <span className={styles.ticketTop}>YOUR NEXT FLIGHT</span>
          <div><b>UAE</b><i className="ti ti-plane" /><b>?</b></div>
          <small>Powered by your everyday spending</small>
        </div>
        <span className={styles.orbit}><i className="ti ti-plane" /></span>
      </div>
    </section>

    <section className={styles.steps} aria-labelledby="how-title">
        <div><span>01</span><i className="ti ti-world-pin" /><h2 id="how-title">Pick a region</h2><p>Select any country and we will match it to one of Earnn&apos;s 14 travel regions.</p></div>
      <div><span>02</span><i className="ti ti-credit-card" /><h2>See your fastest cards</h2><p>Compare Economy, Business and cash-plus-upgrade strategies without a made-up score.</p></div>
      <div><span>03</span><i className="ti ti-adjustments-horizontal" /><h2>Personalize your plan</h2><p>Add salary, category spending and existing miles to calculate your own timeline.</p></div>
    </section>

    <section id="destinations" className={styles.destinations}>
      <div className={styles.sectionHeading}>
        <div><span className={styles.kicker}>START WITH THE DREAM</span><h2>Pick a part of the world to start.</h2></div>
        <p>Hover over or select any country. Its full Earnn travel region will highlight.</p>
      </div>
      <WorldRegionMap selectedRegionId={null} previewRegionId={previewRegionId} onPreview={setPreviewRegionId} onSelect={selectRegion} />
    </section>
    <MilesDisclosure />
  </div>
}
