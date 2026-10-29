import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Layout from "../app/admin/layout";
import Setup from "../app/admin/setup/page";

const state = vi.hoisted(() => ({ authenticated: true, role: null as null | "editor" | "super_admin", path: "/admin", edition: null as null | { _id: string } }));
vi.mock("next/navigation", () => ({ usePathname: () => state.path }));
vi.mock("@clerk/nextjs", () => ({ useAuth: () => ({ isLoaded: true, isSignedIn: state.authenticated }), SignOutButton: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("convex/react", () => ({
  useConvexAuth: () => ({ isLoading: false, isAuthenticated: state.authenticated }),
  useMutation: () => vi.fn(),
  useQuery: (reference: unknown, args: unknown) => args === "skip" ? undefined : String(reference).includes("getCurrent") ? state.edition : state.role ? { role: state.role, displayName: "Organizer" } : null,
}));
vi.mock("../components/data", () => ({ ref: (name: string) => name }));
vi.mock("../components/connection-status", () => ({ ConnectionStatus: () => null }));
vi.mock("../convex/_generated/api", () => ({ api: { editions: { getCurrent: "editions:getCurrent", initialize: "editions:initialize" }, admins: { getSelf: "admins:getSelf" } } }));

beforeEach(() => { state.authenticated = true; state.role = null; state.path = "/admin"; state.edition = null; });
describe("admin page access", () => {
  it("shows the dashboard only for active allowlisted accounts", () => {
    const denied = renderToStaticMarkup(<Layout><p>Protected dashboard</p></Layout>);
    expect(denied).toContain("Access denied");
    expect(denied).not.toContain("Protected dashboard");
    state.role = "super_admin";
    const approved = renderToStaticMarkup(<Layout><p>Protected dashboard</p></Layout>);
    expect(approved).toContain("Protected dashboard");
    expect(approved).toContain('href="/admin/admins"');
  });
  it("requires sign-in and blocks editor access to super-admin pages", () => {
    state.authenticated = false;
    expect(renderToStaticMarkup(<Layout><p>Protected dashboard</p></Layout>)).toContain("Admin sign in required");
    state.authenticated = true; state.role = "editor"; state.path = "/admin/admins";
    const editor = renderToStaticMarkup(<Layout><p>Protected dashboard</p></Layout>);
    expect(editor).toContain("Super admin access required");
    expect(editor).not.toContain("Protected dashboard");
  });
  it("has no browser bootstrap form and allows edition setup only for super admins", () => {
    const denied = renderToStaticMarkup(<Setup />);
    expect(denied).toContain("Your account needs approval");
    expect(denied).not.toContain("<form");
    expect(denied).not.toContain('type="password"');
    state.role = "editor";
    expect(renderToStaticMarkup(<Setup />)).not.toContain("<form");
    state.role = "super_admin";
    expect(renderToStaticMarkup(<Setup />)).toContain("Initialize edition");
  });
});
