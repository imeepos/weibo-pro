/**
 * Persona 记忆图谱相关类型
 */
import type {
  DistilledMemorySection,
  DistilledMemoryStability,
  MemoryType,
  RelationType,
  RiskLevel,
} from './base'

export interface PersonaListItem {
  id: string
  name: string
  avatar: string | null
  description: string | null
  memoryCount: number
  createdAt: string
}

export interface MemoryNode {
  id: string
  name: string
  description: string | null
  content: string
  type: MemoryType
  createdAt: string
  section?: DistilledMemorySection
  isSectionHub?: boolean
  stability?: DistilledMemoryStability
  badge?: string | null
  treeKind?: MemoryTreeNodeKind
  timeRange?: {
    startAt: string | null
    endAt: string | null
  } | null
}

export interface MemoryEdge {
  id: string
  sourceId: string
  targetId: string
  relationType: RelationType
}

export type MemoryTreeNodeKind =
  | 'section'
  | 'event_cluster'
  | 'topic_cluster'
  | 'viewpoint_cluster'
  | 'behavior_signal'
  | 'memory'
  | 'post_evidence'

export interface MemoryTreeNode {
  id: string
  kind: MemoryTreeNodeKind
  label: string
  description: string | null
  count: number
  badge?: string | null
  timeRange?: {
    startAt: string | null
    endAt: string | null
  } | null
  childrenCount: number
  children?: MemoryTreeNode[]
  memoryIds?: string[]
  postIds?: string[]
}

export interface PersonaMemoryGraph {
  persona: {
    id: string
    name: string
    avatar: string | null
    description: string | null
    traits: string[] | null
  }
  memories: MemoryNode[]
  relations: MemoryEdge[]
  tree: MemoryTreeNode[]
  timeline: Array<{
    bucketStart: string | null
    bucketEnd: string | null
    postCount: number
    sameContentCount: number
    eventCount: number
  }>
  coordinationSignals: Array<{
    id: string
    label: string
    level: 'low' | 'medium' | 'high'
    eventKey: string | null
    timeRange: {
      startAt: string | null
      endAt: string | null
    }
    relatedPostCount: number
    description: string
  }>
  stats: {
    totalMemories: number
    totalEvents: number
    totalEvidencePosts: number
    totalWarnings: number
  }
}

export interface PersonaEvidenceItem {
  id: string
  memoryId: string
  sourceTable: string
  sourceId: string
  excerpt: string | null
  evidenceType: string
  score: number
  metadata?: Record<string, unknown> | null
  createdAt: string
}

export interface PersonaNetworkGraph {
  personas: Array<{
    personaId: string
    weiboUserId: string
    name: string
    avatar: string | null
    riskLevel: RiskLevel | 'critical'
    riskScore: number
    traits: string[]
    memoryCount: number
    lastDistilledAt: string | null
  }>
  edges: Array<{
    id: string
    sourcePersonaId: string
    targetPersonaId: string
    edgeType: 'interaction' | 'co_event' | 'profile_similarity'
    weight: number
    reason: string
  }>
}

/** 记忆检索请求 */
export interface RetrieveMemoriesRequest {
  personaId: string
  stimuli: string[]
  depth?: number
  timeout?: number
}

/** 检索到的记忆（带深度） */
export interface RetrievedMemory {
  id: string
  name: string
  content: string
  type: MemoryType
  depth: number
}

/** 记忆检索响应 */
export interface RetrieveMemoriesResponse {
  memories: RetrievedMemory[]
  context: string
}

/** 创建记忆请求 */
export interface CreateMemoryRequest {
  personaId: string
  name: string
  content: string
  type: MemoryType
  relatedMemoryIds?: string[]
}
