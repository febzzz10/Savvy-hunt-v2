import "./globals.css";
import { Fraunces, DM_Sans } from "next/font/google";
import { Footer } from "@/components/editorial";
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-editorial", display: "swap" });
const dm = DM_Sans({ subsets: ["latin"], variable: "--font-dm", display: "swap" });
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "./providers";
import type { Metadata } from "next";
export const metadata: Metadata = { title: { default: "Savvy Hunt", template: "%s | Savvy Hunt" }, description: "School event schedules, official results, live standings, and approved snapshots." };
export default function RootLayout({children}:{children:React.ReactNode}){return <ClerkProvider><html lang="en"><body className={`${fraunces.variable} ${dm.variable}`}><Providers>{children}</Providers><Footer /></body></html></ClerkProvider>}
