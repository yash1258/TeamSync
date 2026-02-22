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
import type * as budget from "../budget.js";
import type * as calendar from "../calendar.js";
import type * as cycles from "../cycles.js";
import type * as dashboard from "../dashboard.js";
import type * as decisions from "../decisions.js";
import type * as documents from "../documents.js";
import type * as http from "../http.js";
import type * as initiatives from "../initiatives.js";
import type * as invites from "../invites.js";
import type * as issueRelations from "../issueRelations.js";
import type * as issues from "../issues.js";
import type * as planningAuth from "../planningAuth.js";
import type * as projects from "../projects.js";
import type * as seed from "../seed.js";
import type * as tasks from "../tasks.js";
import type * as teamMembers from "../teamMembers.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  budget: typeof budget;
  calendar: typeof calendar;
  cycles: typeof cycles;
  dashboard: typeof dashboard;
  decisions: typeof decisions;
  documents: typeof documents;
  http: typeof http;
  initiatives: typeof initiatives;
  invites: typeof invites;
  issueRelations: typeof issueRelations;
  issues: typeof issues;
  planningAuth: typeof planningAuth;
  projects: typeof projects;
  seed: typeof seed;
  tasks: typeof tasks;
  teamMembers: typeof teamMembers;
  users: typeof users;
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
