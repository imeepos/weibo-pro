import { InjectionToken } from "@sker/core";
import { BetterFetchOption } from "@better-fetch/fetch";

type BetterFetchInstance = ReturnType<typeof import("@better-fetch/fetch").createFetch>;

export const BETTER_FETCH = new InjectionToken<BetterFetchInstance>(`BETTER_FETCH`)
export const BETTER_FETCH_CONFIG = new InjectionToken<BetterFetchOption>(`BETTER_FETCH_CONFIG`)
