import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/", destination: "/en/worth", permanent: false },
      {
        source: "/worth/:path*",
        destination: "/en/worth/:path*",
        permanent: false,
      },
      {
        source: "/creators/:path*",
        destination: "/en/creators/:path*",
        permanent: false,
      },
      { source: "/brands", destination: "/en/brands", permanent: false },
      { source: "/dashboard", destination: "/en/dashboard", permanent: false },
      {
        source: "/@:handle",
        destination: "/en/creators/:handle",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
