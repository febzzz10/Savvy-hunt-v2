"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { mut, ref } from "@/components/data";
import { friendlyResultsError } from "@/lib/results-editor";

type Admin = { _id: string; authUserId: string; displayName: string; role: "editor" | "super_admin"; isActive: boolean };

export default function Page() {
  const admins = useQuery(ref<Record<string, never>, Admin[]>("admins:list"), {});
  const save = useMutation(mut<{ authUserId: string; displayName: string; role: "editor" | "super_admin"; isActive: boolean }, string>("admins:save"));
  const [authUserId, setIdentity] = useState(""), [displayName, setName] = useState(""), [role, setRole] = useState<"editor" | "super_admin">("editor");
  const [notice, setNotice] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState<string | null>(null);
  async function update(values: Parameters<typeof save>[0], success: string) {
    setBusy(values.authUserId); setError(""); setNotice("");
    try { await save(values); setNotice(success); return true; }
    catch (cause) { setError(friendlyResultsError(cause)); return false; }
    finally { setBusy(null); }
  }
  return <div className="admins-page">
    <h1>Administrators</h1>
    <p className="admins-intro">Use the provider-scoped identity key shown in the intended admin’s Clerk and Convex session. A Clerk account alone never grants site access.</p>
    <section className="admin-access-guide card"><span className="eyebrow">Access model</span><div className="admin-access-guide-grid"><div><strong>Editors</strong><p className="small">Manage events, results, schools, gallery, and announcements.</p></div><div><strong>Super admins</strong><p className="small">Everything editors can do, plus publishing, public content, admin access, and audit history.</p></div></div></section>
    <form className="card admin-grant-form" onSubmit={async event => { event.preventDefault(); if (await update({ authUserId, displayName, role, isActive: true }, "Admin access saved")) { setIdentity(""); setName(""); } }}>
      <header><h2>Grant admin access</h2><p className="small">Add an identity that has already signed in through Clerk.</p></header>
      <label className="field"><span>Identity key</span><input required value={authUserId} onChange={event => setIdentity(event.target.value)} placeholder="test|user_…" /></label>
      <label className="field"><span>Display name</span><input required value={displayName} onChange={event => setName(event.target.value)} /></label>
      <label className="field"><span>Role</span><select value={role} onChange={event => setRole(event.target.value as "editor" | "super_admin")}><option value="editor">Editor</option><option value="super_admin">Super admin</option></select></label>
      <button className="button" disabled={Boolean(busy)}>{busy === authUserId ? "Saving…" : "Grant access"}</button>
    </form>
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="success" role="status">{notice}</p>}
    <section className="admin-list"><header><div><span className="eyebrow">Access list</span><h2>Admin access list</h2></div><span className="pill">{admins?.filter(admin => admin.isActive).length ?? "—"} active</span></header>
      {admins === undefined ? <p>Loading admin access…</p> : !admins.length ? <div className="empty-state"><h3>No administrators yet</h3><p>Grant access to the first organizer using their identity key.</p></div> : admins.map(admin => <article className="card admin-card" key={admin._id}>
        <div className="admin-card-identity"><strong>{admin.displayName}</strong><p>{admin.authUserId}</p></div>
        <div className="admin-card-meta"><span className="pill" data-status={admin.isActive ? admin.role === "super_admin" ? "published" : "approved" : "cancelled"}>{admin.role === "super_admin" ? "Super admin" : "Editor"} · {admin.isActive ? "active" : "revoked"}</span></div>
        <div className="actions">
          <button className="button secondary" disabled={Boolean(busy)} onClick={() => { const next = admin.role === "editor" ? "super_admin" : "editor"; if (!confirm(`Change ${admin.displayName} to ${next === "super_admin" ? "super admin" : "editor"}?`)) return; void update({ authUserId: admin.authUserId, displayName: admin.displayName, role: next, isActive: admin.isActive }, "Role updated"); }}>Change role</button>
          <button className="button secondary" disabled={Boolean(busy)} onClick={() => { if (admin.isActive && !confirm(`Revoke ${admin.displayName}'s admin access?`)) return; void update({ authUserId: admin.authUserId, displayName: admin.displayName, role: admin.role, isActive: !admin.isActive }, "Access updated"); }}>{busy === admin.authUserId ? "Updating…" : admin.isActive ? "Revoke" : "Reactivate"}</button>
        </div>
      </article>)}
    </section>
  </div>;
}
