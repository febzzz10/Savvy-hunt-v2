"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { Doc } from "@/convex/_generated/dataModel";

export type EventRecord = Doc<"events">;
export const statuses = ["upcoming", "live", "completed", "postponed", "cancelled"] as const;
export type EventStatus = typeof statuses[number];
export const statusLabel = (status: string) => status.charAt(0).toUpperCase() + status.slice(1);
export const localDate = (value: number) => new Date(value + 330 * 60_000).toISOString().slice(0, 16);
export const eventDate = (value: number) => new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });

export function useUnsavedChanges(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    const navigate = (event: MouseEvent) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (anchor && !event.defaultPrevented && !window.confirm("Discard your unsaved changes?")) {
        event.preventDefault(); event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [dirty]);
}

export function EventDialog({ title, children, onClose, busy = false, dirty = false }: { title: string; children: ReactNode; onClose: () => void; busy?: boolean; dirty?: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => { element?.close(); document.body.style.overflow = overflow; trigger?.focus(); };
  }, []);
  function close() { if (!busy && (!dirty || window.confirm("Discard your unsaved changes?"))) onClose(); }
  return <dialog ref={dialog} className="event-dialog" aria-labelledby="event-dialog-title" onCancel={event => { event.preventDefault(); close(); }} onKeyDown={event => {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, summary, [tabindex="0"]')).filter(element => !element.matches(":disabled") && element.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }}>
    <header className="event-dialog-header"><h2 id="event-dialog-title">{title}</h2><button type="button" className="button secondary" disabled={busy} onClick={close} aria-label="Close dialog">Close</button></header>
    {children}
  </dialog>;
}
