"use client";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { Toaster, dynaura } from "dynaura";
import "dynaura/styles-no-font.css";
import { ref, useCurrent } from "./data";
import { detectNotificationMode, presentationFor, type NotificationMode } from "@/lib/notification-device";
import { announcementAnchor, announcementPreview, createAnnouncementTracker, type PublishedAnnouncement } from "@/lib/announcement-notifications";

// Device capability probe. A hidden fixed element resolves env(safe-area-inset-top) (needs viewport-fit=cover).
let probe: HTMLElement | undefined;
let portraitTopInset: number | undefined;
let cached: { key: string; mode: NotificationMode } | undefined;
function readMode(): NotificationMode {
  // Mobile browsers fire resize continuously while the URL bar collapses during scroll; only re-measure
  // (getComputedStyle forces a style recalc) when the width or orientation actually changes.
  const key = `${window.innerWidth}:${window.innerHeight >= window.innerWidth}`;
  if (cached?.key === key) return cached.mode;
  if (!probe) { probe = document.createElement("div"); probe.setAttribute("aria-hidden", "true"); probe.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top)"; document.body.appendChild(probe); }
  if (window.innerHeight >= window.innerWidth) portraitTopInset = parseFloat(getComputedStyle(probe).paddingTop) || 0;
  const mode = detectNotificationMode({ userAgent: navigator.userAgent, maxTouchPoints: navigator.maxTouchPoints, width: window.innerWidth, touchFirst: window.matchMedia("(pointer: coarse) and (hover: none)").matches, portraitTopInset });
  cached = { key, mode };
  return mode;
}
function subscribeMode(notify: () => void) {
  window.addEventListener("resize", notify); window.addEventListener("orientationchange", notify);
  return () => { window.removeEventListener("resize", notify); window.removeEventListener("orientationchange", notify); };
}
// The Toaster renders nothing on the server, so the server snapshot only needs to be stable.
const serverMode = (): NotificationMode => "desktop";

// Dynaura's show forces synchronous layout (about 100ms of main-thread time on a 6x-throttled phone CPU).
// Waiting for an idle moment keeps it from stacking on the render of the Convex update that delivered the
// announcement. Safari has no requestIdleCallback, so it gets a short timeout instead.
function whenIdle(run: () => void) {
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 500 });
  else setTimeout(run, 60);
}

const BrandMark = <span className="announcement-toast-mark" aria-hidden="true">SH</span>;

export function showAnnouncementToast(item: PublishedAnnouncement, open: (id: string) => void) {
  dynaura.info({
    id: `announcement:${item._id}`, title: item.title, icon: BrandMark, trailing: "Now", duration: 8000, queue: true,
    description: <div className="announcement-toast"><span className="announcement-toast-brand">Savvy Hunt · Notice board</span><span className="announcement-toast-body">{announcementPreview(item.body)}</span></div>,
    button: { title: "Read notice", onClick: () => open(item._id) },
    onClick: () => open(item._id),
  });
}

/**
 * Owns the single Dynaura <Toaster /> and announces newly published announcements.
 * It subscribes to the same public query as the notice board (published rows only), so drafts and
 * deleted announcements can never reach it, and it inherits the existing public visibility rules.
 */
export function AnnouncementNotifier() {
  const router = useRouter();
  const mode = useSyncExternalStore(subscribeMode, readMode, serverMode);
  const look = presentationFor(mode);
  const edition = useCurrent();
  const editionId = edition?._id;
  const items = useQuery(ref<{ editionId: string }, PublishedAnnouncement[]>("announcements:listPublic"), editionId ? { editionId } : "skip");
  const open = useCallback((id: string) => { dynaura.dismiss(`announcement:${id}`); router.push(`/#${announcementAnchor(id)}`); }, [router]);
  const show = useCallback((item: PublishedAnnouncement) => whenIdle(() => showAnnouncementToast(item, open)), [open]);

  // One tracker for the life of the app: its "seen" memory must survive re-renders.
  const [tracker] = useState(() => createAnnouncementTracker());
  useEffect(() => { tracker.setShow(show); }, [tracker, show]);

  useEffect(() => {
    if (items && editionId) tracker.update(editionId, items, document.visibilityState !== "hidden");
  }, [items, editionId, tracker]);

  useEffect(() => {
    const flush = () => { if (document.visibilityState === "visible") tracker.flush(); };
    document.addEventListener("visibilitychange", flush);
    return () => document.removeEventListener("visibilitychange", flush);
  }, [tracker]);

  useEffect(() => () => dynaura.clear(), []);

  return <Toaster position={look.position} offset={look.offset} theme={look.theme} swipe={look.swipe} queue maxQueue={5} dedupe="id" />;
}
