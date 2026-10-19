// Display-only metadata for the travel tiles. Group names mirror Backend/life_moments_config.py;
// the backend remains the source of truth for which groups and cards exist.
export type TravelCategory = { name: string; icon: string }

export const TRAVEL_CATEGORIES: TravelCategory[] = [
  { name: 'Airport lounge', icon: 'ti-sofa' },
  { name: 'Airport transfer', icon: 'ti-car' },
  { name: 'Airport fast track', icon: 'ti-bolt' },
  { name: 'Meet & greet', icon: 'ti-users' },
  { name: 'Airport dining', icon: 'ti-tools-kitchen-2' },
  { name: 'Other airport services', icon: 'ti-luggage' },
  { name: 'Flights', icon: 'ti-plane' },
  { name: 'Hotels', icon: 'ti-bed' },
  { name: 'Car hire & chauffeur', icon: 'ti-steering-wheel' },
  { name: 'Travel insurance', icon: 'ti-shield-check' },
  { name: 'Travel connectivity', icon: 'ti-wifi' },
  { name: 'Other travel benefits', icon: 'ti-dots' },
]

export const DEFAULT_CATEGORY_ICON = 'ti-plane'

// Icons for display groups outside the travel list (used by the other My Benefits sections).
export const OTHER_CATEGORY_ICONS: TravelCategory[] = [
  { name: 'Buy 1 Get 1 tickets', icon: 'ti-ticket' },
  { name: 'Cinema discounts', icon: 'ti-discount-2' },
  { name: 'Restaurant discounts', icon: 'ti-tools-kitchen-2' },
  { name: 'Food delivery', icon: 'ti-bike' },
]
