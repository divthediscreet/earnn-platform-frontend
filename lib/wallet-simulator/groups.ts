// lib/wallet-simulator/groups.ts — the simulator's 12 spend groups (keys = backend MANUAL_INPUTS keys).

export type SimulatorGroup = {
  key: string
  label: string // form label
  short: string // label used on the result page
  icon: string
  hint: string
}

export const SIMULATOR_GROUPS: SimulatorGroup[] = [
  { key: 'grocery_store', label: 'Grocery store',        short: 'Grocery store',       icon: '🛒', hint: 'Supermarkets, LuLu, Carrefour' },
  { key: 'grocery_online', label: 'Online grocery',        short: 'Online grocery',  icon: '📱', hint: 'talabat Mart, noon, grocery apps' },
  { key: 'dineout',       label: 'Dining out',            short: 'Dining out',      icon: '🍽️', hint: 'Restaurants and cafés' },
  { key: 'food_delivery', label: 'Food delivery',         short: 'Food delivery',   icon: '🛵', hint: 'talabat, Deliveroo, noon Food, Careem Food' },
  { key: 'travel',        label: 'Travel',                short: 'Travel',          icon: '✈️', hint: 'Flights, hotels, booking sites' },
  { key: 'taxi',          label: 'Taxi & ride-hailing',   short: 'Taxi',            icon: '🚕', hint: 'Careem, Uber, taxis' },
  { key: 'online',        label: 'Online shopping',       short: 'Online shopping', icon: '📦', hint: 'Amazon, noon, online stores' },
  { key: 'retail',        label: 'Retail shopping',       short: 'Retail',          icon: '🛍️', hint: 'Malls, in-store shopping' },
  { key: 'fuel',          label: 'Fuel',                  short: 'Fuel',            icon: '⛽', hint: 'ENOC, ADNOC, Emarat' },
  { key: 'telecom',       label: 'Telecom',               short: 'Telecom',         icon: '📱', hint: 'e& / du bills, internet' },
  { key: 'utility',       label: 'Utilities',             short: 'Utilities',       icon: '💡', hint: 'DEWA, SEWA, water, electricity' },
  { key: 'education',     label: 'Education',             short: 'Education',       icon: '🎓', hint: 'School fees, courses' },
  { key: 'miscellaneous', label: 'Everything else',       short: 'Everything else', icon: '✨', hint: 'Anything not listed above' },
]

const BY_KEY: Record<string, SimulatorGroup> = Object.fromEntries(SIMULATOR_GROUPS.map(g => [g.key, g]))
BY_KEY.grocery = BY_KEY.grocery_store // results saved before the key was renamed

export function groupShort(key: string | null | undefined, fallback = 'Everything else'): string {
  return (key && BY_KEY[key]?.short) || fallback
}

export function groupIcon(key: string | null | undefined): string {
  return (key && BY_KEY[key]?.icon) || '✨'
}

export function aed(n: number): string {
  return `AED ${Math.round(n).toLocaleString('en-US')}`
}

export function pct(rate: number): string {
  // up to 2 decimals, trailing zeros trimmed: 1.25%, 31.5%, 5%
  return `${parseFloat((rate * 100).toFixed(2))}%`
}

export const MAX_WALLET = 3
