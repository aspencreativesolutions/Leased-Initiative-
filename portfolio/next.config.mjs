import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CRAFT_URL = process.env.CLIENT_CRAFT_URL || "http://127.0.0.1:3021";
const API_URL = process.env.CLIENT_CRAFT_API_URL || "http://localhost:3001";

const craftRewrites = [
  { source: "/api/:path*", destination: `${API_URL}/api/:path*` },
  { source: "/studio", destination: `${CRAFT_URL}/studio` },
  { source: "/studio/:path*", destination: `${CRAFT_URL}/studio/:path*` },
  { source: "/portal", destination: `${CRAFT_URL}/portal` },
  { source: "/portal/:path*", destination: `${CRAFT_URL}/portal/:path*` },
  { source: "/login", destination: `${CRAFT_URL}/login` },
  { source: "/register", destination: `${CRAFT_URL}/register` },
  { source: "/check-email", destination: `${CRAFT_URL}/check-email` },
  { source: "/verify-email", destination: `${CRAFT_URL}/verify-email` },
  { source: "/@react-refresh", destination: `${CRAFT_URL}/@react-refresh` },
  { source: "/@vite/:path*", destination: `${CRAFT_URL}/@vite/:path*` },
  { source: "/@fs/:path*", destination: `${CRAFT_URL}/@fs/:path*` },
  { source: "/@id/:path*", destination: `${CRAFT_URL}/@id/:path*` },
  { source: "/src/:path*", destination: `${CRAFT_URL}/src/:path*` },
  { source: "/node_modules/:path*", destination: `${CRAFT_URL}/node_modules/:path*` },
  { source: "/assets/:path*", destination: `${CRAFT_URL}/assets/:path*` },
  { source: "/images/payment-logos/:path*", destination: `${CRAFT_URL}/images/payment-logos/:path*` },
  { source: "/favicon.svg", destination: `${CRAFT_URL}/favicon.svg` },
  { source: "/manifest.webmanifest", destination: `${CRAFT_URL}/manifest.webmanifest` },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async rewrites() {
    return craftRewrites;
  },
};

export default nextConfig;
