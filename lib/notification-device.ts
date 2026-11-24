import type { CustomTheme } from "dynaura";

/** How announcement toasts are presented. Chosen from device capabilities, never from user settings. */
export type NotificationMode = "island" | "ios-banner" | "android-banner" | "desktop";

export type DeviceSignals = {
  userAgent: string;
  maxTouchPoints: number;
  /** Viewport width in CSS px. */
  width: number;
  /** (pointer: coarse) and (hover: none): a touch-first device. */
  touchFirst: boolean;
  /** Resolved env(safe-area-inset-top) measured in portrait, in px; undefined until seen in portrait. */
  portraitTopInset?: number;
};

/** Portrait top insets: Dynamic Island iPhones are 59px or more; notch iPhones are 44 to 50px. */
export const DYNAMIC_ISLAND_MIN_INSET = 54;

const isIPhone = (s: DeviceSignals) => /iPhone|iPod/.test(s.userAgent);

/**
 * Dynamic Island cannot be read directly by a web page, so it is inferred from capability: an iPhone whose
 * portrait top safe-area inset is island-sized (needs viewport-fit=cover). When the inset is unknown, such as a
 * page first opened in landscape, it falls back to the plain iOS banner rather than risk a misplaced island.
 */
export function detectNotificationMode(s: DeviceSignals): NotificationMode {
  if (isIPhone(s)) return (s.portraitTopInset ?? 0) >= DYNAMIC_ISLAND_MIN_INSET ? "island" : "ios-banner";
  // Anything else that is narrow is a phone-sized viewport (Android, emulators, narrow windows): the top-right
  // layout would not fit there. Wider screens, including iPadOS (which reports a Mac user agent), get desktop.
  if (s.width < 768) return "android-banner";
  return "desktop";
}

const ink: CustomTheme = { background: "#1f2a23", foreground: "#fafaf6", muted: "#b4c3b8", ring: "#8fc79a", button: "#33443a", info: "#b9dcc0", success: "#b9dcc0" };
const ivory: CustomTheme = { background: "#ffffff", foreground: "#1f2a23", muted: "#566558", ring: "#32643b", button: "#e5eddf", info: "#285130", success: "#285130" };

export type ToasterPresentation = { position: "top" | "top-right"; offset: number; theme: CustomTheme; swipe: "edge" | "up" | "both" };

/** Only Toaster-level props differ per mode, so toast content is identical everywhere and a layout switch re-shows nothing. */
export function presentationFor(mode: NotificationMode): ToasterPresentation {
  switch (mode) {
    case "island": return { position: "top", offset: 6, theme: ink, swipe: "edge" };
    case "ios-banner": return { position: "top", offset: 10, theme: ivory, swipe: "up" };
    case "android-banner": return { position: "top", offset: 12, theme: ivory, swipe: "both" };
    case "desktop": return { position: "top-right", offset: 20, theme: ink, swipe: "edge" };
  }
}
