import { OTHER_CATEGORY_ICONS, TRAVEL_CATEGORIES, type TravelCategory } from '@/lib/life-moments/categories'

// One entry per My Benefits tile / page. `momentId` is the backend moment (Backend/life_moments_config.py);
// `groups` are the display groups that moment returns, in order, used for the category tiles on the page.
export type BenefitTone = 'navy' | 'sky' | 'teal' | 'gold'

export type BenefitFeature = {
  slug: string
  /** Section heading on the My Benefits page. Features sharing a category share one row of tiles. */
  category: string
  tone: BenefitTone
  momentId: string
  name: string
  icon: string
  hint: string
  subtitle: string
  groups: string[]
}

const allTravelGroups = TRAVEL_CATEGORIES.map(category => category.name)

// Order here is the order of the tiles within each category's row.
export const BENEFIT_FEATURES: BenefitFeature[] = [
  { slug: 'next-trip', category: 'Travel', tone: 'navy', momentId: 'travel', name: 'My Next Trip', icon: 'ti-plane-departure', hint: 'Every travel perk, in one place', subtitle: 'Make every journey more rewarding with the cards you already own.', groups: allTravelGroups },
  { slug: 'airport-lounge', category: 'Travel', tone: 'sky', momentId: 'airport_lounge', name: 'Lounge Access', icon: 'ti-sofa', hint: 'Lounge access on your cards', subtitle: 'See which of your cards get you into airport lounges.', groups: ['Airport lounge'] },
  { slug: 'airport-transfer', category: 'Travel', tone: 'teal', momentId: 'airport_transfer', name: 'Airport Transfer', icon: 'ti-car', hint: 'Rides to and from the airport', subtitle: 'See which of your cards include airport transfers.', groups: ['Airport transfer'] },
  { slug: 'flights', category: 'Travel', tone: 'gold', momentId: 'flights', name: 'Flights', icon: 'ti-plane', hint: 'Flight offers and upgrades', subtitle: 'Flight discounts, tickets and upgrades on your cards.', groups: ['Flights'] },
  { slug: 'hotels', category: 'Travel', tone: 'sky', momentId: 'hotels', name: 'Hotels', icon: 'ti-bed', hint: 'Stay offers on your cards', subtitle: 'Hotel discounts and night offers on your cards.', groups: ['Hotels'] },
  { slug: 'airport-services', category: 'Travel', tone: 'teal', momentId: 'airport_services', name: 'Airport Services', icon: 'ti-luggage', hint: 'Fast track, meet & greet, dining', subtitle: 'Fast track, meet & greet, dining and more at the airport.', groups: ['Airport fast track', 'Meet & greet', 'Airport dining', 'Other airport services'] },
  { slug: 'travel-insurance', category: 'Travel', tone: 'navy', momentId: 'travel_insurance', name: 'Travel Insurance', icon: 'ti-shield-check', hint: 'Cover that comes with your cards', subtitle: 'See the travel insurance your cards offer.', groups: ['Travel insurance'] },
  { slug: 'travel-connectivity', category: 'Travel', tone: 'sky', momentId: 'travel_connectivity', name: 'Travel Connectivity', icon: 'ti-wifi', hint: 'Roaming and data perks', subtitle: 'Stay connected abroad with perks on your cards.', groups: ['Travel connectivity'] },
  { slug: 'car-rental', category: 'Travel', tone: 'gold', momentId: 'car_rental', name: 'Car Rental', icon: 'ti-steering-wheel', hint: 'Car hire and chauffeur perks', subtitle: 'Car hire and chauffeur perks on your cards.', groups: ['Car hire & chauffeur'] },
  { slug: 'retail-discounts', category: 'Shopping', tone: 'sky', momentId: 'retail_discounts', name: 'Retail & Merchant Discounts', icon: 'ti-building-store', hint: 'Store and membership discounts', subtitle: 'Store and merchant discounts on your cards.', groups: ['Retail & merchant discounts'] },
  { slug: 'luxury-outlets', category: 'Shopping', tone: 'gold', momentId: 'luxury_outlets', name: 'Luxury & Outlet Shopping', icon: 'ti-diamond', hint: 'Luxury and outlet perks', subtitle: 'Luxury and outlet shopping perks on your cards.', groups: ['Luxury & outlet shopping'] },
  { slug: 'valet-parking', category: 'Shopping', tone: 'sky', momentId: 'valet_parking', name: 'Valet & Parking', icon: 'ti-parking', hint: 'Valet and parking perks', subtitle: 'Valet and parking perks on your cards.', groups: ['Valet & parking'] },
  { slug: 'restaurant-discounts', category: 'Shopping', tone: 'gold', momentId: 'restaurant_discounts', name: 'Restaurant Discounts', icon: 'ti-tools-kitchen-2', hint: 'Dining offers', subtitle: 'Restaurant discounts on your cards.', groups: ['Restaurant discounts'] },
  { slug: 'ride-hailing', category: 'Shopping', tone: 'teal', momentId: 'ride_hailing', name: 'Ride Hailing', icon: 'ti-map-route', hint: 'Ride-hailing offers', subtitle: 'Ride-hailing offers on your cards.', groups: ['Ride hailing'] },
  { slug: 'insurance-protection', category: 'Shopping', tone: 'navy', momentId: 'insurance_protection', name: 'Insurance & Protection', icon: 'ti-shield-lock', hint: 'Purchase protection and extended warranty', subtitle: 'Purchase protection, warranty extension and insurance on your cards.', groups: ['Insurance & protection'] },
  { slug: 'instalment-plans', category: 'Shopping', tone: 'sky', momentId: 'instalment_plans', name: 'Instalment & Payment Plans', icon: 'ti-calendar-dollar', hint: 'Spread big purchases over time', subtitle: 'Instalment and payment plans offered on your cards.', groups: ['Instalment & payment plans'] },
  { slug: 'cinema', category: 'Cinema & Entertainment', tone: 'navy', momentId: 'cinema', name: 'Cinema', icon: 'ti-movie', hint: 'Buy 1 Get 1 and ticket discounts', subtitle: 'Movie ticket offers on your cards.', groups: ['Buy 1 Get 1 tickets', 'Cinema discounts'] },
  { slug: 'theme-parks-attractions', category: 'Cinema & Entertainment', tone: 'gold', momentId: 'attractions', name: 'Theme Parks & Attractions', icon: 'ti-rollercoaster', hint: 'Park, snow and attraction offers', subtitle: 'Theme park and attraction offers on your cards.', groups: ['Theme parks & attractions'] },
  { slug: 'streaming-media', category: 'Cinema & Entertainment', tone: 'sky', momentId: 'streaming', name: 'Streaming & Media', icon: 'ti-device-tv', hint: 'Streaming and music subscriptions', subtitle: 'Streaming and media offers on your cards.', groups: ['Streaming & media'] },
  { slug: 'exclusive-experiences', category: 'Cinema & Entertainment', tone: 'teal', momentId: 'experiences', name: 'Exclusive Experiences', icon: 'ti-confetti', hint: 'Events, 2-for-1 and VIP access', subtitle: 'Exclusive events and experiences on your cards.', groups: ['Exclusive experiences'] },
  { slug: 'dining-food-delivery', category: 'Cinema & Entertainment', tone: 'gold', momentId: 'dining_delivery', name: 'Dining & Food Delivery', icon: 'ti-tools-kitchen-2', hint: 'Restaurant and delivery offers', subtitle: 'Restaurant and food delivery offers on your cards.', groups: ['Restaurant discounts', 'Food delivery'] },
  { slug: 'outing-valet-parking', category: 'Cinema & Entertainment', tone: 'sky', momentId: 'valet_parking', name: 'Valet & Parking', icon: 'ti-parking', hint: 'Valet and parking perks', subtitle: 'Valet and parking perks on your cards.', groups: ['Valet & parking'] },
  { slug: 'gaming-perks', category: 'Cinema & Entertainment', tone: 'navy', momentId: 'gaming', name: 'Gaming Perks', icon: 'ti-device-gamepad-2', hint: 'Gaming discounts and passes', subtitle: 'Gaming discounts and passes on your cards.', groups: ['Gaming perks'] },
  { slug: 'golf', category: 'Lifestyle & Wellness', tone: 'teal', momentId: 'golf', name: 'Golf', icon: 'ti-golf', hint: 'Complimentary rounds and discounts', subtitle: 'Golf rounds and discounts on your cards.', groups: ['Golf'] },
  { slug: 'health-fitness', category: 'Lifestyle & Wellness', tone: 'sky', momentId: 'health_fitness', name: 'Health & Fitness', icon: 'ti-barbell', hint: 'Gym and fitness offers', subtitle: 'Health and fitness offers on your cards.', groups: ['Health & fitness'] },
  { slug: 'wellness-leisure', category: 'Lifestyle & Wellness', tone: 'gold', momentId: 'wellness_leisure', name: 'Wellness & Leisure', icon: 'ti-beach', hint: 'Beach clubs, spas and clubs', subtitle: 'Wellness and leisure perks on your cards.', groups: ['Wellness & leisure'] },
  // Also listed under Protection & Assistance: same data and picture, a second place to find it.
  { slug: 'lifestyle-roadside-assistance', category: 'Lifestyle & Wellness', tone: 'sky', momentId: 'roadside_assistance', name: 'Roadside Assistance', icon: 'ti-tool', hint: 'Breakdown and towing help', subtitle: 'Roadside assistance on your cards.', groups: ['Roadside assistance'] },
  { slug: 'family-education', category: 'Lifestyle & Wellness', tone: 'navy', momentId: 'family_education', name: 'Family & Education', icon: 'ti-school', hint: 'Kids and learning offers', subtitle: 'Family and education offers on your cards.', groups: ['Family & education'] },
  { slug: 'lifestyle-instalment-plans', category: 'Lifestyle & Wellness', tone: 'sky', momentId: 'instalment_plans', name: 'Instalment & Payment Plans', icon: 'ti-calendar-dollar', hint: 'Including school-fee plans', subtitle: 'Instalment and payment plans offered on your cards.', groups: ['Instalment & payment plans'] },
  { slug: 'shipping-courier', category: 'Lifestyle & Wellness', tone: 'teal', momentId: 'shipping_services', name: 'Shipping & Courier', icon: 'ti-truck-delivery', hint: 'Shipping and courier offers', subtitle: 'Shipping and courier service offers on your cards.', groups: ['Shipping & courier'] },
  { slug: 'app-discounts', category: 'Apps, Subscriptions & Digital', tone: 'navy', momentId: 'app_discounts', name: 'App & Subscription Discounts', icon: 'ti-apps', hint: 'App, food and membership offers', subtitle: 'Discounts on apps and subscriptions through your cards.', groups: ['App & subscription discounts'] },
  { slug: 'digital-subscriptions', category: 'Apps, Subscriptions & Digital', tone: 'sky', momentId: 'digital_subscriptions', name: 'Digital Subscriptions & Perks', icon: 'ti-repeat', hint: 'VPN, memberships and more', subtitle: 'Digital subscriptions and perks on your cards.', groups: ['Digital subscriptions & perks'] },
  { slug: 'apps-streaming-media', category: 'Apps, Subscriptions & Digital', tone: 'teal', momentId: 'streaming', name: 'Streaming & Media', icon: 'ti-device-tv', hint: 'Streaming and music subscriptions', subtitle: 'Streaming and media offers on your cards.', groups: ['Streaming & media'] },
  { slug: 'digital-payments', category: 'Apps, Subscriptions & Digital', tone: 'gold', momentId: 'digital_payments', name: 'Digital Payments & Cards', icon: 'ti-device-mobile', hint: 'Bill pay, Salik, instant card', subtitle: 'Digital payment and card features on your cards.', groups: ['Digital payments & cards'] },
  { slug: 'loyalty-status', category: 'Apps, Subscriptions & Digital', tone: 'sky', momentId: 'loyalty_status', name: 'Loyalty & Status', icon: 'ti-crown', hint: 'Programme tiers and status', subtitle: 'Loyalty programmes and status on your cards.', groups: ['Loyalty & status'] },
  { slug: 'protection-purchase', category: 'Protection & Assistance', tone: 'navy', momentId: 'insurance_protection', name: 'Purchase Protection & Warranty', icon: 'ti-shield-lock', hint: 'Protection and extended warranty', subtitle: 'Purchase protection, warranty extension and insurance on your cards.', groups: ['Insurance & protection'] },
  { slug: 'credit-shield', category: 'Protection & Assistance', tone: 'gold', momentId: 'credit_shield', name: 'Credit Shield', icon: 'ti-umbrella', hint: 'Balance cover if you lose your job or fall ill', subtitle: 'Optional cover that can pay your card balance if you lose your job, fall ill or become disabled. It is usually a paid add-on, so check each card’s fee.', groups: ['Credit Shield'] },
  { slug: 'emergency-assistance', category: 'Protection & Assistance', tone: 'sky', momentId: 'emergency_assistance', name: 'Emergency Assistance', icon: 'ti-first-aid-kit', hint: 'Medical, legal and cash help', subtitle: 'Emergency medical, legal and cash assistance on your cards.', groups: ['Emergency assistance'] },
  { slug: 'card-security', category: 'Protection & Assistance', tone: 'teal', momentId: 'card_security', name: 'Card Security & Lost Card', icon: 'ti-lock', hint: 'Fraud and lost-card help', subtitle: 'Card security and lost-card help on your cards.', groups: ['Card security'] },
  { slug: 'roadside-assistance', category: 'Protection & Assistance', tone: 'gold', momentId: 'roadside_assistance', name: 'Roadside Assistance', icon: 'ti-tool', hint: 'Breakdown and towing help', subtitle: 'Roadside assistance on your cards.', groups: ['Roadside assistance'] },
  { slug: 'concierge', category: 'Protection & Assistance', tone: 'sky', momentId: 'concierge', name: 'Concierge', icon: 'ti-bell', hint: 'Bookings and requests handled', subtitle: 'Concierge services on your cards.', groups: ['Concierge'] },
]

/** Order of the rows on the My Benefits page. A category not listed here goes after these, in the order it appears above. */
const SECTION_ORDER = [
  'Travel',
  'Shopping',
  'Lifestyle & Wellness',
  'Apps, Subscriptions & Digital',
  'Cinema & Entertainment',
  'Protection & Assistance',
]

export const benefitSections = (): { category: string; features: BenefitFeature[] }[] => {
  const present = [...new Set(BENEFIT_FEATURES.map(feature => feature.category))]
  const rank = (category: string) => { const index = SECTION_ORDER.indexOf(category); return index === -1 ? SECTION_ORDER.length : index }
  return present
    .map((category, position) => ({ category, position }))
    .sort((a, b) => rank(a.category) - rank(b.category) || a.position - b.position)
    .map(({ category }) => ({ category, features: BENEFIT_FEATURES.filter(feature => feature.category === category) }))
}

export const getBenefitFeature = (slug: string): BenefitFeature | undefined => BENEFIT_FEATURES.find(feature => feature.slug === slug)

export const categoriesForFeature = (feature: BenefitFeature): TravelCategory[] =>
  feature.groups.map(name => [...TRAVEL_CATEGORIES, ...OTHER_CATEGORY_ICONS].find(category => category.name === name) ?? { name, icon: 'ti-plane' })
