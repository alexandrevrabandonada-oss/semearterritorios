/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 14 keeps trace includes behind the experimental namespace.
  experimental: {
    outputFileTracingIncludes: {
      "/api/fec/import-batches": [
        "./server/fec-pdf-worker.cjs",
        "./node_modules/pdf-parse/**/*",
      ],
      "/api/fec/evidence-responses": [
        "./server/fec-pdf-worker.cjs",
        "./node_modules/pdf-parse/**/*",
      ],
    },
  },
};
export default nextConfig;
