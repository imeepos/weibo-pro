import { describe, it, expect, beforeEach } from 'vitest';
import { AuiContextSerializer } from './serializer';
import type { AuiNode, ToolDefinition } from './types';

describe('AuiContextSerializer', () => {
  let serializer: AuiContextSerializer;

  beforeEach(() => {
    serializer = new AuiContextSerializer();
  });

  describe('serialize / deserialize', () => {
    it('register + serialize 调用已注册序列化器', () => {
      serializer.register('MyWidget', {
        serialize: (value: unknown) => ({ id: '1', type: 'MyWidget', props: { value } }),
      });
      expect(serializer.serialize('MyWidget', 42)).toEqual({
        id: '1',
        type: 'MyWidget',
        props: { value: 42 },
      });
    });

    it('serialize 未注册类型返回 null', () => {
      expect(serializer.serialize('Unknown', 'x')).toBeNull();
    });

    it('unregister 移除序列化器', () => {
      serializer.register('X', { serialize: () => ({ id: '1', type: 'X' }) });
      serializer.unregister('X');
      expect(serializer.serialize('X', 'v')).toBeNull();
    });

    it('deserialize 调用序列化器的 deserialize', () => {
      serializer.register('X', {
        serialize: (v: unknown) => ({ id: '1', type: 'X', props: { v } }),
        deserialize: (n: AuiNode) => n.props?.v,
      });
      expect(serializer.deserialize({ id: '1', type: 'X', props: { v: 'hi' } })).toBe('hi');
    });

    it('deserialize 序列化器未实现 deserialize 时返回 null', () => {
      serializer.register('X', { serialize: () => ({ id: '1', type: 'X' }) });
      expect(serializer.deserialize({ id: '1', type: 'X' })).toBeNull();
    });

    it('deserialize 未注册类型返回 null', () => {
      expect(serializer.deserialize({ id: '1', type: 'Nope' })).toBeNull();
    });
  });

  describe('serializeContext / deserializeContext', () => {
    it('serializeContext 输出含 nodes、metadata、timestamp 的 JSON 字符串', () => {
      const nodes: AuiNode[] = [{ id: 'a', type: 'Button' }];
      const json = serializer.serializeContext(nodes, { page: 'home' });
      const parsed = JSON.parse(json) as { nodes: AuiNode[]; metadata: { page: string }; timestamp: number };
      expect(parsed.nodes).toEqual(nodes);
      expect(parsed.metadata).toEqual({ page: 'home' });
      expect(typeof parsed.timestamp).toBe('number');
    });

    it('deserializeContext 解析合法 JSON', () => {
      const json = JSON.stringify({ nodes: [], timestamp: 1, metadata: { a: 1 } });
      expect(serializer.deserializeContext(json)).toEqual({
        nodes: [],
        timestamp: 1,
        metadata: { a: 1 },
      });
    });

    it('deserializeContext 无效 JSON 返回 null', () => {
      expect(serializer.deserializeContext('not json')).toBeNull();
    });
  });

  describe('toNaturalLanguage', () => {
    it('无可见元素返回提示', () => {
      expect(serializer.toNaturalLanguage([])).toBe('当前页面没有可见元素。');
    });

    it('渲染 Button 描述', () => {
      const nodes: AuiNode[] = [{ id: 'b1', type: 'Button', props: { label: '提交' } }];
      expect(serializer.toNaturalLanguage(nodes)).toContain('按钮 "提交"');
    });

    it('渲染 Button 禁用与重要标记', () => {
      const nodes: AuiNode[] = [
        { id: 'b1', type: 'Button', props: { label: '删除', disabled: true }, metadata: { importance: 'high' } },
      ];
      const text = serializer.toNaturalLanguage(nodes);
      expect(text).toContain('按钮 "删除"，已禁用（重要）');
    });

    it('渲染带工具的 Button 参数', () => {
      const tool: ToolDefinition = {
        name: 'submit',
        handler: () => undefined,
        parameters: [{ name: 'id', type: 'string', required: true, description: 'ID' }],
      };
      const nodes: AuiNode[] = [{ id: 'b1', type: 'Button', props: { label: '提交', tool } }];
      const text = serializer.toNaturalLanguage(nodes);
      expect(text).toContain('工具：submit');
      expect(text).toContain('id (string, 必填): ID');
    });

    it('渲染 Form 描述', () => {
      const nodes: AuiNode[] = [
        {
          id: 'f1',
          type: 'Form',
          props: { fields: ['name', 'email'], requiredFields: ['email'] },
          metadata: { description: '用户表单' },
        },
      ];
      expect(serializer.toNaturalLanguage(nodes)).toContain(
        '用户表单，包含字段：name、email，必填：email'
      );
    });

    it('渲染 Input / Select / Table / Card / Modal / List 描述', () => {
      const nodes: AuiNode[] = [
        { id: 'i1', type: 'Input', props: { label: '姓名', required: true } },
        { id: 's1', type: 'Select', props: { label: '城市', options: ['北京', '上海'] } },
        { id: 't1', type: 'Table', props: { columns: ['a', 'b'], rowCount: 3 } },
        { id: 'c1', type: 'Card', props: { title: '卡片' } },
        { id: 'm1', type: 'Modal', props: { title: '弹窗', visible: true } },
        { id: 'l1', type: 'List', props: { itemCount: 5 } },
      ];
      const text = serializer.toNaturalLanguage(nodes);
      expect(text).toContain('输入框 "姓名"，类型：text（必填）');
      expect(text).toContain('下拉选择 "城市"，选项：北京、上海');
      expect(text).toContain('数据表格，列：a、b，共 3 行');
      expect(text).toContain('卡片 "卡片"');
      expect(text).toContain('弹窗 "弹窗"，已打开');
      expect(text).toContain('列表，共 5 项');
    });

    it('未知类型使用默认描述器', () => {
      const nodes: AuiNode[] = [{ id: 'x1', type: 'UnknownWidget', metadata: { label: '未知' } }];
      expect(serializer.toNaturalLanguage(nodes)).toContain('UnknownWidget (x1): 未知');
    });

    it('过滤 visible=false 的节点', () => {
      const nodes: AuiNode[] = [
        { id: 'a', type: 'Button', props: { label: '可见按钮' } },
        { id: 'b', type: 'Button', props: { label: '隐藏按钮' }, metadata: { visible: false } },
      ];
      const text = serializer.toNaturalLanguage(nodes);
      expect(text).toContain('可见按钮');
      expect(text).not.toContain('隐藏按钮');
    });

    it('支持 visible 为函数', () => {
      const nodes: AuiNode[] = [
        { id: 'a', type: 'Button', props: { label: '函数可见' }, metadata: { visible: () => true } },
        { id: 'b', type: 'Button', props: { label: '函数隐藏' }, metadata: { visible: () => false } },
      ];
      const text = serializer.toNaturalLanguage(nodes);
      expect(text).toContain('函数可见');
      expect(text).not.toContain('函数隐藏');
    });

    it('支持 pageName 标题', () => {
      const nodes: AuiNode[] = [{ id: 'a', type: 'Button' }];
      expect(serializer.toNaturalLanguage(nodes, '首页').startsWith('# 首页')).toBe(true);
    });

    it('registerDescriber 使用自定义描述器', () => {
      serializer.registerDescriber('Custom', (n: AuiNode) => `自定义 ${n.id}`);
      const nodes: AuiNode[] = [{ id: 'c1', type: 'Custom' }];
      expect(serializer.toNaturalLanguage(nodes)).toContain('自定义 c1');
    });
  });
});
