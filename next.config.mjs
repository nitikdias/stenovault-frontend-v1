/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
    // Only add the external rewrite when API_BASE_URL is configured.
    if (!apiBase) {
      console.warn('next.config.mjs: API_BASE_URL not set — skipping proxy rewrite');
      return [];
    }

    // Ensure there's no trailing slash on apiBase
    const base = apiBase.replace(/\/$/, '');

    return [
      {
        source: '/api/proxy/:path*',
        destination: `${base}/:path*`,
      },
    ];
  },
};

export default nextConfig;
