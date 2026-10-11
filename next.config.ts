import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/decouvrir-siggie',
        destination: '/decouvrir-dpharma',
        permanent: true,
      },
      {
        source: '/demo',
        destination: '/decouvrir-dpharma',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
