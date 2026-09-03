export const MILES_REGION_IDS = [
  'uk_ireland',
  'europe',
  'america',
  'north_africa',
  'indian_subcontinent',
  'southeast_asia',
  'philippines',
  'russia_central_asia',
  'china_east_asia',
  'australia_new_zealand',
  'japan_korea',
  'middle_east',
  'sub_saharan_africa',
  'indian_ocean_islands',
] as const

export type MilesRegionId = (typeof MILES_REGION_IDS)[number]

export interface MilesRegion {
  id: MilesRegionId
  label: string
  invitation: string
}

export const MILES_REGIONS: MilesRegion[] = [
  { id: 'uk_ireland', label: 'UK & Ireland', invitation: 'Explore your miles options' },
  { id: 'europe', label: 'Europe', invitation: 'Explore your miles options' },
  { id: 'america', label: 'America', invitation: 'Explore your miles options' },
  { id: 'north_africa', label: 'North Africa', invitation: 'Explore your miles options' },
  { id: 'indian_subcontinent', label: 'Indian Subcontinent', invitation: 'Explore your miles options' },
  { id: 'southeast_asia', label: 'Southeast Asia', invitation: 'Explore your miles options' },
  { id: 'philippines', label: 'Philippines', invitation: 'Explore your miles options' },
  { id: 'russia_central_asia', label: 'Russia & Central Asia', invitation: 'Explore your miles options' },
  { id: 'china_east_asia', label: 'China & East Asia', invitation: 'Explore your miles options' },
  { id: 'australia_new_zealand', label: 'Australia & New Zealand', invitation: 'Explore your miles options' },
  { id: 'japan_korea', label: 'Japan & Korea', invitation: 'Explore your miles options' },
  { id: 'middle_east', label: 'Middle East', invitation: 'Explore your miles options' },
  { id: 'sub_saharan_africa', label: 'Sub-Saharan Africa', invitation: 'Explore your miles options' },
  { id: 'indian_ocean_islands', label: 'Indian Ocean & Islands', invitation: 'Explore your miles options' },
]

export const MILES_REGION_BY_ID = Object.fromEntries(
  MILES_REGIONS.map((region) => [region.id, region]),
) as Record<MilesRegionId, MilesRegion>

export function isMilesRegionId(regionId: string | null): regionId is MilesRegionId {
  return regionId !== null && MILES_REGION_IDS.includes(regionId as MilesRegionId)
}

export function getMilesRegion(regionId: string | null): MilesRegion | null {
  return isMilesRegionId(regionId) ? MILES_REGION_BY_ID[regionId] : null
}
