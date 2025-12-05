import { Injectable } from "@sker/core";
import { Render, WorkflowGraphAst } from "@sker/workflow";
import React from "react";
import { WorkflowGraphNode } from '@sker/ui/components/workflow';
import { useWorkflowOperations } from '../context/workflow-operations';

const WorkflowGraphComponent: React.FC<{ ast: WorkflowGraphAst }> = ({ ast }) => {
    const ops = useWorkflowOperations()

    return (
        <WorkflowGraphNode
            name={ast.name}
            nodeCount={ast.nodes?.length ?? 0}
            edgeCount={ast.edges?.length ?? 0}
            variant="default"
            onClick={() => {
                ops.openSubWorkflow?.(ast.id, ast)
            }}
        />
    )
}

@Injectable()
export class WorkflowGraphAstRender {
    @Render(WorkflowGraphAst)
    render(ast: WorkflowGraphAst) {
        return <WorkflowGraphComponent ast={ast} />
    }
}