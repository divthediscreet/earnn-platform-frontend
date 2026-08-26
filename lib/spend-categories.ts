export const SPEND_CATEGORIES = [
  { key: 'dining',        label: 'Dining & Restaurants',  icon: '🍽️', hint: 'Talabat, Zomato, restaurants, cafes' },
  { key: 'grocery',       label: 'Grocery',               icon: '🛒', hint: 'LuLu, Carrefour, Spinneys, supermarkets' },
  { key: 'travel',        label: 'Travel',                icon: '✈️', hint: 'Emirates, flydubai, hotels, Booking.com' },
  { key: 'fuel',          label: 'Fuel',                  icon: '⛽', hint: 'ENOC, ADNOC petrol stations' },
  { key: 'online',        label: 'Online Shopping',       icon: '📦', hint: 'Amazon, Temu, subscriptions' },
  { key: 'international', label: 'International Spend',   icon: '🌍', hint: 'Any spend outside UAE or in foreign currency' },
  { key: 'entertainment', label: 'Entertainment',         icon: '🎬', hint: 'VOX, Reel, theme parks' },
  { key: 'retail',        label: 'Retail Shopping',       icon: '🛍️', hint: 'Mall shopping, in-store purchases' },
  { key: 'telecom',       label: 'Telecom',               icon: '📱', hint: 'Etisalat/du bills, internet' },
  { key: 'transport',     label: 'Transport',             icon: '🚕', hint: 'Careem, RTA, NOL, SALIK' },
  { key: 'utility',       label: 'Utilities',             icon: '💡', hint: 'DEWA, water, electricity' },
  { key: 'education',     label: 'Education',             icon: '📚', hint: 'School fees, courses' },
  { key: 'miscellaneous', label: 'Other / Miscellaneous', icon: '🔖', hint: 'Everything else' },
] as const

export type SpendCategoryKey = typeof SPEND_CATEGORIES[number]['key']
export type SpendProfile = Record<SpendCategoryKey, number>

export const MERCHANT_OPTIONS: Partial<Record<SpendCategoryKey, { key: string; label: string }[]>> = {
  dining:  [{ key: 'noon', label: 'noon Food' }, { key: 'talabat', label: 'talabat' }, { key: 'deliveroo', label: 'Deliveroo' }, { key: 'careem', label: 'Careem' }, { key: 'smiles', label: 'Smiles' }],
  grocery: [{ key: 'noon', label: 'noon' }, { key: 'talabat', label: 'talabat' }, { key: 'amazon', label: 'Amazon' }, { key: 'carrefour', label: 'Carrefour' }, { key: 'lulu', label: 'LuLu' }],
  travel:  [{ key: 'etihad', label: 'Etihad' }, { key: 'emirates', label: 'Emirates' }],
}

export function emptySpendProfile(): SpendProfile {
  return Object.fromEntries(SPEND_CATEGORIES.map(category => [category.key, 0])) as SpendProfile
}

export function normalizeSpendValue(value: string | number): number {
  const parsed = typeof value === 'number' ? value : Number(value.replace(/,/g, ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}
