import type { Metadata } from "next";

export const metadata: Metadata = { title: "Official results", description: "Official Savvy Hunt event results, winners and published points, updated by organizers as each result is confirmed.", alternates: { canonical: "/results" } };

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
