import type { Metadata } from "next";

export const metadata: Metadata = { title: "Snapshots", description: "Approved photographs from Savvy Hunt events, published by organizers with permission from participating schools.", alternates: { canonical: "/snapshots" } };

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
