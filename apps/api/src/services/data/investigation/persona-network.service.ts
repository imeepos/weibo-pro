import { Injectable } from '@sker/core';
import {
  PersonaEntity,
  UserProfileDistillationTaskEntity,
  WeiboUserPersonaLinkEntity,
  useEntityManager,
} from '@sker/entities';
import type { PersonaNetworkGraph } from '@sker/sdk';
import { In } from 'typeorm';

@Injectable({ providedIn: 'root' })
export class PersonaNetworkService {
  async buildGraph(graph: PersonaNetworkGraph): Promise<PersonaNetworkGraph> {
    const edgeMap = new Map<string, PersonaNetworkGraph['edges'][number]>();

    for (const edge of graph.edges) {
      const existing = edgeMap.get(edge.id);
      if (existing) {
        existing.weight += edge.weight;
        existing.reason = `${existing.reason}; ${edge.reason}`;
      } else {
        edgeMap.set(edge.id, { ...edge });
      }
    }

    return {
      personas: graph.personas,
      edges: Array.from(edgeMap.values()),
    };
  }

  async getGraphOverview(): Promise<PersonaNetworkGraph> {
    return useEntityManager(async (manager) => {
      const links = await manager.find(WeiboUserPersonaLinkEntity, {
        where: { status: 'active', is_primary: true },
      });

      if (!links.length) {
        return { personas: [], edges: [] };
      }

      const personaIds = Array.from(new Set(links.map((item) => item.persona_id)));
      const personas = await manager.find(PersonaEntity, {
        where: { id: In(personaIds) },
      });

      const latestTasks = await manager
        .createQueryBuilder(UserProfileDistillationTaskEntity, 't')
        .distinctOn(['t.weibo_user_id'])
        .select([
          't.weibo_user_id AS "weiboUserId"',
          't.event_id AS "eventId"',
          't.created_at AS "createdAt"',
          't.distilled_json AS "distilledJson"',
        ])
        .where('t.weibo_user_id IN (:...weiboUserIds)', {
          weiboUserIds: Array.from(new Set(links.map((item) => item.weibo_user_id))),
        })
        .orderBy('t.weibo_user_id', 'ASC')
        .addOrderBy('t.created_at', 'DESC')
        .getRawMany();

      const memoryCounts = await manager
        .createQueryBuilder('memories', 'm')
        .select('m.persona_id', 'personaId')
        .addSelect('COUNT(*)', 'count')
        .where('m.persona_id IN (:...personaIds)', { personaIds })
        .groupBy('m.persona_id')
        .getRawMany();

      const countMap = new Map(memoryCounts.map((row: any) => [row.personaId, Number(row.count)]));
      const taskMap = new Map(latestTasks.map((row: any) => [String(row.weiboUserId), row]));
      const linkMap = new Map(links.map((item) => [String(item.weibo_user_id), item.persona_id]));

      const relationRows = await manager.query(
        `
          SELECT
            source_user_id::text AS source_user_id,
            target_user_id::text AS target_user_id,
            SUM(weight) AS total_weight
          FROM user_relation_statistics
          WHERE source_user_id::text = ANY($1)
            AND target_user_id::text = ANY($1)
          GROUP BY source_user_id::text, target_user_id::text
        `,
        [Array.from(linkMap.keys())],
      );

      const graph: PersonaNetworkGraph = {
        personas: links.map((link) => {
          const persona = personas.find((item) => item.id === link.persona_id);
          const latestTask = taskMap.get(String(link.weibo_user_id));
          const distilledJson = latestTask?.distilledJson as Record<string, any> | undefined;

          return {
            personaId: link.persona_id,
            weiboUserId: String(link.weibo_user_id),
            name: persona?.name ?? String(link.weibo_user_id),
            avatar: persona?.avatar ?? null,
            riskLevel: distilledJson?.risk?.overallLevel ?? 'low',
            riskScore: Number(distilledJson?.risk?.overallScore ?? 0),
            traits: persona?.traits ?? [],
            memoryCount: countMap.get(link.persona_id) ?? 0,
            lastDistilledAt: latestTask?.createdAt ? new Date(latestTask.createdAt).toISOString() : null,
          };
        }),
        edges: [],
      };

      for (const row of relationRows) {
        const sourcePersonaId = linkMap.get(String(row.source_user_id));
        const targetPersonaId = linkMap.get(String(row.target_user_id));
        if (!sourcePersonaId || !targetPersonaId || sourcePersonaId === targetPersonaId) continue;

        graph.edges.push({
          id: `interaction:${sourcePersonaId}:${targetPersonaId}`,
          sourcePersonaId,
          targetPersonaId,
          edgeType: 'interaction',
          weight: Number(row.total_weight || 0),
          reason: '用户互动关系',
        });
      }

      const personasByEvent = new Map<string, string[]>();
      for (const link of links) {
        const latestTask = taskMap.get(String(link.weibo_user_id));
        if (!latestTask?.eventId) continue;
        const current = personasByEvent.get(latestTask.eventId) ?? [];
        current.push(link.persona_id);
        personasByEvent.set(latestTask.eventId, current);
      }

      for (const [eventId, personaIdsForEvent] of personasByEvent.entries()) {
        for (let i = 0; i < personaIdsForEvent.length; i += 1) {
          for (let j = i + 1; j < personaIdsForEvent.length; j += 1) {
            graph.edges.push({
              id: `co_event:${personaIdsForEvent[i]}:${personaIdsForEvent[j]}:${eventId}`,
              sourcePersonaId: personaIdsForEvent[i]!,
              targetPersonaId: personaIdsForEvent[j]!,
              edgeType: 'co_event',
              weight: 1,
              reason: `共同出现在事件 ${eventId}`,
            });
          }
        }
      }

      for (let i = 0; i < graph.personas.length; i += 1) {
        for (let j = i + 1; j < graph.personas.length; j += 1) {
          const left = graph.personas[i]!;
          const right = graph.personas[j]!;
          const overlap = left.traits.filter((item) => right.traits.includes(item));
          if (!overlap.length) continue;

          graph.edges.push({
            id: `profile_similarity:${left.personaId}:${right.personaId}`,
            sourcePersonaId: left.personaId,
            targetPersonaId: right.personaId,
            edgeType: 'profile_similarity',
            weight: overlap.length,
            reason: `共享特征：${overlap.join('、')}`,
          });
        }
      }

      return this.buildGraph(graph);
    });
  }
}
