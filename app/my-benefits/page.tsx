import BenefitCarousel from '@/components/my-benefits/BenefitCarousel'
import MyBenefitsHero from '@/components/my-benefits/MyBenefitsHero'
import { benefitSections } from '@/lib/my-benefits/features'
import styles from './page.module.css'

// One row per category in BENEFIT_FEATURES (lib/my-benefits/features.ts); each tile opens /my-benefits/<slug>.
export default function MyBenefitsPage() {
  return <div className={styles.page}>
    <MyBenefitsHero />
    {benefitSections().map((section, index) => <div key={section.category}>
      {index > 0 && <hr className={styles.divider} />}
      <BenefitCarousel category={section.category} features={section.features} />
    </div>)}
  </div>
}
