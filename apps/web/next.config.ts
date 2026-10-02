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
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
