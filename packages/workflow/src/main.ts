import { EdgeMode, Input, Output, ReactiveScheduler } from '.';
import { Ast, createWorkflowGraphAst } from '.';
import { INode } from '.';
import { Observable } from 'rxjs';
import { Handler, Node } from '.';


/**
 A (TestNode) ──┐
                ├──> C (Test2Node)
 B (TestNode) ──┘
 */
@Node()
export class TestNode extends Ast {
    type: `TestNode` = `TestNode`

    @Input()
    a: number = 0;

    @Output()
    b: number = 0;

}

@Node()
export class Test3Node extends Ast {
    @Output()
    a: number = 0;

    @Output()
    b: number = 0;

    type: `Test3Node` = `Test3Node`
}

@Node()
export class Test2Node extends Ast {
    type: `Test2Node` = `Test2Node`

    @Input()
    a: number = 0;

    @Input()
    b: number = 0;
}
// 创建测试节点
function createTestNode(id: string): INode {
    return {
        id,
        type: 'TestNode',
        state: 'pending',
        error: undefined,
        position: { x: 0, y: 0 },
        a: 0,
        count: 0,
        emitCount: 0
    };
}

function createTest2Node(id: string): INode {
    return {
        id,
        type: 'Test2Node',
        state: 'pending',
        error: undefined,
        position: { x: 0, y: 0 },
        a: 0,
        count: 0,
        emitCount: 0
    };
}

function createTest3Node(id: string): INode {
    return {
        id,
        type: 'Test3Node',
        state: 'pending',
        error: undefined,
        position: { x: 0, y: 0 },
        a: 0,
        count: 0,
        emitCount: 0
    };
}

async function delay() {
    return new Promise(resolve => setTimeout(resolve, Math.random() * 1000))
}

// Mock executeAst
export class TestNodeVisitor {
    @Handler(TestNode)
    visitor(node: TestNode) {
        return new Observable(obs => {
            console.log(`[${node.id}] 开始执行`);

            (async () => {
                // 第一次发射 emitting
                node.state = 'emitting';
                console.log(`[${node.id}] 发射 emitting b=1`);
                node.b = 1;
                obs.next({ ...node });
                await delay()

                // 第二次发射 emitting
                node.b = 2;
                console.log(`[${node.id}] 发射 emitting b=2`);
                obs.next({ ...node });
                await delay()

                // 第三次发射 emitting
                node.b = 3;
                console.log(`[${node.id}] 发射 emitting b=3`);
                obs.next({ ...node });
                await delay()

                // 发射 success
                node.state = 'success';
                console.log(`[${node.id}] 发射 success`);
                obs.next({ ...node });

                console.log(`[${node.id}] complete`);
                obs.complete();
            })();
        });
    }
}

export class TestNode2Visitor {
    @Handler(Test2Node)
    handler(ast: Test2Node) {
        console.log(ast)
        ast.state = 'success'
        return ast;
    }
}

export class TestNode3Visitor {
    @Handler(Test3Node)
    handler(node: Test3Node) {
        return new Observable(obs => {
            console.log(`[${node.id}] 开始执行`);

            (async () => {
                // 第一次发射 emitting
                node.state = 'emitting';
                console.log(`[${node.id}] 发射 emitting b=1`);
                node.b = 30;
                obs.next({ ...node });
                await delay()

                // 第二次发射 emitting
                node.b = 31;
                console.log(`[${node.id}] 发射 emitting b=2`);
                obs.next({ ...node });
                await delay()

                // 第三次发射 emitting
                node.b = 32;
                console.log(`[${node.id}] 发射 emitting b=3`);
                obs.next({ ...node });
                await delay()

                // 发射 success
                node.state = 'success';
                console.log(`[${node.id}] 发射 success`);
                obs.next({ ...node });

                console.log(`[${node.id}] complete`);
                obs.complete();
            })();
        });
    }
}
// 简单测试：单个入口节点
async function testSingleNode() {
    console.log('=== 测试：单个入口节点 ===\n');

    const ast = createWorkflowGraphAst({
        name: 'test',
        nodes: [createTestNode('A'), createTestNode("B"), createTest2Node("C"), createTest3Node("D")],
        edges: [
            { from: "A", to: "C", fromProperty: "b", toProperty: "a", id: "1", mode: EdgeMode.ZIP },
            { from: "B", to: "C", fromProperty: "b", toProperty: "b", id: "2", mode: EdgeMode.ZIP },
            { from: "D", to: "C", fromProperty: "a", toProperty: "a", id: "3", mode: EdgeMode.ZIP },
            { from: "D", to: "C", fromProperty: "b", toProperty: "b", id: "4", mode: EdgeMode.ZIP },
        ],
        state: 'pending'
    });

    const scheduler = new ReactiveScheduler();

    console.log('开始调度...\n');

    scheduler.schedule(ast, ast).subscribe({
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