import type { NextConfig } from "next";

const securityHeaders = [
  // Prevent clickjacking attacks
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  // Prevent MIME type sniffing
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  // Force HTTPS (enable once deployed with TLS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  // Referrer policy — only send origin for cross-origin requests
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  // Permissions policy — disable unnecessary browser APIs
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  // XSS protection (legacy, belt-and-suspenders)
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  // Content Security Policy
  // 'unsafe-inline' for styles is required by Tailwind CSS v4 / shadcn
  // 'unsafe-eval' is needed by Next.js in dev; will be tightened in production via env
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js scripts, RSC payloads
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
      // Tailwind v4 CSS-in-JS, glassmorphism inline styles
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Google Fonts, Cloudinary assets, Supabase storage
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https:",
      // Supabase REST & Auth endpoints
      `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com`,
      "media-src 'self'",
      "frame-src 'self' https://www.google.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // ─── Security Headers ────────────────────────────────────────────────────────
  async headers() {
    return [
      {
        // Apply to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  // ─── Image Optimization ──────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    // Cache optimized images for 30 days
    minimumCacheTTL: 2592000,
  },

  // ─── Compiler Optimizations ──────────────────────────────────────────────────
  compiler: {
    // Strip console.log in production builds
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },

  // ─── Experimental ────────────────────────────────────────────────────────────
  experimental: {
    // Enable partial pre-rendering for faster TTFB on static shells
    ppr: false, // Set true when Vercel PPR is stable for the project
    // Optimize package imports to reduce bundle size
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "@supabase/ssr",
    ],
  },

  // ─── Redirects ───────────────────────────────────────────────────────────────
  async redirects() {
    return [
      // Redirect /admin root to dashboard
      {
        source: "/admin",
        destination: "/admin/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
