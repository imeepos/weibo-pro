/**
 * MediaCrawler 相关类型
 */
import type { MediaPlatform } from './base'

export type LoginType = 'qrcode' | 'phone' | 'cookie'
export type CrawlerType = 'search' | 'detail' | 'creator'
export type SaveDataOption = 'csv' | 'db' | 'json' | 'sqlite' | 'mongodb' | 'excel'
export type CrawlerStatus = 'idle' | 'running' | 'stopping' | 'error'
export type LogLevel = 'info' | 'warning' | 'error' | 'success' | 'debug'

export interface CrawlerStartRequest {
  platform: MediaPlatform
  loginType?: LoginType
  crawlerType?: CrawlerType
  keywords?: string
  specifiedIds?: string
  creatorIds?: string
  startPage?: number
  enableComments?: boolean
  enableSubComments?: boolean
  saveOption?: SaveDataOption
  cookies?: string
  headless?: boolean
}

export interface CrawlerStatusResponse {
  status: CrawlerStatus
  platform?: string
  crawlerType?: string
  startedAt?: string
  errorMessage?: string
}

export interface CrawlerLogEntry {
  id: number
  timestamp: string
  level: LogLevel
  message: string
}

export interface PlatformInfo {
  value: MediaPlatform
  label: string
  icon: string
}

export interface ConfigOption {
  value: string
  label: string
}

export interface DataFileInfo {
  name: string
  path: string
  size: number
  modifiedAt: number
  recordCount?: number
  type: string
}

export interface DataFileListResponse {
  files: DataFileInfo[]
}

export interface DataFileContentResponse {
  data: any
  total: number
  columns?: string[]
}

export interface DataStats {
  totalFiles: number
  totalSize: number
  byPlatform: Record<string, number>
  byType: Record<string, number>
}

export interface EnvCheckResult {
  success: boolean
  message: string
  output?: string
  error?: string
}
