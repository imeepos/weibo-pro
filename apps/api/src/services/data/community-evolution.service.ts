import { Injectable, Inject } from '@sker/core';
import { useEntityManager } from '@sker/entities';
import { UserRelationStatistics } from '@sker/entities';
import { CacheService, CACHE_TTL } from '../cache.service';
import type { CommunityEvolutionAnalysis, CommunityTimeSlice, EvolutionEvent, KeyChange, TrendPrediction } from '@sker/sdk';
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';

@Injectable({ providedIn: 'root' })
export class CommunityEvolutionService {
  constructor(
    @Inject(CacheService) private readonly cacheService: CacheService
  ) {}

  async getCommunityEvolutionAnalysis(eventId: string): Promise<CommunityEvolutionAnalysis> {
    const cacheKey = CacheService.buildKey('community:evolution', eventId);

    return await this.cacheService.getOrSet(
      cacheKey,
      () => this.fetchCommunityEvolutionAnalysis(eventId),
      CACHE_TTL.LONG
    );
  }

  private async fetchCommunityEvolutionAnalysis(eventId: string): Promise<CommunityEvolutionAnalysis> {
    return useEntityManager(async (manager) => {
      // 查询事件时间范围
      const event = await manager
        .getRepository(UserRelationStatistics)
        .createQueryBuilder('relation')
        .select('MIN(relation.createdAt)', 'startTime')
        .addSelect('MAX(relation.createdAt)', 'endTime')
        .where('relation.eventId = :eventId', { eventId })
        .getRawOne();

      if (!event || !event.startTime || !event.endTime) {
        return this.getDefaultEvolutionAnalysis();
      }

      // 创建时间切片
      const timeSlices = await this.createTimeSlices(eventId, event.startTime, event.endTime);

      if (timeSlices.length === 0) {
        return this.getDefaultEvolutionAnalysis();
      }

      // 检测演化事件
      const evolutionEvents = this.detectEvolutionEvents(timeSlices);

      // 计算整体稳定性
      const overallStability = this.calculateOverallStability(timeSlices);

      // 识别关键变化
      const keyChanges = this.identifyKeyChanges(timeSlices, evolutionEvents);

      // 预测趋势
      const trendPrediction = this.predictTrend(timeSlices);

      return {
        timeSlices,
        evolutionEvents,
        overallStability,
        keyChanges,
        trendPrediction,
      };
    });
  }

  private async createTimeSlices(
    eventId: string,
    startTime: string,
    endTime: string
  ): Promise<CommunityTimeSlice[]> {
    return useEntityManager(async (manager) => {
      const timeSlices: CommunityTimeSlice[] = [];
      const start = new Date(startTime);
      const end = new Date(endTime);

      // 计算天数差异
      const daysDiff = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

      // 限制最多 30 天切片
      const maxDays = Math.min(daysDiff, 30);

      for (let day = 0; day <= maxDays; day++) {
        const dayStart = new Date(start);
        dayStart.setDate(dayStart.getDate() + day);
        dayStart.setHours(0, 0, 0, 0);

        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        // 查询该时间段的关系数据
        const relations = await manager
          .getRepository(UserRelationStatistics)
          .createQueryBuilder('relation')
          .select('relation.sourceUserId', 'sourceUserId')
          .addSelect('relation.targetUserId', 'targetUserId')
          .addSelect('SUM(relation.weight)', 'totalWeight')
          .where('relation.eventId = :eventId', { eventId })
          .andWhere('relation.createdAt >= :dayStart', { dayStart: dayStart.toISOString() })
          .andWhere('relation.createdAt < :dayEnd', { dayEnd: dayEnd.toISOString() })
          .groupBy('relation.sourceUserId, relation.targetUserId')
          .getRawMany();

        if (relations.length === 0) {
          continue;
        }

        // 运行社区发现
        const communities = await this.detectCommunities(relations);

        timeSlices.push({
          timestamp: dayStart.toISOString(),
          communities,
          modularity: 0, // TODO: 计算模块度
          totalMembers: communities.reduce((sum, c) => sum + c.size, 0),
        });
      }

      return timeSlices;
    });
  }

  private async detectCommunities(relations: any[]): Promise<any[]> {
    // 构建图结构
    const graph = new Graph();

    // 添加节点和边
    for (const relation of relations) {
      const sourceId = relation.sourceUserId;
      const targetId = relation.targetUserId;
      const weight = parseInt(relation.totalWeight) || 0;

      if (!graph.hasNode(sourceId)) {
        graph.addNode(sourceId, { screenName: sourceId });
      }
      if (!graph.hasNode(targetId)) {
        graph.addNode(targetId, { screenName: targetId });
      }

      if (!graph.hasEdge(sourceId, targetId)) {
        graph.addEdge(sourceId, targetId, { weight });
      }
    }

    // 使用 Louvain 算法检测社区
    const communityAssignments = louvain(graph);
    const communities = this.buildCommunities(graph, communityAssignments);

    return communities;
  }

  private buildCommunities(graph: Graph, assignments: Record<string, number>) {
    const communityGroups = new Map<number, string[]>();

    graph.forEachNode((node) => {
      const communityId = assignments[node]!;
      if (!communityGroups.has(communityId)) {
        communityGroups.set(communityId, []);
      }
      communityGroups.get(communityId)!.push(node);
    });

    const communities = Array.from(communityGroups.entries()).map(([communityId, members]) => {
      const size = members.length;

      // 计算社区密度
      let internalEdges = 0;
      members.forEach((memberId) => {
        graph.forEachNeighbor(memberId, (neighbor) => {
          if (members.includes(neighbor) && memberId < neighbor) {
            internalEdges++;
          }
        });
      });

      const maxPossibleEdges = (size * (size - 1)) / 2;
      const density = maxPossibleEdges > 0 ? internalEdges / maxPossibleEdges : 0;

      // 计算平均影响力
      let totalInfluence = 0;
      const memberDetails = members.map((userId) => {
        const inDegree = graph.inDegree(userId);
        const outDegree = graph.outDegree(userId);
        const totalDegree = inDegree + outDegree;
        const influenceScore = size > 1 ? totalDegree / (size - 1) : 0;
        totalInfluence += influenceScore;

        // 分类用户角色
        let role: 'leader' | 'active' | 'peripheral';
        if (inDegree + outDegree === 0) {
          role = 'peripheral';
        } else if (inDegree + outDegree >= size * 0.8) {
          role = 'leader';
        } else if (inDegree + outDegree >= size * 0.5) {
          role = 'active';
        } else {
          role = 'peripheral';
        }

        return {
          userId,
          screenName: graph.getNodeAttribute(userId, 'screenName') as string,
          role,
          inDegree,
          outDegree,
        };
      });

      // 按影响力排序，取前10%作为 leader
      memberDetails.sort((a, b) => (b.inDegree + b.outDegree) - (a.inDegree + a.outDegree));
      const leaderCount = Math.max(1, Math.ceil(members.length * 0.1));
      memberDetails.forEach((member, index) => {
        if (index < leaderCount) {
          member.role = 'leader';
        } else if (index < members.length * 0.5) {
          member.role = 'active';
        } else {
          member.role = 'peripheral';
        }
      });

      return {
        id: `community-${communityId}`,
        name: `Community ${communityId + 1}`,
        members: memberDetails,
        size,
        density,
        avgInfluence: size > 0 ? totalInfluence / size : 0,
        topKeywords: [],
        sentiment: { positive: 0, negative: 0, neutral: 0 },
      };
    });

    return communities;
  }

  private calculateJaccardSimilarity(setA: string[], setB: string[]): number {
    const setAUnique = new Set(setA);
    const setBUnique = new Set(setB);

    if (setAUnique.size === 0 || setBUnique.size === 0) {
      return 0;
    }

    const intersection = new Set([...setAUnique].filter((x) => setBUnique.has(x)));
    const union = new Set([...setAUnique, ...setBUnique]);

    return intersection.size / union.size;
  }

  private matchCommunities(
    prevSlice: CommunityTimeSlice,
    currSlice: CommunityTimeSlice,
    threshold = 0.5
  ): Map<string, string> {
    const matches = new Map<string, string>();

    for (const prevComm of prevSlice.communities) {
      let bestMatch: string | null = null;
      let bestSimilarity = threshold;

      for (const currComm of currSlice.communities) {
        const similarity = this.calculateJaccardSimilarity(
          prevComm.members.map((m) => m.userId),
          currComm.members.map((m) => m.userId)
        );

        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = currComm.id;
        }
      }

      if (bestMatch) {
        matches.set(prevComm.id, bestMatch);
      }
    }

    return matches;
  }

  private reverseMatch(matches: Map<string, string>): Map<string, string[]> {
    const reverseMap = new Map<string, string[]>();

    for (const [prevId, currId] of matches) {
      if (!reverseMap.has(currId)) {
        reverseMap.set(currId, []);
      }
      reverseMap.get(currId)!.push(prevId);
    }

    return reverseMap;
  }

  private detectEvolutionEvents(timeSlices: CommunityTimeSlice[]): EvolutionEvent[] {
    const events: EvolutionEvent[] = [];

    for (let i = 1; i < timeSlices.length; i++) {
      const prevSlice = timeSlices[i - 1]!;
      const currSlice = timeSlices[i]!;
      const matches = this.matchCommunities(prevSlice, currSlice);

      // Birth: 新社区出现
      for (const currComm of currSlice.communities) {
        if (!Array.from(matches.values()).includes(currComm.id)) {
          events.push({
            type: 'birth',
            timestamp: currSlice.timestamp,
            involvedCommunities: [currComm.id],
            magnitude: currComm.size,
            description: `新社区 ${currComm.name} 出现，包含 ${currComm.size} 个成员`,
          });
        }
      }

      // Death: 社区消失
      for (const prevComm of prevSlice.communities) {
        if (!matches.has(prevComm.id)) {
          events.push({
            type: 'death',
            timestamp: currSlice.timestamp,
            involvedCommunities: [prevComm.id],
            magnitude: prevComm.size,
            description: `社区 ${prevComm.name} 解散，原 ${prevComm.size} 个成员`,
          });
        }
      }

      // Split: 一个社区分裂为多个
      const reverseMatches = this.reverseMatch(matches);
      for (const [currId, prevIds] of reverseMatches) {
        if (prevIds.length > 1) {
          const currComm = currSlice.communities.find((c) => c.id === currId);
          events.push({
            type: 'split',
            timestamp: currSlice.timestamp,
            involvedCommunities: [...prevIds, currId],
            magnitude: currComm?.size || 0,
            description: `${prevIds.length} 个社区合并为 ${currComm?.name}`,
          });
        }
      }

      // Merge: 多个社区合并为一个
      const mergeMap = new Map<string, string[]>();
      for (const [prevId, currId] of matches) {
        if (!mergeMap.has(currId)) {
          mergeMap.set(currId, []);
        }
        mergeMap.get(currId)!.push(prevId);
      }

      for (const [currId, prevIds] of mergeMap) {
        if (prevIds.length > 1) {
          const currComm = currSlice.communities.find((c) => c.id === currId);
          events.push({
            type: 'merge',
            timestamp: currSlice.timestamp,
            involvedCommunities: [...prevIds, currId],
            magnitude: currComm?.size || 0,
            description: `${prevIds.length} 个社区合并为 ${currComm?.name}`,
          });
        }
      }

      // Growth/Shrink: 社区规模变化
      for (const [prevId, currId] of matches) {
        const prevComm = prevSlice.communities.find((c) => c.id === prevId);
        const currComm = currSlice.communities.find((c) => c.id === currId);

        if (prevComm && currComm) {
          const changeRatio = (currComm.size - prevComm.size) / prevComm.size;

          if (changeRatio > 0.2) {
            events.push({
              type: 'growth',
              timestamp: currSlice.timestamp,
              involvedCommunities: [prevId, currId],
              magnitude: changeRatio,
              description: `社区 ${currComm.name} 成长 ${Math.round(changeRatio * 100)}%`,
            });
          } else if (changeRatio < -0.2) {
            events.push({
              type: 'shrink',
              timestamp: currSlice.timestamp,
              involvedCommunities: [prevId, currId],
              magnitude: Math.abs(changeRatio),
              description: `社区 ${currComm.name} 衰退 ${Math.round(Math.abs(changeRatio) * 100)}%`,
            });
          }
        }
      }
    }

    return events;
  }

  private calculateOverallStability(timeSlices: CommunityTimeSlice[]): number {
    if (timeSlices.length < 2) {
      return 1.0;
    }

    let totalStability = 0;
    let totalPairs = 0;

    for (let i = 1; i < timeSlices.length; i++) {
      const prevSlice = timeSlices[i - 1]!;
      const currSlice = timeSlices[i]!;
      const matches = this.matchCommunities(prevSlice, currSlice);

      const stability = matches.size / prevSlice.communities.length;
      totalStability += stability;
      totalPairs++;
    }

    return totalPairs > 0 ? totalStability / totalPairs : 0;
  }

  private identifyKeyChanges(timeSlices: CommunityTimeSlice[], events: EvolutionEvent[]): KeyChange[] {
    const keyChanges: KeyChange[] = [];

    for (const event of events) {
      if (event.type === 'growth' || event.type === 'shrink') {
        const [prevId = '', currId = ''] = event.involvedCommunities;
        const prevSlice = timeSlices.find((s) =>
          s.communities.some((c) => c.id === prevId)
        );
        const currSlice = timeSlices.find((s) =>
          s.communities.some((c) => c.id === currId)
        );

        if (prevSlice && currSlice) {
          const prevComm = prevSlice.communities.find((c) => c.id === prevId);
          const currComm = currSlice.communities.find((c) => c.id === currId);

          if (prevComm && currComm) {
            // 识别关键成员变化
            const prevMembers = new Set(prevComm.members.map((m) => m.userId));
            const currMembers = new Set(currComm.members.map((m) => m.userId));

            const newMembers = [...currMembers].filter((m) => !prevMembers.has(m));
            const lostMembers = [...prevMembers].filter((m) => !currMembers.has(m));

            const keyMembers = [...newMembers.slice(0, 3), ...lostMembers.slice(0, 3)];

            keyChanges.push({
              communityId: currId,
              changeType: event.type,
              beforeSize: prevComm.size,
              afterSize: currComm.size,
              keyMembers,
            });
          }
        }
      }
    }

    return keyChanges;
  }

  private predictTrend(timeSlices: CommunityTimeSlice[]): TrendPrediction {
    if (timeSlices.length < 2) {
      return {
        predictedCommunityCount: timeSlices[0]?.communities.length || 0,
        predictedModularity: timeSlices[0]?.modularity || 0,
        confidence: 0,
      };
    }

    // 计算社区数量趋势
    const communityCounts = timeSlices.map((s) => s.communities.length);
    const _avgCommunityCount =
      communityCounts.reduce((sum, count) => sum + count, 0) / communityCounts.length;

    // 简单线性预测（此处 timeSlices.length >= 2，索引安全）
    const lastCount = communityCounts[communityCounts.length - 1]!;
    const prevCount = communityCounts[communityCounts.length - 2]!;
    const trend = lastCount - prevCount;
    const predictedCommunityCount = Math.max(0, Math.round(lastCount + trend));

    // 计算模块度趋势
    const modularities = timeSlices.map((s) => s.modularity);
    const avgModularity =
      modularities.reduce((sum, mod) => sum + mod, 0) / modularities.length;
    const predictedModularity = avgModularity;

    // 计算置信度（基于时间切片数量）
    const confidence = Math.min(1, timeSlices.length / 10);

    return {
      predictedCommunityCount,
      predictedModularity,
      confidence,
    };
  }

  private getDefaultEvolutionAnalysis(): CommunityEvolutionAnalysis {
    return {
      timeSlices: [],
      evolutionEvents: [],
      overallStability: 0,
      keyChanges: [],
      trendPrediction: {
        predictedCommunityCount: 0,
        predictedModularity: 0,
        confidence: 0,
      },
    };
  }
}
