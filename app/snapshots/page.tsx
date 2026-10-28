"use client";
import { Nav } from "@/components/public";
import { Load } from "@/components/data";
import { GalleryPhoto } from "@/components/gallery-photo";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
function Gallery({ editionId }: { editionId: Id<"editions"> }) {
  const { results, status, loadMore } = usePaginatedQuery(api.gallery.pageApproved, { editionId }, { initialNumItems: 12 });
  return <>{status === "LoadingFirstPage" ? <p>Loading gallery…</p> : !results.length ? <p>Approved snapshots will appear here.</p> : <div className="grid">{results.map(item => <figure className="card" key={item._id}><GalleryPhoto id={item._id} alt={item.altText} /><figcaption>{item.caption ?? item.altText}</figcaption></figure>)}</div>}{status === "CanLoadMore" && <button className="button secondary" onClick={() => loadMore(12)}>Load more photos</button>}{status === "LoadingMore" && <p>Loading more photos…</p>}</>;
}
export default function Page() { return <><Nav /><main className="shell"><h1>Snapshots</h1><Load>{edition => <Gallery editionId={edition._id} />}</Load></main></>; }
