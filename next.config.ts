import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  outputFileTracingIncludes: {
    "/kalkulacka/plan.pdf": ["./public/fonts/**", "./public/brand/dokosti-logo-barevne-na-kremove.png"],
    "/kalkulacka": ["./public/fonts/**", "./public/brand/dokosti-logo-barevne-na-kremove.png"],
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
  },
};

export default nextConfig;
