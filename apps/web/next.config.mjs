/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // pdfkit/exceljs read font/asset files via fs at runtime — keep them external
  // so Next requires them from node_modules instead of bundling.
  serverExternalPackages: ["pdfkit", "exceljs", "qrcode", "nodemailer"],
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
  async headers() {
    // Baseline security headers (XSS, clickjacking, MIME sniffing, HSTS).
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https://www.zohoapis.com https://accounts.zoho.com https://api.openai.com",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
