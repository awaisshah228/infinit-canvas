import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/workflow',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
