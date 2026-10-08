import { execSync } from "node:child_process";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Dev-only: lets the footer show which commit the local server is running.
// Production builds keep the plain package.json version.
function devCommitHash(): string {
  if (process.env.NODE_ENV !== "development") return "";
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return "";
  }
}

// Enforced (not Report-Only): Firefox ignores Report-Only policies that have no
// report endpoint, so violations would be invisible. Next.js inlines hydration
// scripts, so script-src needs 'unsafe-inline' until nonces are wired through
// middleware.
const isDev = process.env.NODE_ENV === "development";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Map tiles (OSM, Esri, OpenTopoMap) plus facility photos from Wikimedia
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Dev also needs the HMR websocket
  `connect-src 'self'${isDev ? " ws://localhost:* ws://127.0.0.1:*" : ""}`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {},
  env: { APP_DEV_COMMIT: devCommitHash() },
  // Disable image optimization for MVP
  images: {
    unoptimized: true,
  },

  // React strict mode disabled — incompatible with Leaflet's map initialization
  // (strict mode double-mounts components, causing "map container already initialized" errors)
  reactStrictMode: false,

  // Compression
  compress: true,

  // Don't advertise the framework
  poweredByHeader: false,

  // Production source maps disabled for security
  productionBrowserSourceMaps: false,

  // Headers for security and performance
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy,
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
          {
            // Geolocation is used by the map toolbar's "locate me" button
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(self)",
          },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
