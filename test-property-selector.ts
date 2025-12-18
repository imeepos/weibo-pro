/**
 * 测试 PropertySelectorAst 的实际执行行为
 * 验证：从完整对象中提取指定属性路径的值
 */

import 'reflect-metadata';
import { Container } from '@sker/core';
import { PropertySelectorAst } from '@sker/workflow-ast';
import { PropertySelectorAstVisitor } from '@sker/workflow-run';
import { of } from 'rxjs';

// 模拟事件对象（与你的数据结构一致）
const mockEvent = {
  id: '186c402a-4969-4258-82c8-a08c5c2d2065',
  title: '用户参与多层转发互动表达赞同态度',
  description: '用户在微博上参与了多层转发互动...',
  category_id: 'c2a1f6d8-92df-42cb-8556-8b668701909a',
  category: {
    id: 'c2a1f6d8-92df-42cb-8556-8b668701909a',
    code: '_0616',
    name: '日常分享',
  },
  sentiment: {
    neutral: 0.1075,
    negative: 0.0275,
    positive: 0.865,
  },
  hotness: '3.00',
  status: 'active',
};

async function testPropertySelector() {
  console.log('=== 测试 PropertySelectorAst ===\n');

  // 1. 创建 AST 节点
  const ast = new PropertySelectorAst();
  ast.id = 'test-property-selector';
  ast.path = 'id';  // 提取 id 字段
  ast.data = null;

  console.log('输入配置:');
  console.log('  - path:', ast.path);
  console.log('  - 输入对象:', mockEvent);
  console.log('  - 期望输出:', mockEvent.id);
  console.log('');

  // 2. 创建 Visitor
  const visitor = new PropertySelectorAstVisitor();

  // 3. 构造输入流（模拟从 EventAst 接收的数据）
  const input$ = of({ data: mockEvent });

  // 4. 执行
  console.log('开始执行...\n');
  const output$ = visitor.handler(ast, input$);

  // 5. 订阅输出
  output$.subscribe({
    next: (event) => {
      console.log(`[${event.type}]`, event);

      if (event.type === 'node_emit' && event.data?.value !== undefined) {
        console.log('\n✅ 提取结果:', event.data.value);
        console.log('✅ 类型:', typeof event.data.value);

        if (event.data.value === mockEvent.id) {
          console.log('✅ 验证通过: 成功提取 id 字符串');
        } else if (typeof event.data.value === 'object') {
          console.log('❌ 验证失败: 提取了完整对象，而不是 id 字符串');
          console.log('实际值:', JSON.stringify(event.data.value, null, 2));
        }
      }
    },
    error: (err) => {
      console.error('❌ 执行失败:', err);
    },
    complete: () => {
      console.log('\n执行完成');
      console.log('节点最终状态:');
      console.log('  - state:', ast.state);
      console.log('  - count:', ast.count);
      console.log('  - emitCount:', ast.emitCount);
      console.log('  - value:', ast.value);
    },
  });
}

testPropertySelector();
