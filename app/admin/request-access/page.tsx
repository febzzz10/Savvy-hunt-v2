"use client";
import { useQuery } from "convex/react";
import { ref } from "@/components/data";
export default function Page() { const key = useQuery(ref<Record<string, never>, string | null>("admins:getIdentityKey"), {}); return <main id="main-content" tabIndex={-1} className="shell"><h1>Admin access request</h1><p>Give this identity key to an existing super admin through your organization’s approved channel. It grants no access by itself.</p><code>{key || "Sign in to view your key"}</code></main>; }
