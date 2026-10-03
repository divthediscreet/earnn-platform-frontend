// Which airline programmes a card's reward currency can be converted to.
//
// Presentation-only helper for the Max Miles airline filter.  It mirrors the Emirates
// (skywards_miles) / Etihad (etihad_guest_miles) edges of the reward-conversion matrix, the same
// edges the backend's generic-miles converter averages over.  The simulate response does not carry
// a card's reward currency, so the page joins `earnn_card_id` to `reward_currency_name` from
// GET /api/cards and looks the currency up here.  Update this table when conversion edges change.

export type AirlineGroup = 'emirates' | 'etihad' | 'flexible'

export const AIRLINE_GROUPS: { code: AirlineGroup; label: string; hint: string }[] = [
  { code: 'emirates', label: 'Emirates Skywards', hint: 'Earns or converts to Skywards miles only' },
  { code: 'etihad', label: 'Etihad Guest', hint: 'Earns or converts to Etihad Guest miles only' },
  { code: 'flexible', label: 'Flexible points', hint: 'Converts to both Emirates and Etihad, e.g. Marriott Bonvoy, Citi Miles, FAB Rewards' },
]

const EMIRATES = new Set(['skywards_miles'])
const ETIHAD = new Set([
  'etihad_guest_miles', 'adnoc_reward_points', 'airrewards', 'smiles_points', 'walaa_rewards',
])
const BOTH = new Set([
  '360_rewards_points', 'al_futtaim_fab_rewards', 'cbd_rewards_points', 'citi_miles', 'fab_rewards',
  'marriott_bonvoy_points', 'mashreq_vantage_points', 'plus_points', 'thankyou_points', 'touchpoints',
  'voyager_miles',
])

export function airlineGroupForCurrency(currency: string | null | undefined): AirlineGroup | null {
  const slug = (currency ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')
  if (EMIRATES.has(slug)) return 'emirates'
  if (ETIHAD.has(slug)) return 'etihad'
  if (BOTH.has(slug)) return 'flexible'
  return null
}
