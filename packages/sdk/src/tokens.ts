import { InjectionToken } from "@sker/core";
import type { BetterFetchOption } from "@better-fetch/fetch";
import { BetterAuthClientOptions, BetterFetch, ClientStore } from "better-auth/client";

export const BETTER_FETCH = new InjectionToken<BetterFetch>(`BETTER_FETCH`)
export const BETTER_STORE = new InjectionToken<ClientStore>(`BETTER_STORE`)
export const BETTER_OPTIONS = new InjectionToken<BetterAuthClientOptions>(`BETTER_OPTIONS`)
export const BETTER_FETCH_CONFIG = new InjectionToken<BetterFetchOption>(`BETTER_FETCH_CONFIG`)
