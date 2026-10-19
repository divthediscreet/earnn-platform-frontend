'use client'

import { useState } from 'react'
import type { BenefitFeature } from '@/lib/my-benefits/features'
import styles from './BenefitImage.module.css'

// The benefit's picture (/images/benefits/<momentId>.webp), filling whatever box its parent gives it.
// If the file is missing or fails to load, the coloured icon tile is shown instead.
export default function BenefitImage({ feature, className = '' }: { feature: BenefitFeature; className?: string }) {
  const [failed, setFailed] = useState(false)
  return <span className={`${styles.frame} ${styles[feature.tone]} ${className}`} aria-hidden="true">
    {failed
      ? <i className={`ti ${feature.icon}`} />
      // eslint-disable-next-line @next/next/no-img-element
      : <img src={`/images/benefits/${feature.momentId}.webp`} alt="" loading="eager" width={720} height={720} onError={() => setFailed(true)} />}
  </span>
}
