/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as chartActions from "../chartActions.js";
import type * as crons from "../crons.js";
import type * as firecrawlActions from "../firecrawlActions.js";
import type * as holdings from "../holdings.js";
import type * as http from "../http.js";
import type * as newsActions from "../newsActions.js";
import type * as phoneContacts from "../phoneContacts.js";
import type * as priceActions from "../priceActions.js";
import type * as researchActions from "../researchActions.js";
import type * as seedHoldings from "../seedHoldings.js";
import type * as seedResearch from "../seedResearch.js";
import type * as tasks from "../tasks.js";
import type * as users from "../users.js";
import type * as wallstreetbetsActions from "../wallstreetbetsActions.js";
import type * as weeklyDigestActions from "../weeklyDigestActions.js";
import type * as weeklyDigestEngine from "../weeklyDigestEngine.js";
import type * as weeklyDigestQueries from "../weeklyDigestQueries.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  chartActions: typeof chartActions;
  crons: typeof crons;
  firecrawlActions: typeof firecrawlActions;
  holdings: typeof holdings;
  http: typeof http;
  newsActions: typeof newsActions;
  phoneContacts: typeof phoneContacts;
  priceActions: typeof priceActions;
  researchActions: typeof researchActions;
  seedHoldings: typeof seedHoldings;
  seedResearch: typeof seedResearch;
  tasks: typeof tasks;
  users: typeof users;
  wallstreetbetsActions: typeof wallstreetbetsActions;
  weeklyDigestActions: typeof weeklyDigestActions;
  weeklyDigestEngine: typeof weeklyDigestEngine;
  weeklyDigestQueries: typeof weeklyDigestQueries;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {};
