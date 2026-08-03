import { describe, it, expect } from 'vitest';
import { withAui, createAuiSerializer } from './decorators';
import { contextSerializer } from './serializer';
import type { AuiNode } from './types';

describe('withAui', () => {
  it('返回原组件', () => {
    const Comp = () => null;
    const Wrapped = withAui(Comp, { type: 'Button' });
    expect(Wrapped).toBe(Comp);
  });

  it('传入 serializer 时注册到全局 contextSerializer', () => {
    const Comp = () => null;
    const serializer = {
      serialize: (value: unknown) => ({ id: '1', type: 'MyButton', props: { value } }),
    };
    withAui(Comp, { type: 'MyButton', serializer });
    expect(contextSerializer.serialize('MyButton', 7)).toEqual({
      id: '1',
      type: 'MyButton',
      props: { value: 7 },
    });
  });

  it('不传 serializer 时不做注册', () => {
    const Comp = () => null;
    withAui(Comp, { type: 'NoSerializer' });
    expect(contextSerializer.serialize('NoSerializer', 'v')).toBeNull();
  });
});

describe('createAuiSerializer', () => {
  it('返回包含 serialize 与 deserialize 的对象', () => {
    const serialize = (value: number): AuiNode => ({ id: '1', type: 'N', props: { value } });
    const deserialize = (node: AuiNode) => node.props?.value as number | null;
    const s = createAuiSerializer(serialize, deserialize);
    expect(s.serialize).toBe(serialize);
    expect(s.deserialize).toBe(deserialize);
  });

  it('deserialize 可省略', () => {
    const serialize = (value: number): AuiNode => ({ id: '1', type: 'N', props: { value } });
    const s = createAuiSerializer(serialize);
    expect(s.serialize).toBe(serialize);
    expect(s.deserialize).toBeUndefined();
  });
});
