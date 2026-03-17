import type { NextConfig } from "next";
import path from "path";
import { config } from "dotenv";

// Load .env.local into process.env when Next starts (fixes API routes not seeing OPEN_AI_API_KEY)
config({ path: path.join(process.cwd(), ".env.local") });

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
