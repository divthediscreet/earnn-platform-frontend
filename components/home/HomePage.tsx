import HomeHero from './HomeHero'
import ToolDiscoveryTray from './ToolDiscoveryTray'
import PersonalisationSection from './PersonalisationSection'
import HomeTrustStrip from './HomeTrustStrip'
import HomeFinalCTA from './HomeFinalCTA'
import s from './Home.module.css'

// Four sections (plus a slim privacy strip before the last one), then the site footer: introduce, explore the six tools, why it is personal, start.
export default function HomePage() {
  return (
    <div className={s.page}>
      <HomeHero />
      <PersonalisationSection />
      <ToolDiscoveryTray />
      <HomeTrustStrip />
      <HomeFinalCTA />
    </div>
  )
}
