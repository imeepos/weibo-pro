import { Subscriber } from "rxjs";
import { BrowserContext, Page, Cookie } from "playwright";
import { WeiboLoginAst } from "@sker/workflow-ast";

/**
 * 微博登录事件类型
 */
export type WeiboLoginEventType = 'qrcode' | 'status' | 'scanned' | 'success' | 'expired' | 'error';

/**
 * 微博登录事件接口
 */
export interface WeiboLoginEvent {
  type: WeiboLoginEventType;
  data: any;
  sessionId: string;
  timestamp: Date;
}

/**
 * 微博用户信息接口
 */
export interface WeiboUserInfo {
  uid: string;
  nickname: string;
  avatar: string;
}

/**
 * 登录会话接口
 */
export interface LoginSession {
  sessionId: string;
  userId: string;
  subject: Subscriber<WeiboLoginAst>
  context: BrowserContext;
  page: Page;
  timer?: NodeJS.Timeout;
  createdAt: Date;
  expiresAt: Date;
  lastEvent?: WeiboLoginEvent;
}

/**
 * 登录会话快照
 */
export interface WeiboLoginSessionSnapshot {
  sessionId: string;
  userId: string;
  lastEvent?: WeiboLoginEvent;
  expiresAt: Date;
  isExpired: boolean;
  status: 'active' | 'expired' | 'completed';
}

/**
 * 登录事件信封
 */
export interface WeiboLoginEventEnvelope {
  sessionId: string;
  userId: string;
  event: WeiboLoginEvent;
  emittedAt: string;
}

/**
 * 会话存储接口
 */
export interface SessionStorage {
  createSession(userId: string, metadata?: any): Promise<{ sessionId: string; expiresAt: Date }>;
  getSession(sessionId: string): Promise<any>;
  updateSessionEvent(sessionId: string, event: WeiboLoginEvent): Promise<void>;
  updateSessionStatus(sessionId: string, status: string): Promise<void>;
  getStats(): Promise<any>;
}

/**
 * 微博登录配置
 */
export interface WeiboLoginConfig {
  sessionTimeout: number;
  loginUrl: string;
  userAgent: string;
  headless: boolean;
}