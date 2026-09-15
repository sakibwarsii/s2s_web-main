import type { NextConfig } from "next";

// Was hardcoded to http://127.0.0.1:8000 — worked fine locally but is a
// hard deploy blocker: on Vercel (or anywhere else) nothing is listening
// there, so every /api and /ws call would silently fail. Now reads the
// real backend URL from an env var, falling back to localhost so local
// `npm run dev` behaves exactly as before with zero setup. Set
// BACKEND_URL in Vercel's project settings to the deployed backend's
// actual URL (e.g. https://your-app.up.railway.app) once it exists.
const rawBackendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:8000';
// Defensive: if BACKEND_URL is set but missing its scheme (e.g. someone pastes
// just "xxx.up.railway.app" instead of "https://xxx.up.railway.app" — an easy
// slip when copying from Railway's UI), Next's rewrites() rejects the
// resulting destination outright at build time ("Invalid rewrites found"),
// failing the whole deploy with no build output at all. Normalize instead of
// trusting the env var to always include http(s)://.
const backendUrl = /^https?:\/\//i.test(rawBackendUrl) ? rawBackendUrl : `https://${rawBackendUrl}`;

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    'behind-york-franklin-nested.trycloudflare.com',
    '*.trycloudflare.com',
    'localhost:3000'
  ],
  experimental: {
    middlewareClientMaxBodySize: 50 * 1024 * 1024,
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
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*` // Proxy API requests to backend
      },
      {
        source: '/ws/:path*',
        destination: `${backendUrl}/ws/:path*` // Proxy WebSocket requests to backend
      }
    ];
  }
};

export default nextConfig;
