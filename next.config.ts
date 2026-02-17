import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,

  // Ignore les erreurs TypeScript pendant le build Vercel
  typescript: {
    ignoreBuildErrors: true,
  },

  // Optionnel : désactive l'en-tête "X-Powered-By: Next.js"
  poweredByHeader: false,
};

export default nextConfig;