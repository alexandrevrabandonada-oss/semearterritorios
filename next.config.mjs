/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["@napi-rs/canvas"],
    outputFileTracingIncludes: {
      "/api/memoria/*": ["./node_modules/@napi-rs/canvas*/**/*"],
    },
  },
};

export default nextConfig;
