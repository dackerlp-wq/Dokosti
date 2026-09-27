import { NextResponse } from "next/server";

/** Manifest pro instalaci kasy na plochu tabletu (PWA). */
export function GET() {
  return NextResponse.json(
    {
      name: "Kasa DoKosti",
      short_name: "Kasa",
      start_url: "/admin/kasa",
      scope: "/admin/",
      display: "standalone",
      orientation: "any",
      background_color: "#f3ecdd",
      theme_color: "#1f3a2d",
      lang: "cs",
      icons: [
        { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" } },
  );
}
