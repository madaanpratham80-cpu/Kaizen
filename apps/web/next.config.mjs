/** @type {import('next').NextConfig} */
const config = {
  async rewrites() {
    const origin = process.env.API_INTERNAL_ORIGIN;
    if (!origin) return [];

    const api = new URL(origin);
    if (
      !['http:', 'https:'].includes(api.protocol) ||
      api.username ||
      api.password ||
      api.pathname !== '/' ||
      api.search ||
      api.hash
    ) {
      throw new Error('API_INTERNAL_ORIGIN must be an HTTP or HTTPS origin.');
    }

    return [
      {
        source: '/api/v1/:path*',
        destination: `${api.origin}/api/v1/:path*`,
      },
    ];
  },
};

export default config;
