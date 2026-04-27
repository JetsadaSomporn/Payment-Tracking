import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Prevent clickjacking — never render inside a frame
          { key: "X-Frame-Options", value: "DENY" },
          // Prevent MIME sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Modern replacement for X-XSS-Protection (disabled intentionally per OWASP)
          { key: "X-XSS-Protection", value: "0" },
          // Isolate the browsing context — prevents cross-origin opener attacks
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // Block cross-origin reads of our resources
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          // Enforce cross-origin embedder requirements (enables powerful features safely)
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          // Prevent sensitive URLs from leaking via Referer header
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Restrict browser feature access
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=(), interest-cohort=()",
          },
          // Disable DNS prefetch to prevent URL leakage
          { key: "X-DNS-Prefetch-Control", value: "off" },
          ...(isDev
            ? []
            : [
                // Force HTTPS for 2 years
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=63072000; includeSubDomains; preload",
                },
              ]),
        ],
      },
      {
        source: "/api/:path*",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, max-age=0, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
          // Prevent API responses from being embedded in other sites
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
        ],
      },
      {
        // Static assets can be cached aggressively — Next.js content-hashes filenames
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
