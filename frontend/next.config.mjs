/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Docker standalone output
  output: "standalone",

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
