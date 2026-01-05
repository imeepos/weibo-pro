import { Injectable } from '@sker/core';
import { EdgeMode, IEdge } from '../types';

/**
 * 边组合器
 *
 * 职责：
 * - 按 EdgeMode 分组边
 *
 * 注意：
 * - 所有 EdgeMode 的组合逻辑由 EdgeModeStrategy 处理
 * - 优先级合并逻辑已移至 WorkflowGraphAstVisitor
 */
@Injectable()
export class EdgeCombiner {
    /**
     * 按 EdgeMode 分组边
     */
    groupEdgesByMode(edges: IEdge[]): Map<EdgeMode, IEdge[]> {
        const groups = new Map<EdgeMode, IEdge[]>();

        edges.forEach(edge => {
            const mode = edge.mode ?? EdgeMode.COMBINE_LATEST;
            if (!groups.has(mode)) {
                groups.set(mode, []);
            }
            groups.get(mode)!.push(edge);
        });

        return groups;
    }
}
