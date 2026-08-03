/**
 * 社区发现模块
 *
 * 负责将用户关系数据构建为图结构，使用 Louvain 算法检测社区，
 * 并将社区划分转换为结构化的社区对象（成员、角色、密度、影响力）。
 */
import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';

/**
 * 基于用户关系数据运行社区发现
 *
 * 构建有向图并执行 Louvain 算法，返回结构化社区列表。
 */
export async function detectCommunities(relations: any[]): Promise<any[]> {
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
  const communities = buildCommunities(graph, communityAssignments);

  return communities;
}

/**
 * 将社区划分转换为结构化的社区对象
 *
 * 计算社区规模、密度、成员平均影响力，并按影响力为成员分配角色
 * （leader / active / peripheral）。
 */
export function buildCommunities(graph: Graph, assignments: Record<string, number>) {
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
