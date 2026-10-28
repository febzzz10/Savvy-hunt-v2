"use client";import {SignIn} from "@clerk/nextjs";export default function Page(){return <main className="shell"><h1>Admin sign in</h1><SignIn routing="hash"/></main>}
