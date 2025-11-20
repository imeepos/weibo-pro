
---
name: single-node
description: 单个节点运行的完整逻辑，开发流程。
---

## 单个节点运行

```ts
import { ReactiveScheduler } from '@sker/workflow';
import { Ast, createWorkflowGraphAst } from '@sker/workflow';
import { INode } from '@sker/workflow';
import { Observable } from 'rxjs';
import { Handler, Node } from '@sker/workflow';
@Node()
export class TestNode extends Ast {
    type: `TestNode` = `TestNode`
}
// 创建测试节点
function createTestNode(id: string): INode {
    return {
        id,
        type: 'TestNode',
        state: 'pending',
        error: undefined,
        position: { x: 0, y: 0 }
    };
}

// Mock executeAst
export class TestNodeVisitor {
    @Handler(TestNode)
    visitor(node: TestNode) {
        return new Observable(obs => {
            console.log(`[${node.id}] 开始执行`);

            node.state = 'emitting';
            console.log(`[${node.id}] 发射 emitting`);
            obs.next(node);

            node.state = 'success';
            console.log(`[${node.id}] 发射 success`);
            obs.next(node);

            console.log(`[${node.id}] complete`);
            obs.complete();
        });
    }
}


// 简单测试：单个入口节点
async function testSingleNode() {
    console.log('=== 测试：单个入口节点 ===\n');

    const ast = createWorkflowGraphAst({
        name: 'test',
        nodes: [createTestNode('A')],
        edges: [],
        state: 'pending'
    });

    const scheduler = new ReactiveScheduler();

    console.log('开始调度...\n');

    scheduler.schedule(ast, {}).subscribe({
        next: (result) => {
            console.log(`\n工作流状态更新: ${result.state}`);
            console.log(`节点状态:`, result.nodes.map(n => `${n.id}=${n.state}`));
        },
        complete: () => {
            console.log('\n工作流 complete');
            console.log(`最终工作流状态: ${ast.state}`);
            console.log(`最终节点状态:`, ast.nodes.map(n => `${n.id}=${n.state}`));
        },
        error: (err) => {
            console.error('错误:', err);
        }
    });
}

testSingleNode();
```