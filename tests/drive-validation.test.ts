import { describe, expect, it } from "vitest";
import { isApprovedDriveImage } from "../lib/drive-validation";
const valid = { mimeType: "image/jpeg", size: "1000", parents: ["approved"], trashed: false };
describe("Drive approval boundary", () => {
  it("accepts only supported images in the approved folder", () => { expect(isApprovedDriveImage(valid, "approved")).toBe(true); expect(isApprovedDriveImage(valid, "other")).toBe(false); });
  it("rejects unsafe and inaccessible metadata", () => { expect(isApprovedDriveImage({ ...valid, mimeType: "image/svg+xml" }, "approved")).toBe(false); expect(isApprovedDriveImage({ ...valid, trashed: true }, "approved")).toBe(false); expect(isApprovedDriveImage({ ...valid, size: "15000001" }, "approved")).toBe(false); expect(isApprovedDriveImage({ ...valid, size: undefined }, "approved")).toBe(false); });
});
