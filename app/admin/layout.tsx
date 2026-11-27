import type { Metadata } from "next";
import { AdminLayoutClient } from "./admin-layout-client";

// The access gate is a client component, so the noindex tag lives here. robots.txt also disallows /admin.
export const metadata: Metadata = { title: { absolute: "Savvy Hunt organizer workspace" }, robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
