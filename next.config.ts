import type { NextConfig } from "next";

// Server-side only. Local development can point to a local FastAPI process;
// production continues to use Railway unless Vercel explicitly overrides it.
const backendOrigin = (
  process.env.EARNN_BACKEND_ORIGIN
  ?? 'https://earnn-platform-production.up.railway.app'
).replace(/\/$/, '')

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
    ]
  },
};

export default nextConfig;
