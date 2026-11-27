import type { NextConfig } from "next";

// The /lab prototypes (and their films in public/lab) stay on local dev and
// the branch previews; production sends them home at the edge, so they cost
// no render, no regeneration on a publish and no transfer there.
const isProduction = process.env.VERCEL_ENV === "production";

const nextConfig: NextConfig = {
  cacheComponents: true,
  async redirects() {
    return isProduction ? [{ source: "/lab/:path*", destination: "/", permanent: false }] : [];
  },
  experimental: {
    optimizePackageImports: ["gsap", "lenis", "@sanity/client", "next-sanity"],
    // Two root layouts ((site), (studio)) leave no layout to compose a 404
    // from, so an unmatched URL got Next's default page: see
    // src/app/global-not-found.tsx.
    globalNotFound: true,
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
    ],
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920, 2560],
  },
};

export default nextConfig;
