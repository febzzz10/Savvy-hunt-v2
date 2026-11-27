import { describe, expect, it } from "vitest";
import { GENERIC_PHOTO_ALT, looksLikeFilename, photoAlt } from "../lib/gallery-alt";

describe("photoAlt", () => {
  it("replaces file names synced from Drive with a generic description", () => {
    for (const name of ["IMG_4821.jpg", "DSC00123.JPEG", "PXL_20261201_101010.png", "photo 2026-12-01 at 10.10.10.webp", "WhatsApp Image 2026-12-01 at 10.10.10", "20261201_101010", "IMG-4821"]) {
      expect(looksLikeFilename(name), name).toBe(true);
      expect(photoAlt(name), name).toBe(GENERIC_PHOTO_ALT);
    }
  });
  it("keeps a real description and falls back when it is blank", () => {
    expect(photoAlt("Students from MGM School performing a group song on stage")).toBe("Students from MGM School performing a group song on stage");
    expect(photoAlt("  Quiz finalists holding the trophy ")).toBe("Quiz finalists holding the trophy");
    expect(photoAlt("")).toBe(GENERIC_PHOTO_ALT);
    expect(photoAlt(undefined)).toBe(GENERIC_PHOTO_ALT);
  });
});
