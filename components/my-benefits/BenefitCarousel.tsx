'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { BenefitFeature } from '@/lib/my-benefits/features'
import styles from './BenefitCarousel.module.css'

// The tile picture is /images/benefits/<momentId>.webp; if it is missing or fails to load, the coloured icon tile is shown instead.
function TileArt({ feature }: { feature: BenefitFeature }) {
  const [failed, setFailed] = useState(false)
  return <span className={`${styles.art} ${styles[feature.tone]}`}>
    {failed
      ? <i className={`ti ${feature.icon}`} aria-hidden="true" />
      // eslint-disable-next-line @next/next/no-img-element
      : <img className={styles.artImage} src={`/images/benefits/${feature.momentId}.webp`} alt="" loading="lazy" width={720} height={720} onError={() => setFailed(true)} />}
  </span>
}

// A heading with a horizontally scrolling row of tiles (about 4.5 visible) and prev/next arrows.
export default function BenefitCarousel({ category, features, wide = false }: { category: string; features: BenefitFeature[]; wide?: boolean }) {
  const track = useRef<HTMLUListElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const update = useCallback(() => {
    const el = track.current
    if (!el) return
    setCanPrev(el.scrollLeft > 4)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    update()
    const el = track.current
    if (!el) return
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [update, features.length])

  const scrollByPage = (direction: 1 | -1) => {
    const el = track.current
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: 'smooth' })
  }

  return <section className={`${styles.section} ${wide ? styles.wide : ''}`} aria-label={category}>
    <div className={styles.head}>
      <h2>{category}</h2>
      <div className={styles.arrows}>
        <button type="button" onClick={() => scrollByPage(-1)} disabled={!canPrev} aria-label={`Previous ${category} benefits`}><i className="ti ti-arrow-left" aria-hidden="true" /></button>
        <button type="button" onClick={() => scrollByPage(1)} disabled={!canNext} aria-label={`More ${category} benefits`}><i className="ti ti-arrow-right" aria-hidden="true" /></button>
      </div>
    </div>
    <ul className={styles.track} ref={track} onScroll={update}>
      {features.map(feature => <li key={feature.slug} className={styles.item}>
        <Link href={`/my-benefits/${feature.slug}`} className={styles.tile}>
          <TileArt feature={feature} />
          <span className={styles.name}>{feature.name}</span>
          <span className={styles.hint}>{feature.hint}</span>
        </Link>
      </li>)}
    </ul>
  </section>
}
