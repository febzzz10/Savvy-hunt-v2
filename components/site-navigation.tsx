"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import "./site-navigation.css";
import { MobileNavigation } from "./mobile-navigation";
import { ConnectionStatus } from "./connection-status";

export function SiteNavigation({ links, admin = false, identity, children }: { links: string[][]; admin?: boolean; identity?: string; children?: ReactNode }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [previousPath, setPreviousPath] = useState(pathname);
  if (previousPath !== pathname) {
    setPreviousPath(pathname);
    setExpanded(false);
  }
  const button = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  const home = !admin && pathname === "/";
  const menuId = useId();
  useEffect(() => {
    const desktop = window.matchMedia(admin ? "(min-width: 1200px)" : "(min-width: 960px)");
    const reset = () => { if (desktop.matches) setExpanded(false); };
    const close = () => setExpanded(false);
    desktop.addEventListener("change", reset);
    window.addEventListener("popstate", close);
    return () => {
      desktop.removeEventListener("change", reset);
      window.removeEventListener("popstate", close);
    };
  }, [admin]);
  useEffect(() => {
    if (!expanded) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setExpanded(false); button.current?.focus(); } };
    const outside = (event: PointerEvent) => { if (!header.current?.contains(event.target as Node)) setExpanded(false); };
    document.addEventListener("keydown", escape);
    document.addEventListener("pointerdown", outside);
    return () => { document.removeEventListener("keydown", escape); document.removeEventListener("pointerdown", outside); };
  }, [expanded]);
  return <header className={`responsive-navigation site-header${admin ? " admin-header" : home ? " home-header" : ""}`} ref={header}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <nav className="nav" aria-label={admin ? "Admin navigation" : "Public navigation"}>
      <Link className="brand" aria-current={pathname === (admin ? "/admin" : "/") ? "page" : undefined} href={admin ? "/admin" : "/"} onClick={() => setExpanded(false)}><span className="brand-name">SAVVY <br />HUNT{admin && <small>Organizers</small>}</span></Link>
      <button type="button" ref={button} className="menu-toggle button secondary" aria-expanded={expanded} aria-controls={menuId} onClick={() => setExpanded(!expanded)}><span className={home ? "sr-only" : undefined}>{expanded ? "Close" : "Menu"}</span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d={expanded ? "M6 6l12 12M6 18 18 6" : "M4 6h16M4 12h16M4 18h16"} /></svg></button>
      <div id={menuId} className={`nav-links${expanded ? " is-open" : ""}`} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && event.relatedTarget !== button.current) setExpanded(false); }}>
        {links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} data-section-active={pathname !== href && href !== "/" && (!admin || href !== "/admin") && pathname.startsWith(`${href}/`) || undefined} onClick={() => setExpanded(false)}>{label}</Link>)}{children}
      </div>
    </nav>
    {!admin && <MobileNavigation links={links} />}
    <div className="header-meta"><ConnectionStatus />{identity && <span className="staff-identity">{identity}</span>}</div>
  </header>;
}
