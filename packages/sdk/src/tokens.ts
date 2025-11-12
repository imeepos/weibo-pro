import { InjectionToken } from "@sker/core";
import { AxiosInstance, AxiosRequestConfig } from "axios";

export const AXIOS = new InjectionToken<AxiosInstance>(`AXIOS`)
export const AXIOS_CONFIG = new InjectionToken<AxiosRequestConfig>(`AXIOS_CONFIG`)