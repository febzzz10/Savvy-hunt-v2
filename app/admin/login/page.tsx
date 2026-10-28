"use client";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
export default function Page() {
  return <main id="main-content" tabIndex={-1} className="shell auth-panel"><Link href="/">← Back to Savvy Hunt</Link><h1>Admin sign in</h1><p>Sign in with your staff account. An organizer must grant admin access before you can manage the event.</p><SignIn routing="hash" appearance={{ variables: { colorPrimary: "#12382c", colorMutedForeground: "#4b6155" } }} /><p>Use “Forgot password?” on the password screen to recover your account. For lost MFA access, contact your organizer through the agreed staff channel.</p></main>;
}
