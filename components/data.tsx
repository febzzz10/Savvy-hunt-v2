"use client";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
export function ref<A extends Record<string,unknown>,R=unknown>(name:string){return makeFunctionReference<"query",A,R>(name)}
export function mut<A extends Record<string,unknown>,R=unknown>(name:string){return makeFunctionReference<"mutation",A,R>(name)}
export function act<A extends Record<string,unknown>,R=unknown>(name:string){return makeFunctionReference<"action",A,R>(name)}
export function useCurrent(){return useQuery(api.editions.getCurrent,{})}
export function Load({children}:{children:(edition:Doc<"editions">)=>React.ReactNode}){const edition=useCurrent();return edition===undefined?<p>Connecting to live event data…</p>:edition===null?<p>The event edition has not been configured yet.</p>:<>{children(edition)}</>}
