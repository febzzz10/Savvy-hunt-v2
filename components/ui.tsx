import Link from "next/link";
import type { ReactNode } from "react";

type IconName = "home" | "more" | "results" | "calendar" | "trophy" | "camera" | "arrow" | "pin" | "clock";
const paths: Record<IconName, ReactNode> = {
  home: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
  more: <><circle cx="5" cy="12" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /></>,
  results: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2" /></>,
  trophy: <><path d="M8 3h8v7a4 4 0 0 1-8 0V3ZM8 5H4v3a4 4 0 0 0 4 4m8-7h4v3a4 4 0 0 1-4 4M12 14v5m-5 2h10m-8-2h6" /></>,
  camera: <><path d="m8 5 2-2h4l2 2h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" /><circle cx="12" cy="12" r="4" /></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
};
export function Icon({ name }: { name: IconName }) {
  return <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export function EmptyState({ title, children, href, action, icon = "calendar" }: { title: string; children?: ReactNode; href?: string; action?: string; icon?: IconName }) {
  return <div className="empty-state"><span className="icon-disc"><Icon name={icon} /></span><h3>{title}</h3>{children && <p>{children}</p>}{href && <Link className="text-link" href={href}>{action ?? "Explore the schedule"} <Icon name="arrow" /></Link>}</div>;
}
export function Skeleton({ label = "Loading event information…" }: { label?: string }) {
  return <div className="skeleton" role="status"><span className="sr-only">{label}</span><div /><div /><div /></div>;
}
