"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef } from "react";
import { Icon } from "./ui";

const priorities = ["/scoreboard", "/schedule", "/results"];
const icons = { "/": "home", "/scoreboard": "trophy", "/schedule": "calendar", "/results": "results" } as const;
const matches = (path: string, href: string) => path === href || href !== "/" && path.startsWith(`${href}/`);

export function MobileNavigation({ links }: { links: string[][] }) {
  const pathname = usePathname();
  const sheet = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const direct = [["/", "Home"], ...links.filter(([href]) => priorities.includes(href))];
  const remaining = links.filter(([href]) => !priorities.includes(href));
  const close = () => sheet.current?.close();

  useEffect(() => {
    const dialog = sheet.current;
    const desktop = window.matchMedia("(min-width:960px)");
    const dismiss = () => dialog?.close();
    const resize = () => { if (desktop.matches) dismiss(); };
    desktop.addEventListener("change", resize);
    window.addEventListener("popstate", dismiss);
    return () => {
      desktop.removeEventListener("change", resize);
      window.removeEventListener("popstate", dismiss);
    };
  }, []);
  useEffect(() => { sheet.current?.close(); }, [pathname]);
  useEffect(() => {
    const dialog = sheet.current;
    if (!dialog) return;
    let previousOverflow = "";
    const release = () => {
      document.body.style.overflow = previousOverflow;
      trigger.current?.setAttribute("aria-expanded", "false");
      if (window.matchMedia("(max-width:959px)").matches) trigger.current?.focus();
    };
    const lock = () => {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      trigger.current?.setAttribute("aria-expanded", "true");
    };
    dialog.addEventListener("close", release);
    dialog.addEventListener("navigation-open", lock);
    return () => {
      dialog.removeEventListener("close", release);
      dialog.removeEventListener("navigation-open", lock);
      if (dialog.open) document.body.style.overflow = previousOverflow;
    };
  }, []);

  return <>
    <nav className="mobile-bottom-nav" aria-label="Mobile navigation">
      {direct.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} data-active={matches(pathname, href) || undefined}>
        <Icon name={icons[href as keyof typeof icons]} /><span>{label}</span>
      </Link>)}
      <button ref={trigger} type="button" aria-expanded="false" aria-controls={id} aria-haspopup="dialog" data-active={remaining.some(([href]) => matches(pathname, href)) || undefined} onClick={() => {
        sheet.current?.showModal();
        sheet.current?.dispatchEvent(new Event("navigation-open"));
      }}><Icon name="more" /><span>More</span></button>
    </nav>
    <dialog ref={sheet} id={id} className="mobile-navigation-sheet" aria-labelledby={`${id}-title`} onKeyDown={event => {
      if (event.key !== "Tab") return;
      const controls = event.currentTarget.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }} onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div className="mobile-sheet-content">
        <div className="mobile-sheet-heading"><h2 id={`${id}-title`}>Explore Savvy Hunt</h2><button type="button" className="button secondary" onClick={close} autoFocus>Close</button></div>
        <nav aria-label="More public destinations">{remaining.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined} data-active={matches(pathname, href) || undefined} onClick={close}>{label}<Icon name="arrow" /></Link>)}</nav>
      </div>
    </dialog>
  </>;
}
