import type { ReactNode } from 'react'

// One visual per benefit_category_normalised (49 featured categories) + a few provider overrides.
// To change a visual: edit CATEGORY_VISUAL or PROVIDER_VISUAL below — nothing else is card-specific.
//

type Glyph = ReactNode
const g = (children: Glyph) => children

// 24x24 line glyphs, drawn with currentColor.
const GLYPHS: Record<string, Glyph> = {
  lounge: g(<><path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3" /><path d="M2 12a2 2 0 0 1 4 0v3h12v-3a2 2 0 0 1 4 0v5H2z" /><path d="M5 17v2M19 17v2" /></>),
  cinema: g(<><path d="M4 8h16v11H4z" /><path d="M4 8l2-4h4L8 8M10 8l2-4h4l-2 4M16 8l2-4h2l-2 4" /></>),
  popcorn: g(<><path d="M6 10h12l-1.5 11h-9z" /><path d="M8 10V7a2 2 0 0 1 3-1.7A2 2 0 0 1 14 6a2 2 0 0 1 2 2v2" /><path d="M10 13v6M14 13v6" /></>),
  car: g(<><path d="M4 16V12l2-5h12l2 5v4" /><path d="M3 16h18v2H3zM7 12h10" /><circle cx="7.5" cy="16" r=".6" /><circle cx="16.5" cy="16" r=".6" /></>),
  plane: g(<path d="M10 14L3 11V9l7 1 4-6h2l-1 7 5 1v2l-5 1 1 7h-2l-4-6-4 1z" />),
  bed: g(<><path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" /><circle cx="7" cy="11" r="1.6" /></>),
  golf: g(<><path d="M9 21V3l8 4-8 4" /><ellipse cx="9" cy="20.5" rx="5" ry="1.2" /></>),
  key: g(<><circle cx="8" cy="12" r="4" /><path d="M12 12h9M18 12v3M21 12v2" /></>),
  bell: g(<><path d="M4 17a8 8 0 0 1 16 0z" /><path d="M2 20h20M12 6V4M10 4h4" /></>),
  dining: g(<><path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10" /><path d="M17 21V3c-2.5 2-3 5-3 8h3" /></>),
  shield: g(<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>),
  gift: g(<><path d="M4 9h16v4H4zM5 13h14v8H5zM12 9v12" /><path d="M12 9S9 8.5 8.5 6.5 11 3.5 12 9zM12 9s3-.5 3.5-2.5S13 3.5 12 9z" /></>),
  tag: g(<><path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.3" /></>),
  ticket: g(<><path d="M3 8a2 2 0 0 0 0 4v0a2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H3z" /><path d="M14 6v12" strokeDasharray="2 2" /></>),
  spa: g(<><path d="M12 20c-5 0-8-3-8-8 4 0 7 2 8 5 1-3 4-5 8-5 0 5-3 8-8 8z" /><path d="M12 17C10 12 10 8 12 4c2 4 2 8 0 13z" /></>),
  dumbbell: g(<path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />),
  star: g(<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />),
  globe: g(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></>),
  card: g(<><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M6 15h4" /></>),
  phone: g(<><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></>),
  bag: g(<><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></>),
  bolt: g(<path d="M13 2L4 14h7l-1 8 9-12h-7z" />),
  tv: g(<><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4M10 9.5v4l4-2z" /></>),
  scooter: g(<><circle cx="6" cy="17" r="3" /><circle cx="18" cy="17" r="3" /><path d="M6 17h5l3-8h3M14 9h-3" /><path d="M9 6h4v3H9z" /></>),
  train: g(<><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 11h14M8 21l2-4M16 21l-2-4" /><circle cx="9" cy="14" r=".6" /><circle cx="15" cy="14" r=".6" /></>),
  ball: g(<><circle cx="12" cy="12" r="9" /><path d="M12 3v18M3 12h18M5.5 5.5c3 3 3 10 0 13M18.5 5.5c-3 3-3 10 0 13" /></>),
  wrench: g(<path d="M14 7a4 4 0 0 0 5 5l-9 9a2.1 2.1 0 0 1-3-3l9-9a4 4 0 0 0-2-2z" />),
  book: g(<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h13" />),
  percent: g(<><path d="M19 5L5 19" /><circle cx="7" cy="7" r="2.2" /><circle cx="17" cy="17" r="2.2" /></>),
  crown: g(<path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5z" />),
  coffee: g(<><path d="M5 9h12v6a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4z" /><path d="M17 11h2a2 2 0 0 1 0 4h-2M8 3v3M12 3v3" /></>),
}

type Tone = { bg: string; fg: string }
const TONES: Record<string, Tone> = {
  blue: { bg: '#E3ECFF', fg: '#0E3785' }, teal: { bg: '#DDF5EF', fg: '#00806A' }, amber: { bg: '#FFF0D6', fg: '#B26A00' },
  rose: { bg: '#FFE3E8', fg: '#C0264D' }, violet: { bg: '#EDE5FF', fg: '#5B33C7' }, green: { bg: '#E0F6E0', fg: '#237A2B' },
  slate: { bg: '#E8ECF3', fg: '#3B4A63' }, orange: { bg: '#FFE8D9', fg: '#C24E0B' },
}

type Visual = { glyph: keyof typeof GLYPHS; tone: keyof typeof TONES }
const v = (glyph: keyof typeof GLYPHS, tone: keyof typeof TONES): Visual => ({ glyph, tone })

export const CATEGORY_VISUAL: Record<string, Visual> = {
  airport_lounge_access: v('lounge', 'blue'), cinema_bogo: v('popcorn', 'rose'), cinema_discount: v('cinema', 'rose'),
  app_discount_subscription: v('phone', 'violet'), airport_transfer: v('car', 'teal'), valet_and_parking: v('key', 'slate'),
  golf_discount: v('golf', 'green'), golf_complimentary: v('golf', 'green'), hotel_booking_and_discounts: v('bed', 'blue'),
  hotel_and_accommodation: v('bed', 'blue'), concierge_services: v('bell', 'amber'), restaurant_discounts: v('dining', 'orange'),
  car_rental_and_chauffeur: v('car', 'slate'), airport_meet_and_greet: v('crown', 'amber'), loyalty_and_status: v('crown', 'violet'),
  flight_and_airline_benefits: v('plane', 'blue'), digital_subscriptions_and_perks: v('tv', 'violet'), airport_fast_track: v('bolt', 'amber'),
  retail_and_merchant_discounts_membership: v('bag', 'rose'), wellness_and_leisure: v('spa', 'teal'), exclusive_experiences: v('star', 'amber'),
  ride_and_transit: v('train', 'teal'), health_and_fitness: v('dumbbell', 'green'), spend_acceleration: v('bolt', 'orange'),
  zero_fx_fees: v('globe', 'blue'), lifestyle_experiences: v('ticket', 'violet'), roadside_assistance: v('wrench', 'slate'),
  luxury_outlet_shopping: v('bag', 'violet'), airport_dining: v('coffee', 'orange'), travel_insurance: v('shield', 'teal'),
  education_and_kids: v('book', 'blue'), other_travel_benefits: v('plane', 'teal'), theme_parks_and_attractions: v('ticket', 'orange'),
  sports_club_experiences: v('ball', 'green'), food_delivery: v('scooter', 'orange'), miles_discount_voucher: v('percent', 'blue'),
  instant_digital_card: v('card', 'blue'), ride_hailing: v('car', 'teal'), flight_free_companion_ticket: v('plane', 'amber'),
  lifestyle_perks: v('gift', 'rose'), airport_ancillary_services: v('plane', 'slate'), cashback_and_redemption: v('percent', 'green'),
  purchase_protection_and_warranty: v('shield', 'blue'), global_travel_privileges: v('globe', 'amber'), travel_portal_discounts: v('tag', 'blue'),
  streaming_and_media: v('tv', 'rose'), 'video services': v('tv', 'rose'), airline_upgrade_and_companion: v('plane', 'amber'),
  travel_connectivity: v('phone', 'teal'),
}

// Provider overrides — deliberately limited. Matched on `category` (optional) + provider text.
// Rendered as a brand-coloured wordmark badge in place of the generic icon.
type Brand = { match: RegExp; categories?: string[]; label: string; bg: string; fg: string }
export const PROVIDER_VISUAL: Brand[] = [
  { match: /talabat/i, categories: ['food_delivery', 'app_discount_subscription'], label: 'talabat', bg: '#FF5A00', fg: '#fff' },
  { match: /noon/i, categories: ['food_delivery', 'app_discount_subscription', 'retail_and_merchant_discounts_membership'], label: 'noon', bg: '#FEEE00', fg: '#111' },
  { match: /careem/i, categories: ['airport_transfer', 'ride_hailing', 'app_discount_subscription'], label: 'careem', bg: '#00B14F', fg: '#fff' },
  { match: /bolt/i, label: 'Bolt', bg: '#34D186', fg: '#0B2A1B' },
  { match: /zomato/i, categories: ['app_discount_subscription', 'food_delivery'], label: 'zomato', bg: '#E23744', fg: '#fff' },
  { match: /vox/i, categories: ['cinema_bogo', 'cinema_discount'], label: 'VOX', bg: '#1B1B1B', fg: '#FFD400' },
  { match: /reel/i, categories: ['cinema_bogo', 'cinema_discount'], label: 'REEL', bg: '#C8102E', fg: '#fff' },
  { match: /roxy/i, categories: ['cinema_bogo', 'cinema_discount'], label: 'ROXY', bg: '#7A1F3D', fg: '#fff' },
  { match: /avis/i, categories: ['car_rental_and_chauffeur'], label: 'AVIS', bg: '#D4002A', fg: '#fff' },
  { match: /booking\.com/i, categories: ['hotel_booking_and_discounts', 'hotel_and_accommodation'], label: 'Booking.com', bg: '#003580', fg: '#fff' },
  { match: /marhaba/i, categories: ['airport_meet_and_greet'], label: 'marhaba', bg: '#0A6E5B', fg: '#fff' },
  { match: /thriwe/i, categories: ['concierge_services'], label: 'thriwe', bg: '#1C1C3A', fg: '#fff' },
  { match: /valtrans/i, categories: ['valet_and_parking'], label: 'Valtrans', bg: '#27405F', fg: '#fff' },
]

const FALLBACK: Visual = v('star', 'blue')

export function benefitVisual(category: string | null | undefined, provider: string | null | undefined) {
  const key = String(category ?? '').trim().toLowerCase()
  const brand = provider ? PROVIDER_VISUAL.find(item => item.match.test(provider) && (!item.categories || item.categories.includes(key))) : undefined
  const visual = CATEGORY_VISUAL[key] ?? FALLBACK
  return { brand: brand ?? null, glyph: GLYPHS[visual.glyph], tone: TONES[visual.tone] }
}

export function glyphByName(name: string): Glyph { return GLYPHS[name] ?? GLYPHS.star }
export function toneByName(name: string): Tone { return TONES[name] ?? TONES.blue }
