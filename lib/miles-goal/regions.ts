export interface MilesRegion {
  id: string
  label: string
  backendDestination: string
  shortLabel: string
  mapX: number
  mapY: number
}

export const MILES_REGIONS: MilesRegion[] = [
  { id: 'uk_ireland', label: 'UK & Ireland', backendDestination: 'uk', shortLabel: 'UK', mapX: 48, mapY: 27 },
  { id: 'europe', label: 'Europe', backendDestination: 'europe', shortLabel: 'Europe', mapX: 54, mapY: 32 },
  { id: 'north_america', label: 'North America', backendDestination: 'usa', shortLabel: 'N. America', mapX: 22, mapY: 34 },
  { id: 'egypt_north_africa', label: 'Egypt & North Africa', backendDestination: 'egypt', shortLabel: 'Egypt', mapX: 54, mapY: 45 },
  { id: 'india_subcontinent', label: 'India & Subcontinent', backendDestination: 'india', shortLabel: 'India', mapX: 69, mapY: 48 },
  { id: 'singapore_se_asia', label: 'Singapore & Southeast Asia', backendDestination: 'singapore', shortLabel: 'Singapore', mapX: 79, mapY: 58 },
  { id: 'philippines', label: 'Philippines', backendDestination: 'philippines', shortLabel: 'Philippines', mapX: 86, mapY: 48 },
]

export const COMING_SOON_REGIONS = [
  'South America', 'Sub-Saharan Africa', 'Middle East', 'Australia & New Zealand',
  'Japan & Korea', 'China & East Asia',
]

export function getMilesRegion(regionId: string | null): MilesRegion | null {
  return MILES_REGIONS.find(region => region.id === regionId) ?? null
}
