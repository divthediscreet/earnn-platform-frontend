import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const mapping = JSON.parse(await readFile(`${root}/scripts/miles-goal/country-region-map.json`, 'utf8'))
const mapData = JSON.parse(await readFile(`${root}/scripts/miles-goal/ne_110m_admin_0_map_units.geojson`, 'utf8'))

const expectedRegions = [
  'uk_ireland', 'europe', 'america', 'north_africa', 'indian_subcontinent',
  'southeast_asia', 'philippines', 'russia_central_asia', 'china_east_asia',
  'australia_new_zealand', 'japan_korea', 'middle_east',
  'sub_saharan_africa', 'indian_ocean_islands',
]
assert.deepEqual(Object.keys(mapping), expectedRegions, 'The mapping must contain the 14 approved regions in canonical order')

const reverse = new Map()
for (const [regionId, codes] of Object.entries(mapping)) {
  assert.ok(codes.length > 0, `${regionId} must include at least one geography`)
  for (const code of codes) {
    assert.ok(!reverse.has(code), `${code} maps to both ${reverse.get(code)} and ${regionId}`)
    reverse.set(code, regionId)
  }
}

const allowedNonCountryGeometry = new Set(['ATA', 'KAS'])
const unresolved = []
for (const feature of mapData.features) {
  const unit = feature.properties?.SU_A3
  const parent = feature.properties?.ADM0_A3
  const resolved = reverse.get(unit) || reverse.get(parent)
  if (!resolved && !allowedNonCountryGeometry.has(unit) && !allowedNonCountryGeometry.has(parent)) {
    unresolved.push(`${feature.properties?.NAME_EN || feature.properties?.NAME} [SU_A3=${unit}, ADM0_A3=${parent}]`)
  }
}
assert.deepEqual(unresolved, [], `Every selectable map unit must resolve. Unmapped: ${unresolved.join(', ')}`)

const criticalMappings = {
  GBR: 'uk_ireland', IRL: 'uk_ireland', FRA: 'europe', USA: 'america', CAN: 'america', BRA: 'america',
  EGY: 'north_africa', IND: 'indian_subcontinent', PAK: 'indian_subcontinent', LKA: 'indian_subcontinent',
  THA: 'southeast_asia', PHL: 'philippines', RUS: 'russia_central_asia', KAZ: 'russia_central_asia',
  CHN: 'china_east_asia', AUS: 'australia_new_zealand', NZL: 'australia_new_zealand',
  JPN: 'japan_korea', KOR: 'japan_korea', ARE: 'middle_east', SAU: 'middle_east',
  ZAF: 'sub_saharan_africa', KEN: 'sub_saharan_africa', MDV: 'indian_ocean_islands', MUS: 'indian_ocean_islands',
}
for (const [code, expectedRegion] of Object.entries(criticalMappings)) {
  assert.equal(reverse.get(code), expectedRegion, `${code} must map to ${expectedRegion}`)
}

console.log(`Validated ${mapData.features.length} map units across ${expectedRegions.length} Earnn regions; ${allowedNonCountryGeometry.size} non-country geometries explicitly excluded.`)
