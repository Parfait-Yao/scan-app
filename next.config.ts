import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,

  typescript: {
    ignoreBuildErrors: true, // garde ça pour le moment
  },

  poweredByHeader: false,

  // Force Vercel à inclure les fichiers Prisma
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
};

export default nextConfig;