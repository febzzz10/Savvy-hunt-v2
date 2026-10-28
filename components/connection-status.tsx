"use client";
import { useConvex } from "convex/react";
import { useCallback, useSyncExternalStore } from "react";

type Status = "connecting" | "connected" | "offline" | "reconnecting";
const getServerSnapshot = (): Status => "connecting";
const messages: Record<Status, string> = {
  connecting: "Connecting to live updates…",
  connected: "Live updates connected",
  offline: "Offline — displayed results may be out of date. Reconnect before publishing.",
  reconnecting: "Reconnecting — displayed results may be out of date. Confirm connection before publishing.",
};

export function ConnectionStatus() {
  const convex = useConvex();
  const subscribe = useCallback((notify: () => void) => {
    const unsubscribe = convex.subscribeToConnectionState(notify);
    window.addEventListener("online", notify);
    window.addEventListener("offline", notify);
    return () => {
      unsubscribe();
      window.removeEventListener("online", notify);
      window.removeEventListener("offline", notify);
    };
  }, [convex]);
  const getSnapshot = useCallback((): Status => {
    if (!navigator.onLine) return "offline";
    const { isWebSocketConnected, hasEverConnected } = convex.connectionState();
    return isWebSocketConnected ? "connected" : hasEverConnected ? "reconnecting" : "connecting";
  }, [convex]);
  // React uses this constant snapshot for both SSR and the initial hydration render.
  const status = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return <div className={`connection-status${status === "connected" ? "" : " disconnected"}`} role="status" aria-live="polite" aria-atomic="true">
    {messages[status]}
  </div>;
}
