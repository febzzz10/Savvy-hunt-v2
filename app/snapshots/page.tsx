"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Nav } from "@/components/public";
import { Load } from "@/components/data";
import { GalleryPhoto, downloadName, galleryImageUrl } from "@/components/gallery-photo";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { EmptyState, Skeleton } from "@/components/ui";
import { photoAlt } from "@/lib/gallery-alt";
// Matches the CSS breakpoints: >=1200 → 4, >=768 → 3, >=375 → 2, else 1.
function useColumnCount() {
  const [count, setCount] = useState(3);
  useEffect(() => {
    const queries = [["(min-width: 1200px)", 4], ["(min-width: 768px)", 3], ["(min-width: 375px)", 2]] as const;
    const mqls = queries.map(([q]) => window.matchMedia(q));
    const update = () => setCount(queries.find((_, i) => mqls[i].matches)?.[1] ?? 1);
    update();
    mqls.forEach(m => m.addEventListener("change", update));
    return () => mqls.forEach(m => m.removeEventListener("change", update));
  }, []);
  return count;
}
function Gallery({ editionId }: { editionId: Id<"editions"> }) {
  const { results, status, loadMore } = usePaginatedQuery(api.gallery.pageApproved, { editionId }, { initialNumItems: 12 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const selectedIndex = results.findIndex(item => item._id === selectedId);
  const selected = results[selectedIndex];
  const isOpen = Boolean(selected);
  const columnCount = useColumnCount();
  const columns = useMemo(() => { const cols: typeof results[] = Array.from({ length: columnCount }, () => []); results.forEach((item, i) => cols[i % columnCount].push(item)); return cols; }, [results, columnCount]);
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (status !== "CanLoadMore" || !node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) loadMore(12); }, { rootMargin: "600px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [status, loadMore]);
  useEffect(() => {
    if (!isOpen) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);
  return <>{status === "LoadingFirstPage" ? <Skeleton label="Loading gallery…" /> : !results.length ? <EmptyState title="Memories in the making" icon="camera" href="/schedule">Photos will appear here after they are approved. Follow the programme while our event photo diary takes shape.</EmptyState> : <div className="masonry">{columns.map((column, index) => <div className="masonry-col" key={index}>{column.map(item => { const caption = item.caption?.trim(); return <figure className="masonry-card" key={item._id}><button className="photo-button" onClick={() => setSelectedId(item._id)} aria-label={`Open photograph: ${photoAlt(item.altText)}`}><GalleryPhoto layout="masonry" id={item._id} alt={item.altText} version={item.imageVersion} /></button><a className="photo-download" href={galleryImageUrl(item._id, item.imageVersion)} download={downloadName(item.altText)} aria-label={`Download photograph: ${photoAlt(item.altText)}`} title="Download"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 20h14" /></svg></a>{caption && <figcaption className="masonry-caption">{caption}</figcaption>}</figure>; })}</div>)}</div>}<div ref={sentinel} aria-hidden="true" />{status === "CanLoadMore" && <button className="button secondary" onClick={() => loadMore(12)}>Load more photos</button>}{status === "LoadingMore" && <p role="status">Loading more photos…</p>}
    <dialog ref={dialog} className="lightbox" aria-label="Event photograph" onClose={() => setSelectedId(null)} onKeyDown={event => { if (event.key === "ArrowRight" && selectedIndex < results.length - 1) setSelectedId(results[selectedIndex + 1]._id); if (event.key === "ArrowLeft" && selectedIndex > 0) setSelectedId(results[selectedIndex - 1]._id); }}>
      {selected && <><div className="lightbox-toolbar"><p>{selectedIndex + 1} / {results.length} loaded photographs</p><a className="button secondary" href={galleryImageUrl(selected._id, selected.imageVersion)} download={downloadName(selected.altText)}>Download</a><button autoFocus className="button secondary" onClick={() => dialog.current?.close()}>Close ×</button></div><GalleryPhoto key={selected._id} id={selected._id} alt={selected.altText} version={selected.imageVersion} /><p aria-live="polite">{selected.caption ?? photoAlt(selected.altText)}</p><div className="actions"><button className="button secondary" disabled={selectedIndex === 0} onClick={() => setSelectedId(results[selectedIndex - 1]._id)}>← Previous</button><button className="button secondary" disabled={selectedIndex === results.length - 1} onClick={() => setSelectedId(results[selectedIndex + 1]._id)}>Next →</button></div></>}
    </dialog>
  </>;
}
export default function Page() { return <><Nav /><main id="main-content" tabIndex={-1} className="shell"><span className="eyebrow">The photo diary</span><h1>Snapshots: MGM Savvy Hunt 2026 photos</h1><p className="muted">Approved photographs from Savvy Hunt 2026 at MGM School, Kottarakara. Select an image to view it in full, or follow the <Link href="/schedule">event schedule</Link> and <Link href="/results">results</Link> for what happened where.</p><Load>{edition => <Gallery editionId={edition._id} />}</Load></main></>; }
