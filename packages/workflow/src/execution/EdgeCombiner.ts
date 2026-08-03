import { EdgeMode, IEdge } from '../types';

/**
 * 按 EdgeMode 分组边
 */
export function groupEdgesByMode(edges: IEdge[]): Map<EdgeMode, IEdge[]> {
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
