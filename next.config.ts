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
  // the old /compare and /all-uae-cards links go to the matching new page.
  async redirects() {
    return [
      { source: '/compare', destination: '/compare-all-uae-cards', permanent: true },
      { source: '/simulate', destination: '/simulate-all-uae-cards', permanent: true },
      { source: '/all-uae-cards', destination: '/simulate-all-uae-cards', permanent: true },
    ]
  },
  async rewrites() {
    return [
      { source: '/simulate-all-uae-cards', destination: '/simulate' },
      { source: '/compare-all-uae-cards', destination: '/compare' },
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ]
  },
};

export default nextConfig;
