import type { NextConfig } from "next";

// Server-side only. Local development can point to a local FastAPI process;
// production continues to use Railway unless Vercel explicitly overrides it.
const backendOrigin = (
  process.env.EARNN_BACKEND_ORIGIN
  || 'https://earnn-platform-production.up.railway.app'
).replace(/\/$/, '')

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  // Public URL is /all-uae-cards (the page itself still lives in app/compare); old /compare links redirect to it.
  async redirects() {
    return [{ source: '/compare', destination: '/all-uae-cards', permanent: true }]
  },
  async rewrites() {
    return [
      { source: '/all-uae-cards', destination: '/compare' },
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ]
  },
};

export default nextConfig;
