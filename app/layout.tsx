import "./globals.css";
import { Fraunces, DM_Sans } from "next/font/google";
import { Footer } from "@/components/editorial";
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-editorial", display: "swap" });
const dm = DM_Sans({ subsets: ["latin"], variable: "--font-dm", display: "swap" });
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Providers } from "./providers";
import type { Metadata, Viewport } from "next";
import { SITE_NAME, SITE_URL, SITE_YEAR } from "@/lib/site";
import { HOME_META, siteSchema } from "@/lib/structured-data";
import { JsonLd } from "@/components/structured-data";
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: HOME_META.title, template: `%s | ${SITE_NAME} ${SITE_YEAR}` },
  description: HOME_META.description,
  // og:title and og:description are derived per page from the resolved title and description.
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};
// viewport-fit=cover lets Dynaura place its island inside the iOS safe area; globals.css pads the body to match.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };
export default function RootLayout({children}:{children:React.ReactNode}){return <ClerkProvider><html lang="en"><body className={`${fraunces.variable} ${dm.variable}`} suppressHydrationWarning><JsonLd data={siteSchema()} /><Providers>{children}</Providers><Footer /><Analytics /><SpeedInsights /></body></html></ClerkProvider>}
