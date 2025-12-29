import { auiStore } from './src/store.js';
import { contextSerializer } from './src/serializer.js';
import { createToolExecutor } from './src/tool.js';

const executor = createToolExecutor(auiStore);

// 注册带工具的按钮
auiStore.registerNode({
  id: 'create-user-btn',
  type: 'Button',
  props: {
    label: '创建用户',
    tool: {
      name: 'createUser',
      description: '创建新用户',
      parameters: [
        { name: 'name', type: 'string', required: true, description: '用户名' },
        { name: 'email', type: 'string', required: true, description: '邮箱' },
        { name: 'age', type: 'number', required: false, description: '年龄' },
      ],
      handler: async (params) => {
        const user = { id: Date.now(), ...params };

        // 更新 UI
        auiStore.unregisterNode('create-user-btn');
        auiStore.registerNode({
          id: 'user-created',
          type: 'Card',
          props: { title: `用户创建成功：${params.name} (${params.email})` },
        });
        auiStore.registerNode({
          id: 'edit-user-btn',
          type: 'Button',
          props: {
            label: '编辑用户',
            tool: {
              name: 'editUser',
              parameters: [
                { name: 'name', type: 'string', description: '新用户名' },
              ],
              handler: async (params) => {
                auiStore.updateNode('user-created', {
                  props: { title: `用户已更新：${params.name}` },
                });
                return { updated: true };
              },
            },
          },
        });

        return user;
      },
    },
  },
});

// AI 读取上下文
console.log('=== 初始上下文 ===');
console.log(contextSerializer.toNaturalLanguage(auiStore.getRootNodes(), 'Dashboard'));

// AI 执行工具
console.log('\n=== 执行工具：createUser ===');
const result = await executor.execute('create-user-btn', {
  name: '张三',
  email: 'zhang@example.com',
  age: 25,
});
console.log('执行结果:', result);

// 查看更新后的上下文
console.log('\n=== 更新后的上下文 ===');
console.log(contextSerializer.toNaturalLanguage(auiStore.getRootNodes(), 'Dashboard'));

// AI 再次执行工具
console.log('\n=== 执行工具：editUser ===');
const result2 = await executor.execute('edit-user-btn', {
  name: '李四',
});
console.log('执行结果:', result2);

console.log('\n=== 最终上下文 ===');
console.log(contextSerializer.toNaturalLanguage(auiStore.getRootNodes(), 'Dashboard'));
