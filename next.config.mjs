/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Enable experimental features for cookie handling
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  // ✅ Configure headers for CORS and cookies
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ];
  },
  
  // ✅ Proxy backend requests to avoid cross-origin cookie issues
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'https://infer.e2enetworks.net/project/p-8621/endpoint/is-7549/:path*',
      },
      {
        source: '/api/whisper/:path*',
        destination: 'https://infer.e2enetworks.net/project/p-8621/endpoint/is-7545/:path*',
      },
    ];
  },
};

export default nextConfig;
