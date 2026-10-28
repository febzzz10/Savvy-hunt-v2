import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { Providers } from "./providers";
import type { Metadata } from "next";
export const metadata: Metadata = { title: { default: "Savvy Hunt", template: "%s | Savvy Hunt" }, description: "School event schedules, official results, live standings, and approved snapshots." };
export default function RootLayout({children}:{children:React.ReactNode}){return <ClerkProvider><html lang="en"><body><Providers>{children}</Providers></body></html></ClerkProvider>}
