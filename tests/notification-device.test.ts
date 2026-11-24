// @vitest-environment node
import { describe, expect, it } from "vitest";
import { detectNotificationMode, presentationFor, type DeviceSignals } from "../lib/notification-device";
const IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
const ANDROID = "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36";
const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15";
const sig = (o: Partial<DeviceSignals>): DeviceSignals => ({ userAgent: MAC, maxTouchPoints: 0, width: 1440, touchFirst: false, ...o });
describe("notification mode detection", () => {
  it("uses the island only on an iPhone with an island-sized portrait inset", () => {
    expect(detectNotificationMode(sig({ userAgent: IPHONE, width: 393, touchFirst: true, portraitTopInset: 59 }))).toBe("island");
    expect(detectNotificationMode(sig({ userAgent: IPHONE, width: 402, touchFirst: true, portraitTopInset: 62 }))).toBe("island");
  });
  it("uses the iOS banner on notch and home-button iPhones", () => {
    for (const inset of [0, 20, 44, 47, 50]) expect(detectNotificationMode(sig({ userAgent: IPHONE, width: 390, touchFirst: true, portraitTopInset: inset }))).toBe("ios-banner");
  });
  it("falls back to the iOS banner when the inset was never measured in portrait", () => {
    expect(detectNotificationMode(sig({ userAgent: IPHONE, width: 852, touchFirst: true }))).toBe("ios-banner");
  });
  it("uses the Android banner on Android phones", () => {
    expect(detectNotificationMode(sig({ userAgent: ANDROID, width: 412, touchFirst: true }))).toBe("android-banner");
  });
  it("treats other touch-first phones as banners and tablets and desktops as top-right", () => {
    expect(detectNotificationMode(sig({ width: 380, touchFirst: true }))).toBe("android-banner");
    expect(detectNotificationMode(sig({ width: 393 }))).toBe("android-banner"); // desktop browser or emulator at phone width
    expect(detectNotificationMode(sig({ userAgent: ANDROID, width: 900, touchFirst: true }))).toBe("desktop");
    expect(detectNotificationMode(sig({ maxTouchPoints: 5, width: 1024, touchFirst: true }))).toBe("desktop");
    expect(detectNotificationMode(sig({}))).toBe("desktop");
  });
  it("only changes Toaster-level presentation, never toast content", () => {
    expect(presentationFor("desktop")).toMatchObject({ position: "top-right" });
    for (const m of ["island", "ios-banner", "android-banner"] as const) expect(presentationFor(m).position).toBe("top");
    expect(presentationFor("island").theme.background).not.toBe(presentationFor("ios-banner").theme.background);
  });
});
