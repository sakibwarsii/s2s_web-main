import type { NextConfig } from "next";

// Was hardcoded to http://127.0.0.1:8000 — worked fine locally but is a
// hard deploy blocker: on Vercel (or anywhere else) nothing is listening
// there, so every /api and /ws call would silently fail. Now reads the
// real backend URL from an env var, falling back to localhost so local
// `npm run dev` behaves exactly as before with zero setup. Set
// BACKEND_URL in Vercel's project settings to the deployed backend's
// actual URL (e.g. https://your-app.up.railway.app) once it exists.
const rawBackendUrl = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'https://signova-backend-baas.onrender.com';
// Defensive: if BACKEND_URL is set but missing its scheme, normalize it
const backendUrl = /^https?:\/\//i.test(rawBackendUrl) ? rawBackendUrl : `https://${rawBackendUrl}`;

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'behind-york-franklin-nested.trycloudflare.com',
    '*.trycloudflare.com',
    'localhost:3000'
  ],
  experimental: {
    proxyClientMaxBodySize: 50 * 1024 * 1024,
  },
  images: {
    // Allow external images from all domains used by Visual Assist
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/ws/:path*',
        destination: `${backendUrl}/ws/:path*` // Proxy WebSocket requests to backend
      },
      {
        source: '/api/:path((?!ping).*)',
        destination: `${backendUrl}/api/:path*` // Proxy API requests except ping to backend
      }
    ];
  }
};

export default nextConfig;
