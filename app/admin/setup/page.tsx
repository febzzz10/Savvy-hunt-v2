"use client";
import Link from "next/link";
import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Page() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const current = useQuery(api.editions.getCurrent, {});
  const self = useQuery(api.admins.getSelf, isAuthenticated ? {} : "skip");
  const initialize = useMutation(api.editions.initialize);
  const [edition, setEdition] = useState("Savvy Hunt");
  const [year, setYear] = useState(new Date().getFullYear());
  const [notice, setNotice] = useState("");

  return <main id="main-content" tabIndex={-1} className="shell auth-panel">
    <h1>Admin setup</h1>
    {isLoading || isAuthenticated && self === undefined ? <p role="status">Checking admin access...</p>
      : !isAuthenticated ? <p><Link href="/admin/login">Sign in</Link> to continue setup.</p>
      : !self ? <>
        <p>Your account needs approval before you can manage the event.</p>
        <p><Link href="/admin/request-access">View your identity key</Link> and share it with your organizer. If this is a new installation, the deployment owner must provision the first super admin from the terminal using the admin setup guide.</p>
      </> : self.role !== "super_admin" ? <p>A super admin must configure the event edition.</p>
      : current === undefined ? <p role="status">Loading event edition...</p>
      : current ? <p>The event edition is configured. <Link href="/admin">Open the admin dashboard</Link>.</p>
      : <form className="card" onSubmit={async event => {
        event.preventDefault();
        try {
          await initialize({ name: edition, year });
          setNotice("Edition and six categories created");
        } catch (error) { setNotice(String(error)); }
      }}>
        <h2>Create event edition</h2>
        <label className="field"><span>Edition name</span><input required value={edition} onChange={event => setEdition(event.target.value)} /></label>
        <label className="field"><span>Year</span><input required type="number" min={2000} value={year} onChange={event => setYear(Number(event.target.value))} /></label>
        <button className="button">Initialize edition</button>
      </form>}
    <p role="status">{notice}</p>
  </main>;
}
