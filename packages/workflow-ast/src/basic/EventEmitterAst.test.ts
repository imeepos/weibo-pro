import { describe, it, expect, beforeEach } from 'vitest';
import { EventEmitterAst } from './EventEmitterAst';

describe('EventEmitterAst', () => {
  let ast: EventEmitterAst;

  beforeEach(() => {
    ast = new EventEmitterAst();
  });

  it('应该正确初始化默认值', () => {
    expect(ast.trigger).toBe(true);
    expect(ast.delay).toBe(0);
    expect(ast.type).toBe('EventEmitterAst');
  });

  it('应该正确初始化输出值', () => {
    expect(ast.eventId).toBe('');
    expect(ast.eventTitle).toBe('');
    expect(ast.index).toBe(0);
    expect(ast.total).toBe(0);
    expect(ast.isLast).toBe(false);
  });

  it('应该正确初始化状态值', () => {
    expect(ast.currentIndex).toBe(0);
    expect(ast.totalEvents).toBe(0);
    expect(ast.processedEvents).toBe(0);
    expect(ast.progress).toBe(0);
  });
});
