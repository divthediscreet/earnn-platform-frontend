'use client'

import { useRouter } from 'next/navigation'
import WorldRegionMap from '@/components/miles-goal/WorldRegionMap'
import RegionCardList from '@/components/miles-goal/RegionCardList'
import MilesDisclosure from '@/components/miles-goal/MilesDisclosure'
import { COMING_SOON_REGIONS, MILES_REGIONS, type MilesRegion } from '@/lib/miles-goal/regions'
import styles from './MilesLanding.module.css'

export default function MilesLandingPage() {
  const router = useRouter()
  const selectRegion = (region: MilesRegion) => router.push(`/miles/results?region=${encodeURIComponent(region.id)}`)

  return <div className={styles.page}>
    <section className={styles.hero}>
      <div className={styles.heroCopy}>
        <div className={styles.eyebrow}><span /> MILES GOAL PLANNER</div>
        <h1>Where could your spending <em>take you?</em></h1>
        <p>Turn everyday spending into a clear flight goal. See how UAE miles cards, welcome rewards and smarter fee routes can bring the journey closer.</p>
        <a href="#destinations" className="btn-primary">Choose a destination <i className="ti ti-arrow-down" /></a>
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
      <div><span>01</span><i className="ti ti-world-pin" /><h2 id="how-title">Pick a destination</h2><p>Choose one of the routes currently supported by our airline redemption data.</p></div>
      <div><span>02</span><i className="ti ti-credit-card" /><h2>See your fastest cards</h2><p>Compare Economy, Business and cash-plus-upgrade strategies without a made-up score.</p></div>
      <div><span>03</span><i className="ti ti-adjustments-horizontal" /><h2>Personalize your plan</h2><p>Add salary, category spending and existing miles to calculate your own timeline.</p></div>
    </section>

    <section id="destinations" className={styles.destinations}>
      <div className={styles.sectionHeading}>
        <div><span className={styles.kicker}>START WITH THE DREAM</span><h2>Where do you want to go?</h2></div>
        <p>Seven representative regions are available today for both Emirates and Etihad redemptions.</p>
      </div>
      <WorldRegionMap regions={MILES_REGIONS} onSelect={selectRegion} />
      <RegionCardList regions={MILES_REGIONS} onSelect={selectRegion} />
    </section>

    <section className={styles.comingSoon}>
      <div><span>More of the world is coming</span><p>We will add regions only when matching airline redemption data is ready.</p></div>
      <ul>{COMING_SOON_REGIONS.map(region => <li key={region}>{region}</li>)}</ul>
    </section>
    <MilesDisclosure />
  </div>
}
