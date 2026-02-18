/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  typescript: {
    ignoreBuildErrors: true,
  },

  poweredByHeader: false,

  serverExternalPackages: ["@prisma/client"],

  // Force SWC (stable) au lieu de Turbopack
  experimental: {
    // @ts-ignore — turbopack n'est pas dans les types officiels
    turbopack: false,
  },
};

export default nextConfig;