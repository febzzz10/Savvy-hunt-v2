"use client";
import { useState } from "react";
import Image from "next/image";
import { photoAlt } from "@/lib/gallery-alt";
export const galleryImageUrl = (id: string, version?: string) => `/api/gallery/${id}/image${version ? `?v=${encodeURIComponent(version)}` : ""}`;
export const downloadName = (alt: string) => Array.from(alt, ch => (ch.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(ch) ? " " : ch)).join("").replace(/\s+/g, " ").trim().slice(0, 120) || "savvy-hunt-photo";
export function GalleryPhoto({ id, alt: rawAlt, preview = false, eager = false, version, layout = "frame" }: { id: string; alt: string; preview?: boolean; eager?: boolean; version?: string; layout?: "frame" | "masonry" }) {
  const alt = photoAlt(rawAlt);
  const [broken, setBroken] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const masonry = layout === "masonry";
  if (broken) return <div className={masonry ? "photo-fallback photo-fallback-masonry" : "photo-fallback"} role="img" aria-label={alt} title="Photo temporarily unavailable">Photo temporarily unavailable</div>;
  const src = `/api/gallery/${id}/image${preview ? "?preview=true" : version ? `?v=${encodeURIComponent(version)}` : ""}`;
  if (masonry) return <div className={loaded ? "photo-frame photo-masonry" : "photo-frame photo-masonry photo-loading"}><Image src={src} alt={alt} width={0} height={0} unoptimized loading={eager ? "eager" : "lazy"} sizes="(max-width: 767px) 50vw, 25vw" onLoad={() => setLoaded(true)} onError={() => setBroken(true)} style={{ width: "100%", height: "auto", display: "block" }} /></div>;
  return <div className="photo-frame"><Image src={src} alt={alt} fill unoptimized loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} sizes="(max-width: 767px) 100vw, 45vw" onError={() => setBroken(true)} style={{ objectFit: "cover" }} /></div>;
}
