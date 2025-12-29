import { auiStore } from './src/store.js';
import { contextSerializer } from './src/serializer.js';

// 注册节点
auiStore.registerNode({
  id: 'form-1',
  type: 'Form',
  props: { fields: ['name', 'email'] },
  metadata: { description: '用户信息表单' },
});

auiStore.registerNode({
  id: 'submit-btn',
  type: 'Button',
  props: { label: '提交' },
  metadata: { importance: 'high', visible: true },
});

auiStore.registerNode({
  id: 'hidden-btn',
  type: 'Button',
  props: { label: '隐藏按钮' },
  metadata: { visible: false },
});

// 获取上下文
const nodes = auiStore.getRootNodes();
const context = contextSerializer.toNaturalLanguage(nodes, 'Dashboard');

console.log(context);

// 订阅状态变化
auiStore.state$.subscribe(() => {
  const nodes = auiStore.getRootNodes();
  const context = contextSerializer.toNaturalLanguage(nodes, 'Dashboard');
  console.log('\n--- 上下文更新 ---');
  console.log(context);
});

// 模拟状态变化
setTimeout(() => {
  auiStore.registerNode({
    id: 'hidden-btn',
    type: 'Button',
    props: { label: '隐藏按钮' },
    metadata: { visible: true }, // 改为可见
  });
}, 1000);
