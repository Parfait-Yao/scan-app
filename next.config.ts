/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  typescript: {
    ignoreBuildErrors: true,
  },

  poweredByHeader: false,

  serverExternalPackages: ["@prisma/client"],   // garde-le, c’est bien

  // On supprime complètement le turbopack (il est invalide en Next.js 16)
  experimental: {
    // plus de turbopack ici
  },
};

export default nextConfig;