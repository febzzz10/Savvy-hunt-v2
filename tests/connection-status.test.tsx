import { afterEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConnectionStatus } from "../components/connection-status";

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("ConnectionStatus server snapshot", () => {
  it.each([
    { isWebSocketConnected: false, hasEverConnected: false },
    { isWebSocketConnected: true, hasEverConnected: true },
    { isWebSocketConnected: false, hasEverConnected: true },
  ])("renders identical connecting markup regardless of live state: %o", state => {
    const client = new ConvexReactClient("https://hydration-test.convex.cloud");
    const readConnection = vi.spyOn(client, "connectionState").mockReturnValue({
      ...state, hasInflightRequests: false, timeOfOldestInflightRequest: null,
      connectionCount: state.hasEverConnected ? 1 : 0, connectionRetries: 0,
      inflightMutations: 0, inflightActions: 0,
    });
    vi.stubGlobal("navigator", { get onLine() { throw new Error("SSR must not read navigator"); } });
    const markup = renderToString(<ConvexProvider client={client}><ConnectionStatus /></ConvexProvider>);
    expect(markup).toBe('<div class="connection-status disconnected" role="status" aria-live="polite" aria-atomic="true">Connecting to live updates…</div>');
    expect(readConnection).not.toHaveBeenCalled();
  });
});
