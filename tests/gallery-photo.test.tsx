// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GalleryPhoto } from "../components/gallery-photo";
const src = (markup: string) => markup.match(/<img[^>]*\ssrc="([^"]+)"/)?.[1].replace(/&amp;/g, "&");
describe("GalleryPhoto image URL", () => {
  it("keys public photos by their approved image version so the CDN cache can never serve other bytes", () => {
    expect(src(renderToStaticMarkup(<GalleryPhoto id="abc123" alt="Photo" version={"a".repeat(32)} />))).toBe(`/api/gallery/abc123/image?v=${"a".repeat(32)}`);
  });
  it("falls back to the plain URL when no version is known", () => {
    expect(src(renderToStaticMarkup(<GalleryPhoto id="abc123" alt="Photo" />))).toBe("/api/gallery/abc123/image");
  });
  it("keeps admin previews private: preview wins and no version is sent", () => {
    expect(src(renderToStaticMarkup(<GalleryPhoto id="abc123" alt="Photo" preview version="deadbeef" />))).toBe("/api/gallery/abc123/image?preview=true");
  });
  it("escapes a hostile version instead of injecting query parameters", () => {
    expect(src(renderToStaticMarkup(<GalleryPhoto id="abc123" alt="Photo" version="x&preview=true" />))).toBe("/api/gallery/abc123/image?v=x%26preview%3Dtrue");
  });
});
