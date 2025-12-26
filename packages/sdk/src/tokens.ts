import { InjectionToken } from "@sker/core";
import type { BetterFetchOption } from "@better-fetch/fetch";
import type { createFetch } from "@better-fetch/fetch";

type BetterFetchInstance = ReturnType<typeof createFetch>;

export const BETTER_FETCH = new InjectionToken<BetterFetchInstance>(`BETTER_FETCH`)
export const BETTER_FETCH_CONFIG = new InjectionToken<BetterFetchOption>(`BETTER_FETCH_CONFIG`)
