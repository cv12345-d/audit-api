/** @type {import('next').NextConfig} */
const nextConfig = {
  // L'API backend tourne sur le port 3000
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
