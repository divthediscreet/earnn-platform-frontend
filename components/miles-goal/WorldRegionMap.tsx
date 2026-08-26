'use client'

import type { MilesRegion } from '@/lib/miles-goal/regions'
import styles from './WorldRegionMap.module.css'

export default function WorldRegionMap({ regions, onSelect }: { regions: MilesRegion[]; onSelect: (region: MilesRegion) => void }) {
  return (
    <div className={styles.shell} aria-label="Supported miles destinations">
      <svg className={styles.map} viewBox="0 0 1000 500" role="img" aria-labelledby="miles-map-title miles-map-description">
        <title id="miles-map-title">World map with supported flight regions</title>
        <desc id="miles-map-description">Choose one of seven highlighted destination regions. A complete keyboard-accessible list follows the map.</desc>
        <g className={styles.land} aria-hidden="true">
          <path d="M70 115 125 70l88 12 45 48-13 53-60 28-20 76-58-22-25-62Z" />
          <path d="m230 292 42 23 32 75-20 93-47-48-28-85Z" />
          <path d="m430 95 60-25 87 25 38 45-35 32-8 59-42 8-33-58-69-22Z" />
          <path d="m465 220 82-10 54 49-18 121-58 73-45-48-25-98Z" />
          <path d="m590 107 116-42 149 44 68 67-53 33-108-8-62 46-86-39Z" />
          <path d="m664 242 62-22 38 48-31 70-61-24Z" />
          <path d="m823 340 66 14 39 58-75 33-57-46Z" />
        </g>
        <path className={styles.flightPath} d="M585 235 C 490 140, 325 122, 205 170" aria-hidden="true" />
        <circle className={styles.home} cx="585" cy="235" r="9" aria-hidden="true" />
        <text className={styles.homeLabel} x="600" y="241" aria-hidden="true">UAE</text>
        {regions.map(region => {
          const x = region.mapX * 10
          const y = region.mapY * 5
          return (
            <g key={region.id} className={styles.region} onClick={() => onSelect(region)}
              onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(region)
                }
              }}
              role="button" tabIndex={0} aria-label={`Choose ${region.label}`}>
              <circle cx={x} cy={y} r="22" />
              <circle className={styles.pulse} cx={x} cy={y} r="10" />
              <text x={x} y={y + 38} textAnchor="middle">{region.shortLabel}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
