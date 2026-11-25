"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { EventDialog } from "./events/shared";

/** One page header for every admin module: title, one-line purpose, optional back link and actions. */
export function AdminPageHeader({ title, description, back, actions }: { title: string; description?: ReactNode; back?: { href: string; label: string }; actions?: ReactNode }) {
  return <header className="admin-page-head">
    <div className="admin-page-title">
      {back && <Link className="admin-back" href={back.href}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>{back.label}</Link>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
    {actions && <div className="admin-page-actions">{actions}</div>}
  </header>;
}

export type Feedback = { tone: "success" | "error"; message: string; key: number };

/** Page-level result of an action. Success clears itself; errors stay until dismissed or replaced. */
export function useFeedback() {
  const [feedback, setFeedback] = useState<Feedback>();
  const success = useCallback((message: string) => setFeedback({ tone: "success", message, key: Date.now() }), []);
  const error = useCallback((message: string) => setFeedback({ tone: "error", message, key: Date.now() }), []);
  const clear = useCallback(() => setFeedback(undefined), []);
  return { feedback, success, error, clear };
}

/**
 * Fixed to the bottom of the viewport so the result of an action is visible wherever the action
 * happened, even far down a long feed. The live region is always mounted so updates are announced.
 */
export function FeedbackToast({ feedback, onDismiss }: { feedback?: Feedback; onDismiss: () => void }) {
  useEffect(() => {
    if (feedback?.tone !== "success") return;
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [feedback, onDismiss]);
  return <div className="admin-toast-region" aria-live="polite">
    {feedback && <div className="admin-toast" data-tone={feedback.tone} key={feedback.key} role={feedback.tone === "error" ? "alert" : "status"}>
      <svg className="admin-toast-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{feedback.tone === "success" ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : <><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5.5m0 3.4v.1" /></>}</svg>
      <p>{feedback.message}</p>
      <button type="button" onClick={onDismiss} aria-label="Dismiss message"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
    </div>}
  </div>;
}

/** Confirmation for actions with public or irreversible effects. Errors stay inside the dialog. */
export function ConfirmDialog({ title, children, confirmLabel, busyLabel = "Working…", tone = "primary", busy, error, onCancel, onConfirm }: {
  title: string; children: ReactNode; confirmLabel: string; busyLabel?: string; tone?: "primary" | "danger";
  busy: boolean; error?: string; onCancel: () => void; onConfirm: () => void;
}) {
  return <EventDialog title={title} busy={busy} onClose={onCancel}>
    <div className="event-dialog-body">
      {children}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
    <footer className="event-dialog-footer actions">
      <button type="button" className="button secondary" disabled={busy} onClick={onCancel}>Cancel</button>
      <button type="button" className={`button${tone === "danger" ? " danger" : ""}`} disabled={busy} onClick={onConfirm}>{busy ? busyLabel : confirmLabel}</button>
    </footer>
  </EventDialog>;
}

/** Single-choice filter rendered as a row of toggle buttons. */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string; count?: number }>; onChange: (value: T) => void }) {
  return <div className="admin-segmented" role="group" aria-label={label}>
    {options.map(option => <button type="button" key={option.value} aria-pressed={value === option.value} onClick={() => onChange(option.value)}>
      {option.label}{option.count !== undefined && <>{" "}<span className="admin-segmented-count">{option.count}</span></>}
    </button>)}
  </div>;
}

/** Plain-language gallery review states; "draft" is the legacy name for a photo awaiting review. */
export function photoStatus(approvalStatus: string) {
  const status = approvalStatus === "draft" ? "pending" : approvalStatus;
  const labels: Record<string, string> = { pending: "Awaiting review", approved: "Published", rejected: "Rejected", hidden: "Hidden" };
  return { status, label: labels[status] ?? status };
}

/** Shared Asia/Kolkata timestamp for admin metadata, e.g. "26 Nov 2026, 9:15 am". */
export function adminTime(value: number) {
  return new Date(value).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}
