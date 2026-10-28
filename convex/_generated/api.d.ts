/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admins from "../admins.js";
import type * as announcements from "../announcements.js";
import type * as categories from "../categories.js";
import type * as editions from "../editions.js";
import type * as events from "../events.js";
import type * as gallery from "../gallery.js";
import type * as lib_scoring from "../lib/scoring.js";
import type * as lib_security from "../lib/security.js";
import type * as results from "../results.js";
import type * as schools from "../schools.js";
import type * as scoreboard from "../scoreboard.js";
import type * as siteSettings from "../siteSettings.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admins: typeof admins;
  announcements: typeof announcements;
  categories: typeof categories;
  editions: typeof editions;
  events: typeof events;
  gallery: typeof gallery;
  "lib/scoring": typeof lib_scoring;
  "lib/security": typeof lib_security;
  results: typeof results;
  schools: typeof schools;
  scoreboard: typeof scoreboard;
  siteSettings: typeof siteSettings;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
