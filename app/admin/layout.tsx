"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { ref } from "@/components/data";
import { ConnectionStatus } from "@/components/connection-status";

const links = [["/admin", "Overview"], ["/admin/schools", "Schools"], ["/admin/events", "Events"], ["/admin/scoreboard", "Scoreboard"], ["/admin/announcements", "Announcements"], ["/admin/gallery", "Gallery"]];
const restricted = [["/admin/settings", "Settings"], ["/admin/admins", "Admins"], ["/admin/audit", "Audit"]];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const self = useQuery(ref<Record<string, never>, { role: string; displayName: string } | null>("admins:getSelf"), isAuthenticated ? {} : "skip");
  if (["/admin/login", "/admin/setup", "/admin/request-access"].includes(pathname)) return children;
  if (!isLoaded || isLoading) return <main id="main-content" tabIndex={-1} className="shell"><p role="status">Checking admin access…</p></main>;
  if (!isSignedIn || !isAuthenticated) return <main id="main-content" tabIndex={-1} className="shell"><h1>Admin sign in required</h1><Link href="/admin/login">Sign in to continue</Link></main>;
  if (self === undefined) return <main id="main-content" tabIndex={-1} className="shell"><p role="status">Checking admin access…</p></main>;
  if (!self) return <main id="main-content" tabIndex={-1} className="shell"><h1>Access denied</h1><p>Your account is not on the active admin allowlist.</p><Link href="/admin/request-access">View your identity key</Link><p><SignOutButton redirectUrl="/admin/login"><button className="button secondary">Sign out</button></SignOutButton></p></main>;
  const forbidden = self.role !== "super_admin" && restricted.some(([href]) => pathname === href || pathname.startsWith(`${href}/`));
  return <><a className="skip-link" href="#main-content">Skip to content</a><nav className="nav" aria-label="Admin navigation"><Link className="brand" href="/admin">SAVVY HUNT / ADMIN</Link>{[...links, ...(self.role === "super_admin" ? restricted : [])].map(([href, label]) => <Link key={href} href={href} aria-current={(pathname === href || href === "/admin/events" && pathname.startsWith(`${href}/`)) ? "page" : undefined}>{label}</Link>)}<Link href="/">Public site</Link><SignOutButton redirectUrl="/admin/login"><button className="button secondary">Sign out</button></SignOutButton></nav><ConnectionStatus /><main id="main-content" tabIndex={-1} className="shell">{forbidden ? <><h1>Super admin access required</h1><p>Your editor account can manage events, drafts, and photos. A super admin manages this page.</p><Link href="/admin">Return to overview</Link></> : children}</main></>;
}
