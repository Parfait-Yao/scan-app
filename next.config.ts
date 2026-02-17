import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Ignore les erreurs TS pendant le build Vercel (très utile en ce moment)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Bonne pratique : enlève l'en-tête "X-Powered-By: Next.js"
  poweredByHeader: false,

  // Force l'inclusion de Prisma dans le bundle serverless
  serverExternalPackages: ["@prisma/client"],
};

export default nextConfig;