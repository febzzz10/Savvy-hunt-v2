"use client";
import { useAuth } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";
import { ReactNode } from "react";
const url=process.env.NEXT_PUBLIC_CONVEX_URL;
if(!url)throw new Error("NEXT_PUBLIC_CONVEX_URL is required");
const client=new ConvexReactClient(url);
export function Providers({children}:{children:ReactNode}){return <ConvexProviderWithClerk client={client} useAuth={useAuth}>{children}</ConvexProviderWithClerk>}
