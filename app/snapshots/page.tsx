"use client";
import { useEffect, useRef, useState } from "react";
import { Nav } from "@/components/public";
import { Load } from "@/components/data";
import { GalleryPhoto } from "@/components/gallery-photo";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { EmptyState, Skeleton } from "@/components/ui";
function Gallery({ editionId }: { editionId: Id<"editions"> }) {
  const { results, status, loadMore } = usePaginatedQuery(api.gallery.pageApproved, { editionId }, { initialNumItems: 12 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const selectedIndex = results.findIndex(item => item._id === selectedId);
  const selected = results[selectedIndex];
  const isOpen = Boolean(selected);
  useEffect(() => {
    if (!isOpen) { dialog.current?.close(); return; }
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [isOpen]);
  return <>{status === "LoadingFirstPage" ? <Skeleton label="Loading gallery…" /> : !results.length ? <EmptyState title="Memories in the making" icon="camera" href="/schedule">Photos will appear here after they are approved. Follow the programme while our event photo diary takes shape.</EmptyState> : <div className="gallery-grid">{results.map(item => <figure key={item._id}><button className="photo-button" onClick={() => setSelectedId(item._id)} aria-label={`Open photograph: ${item.altText}`}><GalleryPhoto id={item._id} alt={item.altText} /></button><figcaption>{item.caption ?? item.altText}</figcaption></figure>)}</div>}{status === "CanLoadMore" && <button className="button secondary" onClick={() => loadMore(12)}>Load more photos</button>}{status === "LoadingMore" && <p role="status">Loading more photos…</p>}
    <dialog ref={dialog} className="lightbox" aria-label="Event photograph" onClose={() => setSelectedId(null)} onKeyDown={event => { if (event.key === "ArrowRight" && selectedIndex < results.length - 1) setSelectedId(results[selectedIndex + 1]._id); if (event.key === "ArrowLeft" && selectedIndex > 0) setSelectedId(results[selectedIndex - 1]._id); }}>
      {selected && <><div className="lightbox-toolbar"><p>{selectedIndex + 1} / {results.length} loaded photographs</p><button autoFocus className="button secondary" onClick={() => dialog.current?.close()}>Close ×</button></div><GalleryPhoto key={selected._id} id={selected._id} alt={selected.altText} /><p aria-live="polite">{selected.caption ?? selected.altText}</p><div className="actions"><button className="button secondary" disabled={selectedIndex === 0} onClick={() => setSelectedId(results[selectedIndex - 1]._id)}>← Previous</button><button className="button secondary" disabled={selectedIndex === results.length - 1} onClick={() => setSelectedId(results[selectedIndex + 1]._id)}>Next →</button></div></>}
    </dialog>
  </>;
}
export default function Page() { return <><Nav /><main id="main-content" tabIndex={-1} className="shell"><span className="eyebrow">The photo diary</span><h1>Snapshots</h1><p className="muted">Approved event photographs. Select an image to view it in full.</p><Load>{edition => <Gallery editionId={edition._id} />}</Load></main></>; }
