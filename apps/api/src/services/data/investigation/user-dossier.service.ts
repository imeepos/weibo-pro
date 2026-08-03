/**
 * 用户档案(dossier)服务。
 * 负责编排账号快照、事件风险、历史覆盖、行为时间线、话题情绪、
 * 关系摘要与样本证据等数据加载，并生成蒸馏前摘要。
 * SQL 查询、行映射、纯工具函数与摘要构建分别抽离到独立模块。
 */

import { Injectable } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import type { UserInvestigationDossier } from '@sker/sdk';
import type {
  UserDossierAccountSnapshot,
  UserDossierEvidenceSamples,
  UserDossierOptions,
} from './types';
import {
  queryAccountSnapshot,
  queryEventRiskContext,
  queryEvidenceEvent,
  queryEvidenceHistory,
  queryEvidenceNlp,
  queryEvidenceRelation,
  queryEventTypes,
  queryHistoryCoverage,
  queryInteractionByDay,
  queryPostingByDay,
  queryPostingByHour,
  queryRelationSummary,
  querySentimentTrend,
  queryTopicKeywords,
} from './user-dossier.queries';
import {
  buildEmptyEventRiskContext,
  mapAccountSnapshot,
  mapBehaviorTimeline,
  mapEventRiskContext,
  mapEvidenceSamples,
  mapHistoryCoverage,
  mapRelationSummary,
  mapTopicAndSentimentProfile,
} from './user-dossier.mappers';
import { resolveWindowStart } from './user-dossier.utils';
import {
  buildPreDistillationSummary,
  type PreDistillationSummaryInput,
} from './user-dossier.summary';

@Injectable({ providedIn: 'root' })
export class UserDossierService {
  async getDossier(
    weiboUserId: string,
    options: UserDossierOptions,
  ): Promise<UserInvestigationDossier> {
    const accountSnapshot = await this.loadAccountSnapshot(weiboUserId);
    const eventRiskContext = await this.loadEventRiskContext(weiboUserId, options);
    const historyCoverage = await this.loadHistoryCoverage(weiboUserId, options);
    const behaviorTimeline = await this.loadBehaviorTimeline(weiboUserId, options);
    const topicAndSentimentProfile = await this.loadTopicAndSentimentProfile(weiboUserId, options);
    const relationSummary = await this.loadRelationSummary(weiboUserId, options);
    const evidenceSamples = await this.loadEvidenceSamples(weiboUserId, options);
    const preDistillationSummary = await this.buildPreDistillationSummary({
      eventRiskContext,
      historyCoverage,
      topicAndSentimentProfile,
      relationSummary,
      evidenceSamples,
    });

    return {
      accountSnapshot,
      eventRiskContext,
      historyCoverage,
      behaviorTimeline,
      topicAndSentimentProfile,
      relationSummary,
      evidenceSamples,
      preDistillationSummary,
    };
  }

  protected async loadAccountSnapshot(weiboUserId: string): Promise<UserDossierAccountSnapshot> {
    return useEntityManager(async (manager) => {
      const rows = await queryAccountSnapshot(manager, weiboUserId);
      return mapAccountSnapshot(rows, weiboUserId);
    });
  }

  protected async loadEvidenceSamples(
    weiboUserId: string,
    options: UserDossierOptions,
  ): Promise<UserDossierEvidenceSamples> {
    return useEntityManager(async (manager) => {
      const windowStart = resolveWindowStart(options.windowDays);
      const historyRows = await queryEvidenceHistory(manager, weiboUserId, windowStart);
      const eventRows = options.eventId
        ? await queryEvidenceEvent(manager, weiboUserId, options.eventId, windowStart)
        : [];
      const relationRows = await queryEvidenceRelation(manager, weiboUserId, windowStart);
      const nlpRows = await queryEvidenceNlp(manager, weiboUserId, windowStart);
      return mapEvidenceSamples(eventRows, historyRows, relationRows, nlpRows);
    });
  }

  protected async loadEventRiskContext(
    weiboUserId: string,
    options: UserDossierOptions,
  ): Promise<UserInvestigationDossier['eventRiskContext']> {
    return useEntityManager(async (manager) => {
      if (!options.eventId) {
        return buildEmptyEventRiskContext();
      }

      const rows = await queryEventRiskContext(manager, weiboUserId, options.eventId);
      return mapEventRiskContext(rows, options.eventId);
    });
  }

  protected async loadHistoryCoverage(
    weiboUserId: string,
    options: UserDossierOptions,
  ): Promise<UserInvestigationDossier['historyCoverage']> {
    return useEntityManager(async (manager) => {
      const windowStart = resolveWindowStart(options.windowDays);
      const rows = await queryHistoryCoverage(manager, weiboUserId, windowStart);
      return mapHistoryCoverage(rows, options.windowDays);
    });
  }

  protected async loadBehaviorTimeline(
    weiboUserId: string,
    options: UserDossierOptions,
  ): Promise<UserInvestigationDossier['behaviorTimeline']> {
    return useEntityManager(async (manager) => {
      const windowStart = resolveWindowStart(options.windowDays);
      const postingByDay = await queryPostingByDay(manager, weiboUserId, windowStart);
      const postingByHour = await queryPostingByHour(manager, weiboUserId, windowStart);
      const interactionByDay = await queryInteractionByDay(manager, weiboUserId, windowStart);
      return mapBehaviorTimeline(postingByDay, postingByHour, interactionByDay);
    });
  }

  protected async loadTopicAndSentimentProfile(
    weiboUserId: string,
    options: UserDossierOptions,
  ): Promise<UserInvestigationDossier['topicAndSentimentProfile']> {
    return useEntityManager(async (manager) => {
      const windowStart = resolveWindowStart(options.windowDays);
      const keywordRows = await queryTopicKeywords(manager, weiboUserId, windowStart);
      const eventTypeRows = await queryEventTypes(manager, weiboUserId, windowStart);
      const sentimentRows = await querySentimentTrend(manager, weiboUserId, windowStart);
      return mapTopicAndSentimentProfile(keywordRows, eventTypeRows, sentimentRows);
    });
  }

  protected async loadRelationSummary(
    weiboUserId: string,
    options: UserDossierOptions,
  ): Promise<UserInvestigationDossier['relationSummary']> {
    return useEntityManager(async (manager) => {
      const windowStart = resolveWindowStart(options.windowDays);
      const rows = await queryRelationSummary(manager, weiboUserId, windowStart);
      return mapRelationSummary(rows);
    });
  }

  protected async buildPreDistillationSummary(input: PreDistillationSummaryInput) {
    return buildPreDistillationSummary(input);
  }
}
