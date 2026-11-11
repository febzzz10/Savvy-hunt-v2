import { Skeleton } from "@/components/ui";
export default function AdminLoading() {
  return <div className="admin-loading" aria-busy="true"><Skeleton label="Loading organizer workspace…" /></div>;
}
