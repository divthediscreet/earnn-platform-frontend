import HomeHero from './HomeHero'
import ToolSlider from './ToolSlider'
import PersonalisationSection from './PersonalisationSection'
import MatchTapSpotlight from './MatchTapSpotlight'
import HomeTrustStrip from './HomeTrustStrip'
import HomeFinalCTA from './HomeFinalCTA'
import s from './Home.module.css'

// Opens with the six tools as a slider, then: introduce, why it is personal, the Match & Tap checkout story, a slim privacy strip, start; then the site footer.
export default function HomePage() {
  return (
    <div className={s.page}>
      <ToolSlider />
      <HomeHero />
      <PersonalisationSection />
      <MatchTapSpotlight />
      <HomeTrustStrip />
      <HomeFinalCTA />
    </div>
  )
}
