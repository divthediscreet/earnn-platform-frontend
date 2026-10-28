import type { NextConfig } from "next";

// Server-side only. Local development can point to a local FastAPI process;
// production continues to use Railway unless Vercel explicitly overrides it.
const backendOrigin = (
  process.env.EARNN_BACKEND_ORIGIN
  || 'https://earnn-platform-production.up.railway.app'
).replace(/\/$/, '')

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  // Public URLs are /simulate-all-uae-cards and /compare-all-uae-cards (the pages live in app/simulate and app/compare);
  // the old /compare link goes to the matching new page. /all-uae-cards is the merged Simulate + Compare page.
  async redirects() {
    return [
      { source: '/compare', destination: '/compare-all-uae-cards', permanent: true },
      { source: '/simulate', destination: '/simulate-all-uae-cards', permanent: true },
      // the Big Spend Planner's page address no longer says "miles" (it plans cashback as well)
      { source: '/bulk-spend-miles/:path*', destination: '/bulk-spend/:path*', permanent: true },
      // The old Best-card page and the removed Explore Credit Cards hub (and its sub-path) both go to Best Card for Me.
      { source: '/analyse', destination: '/find-my-best-cards', permanent: true },
      { source: '/explore-credit-cards/:path*', destination: '/find-my-best-cards', permanent: true },
    ]
  },
  async rewrites() {
    return [
      { source: '/simulate-all-uae-cards', destination: '/simulate' },
      { source: '/compare-all-uae-cards', destination: '/compare' },
      // "Find my best cards": the page lives in app/analyse (its result page stays at /analyse/result).
      { source: '/find-my-best-cards', destination: '/analyse' },
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ]
  },
};

export default nextConfig;
