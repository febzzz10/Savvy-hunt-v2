"use client";
import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Page() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const key = useQuery(api.admins.getIdentityKey, isAuthenticated ? {} : "skip");
  return <main id="main-content" tabIndex={-1} className="shell auth-panel">
    <h1>Admin access request</h1>
    <p>Give this complete identity key to an existing super admin through your organization&apos;s approved channel. It grants no access by itself. Copy the entire value, including the issuer and the separator.</p>
    {isLoading || isAuthenticated && key === undefined ? <p role="status">Checking your identity...</p>
      : key ? <code>{key}</code> : <p><Link href="/admin/login">Sign in to view your key</Link>.</p>}
    <p>For a new installation with no admins, the deployment owner must complete the one-time terminal setup described in the admin setup guide. This page cannot grant access.</p>
    <p><Link href="/admin">Return to admin</Link></p>
  </main>;
}
