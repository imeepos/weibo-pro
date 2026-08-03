import { Injectable } from '@sker/core';
import { RateLimiter } from './llm-proxy/rate-limiter';
import { ProtocolConverter } from './llm-proxy/protocol-converter';
import { ProviderRepository } from './llm-proxy/provider-repository';
import { ChatLogRepository } from './llm-proxy/chat-log';
import { ProxyDispatcher } from './llm-proxy/proxy-dispatcher';
import type { ProviderInfo, ProxyResult } from './llm-proxy/types';

@Injectable({ providedIn: 'root' })
export class LlmProxyService {
  private rateLimiter = new RateLimiter();
  private protocolConverter = new ProtocolConverter();
  private providerRepository = new ProviderRepository(this.rateLimiter);
  private chatLogRepository = new ChatLogRepository();
  private dispatcher = new ProxyDispatcher(
    this.providerRepository,
    this.rateLimiter,
    this.protocolConverter,
    this.chatLogRepository,
  );

  async findProvider(requestedModel: string, protocol: string, excludeIds: Set<string> = new Set(), requiresThinking: boolean = false): Promise<ProviderInfo | null> {
    return this.providerRepository.findProvider(requestedModel, protocol, excludeIds, requiresThinking);
  }

  async updateScore(providerId: string, delta: number): Promise<void> {
    return this.providerRepository.updateScore(providerId, delta);
  }

  async setScoreToZero(providerId: string): Promise<void> {
    return this.providerRepository.setScoreToZero(providerId);
  }

  async disableThinkingSupport(providerId: string, modelName: string): Promise<void> {
    return this.providerRepository.disableThinkingSupport(providerId, modelName);
  }

  async proxyRequest(protocol: string, apiPath: string, body: Record<string, unknown> & { model?: string }, headers: Record<string, string>, contentLength: number): Promise<ProxyResult> {
    return this.dispatcher.proxyRequest(protocol, apiPath, body, headers, contentLength);
  }
}
