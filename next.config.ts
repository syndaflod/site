import type { NextConfig } from "next";
import { LINK_PREVIEW_BOTS } from "./src/lib/link-preview-bots";

const nextConfig: NextConfig = {
  // Next's default list plus the link-preview bots it misses (see src/lib/link-preview-bots.ts).
  htmlLimitedBots: LINK_PREVIEW_BOTS,
  devIndicators: false,
  allowedDevOrigins: ["127.0.0.1", "localhost", "172.17.65.100"],
};

export default nextConfig;
