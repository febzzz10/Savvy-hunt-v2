import { ImageResponse } from "next/og";
import { SCHOOL_LOCATION, SCHOOL_NAME, SITE_NAME, SITE_YEAR } from "@/lib/site";

export const alt = `MGM ${SITE_NAME} ${SITE_YEAR} – inter-school competition at ${SCHOOL_NAME}, ${SCHOOL_LOCATION}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand colours mirror app/globals.css. No web font is fetched, so the card renders offline and at build time.
export default function Image() {
  return new ImageResponse(
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 80px", background: "#fafaf6", color: "#1f2a23", fontFamily: "Georgia, serif" }}>
      <div style={{ display: "flex", fontSize: 28, letterSpacing: 6, color: "#32643b", fontFamily: "Arial, sans-serif", fontWeight: 700 }}>INTER-SCHOOL COMPETITION</div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 124, lineHeight: 1, fontWeight: 700, letterSpacing: -3, whiteSpace: "nowrap" }}>MGM {SITE_NAME}</div>
        <div style={{ display: "flex", fontSize: 124, lineHeight: 1.1, fontWeight: 700, letterSpacing: -3, color: "#32643b" }}>{SITE_YEAR}</div>
        <div style={{ display: "flex", width: 280, height: 10, borderRadius: 5, background: "#c59439", marginTop: 28 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontFamily: "Arial, sans-serif", fontSize: 32, color: "#1f2a23" }}>
        <div style={{ display: "flex" }}>{SCHOOL_NAME}, {SCHOOL_LOCATION}</div>
        <div style={{ display: "flex", color: "#32643b", fontWeight: 700 }}>Live scoreboard · Results · Schedule</div>
      </div>
    </div>,
    size,
  );
}
