/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, internal } from "./_generated/api";
import { bootstrap } from "./admins";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const issuer = "https://example.clerk.accounts.dev";
const identityKey = `${issuer}|user_first`;
const args = { authUserId: identityKey, displayName: "First organizer" };

beforeEach(() => vi.stubEnv("CLERK_JWT_ISSUER_DOMAIN", issuer));
afterEach(() => vi.unstubAllEnvs());

describe("initial admin provisioning", () => {
  it("is internal rather than a client-callable mutation", () => {
    expect(bootstrap).toHaveProperty("isInternal", true);
    expect(bootstrap).not.toHaveProperty("isPublic", true);
  });

  it("approves only the copied identity key and audits the grant", async () => {
    const t = convexTest(schema, modules);
    const intended = t.withIdentity({ subject: "user_first", issuer, tokenIdentifier: identityKey });
    const other = t.withIdentity({ subject: "user_other", issuer, tokenIdentifier: `${issuer}|user_other` });
    const sameSubjectOtherIssuer = t.withIdentity({ subject: "user_first", issuer: "https://other.example", tokenIdentifier: "https://other.example|user_first" });

    expect(await intended.query(api.admins.getIdentityKey, {})).toBe(identityKey);
    expect(await intended.query(api.admins.getSelf, {})).toBeNull();
    const id = await t.mutation(internal.admins.bootstrap, args);
    expect(await intended.query(api.admins.getSelf, {})).toEqual({ role: "super_admin", displayName: args.displayName });
    expect((await intended.query(api.admins.list, {})).map(row => row._id)).toEqual([id]);
    expect(await intended.query(api.admins.listAudit, {})).toEqual([
      expect.objectContaining({ action: "admin.bootstrap", actorAuthUserId: identityKey, entityId: id }),
    ]);
    for (const caller of [t, other, sameSubjectOtherIssuer]) {
      expect(await caller.query(api.admins.getSelf, {})).toBeNull();
      await expect(caller.query(api.admins.list, {})).rejects.toThrow();
      await expect(caller.query(api.admins.listAudit, {})).rejects.toThrow();
      await expect(caller.mutation(api.admins.save, { ...args, role: "super_admin", isActive: true })).rejects.toThrow();
      await expect(caller.mutation(api.editions.initialize, { name: "Forbidden", year: 2026 })).rejects.toThrow();
    }
    const editionId = await intended.mutation(api.editions.initialize, { name: "Approved edition", year: 2026 });
    expect(await intended.query(api.events.listAdmin, { editionId })).toEqual([]);
    expect(await intended.query(api.schools.listAdmin, { editionId })).toEqual([]);
    for (const caller of [t, other, sameSubjectOtherIssuer]) {
      await expect(caller.query(api.events.listAdmin, { editionId })).rejects.toThrow();
      await expect(caller.query(api.schools.listAdmin, { editionId })).rejects.toThrow();
    }
  });

  it("cannot run twice, even if the first admin is deleted", async () => {
    const t = convexTest(schema, modules);
    const id = await t.mutation(internal.admins.bootstrap, args);
    await expect(t.mutation(internal.admins.bootstrap, args)).rejects.toThrow("Bootstrap already completed");
    await t.run(ctx => ctx.db.delete(id));
    await expect(t.mutation(internal.admins.bootstrap, { ...args, authUserId: `${issuer}|user_second` })).rejects.toThrow("Bootstrap already completed");
  });

  it.each([true, false])("rejects an existing allowlist even when active=%s", async isActive => {
    const t = convexTest(schema, modules);
    await t.run(ctx => ctx.db.insert("admins", { ...args, role: "editor", isActive, createdAt: 1, updatedAt: 1 }));
    await expect(t.mutation(internal.admins.bootstrap, args)).rejects.toThrow("Bootstrap already completed");
  });

  it("permanently seals legacy installations without changing existing permissions", async () => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(internal.admins.sealBootstrap, {})).rejects.toThrow("No admin exists");
    const id = await t.run(ctx => ctx.db.insert("admins", { ...args, role: "editor", isActive: false, createdAt: 1, updatedAt: 1 }));
    await t.mutation(internal.admins.sealBootstrap, {});
    await t.mutation(internal.admins.sealBootstrap, {});
    expect(await t.run(ctx => ctx.db.get(id))).toMatchObject({ role: "editor", isActive: false });
    await t.run(ctx => ctx.db.delete(id));
    await expect(t.mutation(internal.admins.bootstrap, args)).rejects.toThrow("Bootstrap already completed");
    expect(await t.run(ctx => ctx.db.query("adminBootstrapState").take(2))).toHaveLength(1);
  });

  it.each(["user_first", "person@example.com", "https://other.example|user_first", `${issuer}|`, `${issuer}|user_first|extra`])("rejects an incomplete or wrong-provider key: %s", async authUserId => {
    const t = convexTest(schema, modules);
    await expect(t.mutation(internal.admins.bootstrap, { ...args, authUserId })).rejects.toThrow("complete identity key");
    expect(await t.run(ctx => ctx.db.query("admins").first())).toBeNull();
  });

  it("requires an issuer and a nonempty display name without consuming bootstrap", async () => {
    const t = convexTest(schema, modules);
    vi.stubEnv("CLERK_JWT_ISSUER_DOMAIN", "");
    await expect(t.mutation(internal.admins.bootstrap, args)).rejects.toThrow("CLERK_JWT_ISSUER_DOMAIN");
    vi.stubEnv("CLERK_JWT_ISSUER_DOMAIN", issuer);
    await expect(t.mutation(internal.admins.bootstrap, { ...args, displayName: " " })).rejects.toThrow("Display name is required");
    await expect(t.mutation(internal.admins.bootstrap, args)).resolves.toBeTruthy();
  });

  it("keeps subsequent grants super-admin-only and revoked accounts blocked", async () => {
    const t = convexTest(schema, modules);
    await t.mutation(internal.admins.bootstrap, args);
    const first = t.withIdentity({ subject: "user_first", issuer, tokenIdentifier: identityKey });
    const editorKey = `${issuer}|user_editor`;
    const editor = t.withIdentity({ subject: "user_editor", issuer, tokenIdentifier: editorKey });
    await first.mutation(api.admins.save, { authUserId: editorKey, displayName: "Editor", role: "editor", isActive: true });
    await expect(editor.query(api.admins.list, {})).rejects.toThrow("FORBIDDEN");
    await expect(editor.mutation(api.admins.save, { ...args, role: "super_admin", isActive: true })).rejects.toThrow("FORBIDDEN");
    await expect(first.mutation(api.admins.save, { ...args, role: "editor", isActive: true })).rejects.toThrow("Cannot remove your own super admin access");
    await first.mutation(api.admins.save, { authUserId: editorKey, displayName: "Editor", role: "editor", isActive: false });
    expect(await editor.query(api.admins.getSelf, {})).toBeNull();
    await expect(editor.mutation(api.editions.initialize, { name: "Forbidden", year: 2026 })).rejects.toThrow("FORBIDDEN");
  });
});
