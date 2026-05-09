/** @type {import('next').NextConfig} */
const nextConfig = {
  // Proxy API calls to the Go backend in development
  // so we avoid CORS issues when running locally
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
