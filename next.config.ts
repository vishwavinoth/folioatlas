import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  // The SQLite database is read at runtime via a computed path, which file
  // tracing cannot see. Ship it with every server route explicitly.
  outputFileTracingIncludes: {
    "/api/**/*": ["./db/custom.db"],
  },
};

export default nextConfig;
