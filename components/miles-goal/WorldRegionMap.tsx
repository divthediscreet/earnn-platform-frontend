'use client'

import { useState } from 'react'
import { MILES_REGIONS, type MilesRegion, type MilesRegionId } from '@/lib/miles-goal/regions'
import { REGION_SVG_PATHS, WORLD_MAP_VIEWBOX } from './worldRegionPaths'
import styles from './WorldRegionMap.module.css'

type Props = {
  selectedRegionId: MilesRegionId | null
  previewRegionId: MilesRegionId | null
  onPreview: (regionId: MilesRegionId | null) => void
  onSelect: (region: MilesRegion) => void
}

export default function WorldRegionMap({ selectedRegionId, previewRegionId, onPreview, onSelect }: Props) {
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null)
  const preview = (regionId: MilesRegionId | null) => {
    onPreview(regionId)
  }
  const activeRegionId = previewRegionId || selectedRegionId
  const activeRegion = activeRegionId ? MILES_REGIONS.find(region => region.id === activeRegionId) : null

  return (
    <div
      className={styles.shell}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        setPointer({ x: event.clientX - bounds.left, y: event.clientY - bounds.top })
      }}
      onMouseLeave={() => {
        preview(selectedRegionId)
        setPointer(null)
      }}
    >
      <svg className={styles.map} viewBox={WORLD_MAP_VIEWBOX} role="group" aria-label="Interactive Earnn travel-region map" aria-describedby="miles-map-description">
        <desc id="miles-map-description">Select one of fourteen Earnn travel regions. Each region is a single keyboard-accessible control.</desc>
        <rect className={styles.ocean} width="100%" height="100%" rx="22" aria-hidden="true" />
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
      {activeRegion && <div className={styles.regionLabel} style={pointer ? { left: pointer.x, top: pointer.y } : undefined} role="status">{activeRegion.label}</div>}
    </div>
  )
}
