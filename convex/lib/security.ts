import type { QueryCtx, MutationCtx } from "../_generated/server";
export async function requireAdmin(ctx: QueryCtx | MutationCtx, role: "editor" | "super_admin" = "editor") {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED");
  const admin = await ctx.db.query("admins").withIndex("by_auth_user_id", q => q.eq("authUserId", identity.tokenIdentifier)).unique();
  if (!admin?.isActive || (role === "super_admin" && admin.role !== "super_admin")) throw new Error("FORBIDDEN");
  return admin;
}
export function requiredText(value: string, label: string) {
  const text = value.trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}
export function slugify(value: string) { const slug = requiredText(value, "Name").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""); if(!slug)throw new Error("Name needs at least one Latin letter or digit for its URL"); return slug; }
