import { describe, expect, it } from "vitest";
import { requireAdmin } from "../convex/lib/security";

function context(identity: string | null, admin?: { role: "editor" | "super_admin"; isActive: boolean }) {
  return {
    auth: { getUserIdentity: async () => identity ? { tokenIdentifier: identity } : null },
    db: { query: () => ({ withIndex: () => ({ unique: async () => admin ?? null }) }) },
  } as unknown as Parameters<typeof requireAdmin>[0];
}
describe("backend admin allowlist", () => {
  it("rejects anonymous, unknown, and inactive identities", async () => {
    await expect(requireAdmin(context(null))).rejects.toThrow("UNAUTHENTICATED");
    await expect(requireAdmin(context("issuer|unknown"))).rejects.toThrow("FORBIDDEN");
    await expect(requireAdmin(context("issuer|inactive", { role: "super_admin", isActive: false }))).rejects.toThrow("FORBIDDEN");
  });
  it("lets editors edit but only super admins publish", async () => {
    await expect(requireAdmin(context("issuer|editor", { role: "editor", isActive: true }))).resolves.toBeTruthy();
    await expect(requireAdmin(context("issuer|editor", { role: "editor", isActive: true }), "super_admin")).rejects.toThrow("FORBIDDEN");
    await expect(requireAdmin(context("issuer|super", { role: "super_admin", isActive: true }), "super_admin")).resolves.toBeTruthy();
  });
});
