import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Kasa · DoKosti",
  robots: { index: false },
  manifest: "/admin/kasa/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Kasa DoKosti", statusBarStyle: "default" },
  icons: { apple: "/brand/icon-192.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false, themeColor: "#1f3a2d" };

/** Kasa má vlastní celoobrazovkové rozhraní bez menu administrace. Jen pro přihlášené správce a obsluhu. */
export default async function PosLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login?next=/admin/kasa");
  return <div className="flex min-h-full flex-1 flex-col bg-cream">{children}</div>;
}
