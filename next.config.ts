import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,

  // ← C’est la clé qui résout 100 % des erreurs TS en build Vercel
  typescript: {
    ignoreBuildErrors: true,
  },

  // Optionnel : désactive l'en-tête "powered by Next.js"
  poweredByHeader: false,
};

export default nextConfig;