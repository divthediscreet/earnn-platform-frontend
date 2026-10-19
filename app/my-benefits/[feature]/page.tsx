import { notFound } from 'next/navigation'
import BenefitFeaturePage from '@/components/my-benefits/BenefitFeaturePage'
import { BENEFIT_FEATURES, getBenefitFeature } from '@/lib/my-benefits/features'

export const dynamicParams = false

export function generateStaticParams() {
  return BENEFIT_FEATURES.map(feature => ({ feature: feature.slug }))
}

export default async function MyBenefitsFeaturePage({ params }: { params: Promise<{ feature: string }> }) {
  const feature = getBenefitFeature((await params).feature)
  if (!feature) notFound()
  return <BenefitFeaturePage feature={feature} />
}
