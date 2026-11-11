"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConvexAuth, useQuery } from "convex/react";
import { SignOutButton, useAuth } from "@clerk/nextjs";
import { ref } from "@/components/data";
import { AdminShell } from "@/components/admin/admin-shell";
import "@/components/admin/admin-pages.css";

const restricted = ["/admin/settings", "/admin/admins", "/admin/audit"];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading, isAuthenticated } = useConvexAuth();
  const self = useQuery(ref<Record<string, never>, { role: string; displayName: string } | null>("admins:getSelf"), isAuthenticated ? {} : "skip");
  if (["/admin/login", "/admin/setup", "/admin/request-access"].includes(pathname)) return children;
  if (!isLoaded || isLoading) return <main id="main-content" tabIndex={-1} className="shell"><p role="status">Checking admin access…</p></main>;
  if (!isSignedIn || !isAuthenticated) return <main id="main-content" tabIndex={-1} className="shell auth-panel"><span className="eyebrow">Organizer workspace</span><h1>Admin sign in required</h1><p>Sign in with your staff account to manage the programme, results and photographs.</p><div className="actions"><Link className="button" href="/admin/login">Sign in to continue</Link><Link className="button secondary" href="/">Public site</Link></div></main>;
  if (self === undefined) return <main id="main-content" tabIndex={-1} className="shell"><p role="status">Checking admin access…</p></main>;
  if (!self) return <main id="main-content" tabIndex={-1} className="shell auth-panel"><span className="eyebrow">Organizer workspace</span><h1>Access denied</h1><p>Your account is not on the active admin allowlist.</p><Link className="text-link" href="/admin/request-access">View your identity key</Link><div className="actions"><SignOutButton redirectUrl="/admin/login"><button className="button secondary">Sign out</button></SignOutButton><Link className="button secondary" href="/">Public site</Link></div></main>;
  const forbidden = self.role !== "super_admin" && restricted.some(href => pathname === href || pathname.startsWith(`${href}/`));
  return <AdminShell identity={`${self.displayName} · ${self.role === "super_admin" ? "Super admin" : "Editor"}`} role={self.role as "editor" | "super_admin"}>{forbidden ? <><h1>Super admin access required</h1><p>Your editor account can manage events, drafts, and photos. A super admin manages this page.</p><Link href="/admin">Return to overview</Link></> : children}</AdminShell>;
}
