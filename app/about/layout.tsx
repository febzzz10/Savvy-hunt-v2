import type { Metadata } from "next";

export const metadata: Metadata = { title: "About", description: "About Savvy Hunt: the school competition programme, its categories, participating schools and the organizers behind it.", alternates: { canonical: "/about" } };

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
