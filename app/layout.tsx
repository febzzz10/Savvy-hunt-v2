import "./globals.css";
import { Fraunces, DM_Sans } from "next/font/google";
import { Footer } from "@/components/editorial";
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-editorial", display: "swap" });
const dm = DM_Sans({ subsets: ["latin"], variable: "--font-dm", display: "swap" });
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "./providers";
import type { Metadata, Viewport } from "next";
import { SITE_URL } from "@/lib/site";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Savvy Hunt", template: "%s | Savvy Hunt" },
  description: "School event schedules, official results, live standings, and approved snapshots.",
  openGraph: { type: "website", siteName: "Savvy Hunt" },
};
// viewport-fit=cover lets Dynaura place its island inside the iOS safe area; globals.css pads the body to match.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({children}:{children:React.ReactNode}){return <ClerkProvider><html lang="en"><body className={`${fraunces.variable} ${dm.variable}`} suppressHydrationWarning><Providers>{children}</Providers><Footer /><Analytics /></body></html></ClerkProvider>}
