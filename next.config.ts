import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  experimental: {
    optimizePackageImports: ["gsap", "lenis", "@sanity/client", "next-sanity"],
  },
  images: {
    // Sanity's CDN does the resizing; see src/sanity/lib/imageLoader.ts.
    loader: "custom",
    loaderFile: "./src/sanity/lib/imageLoader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920, 2560],
  },
};

export default nextConfig;
