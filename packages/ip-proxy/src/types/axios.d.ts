import 'axios'

declare module 'axios' {
  export interface AxiosRequestConfig {
    metadata?: {
      proxyUrl?: string
      [key: string]: any
    }
  }

  export interface InternalAxiosRequestConfig {
    metadata?: {
      proxyUrl?: string
      [key: string]: any
    }
  }
}
