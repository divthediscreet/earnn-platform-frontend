// The six Earnn tools, in nav order. The homepage tray, its arrows and its counter are all driven from this list.

export type ToolVisual = 'wallet' | 'compare' | 'tap' | 'calendar' | 'travel' | 'chat'

export type HomeTool = {
  key: string
  name: string
  route: string
  hook: [string, string]
  headline: string
  description: string
  cta: string
  visual: ToolVisual
  icon: string
  accent: string
  /** Photo crop: focus point (0-1) inside the source image. Ask Earnie has no photo. */
  image?: { src: string; alt: string; fx: number; fy: number }
}

export const TOOLS: HomeTool[] = [
  {
    key: 'best',
    name: 'Best for Me',
    route: '/analyse',
    hook: ['Your spending.', 'Your best cards.'],
    headline: 'Your spending. Your best cards.',
    description: 'Tell Earnn how you spend — or upload your credit card statement — and see which cards could reward you most.',
    cta: "Find what's best for me",
    visual: 'wallet',
    icon: 'ti-wallet',
    accent: '#FFD76A',
    image: { src: '/images/home/tile-best.webp', alt: 'Several UAE bank cards fanned out of a leather wallet on a marble desk', fx: 0.5, fy: 0.5 },
  },
  {
    key: 'fly',
    name: 'Fly for Free ✈',
    route: '/trip-planner',
    hook: ['See where your', 'spending could take you.'],
    headline: 'Where could your spending take you?',
    description: 'See the trips and upgrades your everyday spending could help unlock.',
    cta: 'See where I could fly',
    visual: 'travel',
    icon: 'ti-plane-departure',
    accent: '#FF9E8A',
    image: { src: '/images/home/tile-fly.webp', alt: 'A business-class cabin, an infinity pool and a city skyline', fx: 0.5, fy: 0.5 },
  },
  {
    key: 'tap',
    name: 'Match & Tap',
    route: '/merchant-lookup',
    hook: ['Know which card to use', 'before you pay.'],
    headline: 'Know which card to use before you pay.',
    description: "Search where you're spending and see which card could reward you most there.",
    cta: 'Pick right card',
    visual: 'tap',
    icon: 'ti-device-mobile-search',
    accent: '#6FD6B5',
    image: { src: '/images/home/tile-tap.webp', alt: 'A card in a payment terminal on a counter inside a shopping mall', fx: 0.5, fy: 0.5 },
  },
  {
    key: 'big',
    name: 'Big Spend Planner',
    route: '/bulk-spend-miles',
    hook: ['Big payment?', 'Make it count.'],
    headline: 'Big expense coming? Make it count.',
    description: 'Plan upcoming payments like school fees, insurance or travel and see how to get more from them.',
    cta: 'Plan my expenses',
    visual: 'calendar',
    icon: 'ti-calendar-event',
    accent: '#FFB86B',
    image: { src: '/images/home/tile-big.webp', alt: 'A desk calendar with upcoming plans pinned to it, next to a passport and suitcase', fx: 0.5, fy: 0.5 },
  },
  {
    key: 'compare',
    name: 'Compare',
    route: '/all-uae-cards',
    hook: ['Put two cards', 'to the test.'],
    headline: 'Which card actually comes out ahead?',
    description: 'Compare UAE credit cards side by side and see the differences that matter.',
    cta: 'Compare cards',
    visual: 'compare',
    icon: 'ti-arrows-diff',
    accent: '#8FB8FF',
    image: { src: '/images/home/tile-compare.webp', alt: 'Three credit cards standing side by side on a marble plinth', fx: 0.56, fy: 0.5 },
  },
  {
    key: 'earnie',
    name: 'Ask Earnie',
    route: '/chat',
    hook: ['Not sure?', 'Just ask.'],
    headline: 'Have a question? Ask Earnie.',
    description: 'Ask about UAE credit cards, rewards or your spending in plain English.',
    cta: 'Ask Earnie',
    visual: 'chat',
    icon: 'ti-message-circle',
    accent: '#B9A8FF',
  },
]

/**
 * Background size/position that frames the point (fx, fy) of a wide photo inside a frame of the given aspect ratio.
 * zoom 1 = the photo just covers the frame's height.
 */
export function cropStyle(fx: number, fy: number, zoom: number, frameAspect: number, imageAspect = 2.667) {
  const clamp = (n: number) => Math.min(1, Math.max(0, n))
  const visibleX = Math.min(1, frameAspect / (zoom * imageAspect))
  const visibleY = Math.min(1, 1 / zoom)
  const px = visibleX >= 1 ? 0.5 : clamp((fx - visibleX / 2) / (1 - visibleX))
  const py = visibleY >= 1 ? 0.5 : clamp((fy - visibleY / 2) / (1 - visibleY))
  return { backgroundSize: `auto ${zoom * 100}%`, backgroundPosition: `${(px * 100).toFixed(1)}% ${(py * 100).toFixed(1)}%` }
}
