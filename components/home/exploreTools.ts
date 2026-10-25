// The tools shown under "Explore Earnn" on the home page and in the navigation's Explore Earnn menu.
export const EXPLORE_TOOLS = [
  { name: 'Best card for me', text: 'Tell us how you spend and see which cards could reward you most.', href: '/analyse', img: '/images/home/tile-best-800.webp', alt: 'Several UAE bank cards fanned out of a leather wallet' },
  { name: 'Check Before You Pay', text: 'Search a shop, app or product and see which card to use before you pay.', href: '/merchant-lookup', img: '/images/home/tile-checkout-1200.webp', alt: 'A shopper at a checkout wondering which of three credit cards to use' },
  { name: 'Big Spend Planner', text: 'Earn better rewards on upcoming big expenses like school fees, insurance or trip bookings.', href: '/bulk-spend-miles', img: '/images/home/tile-big-800.webp', alt: 'A desk calendar with upcoming plans next to a passport' },
  { name: 'Turn Spending into Flights', text: 'You spend what you spend. Earnn plans how to turn it into a dream business-class flight ticket.', href: '/trip-planner', img: '/images/home/tile-fly-800.webp', alt: 'A business-class cabin, an infinity pool and a city skyline' },
  { name: 'My Benefits', text: 'Discover the movies, fitness, shopping and protection perks your cards already offer.', href: '/my-benefits', img: '/images/home/tile-benefits-800.webp', alt: 'A credit card with movies, fitness, shopping and protection benefits' },
  { name: 'Simulate All UAE Cards', text: 'Build a test wallet of up to 10 cards and see which to use for what.', href: '/simulate-all-uae-cards', img: '/images/home/tile-compare-800.webp', alt: 'Three credit cards standing side by side' },
] as const
