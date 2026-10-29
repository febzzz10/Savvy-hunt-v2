"use client";
import { useQuery } from "convex/react";
import { makeFunctionReference } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { EmptyState, Skeleton } from "./ui";
export function ref<A extends Record<string,unknown>,R=unknown>(name:string){return makeFunctionReference<"query",A,R>(name)}
export function mut<A extends Record<string,unknown>,R=unknown>(name:string){return makeFunctionReference<"mutation",A,R>(name)}
export function act<A extends Record<string,unknown>,R=unknown>(name:string){return makeFunctionReference<"action",A,R>(name)}
export function useCurrent(){return useQuery(api.editions.getCurrent,{})}
export function Load({children, fallback}:{children:(edition:Doc<"editions">)=>React.ReactNode; fallback?: React.ReactNode}){const edition=useCurrent();return edition===undefined?(fallback ?? <Skeleton label="Connecting to live event data…" />):edition===null?<EmptyState title="Getting ready for Savvy Hunt" href="/about" action="About the event">The event edition has not been configured yet. Programmes and official results will appear here once the organizers are ready.</EmptyState>:<>{children(edition)}</>}
