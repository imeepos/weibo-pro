/**
 * 环图工作流 Demo 测试脚本
 *
 * 用途：验证质量循环工作流是否正常工作
 */

import { fromJson, executeWorkflow } from '@sker/workflow';
import * as fs from 'fs';
import * as path from 'path';

// 读取 demo 文件
const demoPath = path.join(__dirname, '../demo-simple.workflow.json');
const demoJson = JSON.parse(fs.readFileSync(demoPath, 'utf-8'));

console.log('='.repeat(60));
console.log('🚀 环图工作流 Demo 测试');
console.log('='.repeat(60));

// 反序列化工作流
const workflow = fromJson(demoJson);
console.log(`✅ 工作流加载成功: ${workflow.name}`);
console.log(`📊 节点数: ${workflow.nodes.length}`);
console.log(`🔗 边数: ${workflow.edges.length}`);
console.log('');

// 验证环图
const loopEdge = workflow.edges.find(
  e => e.from === 'switch' && e.to === 'loop'
);

if (loopEdge) {
  console.log('✅ 环图连线已配置');
  console.log(`   ${loopEdge.from}.${loopEdge.fromProperty} → ${loopEdge.to}.${loopEdge.toProperty}`);
} else {
  console.error('❌ 未找到环图连线（switch → loop）');
  process.exit(1);
}
console.log('');

// 验证 Loop 节点配置
const loopNode = workflow.nodes.find(n => n.id === 'loop');
if (loopNode) {
  console.log('✅ Loop 节点配置:');
  console.log(`   minQualityScore: ${loopNode.minQualityScore}`);
  console.log(`   maxRetries: ${loopNode.maxRetries}`);
} else {
  console.error('❌ 未找到 Loop 节点');
  process.exit(1);
}
console.log('');

// 执行工作流
console.log('🎬 开始执行工作流...');
console.log('-'.repeat(60));

let eventCount = 0;
let loopCount = 0;
let lastScore = 0;

executeWorkflow(workflow).subscribe({
  next: (event) => {
    eventCount++;

    // 打印关键事件
    if (event.type === 'node_runing') {
      const node = workflow.nodes.find(n => n.id === event.id);
      console.log(`▶️  [${node?.name || event.id}] 开始执行`);
    }

    if (event.type === 'node_emit') {
      const node = workflow.nodes.find(n => n.id === event.id);

      // 监控循环次数
      if (event.id === 'loop' && event.property === 'currentAttempt') {
        loopCount = event.value;
        console.log(`🔄 [循环控制器] 第 ${loopCount} 次尝试`);
      }

      // 监控质量分数
      if (event.id === 'evaluator' && event.property === 'structuredOutput') {
        lastScore = event.value?.score || 0;
        const passed = event.value?.passed || false;
        const emoji = passed ? '✅' : '❌';
        console.log(`${emoji} [质量评估] 分数: ${lastScore}, 通过: ${passed}`);

        if (!passed) {
          console.log(`   问题: ${event.value?.issues?.join(', ') || '无'}`);
        }
      }

      // 监控最终输出
      if (event.id === 'loop' && event.property === 'finalChapter') {
        console.log(`🎉 [循环控制器] 输出最终章节`);
      }
    }

    if (event.type === 'node_success') {
      const node = workflow.nodes.find(n => n.id === event.id);
      console.log(`✔️  [${node?.name || event.id}] 执行成功`);
    }

    if (event.type === 'node_fail') {
      const node = workflow.nodes.find(n => n.id === event.id);
      console.error(`❌ [${node?.name || event.id}] 执行失败`);
      console.error(`   错误: ${event.data?.error?.message}`);
    }
  },

  complete: () => {
    console.log('-'.repeat(60));
    console.log('🏁 工作流执行完成');
    console.log('');
    console.log('📈 统计信息:');
    console.log(`   总事件数: ${eventCount}`);
    console.log(`   循环次数: ${loopCount}`);
    console.log(`   最终分数: ${lastScore}`);
    console.log('');

    // 验证结果
    if (loopCount >= 1 && loopCount <= loopNode.maxRetries) {
      console.log(`✅ 循环次数正常（1-${loopNode.maxRetries}）`);
    } else {
      console.warn(`⚠️  循环次数异常: ${loopCount}`);
    }

    if (lastScore >= loopNode.minQualityScore) {
      console.log(`✅ 最终分数达标（>= ${loopNode.minQualityScore}）`);
    } else {
      console.log(`⚠️  最终分数未达标: ${lastScore}`);
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('✨ 测试完成！');
    console.log('='.repeat(60));
  },

  error: (error) => {
    console.error('-'.repeat(60));
    console.error('💥 工作流执行失败');
    console.error('');
    console.error('错误信息:', error.message);
    console.error('');
    console.error('堆栈跟踪:');
    console.error(error.stack);
    console.error('');
    console.error('='.repeat(60));
    process.exit(1);
  }
});
