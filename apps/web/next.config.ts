import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Disable image optimization for MVP
  images: {
    unoptimized: true,
  },

  // Enable experimental features for better performance
  experimental: {
    // Ensure dynamic imports work correctly with SSR false
    dynamicIO: true,
  },

  // CORS and API configuration
  async rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [],
      fallback: [],
    };
  },

  // Webpack configuration for Leaflet
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /leaflet\.css$/,
      use: ["style-loader", "css-loader"],
    });

    return config;
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  },

  // React strict mode for development
  reactStrictMode: true,

  // Compression
  compress: true,

  // Production source maps disabled for security
  productionBrowserSourceMaps: false,

  // SwcMinify enabled by default in Next.js 13+
  swcMinify: true,

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
