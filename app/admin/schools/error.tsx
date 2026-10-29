"use client";
export default function SchoolsError({ reset }: { reset: () => void }) {
  return <div role="alert"><h1>Schools could not be loaded</h1><p>Check your connection and admin access, then try again.</p><button className="button" onClick={reset}>Try again</button></div>;
}
