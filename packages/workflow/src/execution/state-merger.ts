import { Injectable } from '@sker/core';
import { INode } from '../types';

@Injectable()
export class StateMerger {
    mergeNodeStates(
        originalNodes: INode[],
        newlyExecutedNodes: INode[]
    ): INode[] {
        const executedNodeMap = new Map(
            newlyExecutedNodes.map(node => [node.id, node])
        );
        return originalNodes.map(originalNode => {
            const executedNode = executedNodeMap.get(originalNode.id);
            return executedNode || originalNode;
        });
    }
}
