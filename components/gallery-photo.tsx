"use client";
import { useState } from "react";
import Image from "next/image";
export function GalleryPhoto({ id, alt, preview = false, eager = false }: { id: string; alt: string; preview?: boolean; eager?: boolean }) { const [broken, setBroken] = useState(false); return broken ? <div className="photo-fallback" role="img" aria-label={alt}>Photo temporarily unavailable</div> : <div className="photo-frame"><Image src={`/api/gallery/${id}/image${preview ? "?preview=true" : ""}`} alt={alt} fill unoptimized loading={eager ? "eager" : "lazy"} fetchPriority={eager ? "high" : "auto"} sizes="(max-width: 767px) 100vw, 45vw" onError={() => setBroken(true)} style={{ objectFit: "cover" }} /></div>; }
