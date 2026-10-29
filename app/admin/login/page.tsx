"use client";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
export default function Page() {
  return <main id="main-content" tabIndex={-1} className="shell auth-panel"><Link className="text-link" href="/">← Back to Savvy Hunt</Link><div className="auth-brand"><span className="wordmark" aria-hidden="true">SH</span><span className="eyebrow">The organizer workspace</span></div><h1>Admin sign in</h1><p>Sign in with your staff account. An organizer must grant admin access before you can manage the event.</p><div className="clerk-sign-in"><SignIn routing="hash" appearance={{ variables: { colorPrimary: "#32643B", colorMutedForeground: "#1F2A23", borderRadius: "12px", fontFamily: "var(--font-dm), Arial, sans-serif" }, elements: { headerTitle: { fontSize: "1.25rem", lineHeight: "1.3" }, rootBox: { width: "100%" }, cardBox: { width: "100%", maxWidth: "100%", boxShadow: "none" } } }} /></div><p>Use “Forgot password?” on the password screen to recover your account. For lost MFA access, contact your organizer through the agreed staff channel.</p></main>;
}
