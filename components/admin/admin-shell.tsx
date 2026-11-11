"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import { SignOutButton } from "@clerk/nextjs";
import { ConnectionStatus } from "@/components/connection-status";
import "./admin-shell.css";

type Role = "editor" | "super_admin";
const groups: Array<[string, Array<[string, string]>]> = [
  ["Workspace", [["/admin", "Overview"], ["/admin/events", "Events & results"], ["/admin/schools", "Schools"], ["/admin/scoreboard", "Scoreboard"]]],
  ["Content", [["/admin/gallery", "Gallery"], ["/admin/announcements", "Announcements"]]],
];
const administration: Array<[string, string]> = [["/admin/settings", "Public content"], ["/admin/admins", "Admin access"], ["/admin/audit", "Audit history"]];

export function AdminShell({ children, identity, role }: { children: ReactNode; identity: string; role: Role }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [previousPath, setPreviousPath] = useState(pathname);
  if (previousPath !== pathname) {
    setPreviousPath(pathname);
    setExpanded(false);
  }
  const menuId = useId();
  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const close = () => { if (desktop.matches) setExpanded(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setExpanded(false); };
    desktop.addEventListener("change", close);
    document.addEventListener("keydown", escape);
    return () => {
      desktop.removeEventListener("change", close);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const current = (href: string) => pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
  const links = role === "super_admin" ? [...groups, ["Administration", administration] as [string, Array<[string, string]>]] : groups;
  return <div className="admin-frame">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="admin-rail">
      <div className="admin-rail-head">
        <Link className="admin-brand" href="/admin" aria-current={pathname === "/admin" ? "page" : undefined}>
          <span className="admin-brand-mark" aria-hidden="true">SH</span>
          <span>Savvy Hunt<small>Organizer workspace</small></span>
        </Link>
        <button type="button" className="admin-menu" aria-expanded={expanded} aria-controls={menuId} onClick={() => setExpanded(!expanded)}>
          {expanded ? "Close" : "Menu"}
        </button>
      </div>
      <div id={menuId} className={`admin-rail-body${expanded ? " is-open" : ""}`}>
        <nav className="admin-nav" aria-label="Admin navigation">
          {links.map(([label, items]) => <div className="admin-nav-group" key={label}>
            <p className="admin-nav-label">{label}</p>
            {items.map(([href, text]) => <Link key={href} href={href} className="admin-nav-link" aria-current={current(href) ? "page" : undefined} onClick={() => setExpanded(false)}>{text}</Link>)}
          </div>)}
        </nav>
        <div className="admin-rail-footer">
          <ConnectionStatus />
          <span className="admin-identity">{identity}</span>
          <div className="admin-rail-actions">
            <SignOutButton redirectUrl="/admin/login"><button className="admin-signout" type="button">Sign out</button></SignOutButton>
            <Link href="/" className="admin-public-link" onClick={() => setExpanded(false)}>Public site ↗</Link>
          </div>
        </div>
      </div>
    </aside>
    <main id="main-content" tabIndex={-1} className="shell admin-shell">{children}</main>
  </div>;
}
