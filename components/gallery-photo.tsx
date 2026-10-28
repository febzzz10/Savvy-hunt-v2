"use client";
import { useState } from "react";
import Image from "next/image";
export function GalleryPhoto({ id, alt }: { id: string; alt: string }) { const [broken, setBroken] = useState(false); return broken ? <div className="photo-fallback" role="img" aria-label={alt}>Photo temporarily unavailable</div> : <div className="photo-frame"><Image src={`/api/gallery/${id}/image`} alt={alt} fill unoptimized sizes="(max-width: 600px) 100vw, 33vw" onError={() => setBroken(true)} style={{ objectFit: "cover" }} /></div>; }
