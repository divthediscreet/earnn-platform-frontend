'use client'

import { MILES_REGIONS, MILES_REGION_BY_ID, type MilesRegion, type MilesRegionId } from '@/lib/miles-goal/regions'
import { NEUTRAL_SVG_PATHS, REGION_SVG_PATHS, WORLD_MAP_VIEWBOX } from './worldRegionPaths'
import styles from './WorldRegionMap.module.css'

type Props = {
  selectedRegionId: MilesRegionId | null
  previewRegionId: MilesRegionId | null
  onPreview: (regionId: MilesRegionId | null) => void
  onSelect: (region: MilesRegion) => void
}

export default function WorldRegionMap({ selectedRegionId, previewRegionId, onPreview, onSelect }: Props) {
  const preview = (regionId: MilesRegionId | null) => {
    onPreview(regionId)
  }
  const activeRegionId = previewRegionId || selectedRegionId
  const activeRegion = activeRegionId ? MILES_REGION_BY_ID[activeRegionId] : null

  return (
    <div
      className={styles.shell}
      onMouseLeave={() => preview(selectedRegionId)}
    >
      <svg className={styles.map} viewBox={WORLD_MAP_VIEWBOX} role="group" aria-labelledby="miles-map-title miles-map-description">
        <title id="miles-map-title">Interactive Earnn travel-region map</title>
        <desc id="miles-map-description">Select one of fourteen Earnn travel regions. Each region is a single keyboard-accessible control.</desc>
        <rect className={styles.ocean} width="1100" height="560" rx="22" aria-hidden="true" />
        <g aria-hidden="true">
          {NEUTRAL_SVG_PATHS.map((path, index) => <path key={index} d={path} className={`${styles.geography} ${styles.inactive}`} />)}
        </g>
        {MILES_REGIONS.map((region) => {
          const isActive = activeRegionId === region.id
          return (
            <g
              key={region.id}
              className={`${styles.regionGroup} ${isActive ? styles.active : ''}`}
              data-region-id={region.id}
              role="button"
              tabIndex={0}
              aria-label={`Select ${region.label}`}
              aria-pressed={selectedRegionId === region.id}
              onMouseEnter={() => preview(region.id)}
              onFocus={() => preview(region.id)}
              onBlur={() => preview(selectedRegionId)}
              onClick={() => onSelect(region)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelect(region)
                }
              }}
            >
              {REGION_SVG_PATHS[region.id].map((path, index) => (
                <path key={index} d={path} className={styles.geography} aria-hidden="true" />
              ))}
            </g>
          )
        })}
      </svg>
      <div className={styles.regionLabel} aria-live="polite">
        <strong>{activeRegion?.label || 'Explore the world'}</strong>
        <span>{activeRegion ? `${activeRegion.invitation} →` : 'Select any region to begin'}</span>
      </div>
    </div>
  )
}
