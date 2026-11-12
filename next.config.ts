import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const nextConfig: NextConfig = {
  // reactStrictMode: true deliberately double-invokes useEffect hooks in
  // development to help surface side-effect bugs. The side-effect here is
  // that every page load fires every API call twice, which doubles the
  // MongoDB operations during development and local testing.
  //
  // In production Next.js never double-invokes effects regardless of this
  // flag, so changing it does not affect the production build in any way.
  //
  // Set to false to stop duplicate API requests in development.
  // Re-enable temporarily when debugging effect cleanup issues.
  reactStrictMode: false,

  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
