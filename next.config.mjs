/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next 14 keeps trace includes behind the experimental namespace.
  experimental: {
    outputFileTracingIncludes: {
      "/api/fec/import-batches": [
        "./server/fec-pdf-worker.cjs",
        "./server/fec-docx-worker.cjs",
        "./node_modules/pdf-parse/**/*",
        "./node_modules/mammoth/**/*",
        "./node_modules/@xmldom/xmldom/**/*",
        "./node_modules/argparse/**/*",
        "./node_modules/base64-js/**/*",
        "./node_modules/bluebird/**/*",
        "./node_modules/dingbat-to-unicode/**/*",
        "./node_modules/jszip/**/*",
        "./node_modules/lop/**/*",
        "./node_modules/path-is-absolute/**/*",
        "./node_modules/underscore/**/*",
        "./node_modules/xmlbuilder/**/*",
        "./node_modules/lie/**/*",
        "./node_modules/pako/**/*",
        "./node_modules/readable-stream/**/*",
        "./node_modules/setimmediate/**/*",
      ],
      "/api/fec/evidence-responses": [
        "./server/fec-pdf-worker.cjs",
        "./node_modules/pdf-parse/**/*",
      ],
    },
  },
};
export default nextConfig;
