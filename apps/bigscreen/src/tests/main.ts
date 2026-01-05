import 'reflect-metadata';
import '@sker/workflow';
import '@sker/workflow-ast';
import '@sker/workflow-browser';
import "@sker/sdk";
import { createAuthClient } from 'better-auth/client'
import { createSkerClientPlugin } from '@sker/sdk'
import { executeAst, fromJson, WorkflowGraphAst } from '@sker/workflow';
import { readFileSync } from 'fs'
import { join } from 'path';

async function main() {
    createAuthClient({
        baseURL: 'http://localhost:8089/api/auth',
        plugins: [createSkerClientPlugin()]
    });

    console.log('========================================');
    console.log('开始执行工作流测试');
    console.log('========================================\n');

    const json = readFileSync(join(__dirname, 'test.json'), 'utf-8')
    const workflowData = JSON.parse(json)
    const workflow = fromJson(workflowData) as WorkflowGraphAst;

    console.log('工作流名称:', workflow.name);
    console.log('节点数量:', workflow.nodes.length);
    console.log('入口节点:', workflow.entryNodeIds);
    console.log('结束节点:', workflow.endNodeIds);
    console.log('\n========================================');
    console.log('开始执行...');
    console.log('========================================\n');

    const result$ = executeAst(workflow, workflow);

    let eventCount = 0;

    result$.subscribe({
        next: (event: any) => {
            eventCount++;
            const node = workflow.nodes.find((n: any) => n.id === event.id);
            const nodeType = node?.type || 'unknown';

            console.log(`[${eventCount}] 事件: ${event.type} | 节点: ${nodeType}`);

            if (event.data) {
                const dataStr = JSON.stringify(event.data);
                console.log(`  数据: ${dataStr.substring(0, 100)}${dataStr.length > 100 ? '...' : ''}`);
            }

            if (event.error) {
                console.log(`  ❌ 错误: ${event.error}`);
            }
        },
        error: (error) => {
            console.error('\n========================================');
            console.error('❌ 工作流执行失败');
            console.error('========================================');
            console.error(error);
            process.exit(1);
        },
        complete: () => {
            console.log('\n========================================');
            console.log('✓ 工作流执行完成');
            console.log('========================================');
            console.log('总事件数:', eventCount);
            process.exit(0);
        }
    });
}

main().catch((error) => {
    console.error('启动失败:', error);
    process.exit(1);
});